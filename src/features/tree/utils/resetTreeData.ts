import { writeBatch } from "firebase/firestore";
import { marriageDoc, personDoc } from "@/src/lib/queries";
import { db } from "@/src/lib/firebase";
import { Person, Marriage } from "@/src/types/family";

export async function resetTreeData(people: Person[], marriages: Marriage[]): Promise<void> {
  const batch = writeBatch(db);
  for (const p of people) {
    batch.delete(personDoc(p.id));
  }
  for (const m of marriages) {
    batch.delete(marriageDoc(m.id));
  }
  await batch.commit();
}
