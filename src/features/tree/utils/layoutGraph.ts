import ELK from "elkjs/lib/elk.bundled.js";
import { Node, Edge } from "@xyflow/react";

const elk = new ELK();

export const PERSON_NODE_WIDTH = 150;
export const PERSON_NODE_HEIGHT = 76;
export const UNION_NODE_SIZE = 28;

const elkOptions = {
  "elk.algorithm": "layered",
  "elk.direction": "DOWN",
  "elk.partitioning": "true",
  "elk.layered.spacing.nodeNodeBetweenLayers": "80",
  "elk.spacing.nodeNode": "65",
  "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
  "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
  "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
  "elk.layered.crossingMinimization.forceNodeModelOrder": "true",
};

export async function layoutGraph(nodes: Node[], edges: Edge[]): Promise<Node[]> {
  if (nodes.length === 0) return [];

  // Build downward-only edges for ELK to avoid backward-edge layer elevation
  const elkEdges: { id: string; sources: string[]; targets: string[] }[] = [];
  const edgeIdSet = new Set<string>();

  for (const node of nodes) {
    if (node.type !== "union") continue;
    const { leftNodeId, rightNodeId } = (node.data as {
      leftNodeId?: string;
      rightNodeId?: string;
    }) ?? {};

    // 1. Spouses point downward to union
    if (leftNodeId) {
      const eId = `elk-left-${leftNodeId}-${node.id}`;
      if (!edgeIdSet.has(eId)) {
        edgeIdSet.add(eId);
        elkEdges.push({ id: eId, sources: [leftNodeId], targets: [node.id] });
      }
    }
    if (rightNodeId) {
      const eId = `elk-right-${rightNodeId}-${node.id}`;
      if (!edgeIdSet.has(eId)) {
        edgeIdSet.add(eId);
        elkEdges.push({ id: eId, sources: [rightNodeId], targets: [node.id] });
      }
    }

    // 2. Union points downward to visible children (exclude horizontal spouses)
    const childEdges = edges.filter(
      (e) => e.source === node.id && e.target !== rightNodeId && e.target !== leftNodeId
    );
    for (const ce of childEdges) {
      if (!edgeIdSet.has(ce.id)) {
        edgeIdSet.add(ce.id);
        elkEdges.push({ id: ce.id, sources: [node.id], targets: [ce.target] });
      }
    }
  }

  const elkGraph = {
    id: "root",
    layoutOptions: elkOptions,
    children: nodes.map((node) => {
      const isUnion = node.type === "union";
      const gen = (node.data as { generation?: number })?.generation ?? 1;
      // People sit at even partition bands: 0, 2, 4...
      // Union nodes sit at odd partition bands: 1, 3, 5...
      const partition = isUnion ? (gen - 1) * 2 + 1 : (gen - 1) * 2;

      return {
        id: node.id,
        width: isUnion ? UNION_NODE_SIZE : PERSON_NODE_WIDTH,
        height: isUnion ? UNION_NODE_SIZE : PERSON_NODE_HEIGHT,
        layoutOptions: {
          "elk.partition": String(partition),
        },
      };
    }),
    edges: elkEdges,
  };

  const layout = await elk.layout(elkGraph);

  const positionById = new Map<string, { x: number; y: number }>();
  for (const child of layout.children ?? []) {
    positionById.set(child.id, { x: child.x ?? 0, y: child.y ?? 0 });
  }

  // Post-processing: Place each union node directly on the horizontal axis
  // between its spouses (at exact vertical center: y = spouse.y + 24)
  for (const node of nodes) {
    if (node.type !== "union") continue;

    const { leftNodeId, rightNodeId } = (node.data as {
      leftNodeId?: string;
      rightNodeId?: string;
    }) ?? {};

    const leftPos = leftNodeId ? positionById.get(leftNodeId) : null;
    const rightPos = rightNodeId ? positionById.get(rightNodeId) : null;

    if (leftPos && rightPos) {
      // Sits directly between left spouse and right spouse on the horizontal axis
      const gapMidX = (leftPos.x + PERSON_NODE_WIDTH + rightPos.x) / 2;
      const unionX = gapMidX - UNION_NODE_SIZE / 2;
      const unionY = leftPos.y + (PERSON_NODE_HEIGHT - UNION_NODE_SIZE) / 2;
      positionById.set(node.id, { x: unionX, y: unionY });
    } else if (leftPos) {
      // Single parent (left spouse only)
      const unionX = leftPos.x + PERSON_NODE_WIDTH + 20;
      const unionY = leftPos.y + (PERSON_NODE_HEIGHT - UNION_NODE_SIZE) / 2;
      positionById.set(node.id, { x: unionX, y: unionY });
    } else if (rightPos) {
      // Single parent (right spouse only)
      const unionX = rightPos.x - UNION_NODE_SIZE - 20;
      const unionY = rightPos.y + (PERSON_NODE_HEIGHT - UNION_NODE_SIZE) / 2;
      positionById.set(node.id, { x: unionX, y: unionY });
    }
  }

  return nodes.map((node) => ({
    ...node,
    position: positionById.get(node.id) ?? { x: 0, y: 0 },
  }));
}