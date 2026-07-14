import { collection, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { personConverter, marriageConverter } from "../lib/firestore-converters";

const FAMILY_ID = process.env.NEXT_PUBLIC_FAMILY_ID!;

export function peopleCollection() {
  return collection(db, "families", FAMILY_ID, "people").withConverter(personConverter);
}

export function marriagesCollection() {
  return collection(db, "families", FAMILY_ID, "marriages").withConverter(marriageConverter);
}

export function personDoc(personId: string) {
  return doc(db, "families", FAMILY_ID, "people", personId).withConverter(personConverter);
}

export function marriageDoc(marriageId: string) {
  return doc(db, "families", FAMILY_ID, "marriages", marriageId).withConverter(marriageConverter);
}