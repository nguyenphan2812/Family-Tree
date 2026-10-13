"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { marriagesCollection } from "../../../lib/queries";
import { Marriage } from "../../../types/family";

export function useMarriages() {
  const [marriages, setMarriages] = useState<Marriage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      marriagesCollection(),
      (snapshot) => {
        setMarriages(snapshot.docs.map((doc) => doc.data()));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Failed to load marriages from Firestore:", err);
        setError(err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  return { marriages, loading, error };
}