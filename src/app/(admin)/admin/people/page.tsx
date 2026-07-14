"use client";

import { GoogleSignInButton } from "@/src/features/auth/components/GoogleSignInButton";
import { useIsEditor } from "@/src/features/auth/hooks/useIsEditor";
import { PersonForm } from "@/src/features/auth/components/PersonForm";
import { PersonList } from "@/src/features/auth/components/PersonList";

export default function ManagePeoplePage() {
  const { isEditor, loading, user } = useIsEditor();

  if (loading) return <div className="p-8">Checking access...</div>;
  if (!user) {
    return (
      <div className="p-8 flex flex-col items-center gap-4">
        <p>Sign in to manage the family tree.</p>
        <GoogleSignInButton />
      </div>
    );
  }
  if (!isEditor) {
    return <div className="p-8">You don&apos;t have edit access on this account.</div>;
  }

  return (
    <div className="p-8 flex flex-col gap-8">
      <h1 className="text-2xl font-medium">Manage people</h1>
      <PersonForm />
      <PersonList />
    </div>
  );
}