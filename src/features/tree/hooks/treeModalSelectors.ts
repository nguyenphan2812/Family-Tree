import { Node } from "@xyflow/react";
import { Person, Marriage } from "@/src/types/family";

export interface ModalSelectorsParams {
  people: Person[];
  marriages: Marriage[];
  graphNodes: Node[];
  personGenerations: Map<string, number>;
  editingPersonId: string | null;
  viewingPersonId: string | null;
  addingParentForChildId: string | null;
  addingSpouseForPersonId: string | null;
  selectingSpouseForChildParentId: string | null;
  addingChildTargetMarriageId: string | null;
}

export function selectModalEntities({
  people,
  marriages,
  graphNodes,
  personGenerations,
  editingPersonId,
  viewingPersonId,
  addingParentForChildId,
  addingSpouseForPersonId,
  selectingSpouseForChildParentId,
  addingChildTargetMarriageId,
}: ModalSelectorsParams) {
  const editingPerson = editingPersonId
    ? people.find((p) => p.id === editingPersonId) ||
      (graphNodes.find((n) => n.id === editingPersonId)?.data?.person as Person | undefined)
    : undefined;

  const viewingPerson = viewingPersonId
    ? people.find((p) => p.id === viewingPersonId) ||
      (graphNodes.find((n) => n.id === viewingPersonId)?.data?.person as Person | undefined)
    : undefined;

  const viewingPersonGeneration = viewingPersonId
    ? personGenerations.get(viewingPersonId)
    : undefined;

  const childPersonForAddParent = people.find((p) => p.id === addingParentForChildId);
  const parentForAddSpouse = people.find((p) => p.id === addingSpouseForPersonId);
  const parentForSelectSpouse = people.find((p) => p.id === selectingSpouseForChildParentId);

  const existingParentMarriage = addingParentForChildId
    ? marriages.find((m) => m.childrenIds.includes(addingParentForChildId))
    : undefined;

  const targetMarriageForAddChild = addingChildTargetMarriageId
    ? marriages.find((m) => m.id === addingChildTargetMarriageId) ?? null
    : null;

  let childTargetParentsSummary = "";
  if (targetMarriageForAddChild) {
    const parentPersons = targetMarriageForAddChild.spouseIds
      .map((id) => people.find((p) => p.id === id))
      .filter((p): p is Person => Boolean(p));
    if (parentPersons.length > 0) {
      childTargetParentsSummary = `Con của: ${parentPersons.map((p) => `${p.firstName} ${p.lastName}`).join(" & ")}`;
    }
  }

  const childTargetDefaultOrder = targetMarriageForAddChild
    ? targetMarriageForAddChild.childrenIds.length + 1
    : 1;

  return {
    editingPerson,
    viewingPerson,
    viewingPersonGeneration,
    childPersonForAddParent,
    parentForAddSpouse,
    parentForSelectSpouse,
    existingParentMarriage,
    targetMarriageForAddChild,
    childTargetParentsSummary,
    childTargetDefaultOrder,
  };
}
