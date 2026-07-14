"use client";

import { useState } from "react";
import { useMarriageMutations } from "../hooks/useMarriageMutations";
import { MarriageStatus } from "@/src/types/family";
import { usePeople } from "../../person/hooks/usePeople";

export function MarriageForm() {
  const { people } = usePeople();
  const { createMarriage } = useMarriageMutations();
  const [personAId, setPersonAId] = useState("");
  const [personBId, setPersonBId] = useState("");
  const [status, setStatus] = useState<MarriageStatus>("married");
  const [date, setDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!personAId || !personBId || personAId === personBId) return;

    const personA = people.find((p) => p.id === personAId);
    const order = (personA?.marriageIds.length ?? 0) + 1;

    setSubmitting(true);
    await createMarriage({
      spouseIds: [personAId, personBId],
      order,
      status,
      date: date || undefined,
    });
    setPersonAId("");
    setPersonBId("");
    setDate("");
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm p-4 border rounded-md">
      <h2 className="font-medium">Link a marriage</h2>

      <select value={personAId} onChange={(e) => setPersonAId(e.target.value)} className="border rounded px-3 py-2" required>
        <option value="">Select spouse 1</option>
        {people.map((p) => (
          <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
        ))}
      </select>

      <select value={personBId} onChange={(e) => setPersonBId(e.target.value)} className="border rounded px-3 py-2" required>
        <option value="">Select spouse 2</option>
        {people.filter((p) => p.id !== personAId).map((p) => (
          <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
        ))}
      </select>

      <select value={status} onChange={(e) => setStatus(e.target.value as MarriageStatus)} className="border rounded px-3 py-2">
        <option value="married">Married</option>
        <option value="divorced">Divorced</option>
        <option value="widowed">Widowed</option>
      </select>

      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded px-3 py-2" />

      <button type="submit" disabled={submitting} className="bg-black text-white rounded px-4 py-2 disabled:opacity-50">
        {submitting ? "Linking..." : "Link marriage"}
      </button>
    </form>
  );
}