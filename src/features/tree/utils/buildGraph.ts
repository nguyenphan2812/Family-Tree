import { Node, Edge } from "@xyflow/react";
import { Person, Marriage } from "@/src/types/family";
import { calculateGenerations } from "./generation";
import { getMarriageColor } from "./marriageColors";

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

  const allPeople: Person[] = [...people];
  const personById = new Map<string, Person>();
  for (const p of allPeople) {
    personById.set(p.id, p);
  }

  // Sanitize marriages: create virtual placeholder spouses for "Khuyết danh" (single parent) marriages
  const marriageById = new Map<string, Marriage>();
  const marriagesBySpouse = new Map<string, Marriage[]>();
  const sanitizedMarriages: Marriage[] = [];

  for (const m of marriages) {
    const validSpouseIds = m.spouseIds.filter((sid) => personById.has(sid));
    const validChildrenIds = m.childrenIds.filter((cid) => personById.has(cid));

    if (validSpouseIds.length === 0 && validChildrenIds.length === 0) continue;

    let effectiveSpouseIds = [...validSpouseIds];

    // If single spouse, create a placeholder spouse so the marriage has its own horizontal slot
    if (validSpouseIds.length === 1) {
      const singleSpouse = personById.get(validSpouseIds[0]);
      if (singleSpouse) {
        const placeholderId = `placeholder-spouse-${m.id}`;
        const placeholderPerson: Person = {
          id: placeholderId,
          firstName: singleSpouse.gender === "female" ? "Chồng" : "Vợ",
          lastName: "(Khuyết danh)",
          gender: singleSpouse.gender === "female" ? "male" : "female",
          spouseLabel: m.orderLabel || (singleSpouse.gender === "female" ? `Chồng thứ ${m.order}` : `Bà thứ ${m.order}`),
          marriageIds: [m.id],
          isPlaceholder: true,
        };
        allPeople.push(placeholderPerson);
        personById.set(placeholderId, placeholderPerson);
        effectiveSpouseIds.push(placeholderId);
      }
    }

    const sanitized: Marriage = {
      ...m,
      spouseIds: effectiveSpouseIds,
      childrenIds: validChildrenIds,
    };
    sanitizedMarriages.push(sanitized);
    marriageById.set(sanitized.id, sanitized);

    for (const sid of effectiveSpouseIds) {
      if (!marriagesBySpouse.has(sid)) marriagesBySpouse.set(sid, []);
      marriagesBySpouse.get(sid)!.push(sanitized);
    }
  }

  // Calculate generations for all people and marriages
  const { personGenerations, marriageGenerations } = calculateGenerations(allPeople, sanitizedMarriages);

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

  // Visible people (including placeholders)
  const visiblePeople = allPeople.filter((p) => !hiddenPersonIds.has(p.id));

  // Sort visible people by family lineage so spouses are clustered directly beside their partners
  const orderedVisiblePeople = sortPeopleForLayout(
    visiblePeople,
    sanitizedMarriages,
    personGenerations,
    marriageGenerations,
    marriagesBySpouse
  );

  const personOrderMap = new Map<string, number>();
  orderedVisiblePeople.forEach((p, idx) => personOrderMap.set(p.id, idx));

  // Build person nodes
  for (const person of orderedVisiblePeople) {
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

  // Sort sanitized marriages by generation, then by the horizontal position of their spouses, then order
  sanitizedMarriages.sort((a, b) => {
    const genA = marriageGenerations.get(a.id) ?? 1;
    const genB = marriageGenerations.get(b.id) ?? 1;
    if (genA !== genB) return genA - genB;

    const minIdxA = Math.min(
      ...a.spouseIds.map((sid) => personOrderMap.get(sid) ?? 999999)
    );
    const minIdxB = Math.min(
      ...b.spouseIds.map((sid) => personOrderMap.get(sid) ?? 999999)
    );
    if (minIdxA !== minIdxB) return minIdxA - minIdxB;

    return (a.order ?? 1) - (b.order ?? 1);
  });

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

    const marriageColor = getMarriageColor(marriage.order);

    // Determine horizontal neighbors (leftNodeId and rightNodeId)
    let leftNodeId: string | null = null;
    let rightNodeId: string | null = null;

    if (visibleSpouses.length >= 2) {
      const sidA = visibleSpouses[0];
      const sidB = visibleSpouses[1];
      const countA = (marriagesBySpouse.get(sidA) ?? []).length;
      const countB = (marriagesBySpouse.get(sidB) ?? []).length;
      const sharedId = countA >= countB ? sidA : sidB;
      const outerId = countA >= countB ? sidB : sidA;

      const sharedIdx = personOrderMap.get(sharedId) ?? 0;
      const outerIdx = personOrderMap.get(outerId) ?? 0;

      if (outerIdx < sharedIdx) {
        leftNodeId = orderedVisiblePeople[outerIdx]?.id ?? outerId;
        rightNodeId = orderedVisiblePeople[outerIdx + 1]?.id ?? sharedId;
      } else {
        leftNodeId = orderedVisiblePeople[outerIdx - 1]?.id ?? sharedId;
        rightNodeId = orderedVisiblePeople[outerIdx]?.id ?? outerId;
      }
    } else if (visibleSpouses.length === 1) {
      leftNodeId = visibleSpouses[0];
      rightNodeId = null;
    }

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
        color: marriageColor,
        leftNodeId,
        rightNodeId,
      },
    });

    // 1. Horizontal straight edges for spouses along the horizontal axis
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

    // 2. Vertical drop edges from union bottom to children (only if not collapsed)
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
          style: { stroke: marriageColor, strokeWidth: 2 },
        });
      }
    }
  }

  return { nodes, edges, personGenerations };
}

/**
 * Sorts people by genealogical hierarchy so that spouses always sit
 * immediately adjacent to their partners, and siblings follow their parents' marriage order.
 */
function sortPeopleForLayout(
  people: Person[],
  marriages: Marriage[],
  personGenerations: Map<string, number>,
  marriageGenerations: Map<string, number>,
  marriagesBySpouse: Map<string, Marriage[]>
): Person[] {
  const personById = new Map<string, Person>();
  for (const p of people) {
    personById.set(p.id, p);
  }

  // Group visible people by generation
  const peopleByGen = new Map<number, Person[]>();
  for (const p of people) {
    const gen = personGenerations.get(p.id) ?? 1;
    if (!peopleByGen.has(gen)) peopleByGen.set(gen, []);
    peopleByGen.get(gen)!.push(p);
  }

  const allGens = Array.from(peopleByGen.keys()).sort((a, b) => a - b);
  const orderedPeopleByGen = new Map<number, Person[]>();

  for (const gen of allGens) {
    const currentGenPeople = peopleByGen.get(gen) ?? [];
    if (currentGenPeople.length === 0) continue;

    const orderedGen: Person[] = [];
    const visited = new Set<string>();

    function clusterPersonWithSpouses(personId: string) {
      if (visited.has(personId)) return;
      visited.add(personId);

      const pMarriages = (marriagesBySpouse.get(personId) ?? [])
        .filter((m) => (marriageGenerations.get(m.id) ?? gen) === gen)
        .sort((a, b) => (a.order ?? 1) - (b.order ?? 1));

      const leftSpouseIds: string[] = [];
      const rightSpouseIds: string[] = [];

      for (const m of pMarriages) {
        for (const sid of m.spouseIds) {
          if (sid !== personId && !visited.has(sid)) {
            // Only group spouses in the exact same generation
            if ((personGenerations.get(sid) ?? gen) === gen) {
              visited.add(sid);
              if (m.direction === "left") {
                leftSpouseIds.unshift(sid);
              } else if (m.direction === "right") {
                rightSpouseIds.push(sid);
              } else {
                if (leftSpouseIds.length < rightSpouseIds.length) {
                  leftSpouseIds.unshift(sid);
                } else {
                  rightSpouseIds.push(sid);
                }
              }
            }
          }
        }
      }

      for (const sid of leftSpouseIds) {
        const sp = personById.get(sid);
        if (sp) orderedGen.push(sp);
      }
      const p = personById.get(personId);
      if (p) orderedGen.push(p);
      for (const sid of rightSpouseIds) {
        const sp = personById.get(sid);
        if (sp) orderedGen.push(sp);
      }
    }

    // 1. Follow bloodline children from previous generation's ordered parent marriages
    const prevOrdered = orderedPeopleByGen.get(gen - 1) ?? [];
    if (prevOrdered.length > 0) {
      const prevOrderMap = new Map<string, number>();
      prevOrdered.forEach((p, i) => prevOrderMap.set(p.id, i));
      const seenMarriages = new Set<string>();

      for (const parent of prevOrdered) {
        // Sort marriages by physical left-to-right order of the other spouse in prevOrdered
        const pMarriages = (marriagesBySpouse.get(parent.id) ?? []).slice().sort((a, b) => {
          const spouseA = a.spouseIds.find((id) => id !== parent.id);
          const spouseB = b.spouseIds.find((id) => id !== parent.id);
          const idxA = spouseA ? (prevOrderMap.get(spouseA) ?? 9999) : 9999;
          const idxB = spouseB ? (prevOrderMap.get(spouseB) ?? 9999) : 9999;
          if (idxA !== idxB) return idxA - idxB;
          return (a.order ?? 1) - (b.order ?? 1);
        });

        for (const m of pMarriages) {
          if (seenMarriages.has(m.id)) continue;
          seenMarriages.add(m.id);

          const children = m.childrenIds
            .map((cid) => personById.get(cid))
            .filter((c): c is Person => Boolean(c))
            .filter((c) => (personGenerations.get(c.id) ?? gen) === gen);

          children.sort((a, b) => {
            if (a.birthOrder && b.birthOrder) return a.birthOrder - b.birthOrder;
            if (a.birthDate && b.birthDate) return a.birthDate.localeCompare(b.birthDate);
            return (a.createdAt ?? 0) - (b.createdAt ?? 0);
          });

          for (const child of children) {
            clusterPersonWithSpouses(child.id);
          }
        }
      }
    }

    // 2. Add any remaining people in this generation (e.g. roots or founders)
    const remaining = currentGenPeople.filter((p) => !visited.has(p.id));
    remaining.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
    for (const rem of remaining) {
      clusterPersonWithSpouses(rem.id);
    }

    orderedPeopleByGen.set(gen, orderedGen);
  }

  const result: Person[] = [];
  for (const gen of allGens) {
    result.push(...(orderedPeopleByGen.get(gen) ?? []));
  }
  return result;
}