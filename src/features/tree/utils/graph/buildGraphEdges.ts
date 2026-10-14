import { Edge } from "@xyflow/react";
import { Person, Marriage } from "@/src/types/family";

export interface BuildMarriageEdgesParams {
  marriage: Marriage;
  unionId: string;
  leftNodeId?: string | null;
  rightNodeId?: string | null;
  marriageColor: string;
  visibleSpouses: string[];
  visibleChildren: string[];
  marriagesBySpouse: Map<string, Marriage[]>;
  parentMarriageByChild: Map<string, Marriage>;
  personOrderMap: Map<string, number>;
  personById: Map<string, Person>;
  isCollapsed: boolean;
  isMarriageCollapsed: boolean;
}

export function buildMarriageEdges({
  marriage,
  unionId,
  leftNodeId,
  rightNodeId,
  marriageColor,
  visibleSpouses,
  visibleChildren,
  marriagesBySpouse,
  parentMarriageByChild,
  personOrderMap,
  personById,
  isCollapsed,
  isMarriageCollapsed,
}: BuildMarriageEdgesParams): Edge[] {
  const edges: Edge[] = [];

  // Horizontal straight edges for spouses along the horizontal axis
  if (leftNodeId) {
    edges.push({
      id: `e-${leftNodeId}-${marriage.id}`,
      source: leftNodeId,
      sourceHandle: "right",
      target: unionId,
      targetHandle: "left",
      type: "straight",
      style: { stroke: marriageColor, strokeWidth: 2 },
    });
  }

  if (rightNodeId) {
    edges.push({
      id: `e-${marriage.id}-${rightNodeId}`,
      source: unionId,
      sourceHandle: "right",
      target: rightNodeId,
      targetHandle: "left",
      type: "straight",
      style: { stroke: marriageColor, strokeWidth: 2 },
    });
  }

  // Direct edge for multi-spouse marriages where sharedId is not immediately adjacent to union
  if (visibleSpouses.length >= 2) {
    const sidA = visibleSpouses[0];
    const sidB = visibleSpouses[1];
    const countA = (marriagesBySpouse.get(sidA) ?? []).length;
    const countB = (marriagesBySpouse.get(sidB) ?? []).length;
    const hasParentA = parentMarriageByChild.has(sidA);
    const hasParentB = parentMarriageByChild.has(sidB);

    let sharedId: string;
    let outerId: string;

    if (countA !== countB) {
      sharedId = countA > countB ? sidA : sidB;
      outerId = countA > countB ? sidB : sidA;
    } else if (hasParentA !== hasParentB) {
      sharedId = hasParentA ? sidA : sidB;
      outerId = hasParentA ? sidB : sidA;
    } else {
      sharedId = sidA < sidB ? sidA : sidB;
      outerId = sidA < sidB ? sidB : sidA;
    }

    const sharedIdx = personOrderMap.get(sharedId) ?? 0;
    const outerIdx = personOrderMap.get(outerId) ?? 0;

    if (outerIdx > sharedIdx + 1) {
      edges.push({
        id: `e-direct-${sharedId}-${marriage.id}`,
        source: sharedId,
        sourceHandle: "right",
        target: unionId,
        targetHandle: "left",
        type: "straight",
        style: { stroke: marriageColor, strokeWidth: 2, opacity: 0 },
        data: {
          marriageId: marriage.id,
          sharedId,
          outerId,
        },
      });
    } else if (outerIdx < sharedIdx - 1) {
      edges.push({
        id: `e-direct-${sharedId}-${marriage.id}`,
        source: unionId,
        sourceHandle: "right",
        target: sharedId,
        targetHandle: "left",
        type: "straight",
        style: { stroke: marriageColor, strokeWidth: 2, opacity: 0 },
        data: {
          marriageId: marriage.id,
          sharedId,
          outerId,
        },
      });
    }
  }

  // Vertical drop edges from union bottom to children
  const sortedChildren = [...visibleChildren].sort((aId, bId) => {
    const a = personById.get(aId);
    const b = personById.get(bId);
    if (!a || !b) return 0;
    if (a.birthOrder && b.birthOrder) return a.birthOrder - b.birthOrder;
    if (a.birthDate && b.birthDate) return a.birthDate.localeCompare(b.birthDate);
    return (a.createdAt ?? 0) - (b.createdAt ?? 0);
  });

  if (isCollapsed) {
    // In collapsed mode: children edges are hidden by default (opacity: 0) and illuminate on hover
    for (const childId of sortedChildren) {
      edges.push({
        id: `e-${marriage.id}-${childId}`,
        source: unionId,
        sourceHandle: "bottom",
        target: childId,
        targetHandle: "top",
        type: "smoothstep",
        style: { stroke: marriageColor, strokeWidth: 2 },
        data: {
          isCollapsedChildEdge: true,
          marriageId: marriage.id,
        },
      });
    }
  } else if (!isMarriageCollapsed) {
    // In expanded mode: children edges are visible if this marriage branch is not collapsed
    for (const childId of sortedChildren) {
      edges.push({
        id: `e-${marriage.id}-${childId}`,
        source: unionId,
        sourceHandle: "bottom",
        target: childId,
        targetHandle: "top",
        type: "smoothstep",
        style: { stroke: marriageColor, strokeWidth: 2 },
      });
    }
  }

  return edges;
}
