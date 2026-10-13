"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { peopleCollection } from "../../../lib/queries";
import { Person } from "../../../types/family";

export function usePeople() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      peopleCollection(),
      (snapshot) => {
        setPeople(snapshot.docs.map((doc) => doc.data()));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Failed to load people from Firestore:", err);
        setError(err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  return { people, loading, error };
}