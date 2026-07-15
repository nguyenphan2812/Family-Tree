"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";
import { useTreeContext } from "../context/TreeContext";

export function SpouseStackNode({ data }: NodeProps) {
  const { onExpandStack } = useTreeContext();
  const { hubId, count } = data as { hubId: string; count: number };

  const handleStyle = { opacity: 0, width: 1, height: 1 };

  return (
    <div
      onClick={() => onExpandStack(hubId)}
      style={{
        position: "relative",
        border: "1px solid #6b6f7a",
        borderRadius: 8,
        background: "#1c1e24",
        color: "#eee",
        fontSize: 11,
        padding: "6px 12px",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      <Handle type="target" position={Position.Left} id="left" style={handleStyle} />
      {count} spouses ›
    </div>
  );
}