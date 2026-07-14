"use client";

import { addDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { marriagesCollection, marriageDoc, personDoc } from "../../../lib/queries";
import { MarriageStatus } from "@/src/types/family";

export function useMarriageMutations() {
  async function createMarriage(params: {
    spouseIds: string[];
    order: number;
    status?: MarriageStatus;
    date?: string;
    isPlaceholder?: boolean;
  }) {
    const { spouseIds, order, status = "married", date, isPlaceholder = false } = params;

    const docRef = await addDoc(marriagesCollection(), {
      id: "",
      spouseIds,
      order,
      status,
      date,
      childrenIds: [],
      isPlaceholder,
    });

    await Promise.all(
      spouseIds.map((personId) =>
        updateDoc(personDoc(personId), { marriageIds: arrayUnion(docRef.id) })
      )
    );

    return docRef.id;
  }

  async function addChildToMarriage(marriageId: string, childId: string) {
    await updateDoc(marriageDoc(marriageId), {
      childrenIds: arrayUnion(childId),
    });
  }

  async function deleteMarriage(marriageId: string, spouseIds: string[]) {
    await Promise.all(
      spouseIds.map((personId) =>
        updateDoc(personDoc(personId), { marriageIds: arrayRemove(marriageId) })
      )
    );
    await deleteDoc(marriageDoc(marriageId));
  }

  return { createMarriage, addChildToMarriage, deleteMarriage };
}