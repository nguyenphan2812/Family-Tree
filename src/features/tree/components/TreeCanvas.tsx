"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { buildGraph } from "../utils/buildGraph";
import { PersonNode } from "../context/PersonNode";
import { UnionNode } from "./UnionNode";
import { TreeContext } from "../context/TreeContext";
import { PersonFormModal, PersonFormData } from "./PersonFormModal";
import { AddParentModal } from "./AddParentModal";
import { AddSpouseModal } from "./AddSpouseModal";
import { SelectSpouseForChildModal } from "./SelectSpouseForChildModal";
import { TreeSearchBar } from "./TreeSearchBar";
import { layoutGraph, PERSON_NODE_WIDTH, PERSON_NODE_HEIGHT } from "../utils/layoutGraph";
import { Person, Marriage } from "@/src/types/family";

const nodeTypes = { person: PersonNode, union: UnionNode };

function TreeCanvasInner() {
  const { people, loading: peopleLoading } = usePeople();
  const { marriages } = useMarriages();
  const { addPerson, updatePerson, deletePerson } = usePersonMutations();
  const {
    createMarriage,
    addChildToMarriage,
    addSpouseToMarriage,
    removePersonFromAllMarriages,
  } = useMarriageMutations();
  const { isEditor, user } = useIsEditor();
  const { fitView, setCenter } = useReactFlow();

  // State
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [collapsedMarriageIds, setCollapsedMarriageIds] = useState<Set<string>>(new Set());

  // Modal states
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [addingParentForChildId, setAddingParentForChildId] = useState<string | null>(null);
  const [addingSpouseForPersonId, setAddingSpouseForPersonId] = useState<string | null>(null);
  const [selectingSpouseForChildParentId, setSelectingSpouseForChildParentId] = useState<string | null>(null);
  const [addingChildTargetMarriageId, setAddingChildTargetMarriageId] = useState<string | null>(null);
  const [isAddingRootTree, setIsAddingRootTree] = useState(false);

  // Layout calculation
  const { graphNodes, graphEdges, personGenerations } = useMemo(() => {
    const { nodes: rawNodes, edges: rawEdges, personGenerations } = buildGraph(
      people,
      marriages,
      {
        collapsedMarriageIds,
        selectedPersonId,
      }
    );
    return { graphNodes: rawNodes, graphEdges: rawEdges, personGenerations };
  }, [people, marriages, collapsedMarriageIds, selectedPersonId]);

  useEffect(() => {
    let isCancelled = false;
    layoutGraph(graphNodes, graphEdges).then((positionedNodes) => {
      if (!isCancelled) {
        setNodes(positionedNodes);
        setEdges(graphEdges);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [graphNodes, graphEdges]);

  // Initial fit view on first load
  useEffect(() => {
    if (nodes.length > 0 && !selectedPersonId) {
      const timeout = setTimeout(() => fitView({ padding: 0.35, duration: 400 }), 150);
      return () => clearTimeout(timeout);
    }
  }, [nodes.length === 0, fitView]);

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

  // Toggle collapsing of a marriage's descendant branch
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

  // Collapse / Expand all branches
  const handleCollapseAll = useCallback(() => {
    const allWithChildren = marriages
      .filter((m) => m.childrenIds.length > 0)
      .map((m) => m.id);
    setCollapsedMarriageIds(new Set(allWithChildren));
  }, [marriages]);

  const handleExpandAll = useCallback(() => {
    setCollapsedMarriageIds(new Set());
  }, []);

  // 1. Upward Expansion: Thêm Cha / Mẹ
  const handleOpenAddParent = useCallback((childPersonId: string) => {
    setAddingParentForChildId(childPersonId);
  }, []);

  const handleSaveParent = useCallback(
    async (data: {
      fatherData?: PersonFormData;
      motherData?: PersonFormData;
      existingMarriageId?: string;
    }) => {
      if (!addingParentForChildId) return;

      let fatherId: string | undefined = undefined;
      let motherId: string | undefined = undefined;

      if (data.fatherData) {
        fatherId = await addPerson({ ...data.fatherData });
      }
      if (data.motherData) {
        motherId = await addPerson({ ...data.motherData });
      }

      if (data.existingMarriageId) {
        // Add missing spouse to existing marriage
        const missingSpouseId = fatherId || motherId;
        if (missingSpouseId) {
          await addSpouseToMarriage(data.existingMarriageId, missingSpouseId);
        }
      } else {
        // Create new marriage of parents with this child
        const spouseIds = [fatherId, motherId].filter(Boolean) as string[];
        await createMarriage({
          spouseIds,
          order: 1,
          childrenIds: [addingParentForChildId],
          isPlaceholder: spouseIds.length < 2,
        });
      }

      setAddingParentForChildId(null);
    },
    [addingParentForChildId, addPerson, addSpouseToMarriage, createMarriage]
  );

  // 2. Sideways Expansion: Thêm Phối ngẫu (Vợ / Chồng)
  const handleOpenAddSpouse = useCallback((personId: string) => {
    setAddingSpouseForPersonId(personId);
  }, []);

  const handleSaveSpouse = useCallback(
    async (data: {
      spouseData: PersonFormData;
      order: number;
      orderLabel: string;
    }) => {
      if (!addingSpouseForPersonId) return;

      const newSpouseId = await addPerson({
        ...data.spouseData,
        spouseLabel: data.orderLabel,
      });

      await createMarriage({
        spouseIds: [addingSpouseForPersonId, newSpouseId],
        order: data.order,
        orderLabel: data.orderLabel,
      });

      setAddingSpouseForPersonId(null);
    },
    [addingSpouseForPersonId, addPerson, createMarriage]
  );

  // 3. Downward Expansion: Thêm Con
  const handleOpenAddChildToMarriage = useCallback((marriageId: string) => {
    setAddingChildTargetMarriageId(marriageId);
  }, []);

  const handleOpenAddChildToPerson = useCallback(
    (parentPersonId: string) => {
      const personMarriages = marriages
        .filter((m) => m.spouseIds.includes(parentPersonId))
        .sort((a, b) => a.order - b.order);

      if (personMarriages.length === 0) {
        // Person has no marriages yet: create a placeholder marriage or prompt
        createMarriage({
          spouseIds: [parentPersonId],
          order: 1,
          isPlaceholder: true,
        }).then((newMId) => {
          setAddingChildTargetMarriageId(newMId);
        });
      } else if (personMarriages.length === 1) {
        // Exactly 1 marriage: proceed directly to add child
        setAddingChildTargetMarriageId(personMarriages[0].id);
      } else {
        // 2+ marriages: prompt user to pick WHICH spouse this child belongs to!
        setSelectingSpouseForChildParentId(parentPersonId);
      }
    },
    [marriages, createMarriage]
  );

  const handleSaveChild = useCallback(
    async (data: PersonFormData) => {
      if (!addingChildTargetMarriageId) return;

      const targetMarriage = marriages.find((m) => m.id === addingChildTargetMarriageId);
      const childCount = targetMarriage?.childrenIds.length ?? 0;
      const birthOrder = data.birthOrder ?? childCount + 1;

      const newChildId = await addPerson({
        ...data,
        birthOrder,
      });

      await addChildToMarriage(addingChildTargetMarriageId, newChildId);
      setAddingChildTargetMarriageId(null);
    },
    [addingChildTargetMarriageId, marriages, addPerson, addChildToMarriage]
  );

  // 4. Edit / Delete Person
  const handleEditSave = useCallback(
    async (data: PersonFormData) => {
      if (!editingPersonId) return;
      await updatePerson(editingPersonId, data);
      setEditingPersonId(null);
    },
    [editingPersonId, updatePerson]
  );

  const handleEditDelete = useCallback(async () => {
    if (!editingPersonId) return;
    await removePersonFromAllMarriages(editingPersonId, marriages);
    await deletePerson(editingPersonId);
    setEditingPersonId(null);
  }, [editingPersonId, marriages, removePersonFromAllMarriages, deletePerson]);

  // Root Tree Add
  const handleAddTree = useCallback(
    async (data: PersonFormData) => {
      await addPerson({ ...data });
      setIsAddingRootTree(false);
    },
    [addPerson]
  );

  const editingPerson = people.find((p) => p.id === editingPersonId);
  const childPersonForAddParent = people.find((p) => p.id === addingParentForChildId);
  const parentForAddSpouse = people.find((p) => p.id === addingSpouseForPersonId);
  const parentForSelectSpouse = people.find((p) => p.id === selectingSpouseForChildParentId);

  // Existing parent marriage for AddParentModal if any
  const existingParentMarriage = useMemo(() => {
    if (!addingParentForChildId) return undefined;
    return marriages.find((m) => m.childrenIds.includes(addingParentForChildId));
  }, [addingParentForChildId, marriages]);

  // Max generation count
  const maxGeneration = useMemo(() => {
    let max = 1;
    for (const gen of personGenerations.values()) {
      if (gen > max) max = gen;
    }
    return max;
  }, [personGenerations]);

  if (peopleLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-slate-300 text-sm">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <span>Đang tải dữ liệu gia phả...</span>
        </div>
      </div>
    );
  }

  if (people.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-slate-300 p-4">
        {isEditor ? (
          <div className="flex flex-col items-center gap-4 text-center max-w-sm">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-2xl shadow-inner">
              🌳
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Bắt đầu Cây Gia Phả</h2>
              <p className="text-xs text-slate-400 mt-1">
                Chưa có ai trong cây. Hãy tạo người Thủy Tổ (Cụ Tổ) đầu tiên của dòng họ.
              </p>
            </div>
            <button
              onClick={() => setIsAddingRootTree(true)}
              className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-lg cursor-pointer transition"
            >
              + Tạo Cụ Tổ (Bắt đầu cây)
            </button>
            {isAddingRootTree && (
              <PersonFormModal
                onSubmit={handleAddTree}
                onCancel={() => setIsAddingRootTree(false)}
              />
            )}
          </div>
        ) : (
          <div className="text-center">
            <p className="text-slate-400 text-sm">Cây gia phả chưa được khởi tạo.</p>
            <p className="text-slate-600 text-xs mt-1">Chỉ Editor mới có quyền khởi tạo cây.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <TreeContext.Provider
      value={{
        isEditor,
        onEditPerson: setEditingPersonId,
        onAddParent: handleOpenAddParent,
        onAddSpouse: handleOpenAddSpouse,
        onAddChildToPerson: handleOpenAddChildToPerson,
        onAddChildToMarriage: handleOpenAddChildToMarriage,
        onToggleCollapseMarriage: handleToggleCollapseMarriage,
        onSelectPerson: handleSelectPerson,
        onAddTree: handleAddTree,
      }}
    >
      <div className="relative w-full h-screen bg-slate-950">
        {/* Floating Top Navigation Bar */}
        <div className="absolute top-4 left-4 right-4 z-40 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
          {/* Left: Search Bar */}
          <div className="pointer-events-auto flex items-center gap-2">
            <TreeSearchBar
              people={people}
              personGenerations={personGenerations}
              onSelectPerson={handleSelectPerson}
            />
          </div>

          {/* Right: Stats & Actions */}
          <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-1.5 shadow-lg backdrop-blur-md text-xs text-slate-300">
            <span className="font-medium text-slate-100">{people.length}</span> người
            <span className="text-slate-600">•</span>
            <span className="font-medium text-amber-300">{maxGeneration}</span> thế hệ
            <span className="text-slate-600">•</span>
            {collapsedMarriageIds.size > 0 ? (
              <button
                onClick={handleExpandAll}
                className="text-sky-400 hover:text-sky-300 text-[11px] underline cursor-pointer"
              >
                Mở rộng tất cả
              </button>
            ) : (
              <button
                onClick={handleCollapseAll}
                className="text-slate-400 hover:text-slate-200 text-[11px] underline cursor-pointer"
              >
                Thu gọn các nhánh
              </button>
            )}
            {isEditor && (
              <>
                <span className="text-slate-600">•</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-1.5 py-0.5 rounded">
                  Editor: {user?.email}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Canvas */}
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} minZoom={0.1} maxZoom={2}>
          <Background color="#334155" gap={24} size={1} />
          <Controls className="bg-slate-900! border-slate-700! text-slate-200!" />
          <MiniMap
            nodeColor={(n) => (n.type === "union" ? "#eab308" : "#3b82f6")}
            maskColor="rgba(15, 23, 42, 0.7)"
            className="bg-slate-900! border-slate-700!"
          />
        </ReactFlow>

        {/* Modal: Edit Person */}
        {editingPerson && (
          <PersonFormModal
            initialData={{
              firstName: editingPerson.firstName,
              lastName: editingPerson.lastName,
              birthDate: editingPerson.birthDate ?? "",
              deathDate: editingPerson.deathDate ?? "",
              gender: editingPerson.gender ?? "male",
              bio: editingPerson.bio ?? "",
              spouseLabel: editingPerson.spouseLabel,
              birthOrder: editingPerson.birthOrder,
            }}
            onSubmit={handleEditSave}
            onCancel={() => setEditingPersonId(null)}
            onDelete={handleEditDelete}
          />
        )}

        {/* Modal: Upward Expansion (Add Parents) */}
        {childPersonForAddParent && (
          <AddParentModal
            childPerson={childPersonForAddParent}
            existingParentMarriage={existingParentMarriage}
            people={people}
            onSubmit={handleSaveParent}
            onCancel={() => setAddingParentForChildId(null)}
          />
        )}

        {/* Modal: Sideways Expansion (Add Spouse) */}
        {parentForAddSpouse && (
          <AddSpouseModal
            person={parentForAddSpouse}
            existingMarriages={marriages
              .filter((m) => m.spouseIds.includes(parentForAddSpouse.id))
              .sort((a, b) => a.order - b.order)}
            people={people}
            onSubmit={handleSaveSpouse}
            onCancel={() => setAddingSpouseForPersonId(null)}
          />
        )}

        {/* Modal: Select which spouse for child when 2+ spouses exist */}
        {parentForSelectSpouse && (
          <SelectSpouseForChildModal
            parentPerson={parentForSelectSpouse}
            marriages={marriages
              .filter((m) => m.spouseIds.includes(parentForSelectSpouse.id))
              .sort((a, b) => a.order - b.order)}
            people={people}
            onSelectMarriage={(mId) => {
              setSelectingSpouseForChildParentId(null);
              setAddingChildTargetMarriageId(mId);
            }}
            onAddSpouseFirst={() => {
              const pId = parentForSelectSpouse.id;
              setSelectingSpouseForChildParentId(null);
              setAddingSpouseForPersonId(pId);
            }}
            onCancel={() => setSelectingSpouseForChildParentId(null)}
          />
        )}

        {/* Modal: Downward Expansion (Add Child to specific marriage) */}
        {addingChildTargetMarriageId && (
          <PersonFormModal
            onSubmit={handleSaveChild}
            onCancel={() => setAddingChildTargetMarriageId(null)}
          />
        )}
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