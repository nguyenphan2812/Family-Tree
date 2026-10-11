"use client";

import { useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { useTreeContext } from "./TreeContext";
import { Person } from "@/src/types/family";
import { PERSON_NODE_WIDTH, PERSON_NODE_HEIGHT } from "../utils/layoutGraph";

export function PersonNode({ id, data }: NodeProps) {
  const {
    isEditor,
    onEditPerson,
    onAddParent,
    onAddSpouse,
    onAddChildToPerson,
    onSelectPerson,
    onRequireAuth,
  } = useTreeContext();

  const [hovered, setHovered] = useState(false);
  const person = data.person as Person;
  const generation = (data.generation as number) ?? 1;
  const isSelected = Boolean(data.isSelected);
  const isPlaceholder = Boolean(person.isPlaceholder);

  const isMale = person.gender === "male";
  const isFemale = person.gender === "female";

  const borderColor = isSelected
    ? "border-amber-400 ring-2 ring-amber-400/60 shadow-amber-500/30 shadow-xl"
    : isPlaceholder
    ? "border-dashed border-amber-500/80 hover:border-amber-400 shadow-amber-950/20"
    : isMale
    ? "border-sky-500/70 hover:border-sky-400"
    : isFemale
    ? "border-rose-400/70 hover:border-rose-300"
    : "border-slate-500 hover:border-slate-300";

  const genderBg = isPlaceholder
    ? "bg-amber-950/20"
    : isMale
    ? "bg-sky-950/40"
    : isFemale
    ? "bg-rose-950/40"
    : "bg-slate-900/60";

  // Format short birth/death year
  const birthYear = person.birthDate ? new Date(person.birthDate).getFullYear() : null;
  const deathYear = person.deathDate ? new Date(person.deathDate).getFullYear() : null;
  const yearText = birthYear || deathYear ? `${birthYear ?? "?"} - ${deathYear ?? ""}` : null;

  // Show action buttons ONLY when hovered and NOT placeholder
  const showActionButtons = hovered && !isPlaceholder;

  const handleAction = (callback: () => void) => {
    if (!isEditor) {
      onRequireAuth();
      return;
    }
    callback();
  };

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
        style={{ opacity: 0, width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ opacity: 0, width: 8, height: 8 }}
      />
      {/* Horizontal handles for marriage axis */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ opacity: 0, width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        style={{ opacity: 0, width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ opacity: 0, width: 8, height: 8 }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        style={{ opacity: 0, width: 8, height: 8 }}
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
        ) : isPlaceholder ? (
          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-medium">
            Khuyết danh
          </span>
        ) : null}
      </div>

      {/* Person Name */}
      <div className="font-medium text-xs text-slate-100 truncate flex items-center gap-1">
        <span>{isPlaceholder ? "👤" : isMale ? "👨" : isFemale ? "👩" : "👤"}</span>
        <span className={`truncate ${isPlaceholder ? "text-amber-200/90 italic" : ""}`}>
          {person.firstName} {person.lastName}
        </span>
      </div>

      {/* Bottom Dates */}
      <div className="text-[10px] text-slate-400 truncate">
        {isPlaceholder ? (
          <span className="text-amber-400/90 text-[10px] flex items-center gap-1 font-medium">
            ✏️ Bấm để thêm thông tin
          </span>
        ) : (
          yearText ?? <span className="text-slate-500 italic">Chưa có năm sinh</span>
        )}
      </div>

      {/* 4 Directional Action Buttons at the 4 Edges */}
      {showActionButtons && (
        <>
          {/* 1. TOP EDGE: Thêm Cha / Mẹ (Tiền nhân) */}
          <EdgeActionButton
            position="top"
            colorClass="bg-sky-500 hover:bg-sky-400 text-white shadow-sky-950/80"
            tooltip="Thêm Cha / Mẹ (Tiền nhân)"
            onClick={(e) => {
              e.stopPropagation();
              handleAction(() => onAddParent(id));
            }}
          />

          {/* 2. BOTTOM EDGE: Thêm Con (Hậu duệ) */}
          <EdgeActionButton
            position="bottom"
            colorClass="bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-950/80"
            tooltip="Thêm Con (Hậu duệ)"
            onClick={(e) => {
              e.stopPropagation();
              handleAction(() => onAddChildToPerson(id));
            }}
          />

          {/* 3. LEFT EDGE: Thêm Vợ / Chồng (Phối ngẫu bên trái) */}
          <EdgeActionButton
            position="left"
            colorClass="bg-rose-500 hover:bg-rose-400 text-white shadow-rose-950/80"
            tooltip="Thêm Vợ / Chồng (bên trái)"
            onClick={(e) => {
              e.stopPropagation();
              handleAction(() => onAddSpouse(id, "left"));
            }}
          />

          {/* 4. RIGHT EDGE: Thêm Vợ / Chồng (Phối ngẫu bên phải) */}
          <EdgeActionButton
            position="right"
            colorClass="bg-rose-500 hover:bg-rose-400 text-white shadow-rose-950/80"
            tooltip="Thêm Vợ / Chồng (bên phải)"
            onClick={(e) => {
              e.stopPropagation();
              handleAction(() => onAddSpouse(id, "right"));
            }}
          />
        </>
      )}
    </div>
  );
}

interface EdgeActionButtonProps {
  position: "top" | "bottom" | "left" | "right";
  colorClass: string;
  tooltip: string;
  onClick: (e: React.MouseEvent) => void;
}

function EdgeActionButton({
  position,
  colorClass,
  tooltip,
  onClick,
}: EdgeActionButtonProps) {
  const [btnHovered, setBtnHovered] = useState(false);

  const positionStyles: Record<string, React.CSSProperties> = {
    top: { top: 0, left: "50%", transform: "translate(-50%, -50%)" },
    bottom: { bottom: 0, left: "50%", transform: "translate(-50%, 50%)" },
    left: { left: 0, top: "50%", transform: "translate(-50%, -50%)" },
    right: { right: 0, top: "50%", transform: "translate(50%, -50%)" },
  };

  const tooltipStyles: Record<string, string> = {
    top: "-top-8 left-1/2 -translate-x-1/2",
    bottom: "-bottom-8 left-1/2 -translate-x-1/2",
    left: "-left-2 top-1/2 -translate-x-full -translate-y-1/2",
    right: "-right-2 top-1/2 translate-x-full -translate-y-1/2",
  };

  return (
    <div
      style={positionStyles[position]}
      className="absolute z-50 flex items-center justify-center pointer-events-auto"
      onMouseEnter={() => setBtnHovered(true)}
      onMouseLeave={() => setBtnHovered(false)}
    >
      <button
        type="button"
        onClick={onClick}
        title={tooltip}
        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm cursor-pointer shadow-xl border-2 border-slate-900 transition-all hover:scale-125 active:scale-95 ${colorClass}`}
      >
        +
      </button>

      {/* Floating tooltip badge */}
      {btnHovered && (
        <div
          className={`absolute pointer-events-none whitespace-nowrap px-2 py-1 rounded-md bg-slate-950 text-slate-100 text-[11px] font-medium border border-slate-700 shadow-2xl z-50 ${tooltipStyles[position]}`}
        >
          {tooltip}
        </div>
      )}
    </div>
  );
}