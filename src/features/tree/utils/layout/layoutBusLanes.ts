import { Node, Edge } from "@xyflow/react";
import {
  PERSON_NODE_WIDTH,
  PERSON_NODE_HEIGHT,
  UNION_NODE_SIZE,
} from "./layoutConstants";

export interface FinalizeLayoutResult {
  nodes: Node[];
  edges: Edge[];
}

export function finalizeLayoutNodesAndEdges(
  nodes: Node[],
  edges: Edge[],
  allGens: number[],
  unionNodes: Node[],
  positionById: Map<string, { x: number; y: number }>,
  genYMap: Map<number, number>
): FinalizeLayoutResult {
  const unionBusYMap = new Map<string, number>();
  for (const gen of allGens) {
    const gUnions = unionNodes
      .filter((u) => ((u.data as { generation?: number })?.generation ?? 1) === gen)
      .sort((a, b) => (positionById.get(a.id)?.x ?? 0) - (positionById.get(b.id)?.x ?? 0));

    const tierY = genYMap.get(gen) ?? 0;
    const personBottomY = tierY + PERSON_NODE_HEIGHT;
    const busBaseY = personBottomY + 14;

    const nextGen = allGens.find((g) => g > gen);
    const childTopY =
      nextGen !== undefined ? (genYMap.get(nextGen) ?? (busBaseY + 80)) : busBaseY + 80;

    const verticalGap = Math.max(30, childTopY - busBaseY);
    const laneCount = gUnions.length;
    const step = Math.min(16, Math.max(8, (verticalGap - 20) / Math.max(1, laneCount)));

    gUnions.forEach((uNode, idx) => {
      const busY = busBaseY + (idx % 4) * step;
      unionBusYMap.set(uNode.id, busY);
    });
  }

  const updatedEdges = edges.map((e) => {
    if (e.id.startsWith("e-direct-")) return e;
    const busY = unionBusYMap.get(e.source);
    if (busY !== undefined) {
      return {
        ...e,
        data: {
          ...e.data,
          busY,
        },
      };
    }
    return e;
  });

  const positionedNodes = nodes.map((node) => {
    const isUnion = node.type === "union";
    const width = isUnion ? UNION_NODE_SIZE : PERSON_NODE_WIDTH;
    const height = isUnion ? UNION_NODE_SIZE : PERSON_NODE_HEIGHT;
    return {
      ...node,
      width: node.width ?? width,
      height: node.height ?? height,
      initialWidth: node.initialWidth ?? width,
      initialHeight: node.initialHeight ?? height,
      position: positionById.get(node.id) ?? { x: 0, y: 0 },
    };
  });

  return { nodes: positionedNodes, edges: updatedEdges };
}
