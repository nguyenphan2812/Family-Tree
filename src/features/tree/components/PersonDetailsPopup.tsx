"use client";

import { Person } from "@/src/types/family";

function formatDate(d?: string) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function PersonDetailsPopup({ person }: { person: Person }) {
  const birth = formatDate(person.birthDate);
  const death = formatDate(person.deathDate);

  return (
    <div
      style={{
        position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
        marginTop: 10, width: 200, background: "#1c1e24", border: "1px solid #3a3c42",
        borderRadius: 10, padding: 12, color: "#eee", fontSize: 12, zIndex: 20,
        pointerEvents: "none", textAlign: "left",
      }}
    >
      <div style={{ fontWeight: 500, marginBottom: 4 }}>{person.firstName} {person.lastName}</div>
      {(birth || death) && (
        <div style={{ color: "#999", marginBottom: 4 }}>
          {birth ?? "?"} {(birth || death) && "–"} {death ?? (person.deathDate === undefined ? "" : "?")}
        </div>
      )}
      {person.gender && <div style={{ color: "#999", marginBottom: 4, textTransform: "capitalize" }}>{person.gender}</div>}
      {person.bio && <div style={{ color: "#ccc", marginTop: 6 }}>{person.bio}</div>}
    </div>
  );
}