"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { peopleCollection } from "../../../lib/queries";
import { Person } from "../../../types/family";

export function usePeople() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(peopleCollection(), (snapshot) => {
      setPeople(snapshot.docs.map((doc) => doc.data()));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { people, loading };
}