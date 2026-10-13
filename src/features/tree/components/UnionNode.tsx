"use client";

import { useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Marriage } from "@/src/types/family";
import { useTreeContext } from "../context/TreeContext";

interface UnionNodeData {
  marriage: Marriage;
  generation: number;
  totalChildrenCount: number;
  visibleChildrenCount: number;
  isCollapsed: boolean;
  color?: string;
  spouseNames?: string;
}

export function UnionNode({ data }: NodeProps) {
  const unionData = data as unknown as UnionNodeData;
  const { marriage, totalChildrenCount, isCollapsed, color, spouseNames } = unionData;
  const {
    isEditor,
    onAddChildToMarriage,
    onToggleCollapseMarriage,
    setHoveredUnionId,
  } = useTreeContext();
  const [hovered, setHovered] = useState(false);

  const hasChildren = totalChildrenCount > 0;
  const accentColor = color || "#94a3b8";

  return (
    <div
      onMouseEnter={() => {
        setHovered(true);
        setHoveredUnionId(marriage.id);
      }}
      onMouseLeave={() => {
        setHovered(false);
        setHoveredUnionId(null);
      }}
      className="relative flex items-center justify-center"
      style={{ width: 28, height: 28 }}
    >
      {/* Tooltip Chip on Hover */}
      {hovered && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-0.5 rounded-full bg-slate-900/95 text-[10px] text-slate-100 border border-slate-700 shadow-xl pointer-events-none z-50 backdrop-blur-md flex items-center gap-1.5 font-medium animate-in fade-in zoom-in-95 duration-150">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
          <span>{spouseNames || marriage.orderLabel || "Hôn nhân"}</span>
          <span className="text-slate-500">·</span>
          <span className="text-amber-300 font-semibold">{totalChildrenCount} con</span>
        </div>
      )}

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ opacity: 0, width: 4, height: 4 }}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        style={{ opacity: 0, width: 4, height: 4 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ opacity: 0, width: 4, height: 4 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ opacity: 0, width: 4, height: 4 }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        style={{ opacity: 0, width: 4, height: 4 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ opacity: 0, width: 4, height: 4 }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        style={{ opacity: 0, width: 4, height: 4 }}
      />

      {/* Union Badge */}
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium cursor-pointer shadow-sm transition-all ${
          isCollapsed ? "scale-105" : "hover:scale-110"
        }`}
        style={{
          backgroundColor: isCollapsed ? accentColor : "#090d16",
          color: isCollapsed ? "#ffffff" : accentColor,
          border: `2px solid ${accentColor}`,
          boxShadow: isCollapsed
            ? `0 0 12px ${accentColor}80`
            : `0 0 8px ${accentColor}35`,
        }}
        title={
          hasChildren
            ? `${spouseNames || "Hôn nhân"} · ${totalChildrenCount} người con ${marriage.orderLabel ? `(${marriage.orderLabel})` : ""} - Click để ${isCollapsed ? "mở rộng" : "thu gọn"}`
            : `${spouseNames || "Hôn nhân"} ${marriage.orderLabel ? `(${marriage.orderLabel})` : ""}`
        }
        onClick={() => {
          if (hasChildren) {
            onToggleCollapseMarriage(marriage.id);
          }
        }}
      >
        {isCollapsed ? (
          <span className="text-[10px] font-bold">+{totalChildrenCount}</span>
        ) : hasChildren ? (
          <span className="text-[10px] font-bold">{totalChildrenCount}</span>
        ) : (
          <span className="text-[9px]">💍</span>
        )}
      </div>

      {/* Hover action to add child directly to this marriage */}
      {isEditor && hovered && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddChildToMarriage(marriage.id);
          }}
          title="Thêm con cho cuộc hôn nhân này"
          className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center text-xs leading-none shadow cursor-pointer z-30"
        >
          +
        </button>
      )}
    </div>
  );
}