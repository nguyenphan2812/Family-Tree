"use client";

import { doc, writeBatch, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { marriagesCollection, marriageDoc, personDoc } from "@/src/lib/queries";
import { db } from "@/src/lib/firebase";
import { Marriage, MarriageStatus } from "@/src/types/family";

export interface CreateMarriageParams {
  spouseIds: string[];
  order: number;
  orderLabel?: string;
  status?: MarriageStatus;
  date?: string;
  isPlaceholder?: boolean;
  childrenIds?: string[];
  direction?: "left" | "right";
}

export function useMarriageMutations() {
  async function createMarriage(params: CreateMarriageParams) {
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

  async function updateMarriage(marriageId: string, data: Partial<Marriage>) {
    await updateDoc(marriageDoc(marriageId), data);
  }

  // Removes a person from every marriage they're part of (as spouse or child),
  // deleting any marriage that becomes empty of spouses or childless with only 1 spouse.
  async function removePersonFromAllMarriages(
    personId: string,
    allMarriages: { id: string; spouseIds: string[]; childrenIds: string[] }[]
  ) {
    const affected = allMarriages.filter(
      (m) => m.spouseIds.includes(personId) || m.childrenIds.includes(personId)
    );

    if (affected.length === 0) return;

    const batch = writeBatch(db);
    for (const marriage of affected) {
      const newSpouseIds = marriage.spouseIds.filter((id) => id !== personId);
      const newChildrenIds = marriage.childrenIds.filter((id) => id !== personId);

      // If no spouses remain, or if only 1 spouse remains and there are no children,
      // the marriage has no purpose and must be deleted.
      if (newSpouseIds.length === 0 || (newSpouseIds.length < 2 && newChildrenIds.length === 0)) {
        batch.delete(marriageDoc(marriage.id));
        for (const sid of newSpouseIds) {
          batch.update(personDoc(sid), {
            marriageIds: arrayRemove(marriage.id),
          });
        }
      } else {
        batch.update(marriageDoc(marriage.id), {
          spouseIds: newSpouseIds,
          childrenIds: newChildrenIds,
          isPlaceholder: false,
        });
      }
    }
    await batch.commit();
  }

  // Deletes a specific marriage and removes its ID from any spouse documents.
  async function deleteMarriage(
    marriageId: string,
    currentMarriages: { id: string; spouseIds: string[] }[] = []
  ) {
    const target = currentMarriages.find((m) => m.id === marriageId);
    const batch = writeBatch(db);
    batch.delete(marriageDoc(marriageId));
    if (target) {
      for (const sid of target.spouseIds) {
        batch.update(personDoc(sid), {
          marriageIds: arrayRemove(marriageId),
        });
      }
    }
    await batch.commit();
  }

  return {
    createMarriage,
    addSpouseToMarriage,
    addChildToMarriage,
    updateMarriage,
    removePersonFromAllMarriages,
    deleteMarriage,
  };
}