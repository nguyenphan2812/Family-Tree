"use client";

import { useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { useTreeContext } from "./TreeContext";
import { Person } from "@/src/types/family";
import { PersonDetailsPopup } from "../components/PersonDetailsPopup";
import { PERSON_NODE_WIDTH, PERSON_NODE_HEIGHT } from "../utils/layoutGraph";

export function PersonNode({ id, data }: NodeProps) {
  const {
    isEditor,
    onEditPerson,
    onAddParent,
    onAddSpouse,
    onAddChildToPerson,
    onSelectPerson,
  } = useTreeContext();

  const [hovered, setHovered] = useState(false);
  const person = data.person as Person;
  const generation = (data.generation as number) ?? 1;
  const isSelected = Boolean(data.isSelected);

  const isMale = person.gender === "male";
  const isFemale = person.gender === "female";

  const borderColor = isSelected
    ? "border-amber-400 ring-2 ring-amber-400/40"
    : isMale
    ? "border-sky-500/70 hover:border-sky-400"
    : isFemale
    ? "border-rose-400/70 hover:border-rose-300"
    : "border-slate-500 hover:border-slate-300";

  const genderBg = isMale ? "bg-sky-950/40" : isFemale ? "bg-rose-950/40" : "bg-slate-900/60";

  // Format short birth/death year
  const birthYear = person.birthDate ? new Date(person.birthDate).getFullYear() : null;
  const deathYear = person.deathDate ? new Date(person.deathDate).getFullYear() : null;
  const yearText = birthYear || deathYear ? `${birthYear ?? "?"} - ${deathYear ?? ""}` : null;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => {
        onSelectPerson(id);
        if (isEditor) onEditPerson(id);
      }}
      className={`relative rounded-xl border p-2.5 flex flex-col justify-between text-left cursor-pointer transition-all shadow-md bg-slate-900/95 backdrop-blur-sm ${genderBg} ${borderColor}`}
      style={{
        width: PERSON_NODE_WIDTH,
        height: PERSON_NODE_HEIGHT,
      }}
    >
      {/* React Flow Handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ opacity: 0, width: 6, height: 6 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ opacity: 0, width: 6, height: 6 }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        style={{ opacity: 0, width: 6, height: 6 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ opacity: 0, width: 6, height: 6 }}
      />

      {/* Top Header: Generation badge & Role/Spouse label */}
      <div className="flex items-center justify-between text-[10px] text-slate-400">
        <span className="font-semibold text-amber-300/90 tracking-wide uppercase">
          Đời {generation}
        </span>
        {person.spouseLabel ? (
          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-medium truncate max-w-[70px]">
            {person.spouseLabel}
          </span>
        ) : person.birthOrder ? (
          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[9px]">
            Con thứ {person.birthOrder}
          </span>
        ) : null}
      </div>

      {/* Person Name */}
      <div className="font-medium text-xs text-slate-100 truncate flex items-center gap-1">
        <span>{isMale ? "👨" : isFemale ? "👩" : "👤"}</span>
        <span className="truncate">{person.firstName} {person.lastName}</span>
      </div>

      {/* Bottom Dates */}
      <div className="text-[10px] text-slate-400 truncate">
        {yearText ?? <span className="text-slate-500 italic">Chưa có năm sinh</span>}
      </div>

      {/* Hover Details Popup */}
      {hovered && <PersonDetailsPopup person={person} />}

      {/* 4 Directional Action Buttons for Editor */}
      {isEditor && hovered && (
        <>
          {/* Top: Add Parents */}
          <ActionButton
            title="Thêm Cha / Mẹ (Tiền nhân)"
            style={{ top: -11, left: "50%", transform: "translateX(-50%)" }}
            onClick={(e) => {
              e.stopPropagation();
              onAddParent(id);
            }}
          >
            ⬆
          </ActionButton>

          {/* Bottom: Add Child */}
          <ActionButton
            title="Thêm Con (Hậu duệ)"
            style={{ bottom: -11, left: "50%", transform: "translateX(-50%)" }}
            onClick={(e) => {
              e.stopPropagation();
              onAddChildToPerson(id);
            }}
          >
            ⬇
          </ActionButton>

          {/* Left: Add Spouse */}
          <ActionButton
            title="Thêm Phối ngẫu (Vợ / Chồng)"
            style={{ left: -11, top: "50%", transform: "translateY(-50%)" }}
            onClick={(e) => {
              e.stopPropagation();
              onAddSpouse(id);
            }}
          >
            ⬅
          </ActionButton>

          {/* Right: Add Spouse */}
          <ActionButton
            title="Thêm Phối ngẫu (Vợ / Chồng)"
            style={{ right: -11, top: "50%", transform: "translateY(-50%)" }}
            onClick={(e) => {
              e.stopPropagation();
              onAddSpouse(id);
            }}
          >
            ➡
          </ActionButton>
        </>
      )}
    </div>
  );
}

function ActionButton({
  children,
  title,
  style,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  style: React.CSSProperties;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={style}
      className="absolute w-5 h-5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-500 flex items-center justify-center text-[10px] cursor-pointer shadow-md z-30 transition-transform hover:scale-110"
    >
      {children}
    </button>
  );
}