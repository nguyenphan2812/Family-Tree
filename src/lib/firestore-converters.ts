import { FirestoreDataConverter, QueryDocumentSnapshot } from "firebase/firestore";
import { Marriage, Person } from "../types/family";

function removeUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

export const personConverter: FirestoreDataConverter<Person> = {
  toFirestore(person: Person) {
    return removeUndefined({
      firstName: person.firstName,
      lastName: person.lastName,
      birthDate: person.birthDate,
      deathDate: person.deathDate,
      gender: person.gender,
      photoURL: person.photoURL,
      bio: person.bio,
      marriageIds: person.marriageIds,
      position: person.position,
      createdBy: person.createdBy,
      createdAt: person.createdAt,
      updatedAt: person.updatedAt,
    });
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Person {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      firstName: data.firstName,
      lastName: data.lastName,
      birthDate: data.birthDate,
      deathDate: data.deathDate,
      gender: data.gender,
      photoURL: data.photoURL,
      bio: data.bio,
      marriageIds: data.marriageIds ?? [],
      position: data.position,
      createdBy: data.createdBy,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },
};

export const marriageConverter: FirestoreDataConverter<Marriage> = {
  toFirestore(marriage: Marriage) {
    return removeUndefined({
      spouseIds: marriage.spouseIds,
      order: marriage.order,
      status: marriage.status,
      date: marriage.date,
      childrenIds: marriage.childrenIds,
      isPlaceholder: marriage.isPlaceholder,
    });
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Marriage {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      spouseIds: data.spouseIds ?? [],
      order: data.order ?? 1,
      status: data.status ?? "unknown",
      date: data.date,
      childrenIds: data.childrenIds ?? [],
      isPlaceholder: data.isPlaceholder ?? false,
    };
  },
};