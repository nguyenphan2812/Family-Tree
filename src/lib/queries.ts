import { collection, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { personConverter, marriageConverter } from "../lib/firestore-converters";

function getFamilyId(): string {
  const familyId = process.env.NEXT_PUBLIC_FAMILY_ID;
  if (!familyId) {
    throw new Error(
      "NEXT_PUBLIC_FAMILY_ID is not defined in environment variables. Please check your .env.local file."
    );
  }
  return familyId;
}

export function peopleCollection() {
  return collection(db, "families", getFamilyId(), "people").withConverter(personConverter);
}

export function marriagesCollection() {
  return collection(db, "families", getFamilyId(), "marriages").withConverter(marriageConverter);
}

export function personDoc(personId: string) {
  return doc(db, "families", getFamilyId(), "people", personId).withConverter(personConverter);
}

export function marriageDoc(marriageId: string) {
  return doc(db, "families", getFamilyId(), "marriages", marriageId).withConverter(marriageConverter);
}