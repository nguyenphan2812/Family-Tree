"use client";

import { useMemo, useState } from "react";
import { useMarriages } from "../hooks/useMarriages";
import { useMarriageMutations } from "../hooks/useMarriageMutations";
import { usePeople } from "../../person/hooks/usePeople";

const UNKNOWN_SPOUSE_VALUE = "__unknown__";

export function AddChildForm() {
  const { people } = usePeople();
  const { marriages } = useMarriages();
  const { createMarriage, addChildToMarriage } = useMarriageMutations();

  const [parentId, setParentId] = useState("");
  const [marriageId, setMarriageId] = useState("");
  const [childId, setChildId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const parentMarriages = useMemo(
    () => marriages.filter((m) => m.spouseIds.includes(parentId)),
    [marriages, parentId]
  );

  function personName(id: string) {
    const p = people.find((p) => p.id === id);
    return p ? `${p.firstName} ${p.lastName}` : "Unknown";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!parentId || !childId || !marriageId) return;

    setSubmitting(true);
    let targetMarriageId = marriageId;

    if (marriageId === UNKNOWN_SPOUSE_VALUE) {
      const order = parentMarriages.length + 1;
      targetMarriageId = await createMarriage({
        spouseIds: [parentId],
        order,
        isPlaceholder: true,
      });
    }

    await addChildToMarriage(targetMarriageId, childId);
    setChildId("");
    setMarriageId("");
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm p-4 border rounded-md">
      <h2 className="font-medium">Add a child</h2>

      <select value={parentId} onChange={(e) => { setParentId(e.target.value); setMarriageId(""); }} className="border rounded px-3 py-2" required>
        <option value="">Select a parent</option>
        {people.map((p) => (
          <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
        ))}
      </select>

      {parentId && (
        <select value={marriageId} onChange={(e) => setMarriageId(e.target.value)} className="border rounded px-3 py-2" required>
          <option value="">Select which union</option>
          {parentMarriages.map((m) => {
            const otherSpouse = m.spouseIds.find((id) => id !== parentId);
            return (
              <option key={m.id} value={m.id}>
                {otherSpouse ? personName(otherSpouse) : "Unknown spouse"} (marriage {m.order})
              </option>
            );
          })}
          <option value={UNKNOWN_SPOUSE_VALUE}>+ New union with unknown spouse</option>
        </select>
      )}

      <select value={childId} onChange={(e) => setChildId(e.target.value)} className="border rounded px-3 py-2" required>
        <option value="">Select the child</option>
        {people.filter((p) => p.id !== parentId).map((p) => (
          <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
        ))}
      </select>

      <button type="submit" disabled={submitting} className="bg-black text-white rounded px-4 py-2 disabled:opacity-50">
        {submitting ? "Adding..." : "Add child"}
      </button>
    </form>
  );
}