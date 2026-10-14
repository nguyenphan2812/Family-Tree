"use client";

import { useState } from "react";
import Image from "next/image";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { useTreeContext } from "../context/TreeContext";
import { Person } from "@/src/types/family";
import { PERSON_NODE_WIDTH, PERSON_NODE_HEIGHT } from "../utils/layoutGraph";
import { PersonNodeActions } from "./PersonNodeActions";

export function PersonNode({ id, data }: NodeProps) {
  const {
    isEditor,
    onEditPerson,
    onViewPerson,
    onAddParent,
    onAddSpouse,
    onAddChildToPerson,
    onSelectPerson,
    onRequireAuth,
    setHoveredPersonId,
    selectedPersonId,
  } = useTreeContext();

  const [hovered, setHovered] = useState(false);
  const person = data.person as Person;
  const generation = (data.generation as number) ?? 1;
  const isSelected = selectedPersonId === id || Boolean(data.isSelected);
  const isPlaceholder = Boolean(person.isPlaceholder);
  const isMale = person.gender === "male";
  const isFemale = person.gender === "female";

  const borderColor = isSelected
    ? "border-amber-400 ring-2 ring-amber-400/70 shadow-amber-500/30 shadow-xl"
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

  const avatarRingColor = isSelected
    ? "ring-2 ring-amber-400 border-amber-300"
    : isPlaceholder
    ? "border-amber-500/70 border-dashed"
    : isMale
    ? "ring-2 ring-sky-500/40 border-sky-400/80"
    : isFemale
    ? "ring-2 ring-rose-500/40 border-rose-400/80"
    : "ring-2 ring-slate-600/40 border-slate-500";

  // Format short birth/death year
  const rawBirth = person.birthDate ? new Date(person.birthDate).getFullYear() : null;
  const rawDeath = person.deathDate ? new Date(person.deathDate).getFullYear() : null;
  const birthYear = rawBirth && !isNaN(rawBirth) ? rawBirth : null;
  const deathYear = rawDeath && !isNaN(rawDeath) ? rawDeath : null;
  const yearText = birthYear || deathYear ? `${birthYear ?? "?"} - ${deathYear ?? ""}` : null;

  const displayName = isPlaceholder
    ? `${person.firstName} ${person.lastName}`
    : person.lastName
    ? `${person.lastName} ${person.firstName}`
    : person.firstName;

  // Show action buttons ONLY when user is an editor, hovered, and NOT placeholder
  const showActionButtons = isEditor && hovered && !isPlaceholder;

  return (
    <div
      onMouseEnter={() => {
        setHovered(true);
        setHoveredPersonId(id);
      }}
      onMouseLeave={() => {
        setHovered(false);
        setHoveredPersonId(null);
      }}
      onClick={() => {
        onSelectPerson(id);
        if (isEditor) {
          onEditPerson(id);
        } else {
          onViewPerson(id);
        }
      }}
      className={`relative rounded-2xl border p-2 flex flex-col items-center justify-between text-center cursor-pointer transition-all shadow-md bg-slate-900/95 backdrop-blur-sm ${genderBg} ${borderColor}`}
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
        position={Position.Top}
        id="top-source"
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

      {/* Top Header: Generation badge & Spouse label */}
      <div className="w-full flex items-center justify-between text-[9px] px-0.5">
        <span className="font-bold text-amber-300 tracking-wider uppercase">
          Đời {generation}
        </span>
        {person.spouseLabel ? (
          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium truncate max-w-16">
            {person.spouseLabel}
          </span>
        ) : isPlaceholder ? (
          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
            Khuyết danh
          </span>
        ) : (
          <span />
        )}
      </div>

      {/* Main Focus: Portrait Photo / Avatar Frame */}
      <div className="relative my-0.5 group">
        <div
          className={`w-14 h-14 rounded-full overflow-hidden border-2 flex items-center justify-center bg-slate-950/80 shadow-md transition-transform group-hover:scale-105 ${avatarRingColor}`}
        >
          {person.photoURL ? (
            <Image
              src={person.photoURL}
              alt={displayName}
              width={56}
              height={56}
              unoptimized
              className="w-full h-full object-cover"
            />
          ) : isPlaceholder ? (
            <span className="text-xl text-amber-300/80">👤</span>
          ) : (
            <span className="text-2xl select-none">
              {isMale ? "👨" : isFemale ? "👩" : "👤"}
            </span>
          )}
        </div>

        {/* Hover Camera Badge when Editor */}
        {isEditor && hovered && (
          <div
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-[10px] text-slate-200 shadow-md"
            title="Nhấn để đổi ảnh"
          >
            📷
          </div>
        )}
      </div>

      {/* Person Name */}
      <div className="w-full px-0.5">
        <div
          className={`font-semibold text-xs text-slate-100 truncate ${
            isPlaceholder ? "text-amber-200/90 italic" : ""
          }`}
          title={displayName}
        >
          {displayName}
        </div>
      </div>

      {/* Birth & Death Year */}
      <div className="w-full text-[10px] text-slate-400 truncate px-0.5">
        {isPlaceholder ? (
          <span className="text-amber-400/90 font-medium">
            ✏️ Thêm thông tin
          </span>
        ) : (
          yearText ?? <span className="text-slate-500 italic">Chưa rõ năm</span>
        )}
      </div>

      {/* 4 Directional Action Buttons at the 4 Edges */}
      {showActionButtons && (
        <PersonNodeActions
          personId={id}
          isEditor={isEditor}
          onRequireAuth={onRequireAuth}
          onAddParent={onAddParent}
          onAddSpouse={onAddSpouse}
          onAddChildToPerson={onAddChildToPerson}
        />
      )}
    </div>
  );
}