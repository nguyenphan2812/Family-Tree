"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Node,
  Edge,
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
} from "@xyflow/react";
import { usePeople } from "@/src/features/person/hooks/usePeople";
import { usePersonMutations } from "@/src/features/person/hooks/usePersonMutations";
import { useMarriages } from "@/src/features/marriage/hooks/useMarriages";
import { useMarriageMutations } from "@/src/features/marriage/hooks/useMarriageMutations";
import { useIsEditor } from "@/src/features/auth/hooks/useIsEditor";
import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { buildGraph } from "../utils/buildGraph";
import { PersonNode } from "./PersonNode";
import { UnionNode } from "./UnionNode";
import { TreeContext } from "../context/TreeContext";
import { TreeHeader } from "./TreeHeader";
import { TreeModals } from "./TreeModals";
import { TreeEmptyState } from "./TreeEmptyState";
import { layoutGraph, PERSON_NODE_WIDTH, PERSON_NODE_HEIGHT } from "../utils/layoutGraph";
import { Person } from "@/src/types/family";
import { FamilyEdge } from "./FamilyEdge";
import { useTreeHighlight } from "../hooks/useTreeHighlight";
import { useTreeModals } from "../hooks/useTreeModals";

const nodeTypes = { person: PersonNode, union: UnionNode };
const edgeTypes = { smoothstep: FamilyEdge, family: FamilyEdge };

function TreeCanvasInner() {
  const { people, loading: peopleLoading, error: peopleError } = usePeople();
  const { marriages, error: marriagesError } = useMarriages();
  const { addPerson, updatePerson, deletePerson } = usePersonMutations();
  const {
    createMarriage,
    addChildToMarriage,
    addSpouseToMarriage,
    updateMarriage,
    removePersonFromAllMarriages,
    deleteMarriage,
  } = useMarriageMutations();
  const { isEditor, user } = useIsEditor();
  const { signIn, logOut } = useAuth();
  const { fitView, setCenter } = useReactFlow();
  const initialFitDoneRef = useRef(false);

  // Core canvas state
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [collapsedMarriageIds, setCollapsedMarriageIds] = useState<Set<string>>(new Set());
  const [hoveredUnionId, setHoveredUnionId] = useState<string | null>(null);
  const [hoveredPersonId, setHoveredPersonId] = useState<string | null>(null);

  // Layout calculation
  const { graphNodes, graphEdges, personGenerations } = useMemo(() => {
    const isCollapsed = collapsedMarriageIds.size > 0;
    const { nodes: rawNodes, edges: rawEdges, personGenerations: pGen } = buildGraph(
      people,
      marriages,
      {
        collapsedMarriageIds,
        isCollapsed,
      }
    );
    return { graphNodes: rawNodes, graphEdges: rawEdges, personGenerations: pGen };
  }, [people, marriages, collapsedMarriageIds]);

  useEffect(() => {
    let isCancelled = false;
    const isCollapsed = collapsedMarriageIds.size > 0;
    layoutGraph(graphNodes, graphEdges, { isCollapsed }).then(
      ({ nodes: positionedNodes, edges: positionedEdges }) => {
        if (!isCancelled) {
          setNodes(positionedNodes);
          setEdges(positionedEdges);
        }
      }
    );
    return () => {
      isCancelled = true;
    };
  }, [graphNodes, graphEdges, collapsedMarriageIds]);

  // Bloodline highlighting hook
  const { displayNodes, displayEdges } = useTreeHighlight({
    nodes,
    edges,
    marriages,
    hoveredUnionId,
    hoveredPersonId,
  });

  // Modal states and CRUD operations hook
  const modals = useTreeModals({
    people,
    marriages,
    graphNodes,
    personGenerations,
    isEditor,
    addPerson,
    updatePerson,
    deletePerson,
    createMarriage,
    addChildToMarriage,
    addSpouseToMarriage,
    removePersonFromAllMarriages,
    deleteMarriage,
    updateMarriage,
    onResetComplete: () => setSelectedPersonId(null),
  });

  // Initial fit view on first load
  useEffect(() => {
    if (nodes.length > 0 && !initialFitDoneRef.current && !selectedPersonId) {
      initialFitDoneRef.current = true;
      const timeout = setTimeout(() => fitView({ padding: 0.35, duration: 400 }), 150);
      return () => clearTimeout(timeout);
    }
  }, [nodes.length, selectedPersonId, fitView]);

  // Focus & glide to selected person
  const handleSelectPerson = useCallback(
    (personId: string) => {
      setSelectedPersonId(personId);
      const targetNode = nodes.find((n) => n.id === personId);
      if (targetNode) {
        setCenter(
          targetNode.position.x + PERSON_NODE_WIDTH / 2,
          targetNode.position.y + PERSON_NODE_HEIGHT / 2,
          { zoom: 1.1, duration: 600 }
        );
      }
    },
    [nodes, setCenter]
  );

  const handleToggleCollapseMarriage = useCallback((marriageId: string) => {
    setCollapsedMarriageIds((prev) => {
      const next = new Set(prev);
      if (next.has(marriageId)) {
        next.delete(marriageId);
      } else {
        next.add(marriageId);
      }
      return next;
    });
  }, []);

  const handleCollapseAll = useCallback(() => {
    const allWithChildren = marriages
      .filter((m) => m.childrenIds.length > 0)
      .map((m) => m.id);
    setCollapsedMarriageIds(new Set(allWithChildren));
  }, [marriages]);

  const handleExpandAll = useCallback(() => {
    setCollapsedMarriageIds(new Set());
  }, []);

  const maxGeneration = useMemo(() => {
    let max = 1;
    for (const gen of personGenerations.values()) {
      if (gen > max) max = gen;
    }
    return max;
  }, [personGenerations]);

  if (peopleError || marriagesError || peopleLoading || people.length === 0) {
    return (
      <TreeEmptyState
        peopleLoading={peopleLoading}
        peopleError={peopleError}
        marriagesError={marriagesError}
        user={user}
        isEditor={isEditor}
        isAddingRootTree={modals.isAddingRootTree}
        onStartAddRootTree={() => modals.setIsAddingRootTree(true)}
        onCancelAddRootTree={() => modals.setIsAddingRootTree(false)}
        onSaveRootTree={modals.handleAddTree}
        onSignIn={signIn}
        onLogOut={logOut}
      />
    );
  }

  return (
    <TreeContext.Provider
      value={{
        isEditor,
        onEditPerson: modals.setEditingPersonId,
        onViewPerson: modals.setViewingPersonId,
        onAddParent: modals.handleOpenAddParent,
        onAddSpouse: modals.handleOpenAddSpouse,
        onAddChildToPerson: modals.handleOpenAddChildToPerson,
        onAddChildToMarriage: modals.handleOpenAddChildToMarriage,
        onToggleCollapseMarriage: handleToggleCollapseMarriage,
        onSelectPerson: handleSelectPerson,
        onRequireAuth: signIn,
        hoveredUnionId,
        hoveredPersonId,
        setHoveredUnionId,
        setHoveredPersonId,
        selectedPersonId,
      }}
    >
      <div className="relative w-full h-screen bg-slate-950">
        <TreeHeader
          people={people}
          personGenerations={personGenerations}
          maxGeneration={maxGeneration}
          hasCollapsedBranches={collapsedMarriageIds.size > 0}
          isEditor={isEditor}
          user={user}
          onSelectPerson={handleSelectPerson}
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          onOpenManageEditors={() => modals.setShowManageEditors(true)}
          onOpenReset={() => modals.setShowConfirmReset(true)}
          onSignIn={signIn}
          onLogOut={logOut}
        />

        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          minZoom={0.1}
          maxZoom={2}
        >
          <Background color="#334155" gap={24} size={1} />
          <Controls className="bg-slate-900! border-slate-700! text-slate-200!" />
          <MiniMap
            pannable
            zoomable
            position="bottom-right"
            bgColor="#090d16"
            maskColor="rgba(2, 6, 23, 0.75)"
            maskStrokeColor="#38bdf8"
            maskStrokeWidth={2}
            nodeBorderRadius={3}
            nodeStrokeColor="#1e293b"
            nodeStrokeWidth={1}
            nodeColor={(n) => {
              if (n.type === "union") {
                return (n.data as { color?: string })?.color || "#eab308";
              }
              const p = (n.data as { person?: Person })?.person;
              if (p?.isPlaceholder) return "#f59e0b";
              if (p?.gender === "female") return "#fb7185";
              return "#38bdf8";
            }}
            onNodeClick={(_event, node) => {
              if (node.type === "person") {
                handleSelectPerson(node.id);
              }
            }}
            className="rounded-xl overflow-hidden border border-slate-700 shadow-2xl bg-slate-900"
            style={{ width: 220, height: 160 }}
          />
        </ReactFlow>

        <TreeModals people={people} marriages={marriages} modals={modals} />
      </div>
    </TreeContext.Provider>
  );
}

export function TreeCanvas() {
  return (
    <ReactFlowProvider>
      <TreeCanvasInner />
    </ReactFlowProvider>
  );
}