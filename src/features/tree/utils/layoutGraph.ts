import ELK from "elkjs/lib/elk.bundled.js";
import { Node, Edge } from "@xyflow/react";

const elk = new ELK();

const elkOptions = {
  "elk.algorithm": "layered",
  "elk.direction": "DOWN",
  "elk.layered.spacing.nodeNodeBetweenLayers": "100",
  "elk.spacing.nodeNode": "60",
  "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
};

const PERSON_WIDTH = 72;
const PERSON_HEIGHT = 72;
const UNION_SIZE = 1;

export async function layoutGraph(nodes: Node[], edges: Edge[]): Promise<Node[]> {
  if (nodes.length === 0) return [];

  const elkGraph = {
    id: "root",
    layoutOptions: elkOptions,
    children: nodes.map((node) => ({
      id: node.id,
      width: node.type === "union" ? UNION_SIZE : PERSON_WIDTH,
      height: node.type === "union" ? UNION_SIZE : PERSON_HEIGHT,
    })),
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