import { Node, Edge } from "@xyflow/react";
import { Person, Marriage } from "@/src/types/family";

export function buildGraph(
  people: Person[],
  marriages: Marriage[],
  expandedPersonIds: Set<string> = new Set()
) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const personById = new Map(people.map((p) => [p.id, p]));

  // Count how many marriages each person is part of, to detect 3+ spouse cases
  const marriageCountByPerson = new Map<string, number>();
  for (const m of marriages) {
    for (const sid of m.spouseIds) {
      marriageCountByPerson.set(sid, (marriageCountByPerson.get(sid) ?? 0) + 1);
    }
  }

  for (const person of people) {
    nodes.push({
      id: person.id,
      type: "person",
      position: person.position ?? { x: 0, y: 0 },
      data: { person },
    });
  }

  // Marriages grouped by their "hub" (the spouse with 3+ marriages, if any)
  const collapsedHubs = new Map<string, Marriage[]>();

  for (const marriage of marriages) {
    const hub = marriage.spouseIds.find((sid) => (marriageCountByPerson.get(sid) ?? 0) >= 3);
    const hubExpanded = hub ? expandedPersonIds.has(hub) : true;

    if (hub && !hubExpanded) {
      // Defer — this marriage belongs to a collapsed stack, handled after the loop
      if (!collapsedHubs.has(hub)) collapsedHubs.set(hub, []);
      collapsedHubs.get(hub)!.push(marriage);
      continue;
    }

    const spousePositions = marriage.spouseIds.map((id) => personById.get(id)?.position ?? { x: 0, y: 0 });
    const midX = spousePositions.reduce((sum, p) => sum + p.x, 0) / (spousePositions.length || 1);
    const midY = spousePositions[0]?.y ?? 0;
    const unionId = `union-${marriage.id}`;

    nodes.push({ id: unionId, type: "union", position: { x: midX + 36, y: midY + 36 }, data: {} });

    marriage.spouseIds.forEach((spouseId) => {
      const spousePos = personById.get(spouseId)?.position ?? { x: 0, y: 0 };
      const handle = spousePos.x <= midX ? "right" : "left";
      edges.push({
        id: `e-${spouseId}-${marriage.id}`,
        source: spouseId,
        sourceHandle: handle,
        target: unionId,
        targetHandle: handle === "right" ? "left" : "right",
        type: "straight",
        style: { stroke: "#555" },
      });
    });

    marriage.childrenIds.forEach((childId) => {
      edges.push({
        id: `e-${marriage.id}-${childId}`,
        source: unionId,
        sourceHandle: "bottom",
        target: childId,
        targetHandle: "top",
        type: "straight",
        style: { stroke: "#555" },
      });
    });
  }

  // One collapsed badge node per hub with 3+ unexpanded spouses
  for (const [hubId, hubMarriages] of collapsedHubs) {
    const hubPos = personById.get(hubId)?.position ?? { x: 0, y: 0 };
    const badgeId = `spouse-stack-${hubId}`;
    nodes.push({
      id: badgeId,
      type: "spouseStack",
      position: { x: hubPos.x + 130, y: hubPos.y },
      data: { hubId, count: hubMarriages.length },
    });
    edges.push({
      id: `e-${hubId}-${badgeId}`,
      source: hubId,
      sourceHandle: "right",
      target: badgeId,
      targetHandle: "left",
      type: "straight",
      style: { stroke: "#555" },
    });
  }

  return { nodes, edges };
}