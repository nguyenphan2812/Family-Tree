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
}

export function UnionNode({ id: _id, data }: NodeProps) {
  const unionData = data as unknown as UnionNodeData;
  const { marriage, totalChildrenCount, isCollapsed } = unionData;
  const { isEditor, onAddChildToMarriage, onToggleCollapseMarriage } = useTreeContext();
  const [hovered, setHovered] = useState(false);

  const hasChildren = totalChildrenCount > 0;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex items-center justify-center"
      style={{ width: 28, height: 28 }}
    >
      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
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
        type="target"
        position={Position.Right}
        id="right"
        style={{ opacity: 0, width: 4, height: 4 }}
      />

      {/* Union Badge */}
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium cursor-pointer shadow-sm transition-all ${
          isCollapsed
            ? "bg-amber-600 text-white border-2 border-amber-300 ring-2 ring-amber-500/30 scale-105"
            : hasChildren
            ? "bg-slate-700 text-slate-200 border border-slate-500 hover:border-slate-300"
            : "bg-slate-800 text-slate-400 border border-slate-600"
        }`}
        title={
          hasChildren
            ? `${totalChildrenCount} người con ${marriage.orderLabel ? `(${marriage.orderLabel})` : ""} - Click để ${isCollapsed ? "mở rộng" : "thu gọn"}`
            : `Hôn nhân ${marriage.orderLabel ? `(${marriage.orderLabel})` : ""}`
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