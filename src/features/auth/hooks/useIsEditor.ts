"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useAuth } from "./useAuth";

export function useIsEditor() {
  const { user, loading: authLoading } = useAuth();
  const [isEditor, setIsEditor] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkEditor() {
      const familyId = process.env.NEXT_PUBLIC_FAMILY_ID;
      if (!user || !familyId) {
        setIsEditor(false);
        setChecking(false);
        return;
      }

      try {
        const familyRef = doc(db, "families", familyId);
        const familySnap = await getDoc(familyRef);
        const editorEmails: string[] = familySnap.data()?.editorEmails ?? [];
        const userEmail = (user.email ?? "").toLowerCase().trim();

        setIsEditor(editorEmails.some((e) => e.toLowerCase().trim() === userEmail));
      } catch (err) {
        console.error("Failed to verify editor status:", err);
        setIsEditor(false);
      } finally {
        setChecking(false);
      }
    }

    if (!authLoading) {
      checkEditor();
    }
  }, [user, authLoading]);

  return { isEditor, loading: authLoading || checking, user };
}