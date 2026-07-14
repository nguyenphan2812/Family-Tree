"use client";

import { useState } from "react";
import { usePersonMutations } from "../../person/hooks/usePersonMutations";

export function PersonForm() {
  const { addPerson } = usePersonMutations();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) return;

    setSubmitting(true);
    await addPerson({ firstName, lastName, birthDate, gender });
    setFirstName("");
    setLastName("");
    setBirthDate("");
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm p-4 border rounded-md">
      <h2 className="font-medium">Add a person</h2>

      <input
        placeholder="First name"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        className="border rounded px-3 py-2"
        required
      />

      <input
        placeholder="Last name"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        className="border rounded px-3 py-2"
      />

      <input
        type="date"
        value={birthDate}
        onChange={(e) => setBirthDate(e.target.value)}
        className="border rounded px-3 py-2"
      />

      <select
        value={gender}
        onChange={(e) => setGender(e.target.value as "male" | "female" | "other")}
        className="border rounded px-3 py-2"
      >
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="other">Other</option>
      </select>

      <button
        type="submit"
        disabled={submitting}
        className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
      >
        {submitting ? "Adding..." : "Add person"}
      </button>
    </form>
  );
}