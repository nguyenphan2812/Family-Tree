"use client";

import { useState } from "react";

export interface PersonFormData {
  firstName: string;
  lastName: string;
  birthDate: string;
  deathDate: string;
  gender: "male" | "female" | "other";
  bio: string;
}

interface Props {
  initialData?: PersonFormData;
  onSubmit: (data: PersonFormData) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function PersonFormModal({ initialData, onSubmit, onCancel, onDelete }: Props) {
  const [firstName, setFirstName] = useState(initialData?.firstName ?? "");
  const [lastName, setLastName] = useState(initialData?.lastName ?? "");
  const [birthDate, setBirthDate] = useState(initialData?.birthDate ?? "");
  const [deathDate, setDeathDate] = useState(initialData?.deathDate ?? "");
  const [gender, setGender] = useState<"male" | "female" | "other">(initialData?.gender ?? "male");
  const [bio, setBio] = useState(initialData?.bio ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) return;
    onSubmit({ firstName, lastName, birthDate, deathDate, gender, bio });
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1c1e24", border: "1px solid #3a3c42", borderRadius: 12,
          padding: 24, width: 320, display: "flex", flexDirection: "column", gap: 12,
        }}
      >
        <h2 style={{ color: "#eee", fontSize: 16, fontWeight: 500 }}>
          {initialData ? "Edit person" : "Add person"}
        </h2>

        <input placeholder="First name" value={firstName} autoFocus onChange={(e) => setFirstName(e.target.value)} style={inputStyle} required />
        <input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} style={inputStyle} />

        <label style={labelStyle}>Date of birth</label>
        <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} style={inputStyle} />

        <label style={labelStyle}>Date of death (if applicable)</label>
        <input type="date" value={deathDate} onChange={(e) => setDeathDate(e.target.value)} style={inputStyle} />

        <select value={gender} onChange={(e) => setGender(e.target.value as "male" | "female" | "other")} style={inputStyle}>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>

        <textarea placeholder="Bio / notes" value={bio} onChange={(e) => setBio(e.target.value)} style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} />

        {!confirmingDelete ? (
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="button" onClick={onCancel} style={{ ...buttonStyle, background: "transparent", border: "1px solid #555", color: "#eee" }}>
              Cancel
            </button>
            <button type="submit" style={{ ...buttonStyle, background: "#eee", color: "#111" }}>
              {initialData ? "Save" : "Add"}
            </button>
          </div>
        ) : null}

        {initialData && onDelete && !confirmingDelete && (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            style={{ background: "transparent", border: "none", color: "#e07a7a", fontSize: 12, cursor: "pointer", marginTop: 4 }}
          >
            Delete this person
          </button>
        )}

        {confirmingDelete && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
            <p style={{ color: "#e07a7a", fontSize: 12 }}>
              This removes them from the tree and any marriages they&apos;re part of. This can&apos;t be undone.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setConfirmingDelete(false)} style={{ ...buttonStyle, background: "transparent", border: "1px solid #555", color: "#eee" }}>
                Cancel
              </button>
              <button type="button" onClick={onDelete} style={{ ...buttonStyle, background: "#e07a7a", color: "#111" }}>
                Confirm delete
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#111318", border: "1px solid #3a3c42", borderRadius: 8,
  color: "#eee", padding: "8px 10px", fontSize: 13,
};

const labelStyle: React.CSSProperties = { color: "#999", fontSize: 12, marginBottom: -6 };

const buttonStyle: React.CSSProperties = {
  flex: 1, borderRadius: 8, padding: "8px 0", fontSize: 13, cursor: "pointer",
};