"use client";

import { useState, useMemo, useCallback } from "react";
import { Node } from "@xyflow/react";
import { Person, Marriage } from "@/src/types/family";
import { PersonFormData } from "../components/PersonFormModal";
import { CreateMarriageParams } from "@/src/features/marriage/hooks/useMarriageMutations";
import { resetTreeData } from "../utils/resetTreeData";
import { selectModalEntities } from "./treeModalSelectors";

export interface UseTreeModalsProps {
  people: Person[];
  marriages: Marriage[];
  graphNodes: Node[];
  personGenerations: Map<string, number>;
  isEditor: boolean;
  addPerson: (data: PersonFormData) => Promise<string>;
  updatePerson: (id: string, data: Partial<PersonFormData>) => Promise<void>;
  deletePerson: (id: string) => Promise<void>;
  createMarriage: (data: CreateMarriageParams) => Promise<string>;
  addChildToMarriage: (marriageId: string, childId: string) => Promise<void>;
  addSpouseToMarriage: (marriageId: string, spouseId: string) => Promise<void>;
  removePersonFromAllMarriages: (personId: string, currentMarriages: Marriage[]) => Promise<void>;
  deleteMarriage: (marriageId: string, currentMarriages: Marriage[]) => Promise<void>;
  updateMarriage?: (marriageId: string, data: Partial<Marriage>) => Promise<void>;
  onResetComplete?: () => void;
}

export function useTreeModals({
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
  onResetComplete,
}: UseTreeModalsProps) {
  // Modal states
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [viewingPersonId, setViewingPersonId] = useState<string | null>(null);
  const [addingParentForChildId, setAddingParentForChildId] = useState<string | null>(null);
  const [addingSpouseForPersonId, setAddingSpouseForPersonId] = useState<string | null>(null);
  const [addingSpouseDirection, setAddingSpouseDirection] = useState<"left" | "right">("right");
  const [selectingSpouseForChildParentId, setSelectingSpouseForChildParentId] = useState<string | null>(null);
  const [addingChildTargetMarriageId, setAddingChildTargetMarriageId] = useState<string | null>(null);
  const [isAddingRootTree, setIsAddingRootTree] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showManageEditors, setShowManageEditors] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

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
        const missingSpouseId = fatherId || motherId;
        if (missingSpouseId) {
          await addSpouseToMarriage(data.existingMarriageId, missingSpouseId);
        }
      } else {
        const spouseIds = [fatherId, motherId].filter(Boolean) as string[];
        await createMarriage({
          spouseIds,
          order: 1,
          childrenIds: [addingParentForChildId],
          isPlaceholder: false,
        });
      }

      setAddingParentForChildId(null);
    },
    [addingParentForChildId, addPerson, addSpouseToMarriage, createMarriage]
  );

  // 2. Sideways Expansion: Thêm Phối ngẫu (Vợ / Chồng)
  const handleOpenAddSpouse = useCallback((personId: string, direction: "left" | "right" = "right") => {
    setAddingSpouseForPersonId(personId);
    setAddingSpouseDirection(direction);
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
        spouseLabel: data.orderLabel || undefined,
      });

      await createMarriage({
        spouseIds: [addingSpouseForPersonId, newSpouseId],
        order: data.order,
        orderLabel: data.orderLabel || undefined,
        direction: addingSpouseDirection,
      });

      setAddingSpouseForPersonId(null);
    },
    [addingSpouseForPersonId, addingSpouseDirection, addPerson, createMarriage]
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
        createMarriage({
          spouseIds: [parentPersonId],
          order: 1,
          isPlaceholder: false,
        }).then((newMId: string) => {
          setAddingChildTargetMarriageId(newMId);
        });
      } else if (personMarriages.length === 1) {
        setAddingChildTargetMarriageId(personMarriages[0].id);
      } else {
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

  const entities = useMemo(
    () => selectModalEntities({
      people, marriages, graphNodes, personGenerations,
      editingPersonId, viewingPersonId, addingParentForChildId,
      addingSpouseForPersonId, selectingSpouseForChildParentId, addingChildTargetMarriageId,
    }),
    [
      people, marriages, graphNodes, personGenerations,
      editingPersonId, viewingPersonId, addingParentForChildId,
      addingSpouseForPersonId, selectingSpouseForChildParentId, addingChildTargetMarriageId,
    ]
  );

  const handleEditSave = useCallback(
    async (data: PersonFormData) => {
      if (!editingPersonId) return;
      if (editingPersonId.startsWith("placeholder-spouse-")) {
        const marriageId = editingPersonId.replace("placeholder-spouse-", "");
        const newPersonId = await addPerson({
          ...data,
          spouseLabel: data.spouseLabel || entities.editingPerson?.spouseLabel,
        });
        await addSpouseToMarriage(marriageId, newPersonId);
      } else {
        await updatePerson(editingPersonId, data);
      }
      setEditingPersonId(null);
    },
    [editingPersonId, entities.editingPerson, addPerson, addSpouseToMarriage, updatePerson]
  );

  const handleEditDelete = useCallback(async () => {
    if (!editingPersonId) return;
    if (editingPersonId.startsWith("placeholder-spouse-")) {
      const marriageId = editingPersonId.replace("placeholder-spouse-", "");
      const target = marriages.find((m) => m.id === marriageId);
      if (target && target.childrenIds.length > 0 && updateMarriage) {
        await updateMarriage(marriageId, { isPlaceholder: false });
      } else {
        await deleteMarriage(marriageId, marriages);
      }
    } else {
      await removePersonFromAllMarriages(editingPersonId, marriages);
      await deletePerson(editingPersonId);
    }
    setEditingPersonId(null);
  }, [editingPersonId, marriages, updateMarriage, deleteMarriage, removePersonFromAllMarriages, deletePerson]);

  // Root Tree Add
  const handleAddTree = useCallback(
    async (data: PersonFormData) => {
      await addPerson({ ...data });
      setIsAddingRootTree(false);
    },
    [addPerson]
  );

  // Reset / Clear all data
  const handleResetAllData = useCallback(async () => {
    if (!isEditor) return;
    setIsResetting(true);
    try {
      await resetTreeData(people, marriages);
      setShowConfirmReset(false);
      onResetComplete?.();
    } catch (err) {
      console.error("Failed to reset tree data:", err);
    } finally {
      setIsResetting(false);
    }
  }, [isEditor, people, marriages, onResetComplete]);

  return {
    editingPersonId,
    setEditingPersonId,
    viewingPersonId,
    setViewingPersonId,
    addingParentForChildId,
    setAddingParentForChildId,
    addingSpouseForPersonId,
    setAddingSpouseForPersonId,
    addingSpouseDirection,
    selectingSpouseForChildParentId,
    setSelectingSpouseForChildParentId,
    addingChildTargetMarriageId,
    setAddingChildTargetMarriageId,
    isAddingRootTree,
    setIsAddingRootTree,
    showConfirmReset,
    setShowConfirmReset,
    showManageEditors,
    setShowManageEditors,
    isResetting,
    handleOpenAddParent,
    handleSaveParent,
    handleOpenAddSpouse,
    handleSaveSpouse,
    handleOpenAddChildToMarriage,
    handleOpenAddChildToPerson,
    handleSaveChild,
    handleEditSave,
    handleEditDelete,
    handleAddTree,
    handleResetAllData,
    ...entities,
  };
}

export type UseTreeModalsResult = ReturnType<typeof useTreeModals>;
