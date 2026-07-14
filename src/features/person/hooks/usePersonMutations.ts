"use client";

import { addDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { peopleCollection, personDoc } from "../../../lib/queries";
import { Person } from "../../../types/family";
import { useAuth } from "../../../features/auth/hooks/useAuth";

type NewPerson = Omit<Person, "id" | "marriageIds" | "createdBy" | "createdAt" | "updatedAt">;

export function usePersonMutations() {
  const { user } = useAuth();

  async function addPerson(data: NewPerson) {
    const docRef = await addDoc(peopleCollection(), {
      ...data,
      id: "", // overwritten by converter/Firestore doc id; not stored
      marriageIds: [],
      createdBy: user?.email ?? "unknown",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return docRef.id;
  }

  async function updatePerson(personId: string, data: Partial<Person>) {
    await updateDoc(personDoc(personId), {
      ...data,
      updatedAt: Date.now(),
    });
  }

  async function deletePerson(personId: string) {
    await deleteDoc(personDoc(personId));
  }

  return { addPerson, updatePerson, deletePerson };
}