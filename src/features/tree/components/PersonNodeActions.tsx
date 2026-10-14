"use client";

import { useState } from "react";

export interface PersonNodeActionsProps {
  personId: string;
  isEditor: boolean;
  onRequireAuth: () => void;
  onAddParent: (id: string) => void;
  onAddSpouse: (id: string, side: "left" | "right") => void;
  onAddChildToPerson: (id: string) => void;
}

export function PersonNodeActions({
  personId,
  isEditor,
  onRequireAuth,
  onAddParent,
  onAddSpouse,
  onAddChildToPerson,
}: PersonNodeActionsProps) {
  const handleAction = (callback: () => void) => {
    if (!isEditor) {
      onRequireAuth();
      return;
    }
    callback();
  };

  return (
    <>
      {/* 1. TOP EDGE: Thêm Cha / Mẹ (Tiền nhân) */}
      <EdgeActionButton
        position="top"
        colorClass="bg-sky-500 hover:bg-sky-400 text-white shadow-sky-950/80"
        tooltip="Thêm Cha / Mẹ (Tiền nhân)"
        onClick={(e) => {
          e.stopPropagation();
          handleAction(() => onAddParent(personId));
        }}
      />

      {/* 2. BOTTOM EDGE: Thêm Con (Hậu duệ) */}
      <EdgeActionButton
        position="bottom"
        colorClass="bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-950/80"
        tooltip="Thêm Con (Hậu duệ)"
        onClick={(e) => {
          e.stopPropagation();
          handleAction(() => onAddChildToPerson(personId));
        }}
      />

      {/* 3. LEFT EDGE: Thêm Vợ / Chồng (Phối ngẫu bên trái) */}
      <EdgeActionButton
        position="left"
        colorClass="bg-rose-500 hover:bg-rose-400 text-white shadow-rose-950/80"
        tooltip="Thêm Vợ / Chồng (bên trái)"
        onClick={(e) => {
          e.stopPropagation();
          handleAction(() => onAddSpouse(personId, "left"));
        }}
      />

      {/* 4. RIGHT EDGE: Thêm Vợ / Chồng (Phối ngẫu bên phải) */}
      <EdgeActionButton
        position="right"
        colorClass="bg-rose-500 hover:bg-rose-400 text-white shadow-rose-950/80"
        tooltip="Thêm Vợ / Chồng (bên phải)"
        onClick={(e) => {
          e.stopPropagation();
          handleAction(() => onAddSpouse(personId, "right"));
        }}
      />
    </>
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
