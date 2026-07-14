"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { marriagesCollection } from "../../../lib/queries";
import { Marriage } from "../../../types/family";

export function useMarriages() {
  const [marriages, setMarriages] = useState<Marriage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(marriagesCollection(), (snapshot) => {
      setMarriages(snapshot.docs.map((doc) => doc.data()));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { marriages, loading };
}