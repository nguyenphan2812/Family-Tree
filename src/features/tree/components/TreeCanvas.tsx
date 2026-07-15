"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ReactFlow, ReactFlowProvider, Background, Controls, useReactFlow } from "@xyflow/react";
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
import { SpouseStackNode } from "./SpouseStackNode";

const nodeTypes = { person: PersonNode, union: UnionNode, spouseStack: SpouseStackNode };

function TreeCanvasInner() {
  const { people, loading: peopleLoading } = usePeople();
  const { marriages } = useMarriages();
  const { addPerson, updatePerson, deletePerson } = usePersonMutations();
  const { createMarriage, addChildToMarriage, removePersonFromAllMarriages } = useMarriageMutations();
  const { isEditor } = useIsEditor();
  const { fitView } = useReactFlow();

  const [pendingSubmit, setPendingSubmit] = useState<((data: PersonFormData) => void) | null>(null);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);

  const { nodes, edges } = useMemo(() => buildGraph(people, marriages), [people, marriages]);

  useEffect(() => {
    if (nodes.length > 0) {
      const timeout = setTimeout(() => fitView({ padding: 0.4, duration: 400 }), 50);
      return () => clearTimeout(timeout);
    }
  }, [nodes.length, fitView]);

  const openAddModal = useCallback((onSubmit: (data: PersonFormData) => void) => {
    setPendingSubmit(() => onSubmit);
  }, []);

  const handleExpandStack = useCallback((personId: string) => {
    // Placeholder callback for expanding spouse stacks in the tree context.
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
      await addPerson({ ...data, position: { x: 0, y: 0 } });
    },
    [addPerson]
  );

  const handleAddCard = useCallback(
    async (personId: string, direction: "top" | "bottom" | "left" | "right", data: PersonFormData) => {
      const person = people.find((p) => p.id === personId);
      const basePos = person?.position ?? { x: 0, y: 0 };

      if (direction === "left" || direction === "right") {
        const offset = direction === "right" ? 240 : -240;
        const newId = await addPerson({ ...data, position: { x: basePos.x + offset, y: basePos.y } });
        const order = (person?.marriageIds.length ?? 0) + 1;
        await createMarriage({ spouseIds: [personId, newId], order });
      }

      if (direction === "bottom") {
        const existingMarriages = marriages.filter((m) => m.spouseIds.includes(personId));
        let marriageId: string;
        let childCount = 0;
        if (existingMarriages.length > 0) {
          const latest = existingMarriages.sort((a, b) => b.order - a.order)[0];
          marriageId = latest.id;
          childCount = latest.childrenIds.length;
        } else {
          marriageId = await createMarriage({ spouseIds: [personId], order: 1, isPlaceholder: true });
        }
        const newId = await addPerson({ ...data, position: { x: basePos.x + childCount * 160, y: basePos.y + 180 } });
        await addChildToMarriage(marriageId, newId);
      }

      if (direction === "top") {
        const newId = await addPerson({ ...data, position: { x: basePos.x, y: basePos.y - 180 } });
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
        onExpandStack: handleExpandStack,
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