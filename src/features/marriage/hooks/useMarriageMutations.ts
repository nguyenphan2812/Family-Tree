"use client";

import { doc, writeBatch, updateDoc, arrayUnion } from "firebase/firestore";
import { marriagesCollection, marriageDoc, personDoc } from "@/src/lib/queries";
import { db } from "@/src/lib/firebase";
import { MarriageStatus } from "@/src/types/family";

export function useMarriageMutations() {
  async function createMarriage(params: {
    spouseIds: string[];
    order: number;
    orderLabel?: string;
    status?: MarriageStatus;
    date?: string;
    isPlaceholder?: boolean;
    childrenIds?: string[];
    direction?: "left" | "right";
  }) {
    const {
      spouseIds,
      order,
      orderLabel,
      status = "married",
      date,
      isPlaceholder = false,
      childrenIds = [],
      direction = "right",
    } = params;

    const marriageRef = doc(marriagesCollection());
    const batch = writeBatch(db);

    batch.set(marriageRef, {
      id: marriageRef.id,
      spouseIds,
      order,
      orderLabel,
      status,
      date,
      childrenIds,
      isPlaceholder,
      direction,
    });

    for (const personId of spouseIds) {
      batch.update(personDoc(personId), { marriageIds: arrayUnion(marriageRef.id) });
    }

    await batch.commit();
    return marriageRef.id;
  }

  async function addSpouseToMarriage(marriageId: string, spouseId: string) {
    const batch = writeBatch(db);
    batch.update(marriageDoc(marriageId), {
      spouseIds: arrayUnion(spouseId),
      isPlaceholder: false,
    });
    batch.update(personDoc(spouseId), {
      marriageIds: arrayUnion(marriageId),
    });
    await batch.commit();
  }

  async function addChildToMarriage(marriageId: string, childId: string) {
    await updateDoc(marriageDoc(marriageId), {
      childrenIds: arrayUnion(childId),
    });
  }

  // Removes a person from every marriage they're part of (as spouse or child),
  // deleting any marriage that becomes empty of spouses as a result.
  async function removePersonFromAllMarriages(personId: string, allMarriages: { id: string; spouseIds: string[]; childrenIds: string[] }[]) {
    const affected = allMarriages.filter(
      (m) => m.spouseIds.includes(personId) || m.childrenIds.includes(personId)
    );

    if (affected.length === 0) return;

    const batch = writeBatch(db);
    for (const marriage of affected) {
      const newSpouseIds = marriage.spouseIds.filter((id) => id !== personId);
      const newChildrenIds = marriage.childrenIds.filter((id) => id !== personId);

      // If no spouses remain, the marriage no longer has parents and must be deleted.
      // (Children remain intact in the tree as independent people without parents).
      if (newSpouseIds.length === 0) {
        batch.delete(marriageDoc(marriage.id));
      } else {
        batch.update(marriageDoc(marriage.id), {
          spouseIds: newSpouseIds,
          childrenIds: newChildrenIds,
        });
      }
    }
    await batch.commit();
  }

  return {
    createMarriage,
    addSpouseToMarriage,
    addChildToMarriage,
    removePersonFromAllMarriages,
  };
}