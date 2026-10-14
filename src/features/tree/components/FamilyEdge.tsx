"use client";

import { EdgeProps, BaseEdge, getSmoothStepPath, Position } from "@xyflow/react";

/**
 * Custom edge component that supports unique horizontal bus lanes (`data.busY`).
 * By ensuring each marriage has a unique `busY`, horizontal bus segments
 * from different marriages never overlap each other.
 */
export function FamilyEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition = Position.Bottom,
  targetPosition = Position.Top,
  style = {},
  markerEnd,
  data,
}: EdgeProps) {
  const customCenterY = (data as { busY?: number })?.busY;

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
    centerY: customCenterY,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={style}
      markerEnd={markerEnd}
    />
  );
}
