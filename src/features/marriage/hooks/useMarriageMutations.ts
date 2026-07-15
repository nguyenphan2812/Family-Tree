"use client";

import { addDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { marriagesCollection, marriageDoc, personDoc } from "@/src/lib/queries";
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

  // Removes a person from every marriage they're part of (as spouse or child),
  // deleting any marriage that becomes fully empty as a result.
  async function removePersonFromAllMarriages(personId: string, allMarriages: { id: string; spouseIds: string[]; childrenIds: string[] }[]) {
    const affected = allMarriages.filter(
      (m) => m.spouseIds.includes(personId) || m.childrenIds.includes(personId)
    );

    for (const marriage of affected) {
      const newSpouseIds = marriage.spouseIds.filter((id) => id !== personId);
      const newChildrenIds = marriage.childrenIds.filter((id) => id !== personId);

      if (newSpouseIds.length === 0 && newChildrenIds.length === 0) {
        await deleteDoc(marriageDoc(marriage.id));
      } else {
        await updateDoc(marriageDoc(marriage.id), {
          spouseIds: newSpouseIds,
          childrenIds: newChildrenIds,
        });
      }
    }
  }

  return { createMarriage, addChildToMarriage, deleteMarriage, removePersonFromAllMarriages };
}