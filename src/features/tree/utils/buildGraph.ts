import { Node, Edge } from "@xyflow/react";
import { Person, Marriage } from "@/src/types/family";

// Builds the raw graph structure (no coordinates) — elkjs computes positions separately.
export function buildGraph(people: Person[], marriages: Marriage[]) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  for (const person of people) {
    nodes.push({
      id: person.id,
      type: "person",
      position: { x: 0, y: 0 }, // placeholder, elkjs will overwrite
      data: { person },
    });
  }

  for (const marriage of marriages) {
    const unionId = `union-${marriage.id}`;

    nodes.push({
      id: unionId,
      type: "union",
      position: { x: 0, y: 0 },
      data: {},
    });

    marriage.spouseIds.forEach((spouseId) => {
      edges.push({
        id: `e-${spouseId}-${marriage.id}`,
        source: spouseId,
        target: unionId,
        type: "straight",
        style: { stroke: "#555" },
      });
    });

    marriage.childrenIds.forEach((childId) => {
      edges.push({
        id: `e-${marriage.id}-${childId}`,
        source: unionId,
        target: childId,
        type: "straight",
        style: { stroke: "#555" },
      });
    });
  }

  return { nodes, edges };
}