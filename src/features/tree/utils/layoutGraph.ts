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
  "elk.layered.spacing.nodeNodeBetweenLayers": "65",
  "elk.spacing.nodeNode": "45",
  "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
  "elk.layered.crossingMinimization.forceNodeModelOrder": "true",
};

export async function layoutGraph(nodes: Node[], edges: Edge[]): Promise<Node[]> {
  if (nodes.length === 0) return [];

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
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  const layout = await elk.layout(elkGraph);

  const positionById = new Map<string, { x: number; y: number }>();
  for (const child of layout.children ?? []) {
    positionById.set(child.id, { x: child.x ?? 0, y: child.y ?? 0 });
  }

  return nodes.map((node) => ({
    ...node,
    position: positionById.get(node.id) ?? { x: 0, y: 0 },
  }));
}