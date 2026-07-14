"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useAuth } from "./useAuth";

const FAMILY_ID = process.env.NEXT_PUBLIC_FAMILY_ID!;

export function useIsEditor() {
  const { user, loading: authLoading } = useAuth();
  const [isEditor, setIsEditor] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkEditor() {
      if (!user) {
        setIsEditor(false);
        setChecking(false);
        return;
      }

      const familyRef = doc(db, "families", FAMILY_ID);
      const familySnap = await getDoc(familyRef);
      const editorEmails: string[] = familySnap.data()?.editorEmails ?? [];

      setIsEditor(editorEmails.includes(user.email ?? ""));
      setChecking(false);
    }

    if (!authLoading) {
      checkEditor();
    }
  }, [user, authLoading]);

  return { isEditor, loading: authLoading || checking, user };
}