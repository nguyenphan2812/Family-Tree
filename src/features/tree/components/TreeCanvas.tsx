"use client";

import { useCallback, useEffect, useState } from "react";
import { Node, Edge, ReactFlow, ReactFlowProvider, Background, Controls, useReactFlow } from "@xyflow/react";
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
import { layoutGraph } from "../utils/layoutGraph";

const nodeTypes = { person: PersonNode, union: UnionNode };

function TreeCanvasInner() {
  const { people, loading: peopleLoading } = usePeople();
  const { marriages } = useMarriages();
  const { addPerson, updatePerson, deletePerson } = usePersonMutations();
  const { createMarriage, addChildToMarriage, removePersonFromAllMarriages } = useMarriageMutations();
  const { isEditor } = useIsEditor();
  const { fitView } = useReactFlow();

  const [pendingSubmit, setPendingSubmit] = useState<((data: PersonFormData) => void) | null>(null);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  useEffect(() => {
    const { nodes: rawNodes, edges: rawEdges } = buildGraph(people, marriages);
    layoutGraph(rawNodes, rawEdges).then((positionedNodes) => {
      setNodes(positionedNodes);
      setEdges(rawEdges);
    });
  }, [people, marriages]);

  useEffect(() => {
    if (nodes.length > 0) {
      const timeout = setTimeout(() => fitView({ padding: 0.4, duration: 400 }), 100);
      return () => clearTimeout(timeout);
    }
  }, [nodes, fitView]);

  const openAddModal = useCallback((onSubmit: (data: PersonFormData) => void) => {
    setPendingSubmit(() => onSubmit);
  }, []);

  const handleModalSubmit = useCallback(
    (data: PersonFormData) => {
      pendingSubmit?.(data);
      setPendingSubmit(null);
    },
    [pendingSubmit]
  );

  const handleAddTree = useCallback(
    async (data: PersonFormData) => {
      await addPerson({ ...data });
    },
    [addPerson]
  );

  const handleAddCard = useCallback(
    async (personId: string, direction: "top" | "bottom" | "left" | "right", data: PersonFormData) => {
      const person = people.find((p) => p.id === personId);

      if (direction === "left" || direction === "right") {
        const newId = await addPerson({ ...data });
        const order = (person?.marriageIds.length ?? 0) + 1;
        await createMarriage({ spouseIds: [personId, newId], order });
      }

      if (direction === "bottom") {
        const existingMarriages = marriages.filter((m) => m.spouseIds.includes(personId));
        let marriageId: string;
        if (existingMarriages.length > 0) {
          marriageId = existingMarriages.sort((a, b) => b.order - a.order)[0].id;
        } else {
          marriageId = await createMarriage({ spouseIds: [personId], order: 1, isPlaceholder: true });
        }
        const newId = await addPerson({ ...data });
        await addChildToMarriage(marriageId, newId);
      }

      if (direction === "top") {
        const newId = await addPerson({ ...data });
        const marriageId = await createMarriage({ spouseIds: [newId], order: 1, isPlaceholder: true });
        await addChildToMarriage(marriageId, personId);
      }
    },
    [people, marriages, addPerson, createMarriage, addChildToMarriage]
  );

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

  const editingPerson = people.find((p) => p.id === editingPersonId);

  if (peopleLoading) return <div style={{ padding: 32, color: "#333" }}>Loading tree...</div>;

  if (people.length === 0) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FFEBCD" }}>
        {isEditor ? (
          <>
            <button
              onClick={() => openAddModal(handleAddTree)}
              style={{ padding: "12px 20px", borderRadius: 8, border: "1px solid #555", background: "#1c1e24", color: "#eee", cursor: "pointer" }}
            >
              + Add tree
            </button>
            {pendingSubmit && <PersonFormModal onSubmit={handleModalSubmit} onCancel={() => setPendingSubmit(null)} />}
          </>
        ) : (
          <p style={{ color: "#888" }}>This family tree hasn&apos;t been started yet.</p>
        )}
      </div>
    );
  }

  return (
    <TreeContext.Provider
      value={{
        isEditor,
        onAddCard: handleAddCard,
        onAddTree: handleAddTree,
        openAddModal,
        onEditPerson: setEditingPersonId,
      }}
    >
      <div style={{ height: "100vh", background: "#FFEBCD" }}>
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes}>
          <Background color="#e8d9bb" gap={22} />
          <Controls />
        </ReactFlow>

        {pendingSubmit && <PersonFormModal onSubmit={handleModalSubmit} onCancel={() => setPendingSubmit(null)} />}

        {editingPerson && (
          <PersonFormModal
            initialData={{
              firstName: editingPerson.firstName,
              lastName: editingPerson.lastName,
              birthDate: editingPerson.birthDate ?? "",
              deathDate: editingPerson.deathDate ?? "",
              gender: editingPerson.gender ?? "male",
              bio: editingPerson.bio ?? "",
            }}
            onSubmit={handleEditSave}
            onCancel={() => setEditingPersonId(null)}
            onDelete={handleEditDelete}
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