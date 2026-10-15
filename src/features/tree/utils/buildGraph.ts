import { Node, Edge } from "@xyflow/react";
import { Person, Marriage } from "@/src/types/family";
import { calculateGenerations } from "./generation";
import { getMarriageColor } from "./marriageColors";
import { PERSON_NODE_WIDTH, PERSON_NODE_HEIGHT, UNION_NODE_SIZE } from "./layoutGraph";
import { sanitizeMarriages } from "./graph/sanitizeMarriages";
import { sortPeopleForLayoutExpanded } from "./graph/sortPeopleExpanded";
import { buildMarriageEdges } from "./graph/buildGraphEdges";

export interface BuildGraphOptions {
  collapsedMarriageIds?: Set<string>;
  selectedPersonId?: string | null;
  isCollapsed?: boolean;
}

export interface BuildGraphResult {
  nodes: Node[];
  edges: Edge[];
  personGenerations: Map<string, number>;
}

/**
 * Builds nodes and edges for the family tree graph.
 * Unifies both Expanded Mode (hierarchical ELK tree) and Collapsed Mode (generational tiers).
 */
export function buildGraph(
  people: Person[],
  marriages: Marriage[],
  options: BuildGraphOptions = {}
): BuildGraphResult {
  const { collapsedMarriageIds = new Set<string>() } = options;
  const isCollapsed =
    options.isCollapsed ?? (options.collapsedMarriageIds ? options.collapsedMarriageIds.size > 0 : false);

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  if (people.length === 0) {
    return { nodes, edges, personGenerations: new Map() };
  }

  // 1. Sanitize marriages & virtual placeholder spouses for single parents
  const {
    allPeople,
    personById,
    sanitizedMarriages,
    marriageById,
    marriagesBySpouse,
    parentMarriageByChild,
  } = sanitizeMarriages(people, marriages);

  // 2. Calculate generational levels for all people and marriages
  const { personGenerations, marriageGenerations } = calculateGenerations(
    allPeople,
    sanitizedMarriages
  );

  // 3. Compute hidden descendants for individually collapsed marriages (Expanded mode)
  const hiddenPersonIds = new Set<string>();
  if (!isCollapsed) {
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
  }

  // 4. Visible people
  const visiblePeople = isCollapsed
    ? allPeople
    : allPeople.filter((p) => !hiddenPersonIds.has(p.id));

  // 5. Sort visible people by family lineage so spouses are clustered directly beside their partners
  const orderedVisiblePeople = sortPeopleForLayoutExpanded(
    visiblePeople,
    personGenerations,
    marriageGenerations,
    marriagesBySpouse
  );

  const personOrderMap = new Map<string, number>();
  orderedVisiblePeople.forEach((p, idx) => personOrderMap.set(p.id, idx));

  // 6. Build person nodes
  for (const person of orderedVisiblePeople) {
    const gen = personGenerations.get(person.id) ?? 1;
    const personMarriages = (marriagesBySpouse.get(person.id) ?? []).sort((a, b) => a.order - b.order);

    nodes.push({
      id: person.id,
      type: "person",
      position: { x: 0, y: 0 },
      width: PERSON_NODE_WIDTH,
      height: PERSON_NODE_HEIGHT,
      initialWidth: PERSON_NODE_WIDTH,
      initialHeight: PERSON_NODE_HEIGHT,
      data: {
        person,
        generation: gen,
        marriages: personMarriages,
      },
    });
  }

  // 7. Sort sanitized marriages by generation, min spouse horizontal index, then order
  sanitizedMarriages.sort((a, b) => {
    const genA = marriageGenerations.get(a.id) ?? 1;
    const genB = marriageGenerations.get(b.id) ?? 1;
    if (genA !== genB) return genA - genB;

    const minIdxA = Math.min(...a.spouseIds.map((sid) => personOrderMap.get(sid) ?? 999999));
    const minIdxB = Math.min(...b.spouseIds.map((sid) => personOrderMap.get(sid) ?? 999999));
    if (minIdxA !== minIdxB) return minIdxA - minIdxB;

    return (a.order ?? 1) - (b.order ?? 1);
  });

  // 8. Build union nodes & edges
  for (const marriage of sanitizedMarriages) {
    const visibleSpouses = marriage.spouseIds.filter((sid) => personOrderMap.has(sid));
    const visibleChildren = marriage.childrenIds.filter(
      (cid) => personById.has(cid) && !hiddenPersonIds.has(cid)
    );

    if (visibleSpouses.length === 0) {
      continue;
    }

    const unionId = `union-${marriage.id}`;
    const mGen = marriageGenerations.get(marriage.id) ?? 1;
    const isMarriageCollapsed = isCollapsed || collapsedMarriageIds.has(marriage.id);
    const marriageColor = getMarriageColor(marriage.order);

    let leftNodeId: string | null = null;
    let rightNodeId: string | null = null;

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

      if (outerIdx < sharedIdx) {
        const nextPerson = orderedVisiblePeople[outerIdx + 1];
        const isSameGen =
          nextPerson &&
          (personGenerations.get(nextPerson.id) ?? 1) === (personGenerations.get(outerId) ?? 1);
        if (outerIdx < sharedIdx - 1 && isSameGen) {
          leftNodeId = outerId;
          rightNodeId = nextPerson.id;
        } else {
          leftNodeId = outerId;
          rightNodeId = sharedId;
        }
      } else {
        const prevPerson = orderedVisiblePeople[outerIdx - 1];
        const isSameGen =
          prevPerson &&
          (personGenerations.get(prevPerson.id) ?? 1) === (personGenerations.get(outerId) ?? 1);
        if (outerIdx > sharedIdx + 1 && isSameGen) {
          leftNodeId = prevPerson.id;
          rightNodeId = outerId;
        } else {
          leftNodeId = sharedId;
          rightNodeId = outerId;
        }
      }
    } else if (visibleSpouses.length === 1) {
      leftNodeId = visibleSpouses[0];
      rightNodeId = null;
    }

    const spouseNames = marriage.spouseIds
      .map((sid) => personById.get(sid))
      .filter((p): p is Person => Boolean(p && !p.isPlaceholder))
      .map((p) => (p.lastName ? `${p.lastName} ${p.firstName}` : p.firstName))
      .join(" × ");

    nodes.push({
      id: unionId,
      type: "union",
      position: { x: 0, y: 0 },
      width: UNION_NODE_SIZE,
      height: UNION_NODE_SIZE,
      initialWidth: UNION_NODE_SIZE,
      initialHeight: UNION_NODE_SIZE,
      data: {
        marriage,
        generation: mGen,
        totalChildrenCount: marriage.childrenIds.length,
        visibleChildrenCount: visibleChildren.length,
        isCollapsed: isMarriageCollapsed,
        color: marriageColor,
        leftNodeId,
        rightNodeId,
        spouseNames,
      },
    });

    edges.push(
      ...buildMarriageEdges({
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
      })
    );
  }

  return { nodes, edges, personGenerations };
}
