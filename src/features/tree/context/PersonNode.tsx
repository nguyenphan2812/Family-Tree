"use client";

import { useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { useTreeContext } from "../context/TreeContext";
import { Person } from "@/src/types/family";
import { PersonDetailsPopup } from "../components/PersonDetailsPopup";

export function PersonNode({ id, data }: NodeProps) {
  const { isEditor, onAddCard, openAddModal, onEditPerson } = useTreeContext();
  const [hovered, setHovered] = useState(false);
  const person = data.person as Person;

  const handleStyle = { opacity: 0, width: 1, height: 1 };

  function triggerAdd(e: React.MouseEvent, direction: "top" | "bottom" | "left" | "right") {
    e.stopPropagation();
    openAddModal((formData) => onAddCard(id, direction, formData));
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => isEditor && onEditPerson(id)}
      style={{
        position: "relative", width: 72, height: 72, borderRadius: "50%",
        background: "#1c1e24", border: "1.5px solid #6b6f7a",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#eee", fontSize: 11, textAlign: "center", padding: 4,
        cursor: isEditor ? "pointer" : "default",
      }}
    >
      <Handle type="target" position={Position.Top} id="top" style={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={handleStyle} />
      <Handle type="source" position={Position.Left} id="left" style={handleStyle} />
      <Handle type="source" position={Position.Right} id="right" style={handleStyle} />

      <span>{person.firstName} {person.lastName}</span>

      {hovered && <PersonDetailsPopup person={person} />}

      {isEditor && hovered && (
        <>
          <PlusButton style={{ top: -14, left: "50%", transform: "translateX(-50%)" }} onClick={(e) => triggerAdd(e, "top")} />
          <PlusButton style={{ bottom: -14, left: "50%", transform: "translateX(-50%)" }} onClick={(e) => triggerAdd(e, "bottom")} />
          <PlusButton style={{ left: -14, top: "50%", transform: "translateY(-50%)" }} onClick={(e) => triggerAdd(e, "left")} />
          <PlusButton style={{ right: -14, top: "50%", transform: "translateY(-50%)" }} onClick={(e) => triggerAdd(e, "right")} />
        </>
      )}
    </div>
  );
}

function PlusButton({ style, onClick }: { style: React.CSSProperties; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: "absolute", width: 22, height: 22, borderRadius: "50%",
        background: "#333", color: "#fff", border: "1px solid #777",
        fontSize: 14, lineHeight: 1, cursor: "pointer", ...style,
      }}
    >
      +
    </button>
  );
}