"use client";

import { useAuth } from "../hooks/useAuth";

export function GoogleSignInButton() {
  const { signIn } = useAuth();

  return (
    <button
      onClick={() => signIn()}
      className="px-4 py-2 border rounded-md hover:bg-gray-50 transition"
    >
      Sign in with Google
    </button>
  );
}