import { Node, Edge } from "@xyflow/react";
import { Person, Marriage } from "@/src/types/family";
import { calculateGenerations } from "./generation";

export interface BuildGraphOptions {
  collapsedMarriageIds?: Set<string>;
  selectedPersonId?: string | null;
}

export interface BuildGraphResult {
  nodes: Node[];
  edges: Edge[];
  personGenerations: Map<string, number>;
}

export function buildGraph(
  people: Person[],
  marriages: Marriage[],
  options: BuildGraphOptions = {}
): BuildGraphResult {
  const { collapsedMarriageIds = new Set<string>(), selectedPersonId } = options;

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  if (people.length === 0) {
    return { nodes, edges, personGenerations: new Map() };
  }

  const personById = new Map<string, Person>();
  for (const p of people) {
    personById.set(p.id, p);
  }

  // Sanitize marriages: only keep valid spouse and child references
  const marriageById = new Map<string, Marriage>();
  const marriagesBySpouse = new Map<string, Marriage[]>();
  const sanitizedMarriages: Marriage[] = [];

  for (const m of marriages) {
    const validSpouseIds = m.spouseIds.filter((sid) => personById.has(sid));
    const validChildrenIds = m.childrenIds.filter((cid) => personById.has(cid));

    if (validSpouseIds.length === 0 && validChildrenIds.length === 0) continue;

    const sanitized: Marriage = {
      ...m,
      spouseIds: validSpouseIds,
      childrenIds: validChildrenIds,
    };
    sanitizedMarriages.push(sanitized);
    marriageById.set(sanitized.id, sanitized);

    for (const sid of validSpouseIds) {
      if (!marriagesBySpouse.has(sid)) marriagesBySpouse.set(sid, []);
      marriagesBySpouse.get(sid)!.push(sanitized);
    }
  }

  // Calculate generations for all people and marriages
  const { personGenerations, marriageGenerations } = calculateGenerations(people, sanitizedMarriages);

  // Compute hidden descendants for collapsed marriages
  const hiddenPersonIds = new Set<string>();
  function hideBranch(mId: string) {
    const m = marriageById.get(mId);
    if (!m) return;
    for (const cid of m.childrenIds) {
      if (!hiddenPersonIds.has(cid)) {
        hiddenPersonIds.add(cid);
        const childMarriages = marriagesBySpouse.get(cid) ?? [];
        for (const cm of childMarriages) {
          hideBranch(cm.id);
        }
      }
    }
  }

  for (const cmId of collapsedMarriageIds) {
    hideBranch(cmId);
  }

  // Visible people
  const visiblePeople = people.filter((p) => !hiddenPersonIds.has(p.id));

  // Sort visible people: generation ascending, then by birthDate or createdAt
  visiblePeople.sort((a, b) => {
    const genA = personGenerations.get(a.id) ?? 1;
    const genB = personGenerations.get(b.id) ?? 1;
    if (genA !== genB) return genA - genB;
    return (a.createdAt ?? 0) - (b.createdAt ?? 0);
  });

  // Build person nodes
  for (const person of visiblePeople) {
    const gen = personGenerations.get(person.id) ?? 1;
    const personMarriages = (marriagesBySpouse.get(person.id) ?? []).sort((a, b) => a.order - b.order);

    nodes.push({
      id: person.id,
      type: "person",
      position: { x: 0, y: 0 },
      data: {
        person,
        generation: gen,
        marriages: personMarriages,
        isSelected: person.id === selectedPersonId,
      },
    });
  }

  // Build union nodes & edges
  for (const marriage of sanitizedMarriages) {
    // If all spouses or children are hidden, check visibility
    const visibleSpouses = marriage.spouseIds.filter((sid) => !hiddenPersonIds.has(sid));
    if (visibleSpouses.length === 0 && marriage.childrenIds.every((cid) => hiddenPersonIds.has(cid))) {
      continue;
    }

    const unionId = `union-${marriage.id}`;
    const mGen = marriageGenerations.get(marriage.id) ?? 1;
    const isCollapsed = collapsedMarriageIds.has(marriage.id);
    const visibleChildren = marriage.childrenIds.filter((cid) => !hiddenPersonIds.has(cid));

    nodes.push({
      id: unionId,
      type: "union",
      position: { x: 0, y: 0 },
      data: {
        marriage,
        generation: mGen,
        totalChildrenCount: marriage.childrenIds.length,
        visibleChildrenCount: visibleChildren.length,
        isCollapsed,
      },
    });

    // Edges from spouses to union
    for (const spouseId of visibleSpouses) {
      edges.push({
        id: `e-${spouseId}-${marriage.id}`,
        source: spouseId,
        sourceHandle: "bottom",
        target: unionId,
        targetHandle: "top",
        type: "smoothstep",
        style: { stroke: "#94a3b8", strokeWidth: 2 },
      });
    }

    // Edges from union to visible children (only if not collapsed)
    if (!isCollapsed) {
      // Sort children by birthOrder or birthDate
      const sortedChildren = [...visibleChildren].sort((aId, bId) => {
        const a = personById.get(aId);
        const b = personById.get(bId);
        if (!a || !b) return 0;
        if (a.birthOrder && b.birthOrder) return a.birthOrder - b.birthOrder;
        if (a.birthDate && b.birthDate) return a.birthDate.localeCompare(b.birthDate);
        return (a.createdAt ?? 0) - (b.createdAt ?? 0);
      });

      for (const childId of sortedChildren) {
        edges.push({
          id: `e-${marriage.id}-${childId}`,
          source: unionId,
          sourceHandle: "bottom",
          target: childId,
          targetHandle: "top",
          type: "smoothstep",
          style: { stroke: "#64748b", strokeWidth: 2 },
        });
      }
    }
  }

  return { nodes, edges, personGenerations };
}