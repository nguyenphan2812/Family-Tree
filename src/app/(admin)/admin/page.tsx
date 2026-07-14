"use client";

import { useIsEditor } from "../../../features/auth/hooks/useIsEditor";
import { GoogleSignInButton } from "../../../features/auth/components/GoogleSignInButton";

export default function AdminPage() {
  const { isEditor, loading, user } = useIsEditor();

  if (loading) {
    return <div className="p-8">Checking access...</div>;
  }

  if (!user) {
    return (
      <div className="p-8 flex flex-col items-center gap-4">
        <p>Sign in to manage the family tree.</p>
        <GoogleSignInButton />
      </div>
    );
  }

  if (!isEditor) {
    return (
      <div className="p-8">
        <p>You&apos;re signed in as {user.email}, but this account isn&apos;t approved to edit the tree yet.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-medium mb-4">Admin dashboard</h1>
      <p>Signed in as {user.email} — you have edit access.</p>
      {/* Person/marriage management UI goes here in later steps */}
    </div>
  );
}