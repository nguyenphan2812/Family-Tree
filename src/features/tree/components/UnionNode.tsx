"use client";

import { Handle, Position } from "@xyflow/react";

export function UnionNode() {
  const handleStyle = { opacity: 0, width: 1, height: 1 };
  return (
    <div style={{ width: 1, height: 1 }}>
      <Handle type="target" position={Position.Left} id="left" style={handleStyle} />
      <Handle type="target" position={Position.Right} id="right" style={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={handleStyle} />
    </div>
  );
}