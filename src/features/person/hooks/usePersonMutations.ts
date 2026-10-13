"use client";

import { addDoc, deleteDoc, updateDoc, deleteField } from "firebase/firestore";
import { peopleCollection, personDoc } from "@/src/lib/queries";
import { Person } from "@/src/types/family";
import { useAuth } from "@/src/features/auth/hooks/useAuth";

type NewPerson = Omit<Person, "id" | "marriageIds" | "createdBy" | "createdAt" | "updatedAt">;

export function usePersonMutations() {
  const { user } = useAuth();

  async function addPerson(data: NewPerson) {
    const docRef = await addDoc(peopleCollection(), {
      ...data,
      id: "",
      marriageIds: [],
      createdBy: user?.email ?? "unknown",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return docRef.id;
  }

  async function updatePerson(personId: string, data: Partial<Person>) {
    const cleanData: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    for (const [key, value] of Object.entries(data)) {
      if (key === "id") continue;
      if (value === undefined) {
        cleanData[key] = deleteField();
      } else {
        cleanData[key] = value;
      }
    }

    await updateDoc(personDoc(personId), cleanData);
  }

  async function deletePerson(personId: string) {
    await deleteDoc(personDoc(personId));
  }

  return { addPerson, updatePerson, deletePerson };
}