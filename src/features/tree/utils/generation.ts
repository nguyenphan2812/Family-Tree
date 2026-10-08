import { Person, Marriage } from "@/src/types/family";

export interface GenerationMap {
  personGenerations: Map<string, number>;
  marriageGenerations: Map<string, number>;
}

/**
 * Computes the generational level for each person and marriage in the tree.
 * Supports arbitrary two-way trees (ancestors going up, descendants going down, multiple spouses).
 * Oldest ancestor generation is normalized to 1, children are generation + 1, etc.
 */
export function calculateGenerations(
  people: Person[],
  marriages: Marriage[]
): GenerationMap {
  const personGenerations = new Map<string, number>();
  const marriageGenerations = new Map<string, number>();

  if (people.length === 0) {
    return { personGenerations, marriageGenerations };
  }

  const personById = new Map<string, Person>();
  for (const p of people) {
    personById.set(p.id, p);
  }

  // Map: personId -> list of parent marriages (marriages where this person is a child)
  const parentMarriagesByChild = new Map<string, Marriage[]>();
  // Map: personId -> list of spouse marriages (marriages where this person is a spouse)
  const spouseMarriagesByPerson = new Map<string, Marriage[]>();

  for (const m of marriages) {
    for (const childId of m.childrenIds) {
      if (personById.has(childId)) {
        if (!parentMarriagesByChild.has(childId)) {
          parentMarriagesByChild.set(childId, []);
        }
        parentMarriagesByChild.get(childId)!.push(m);
      }
    }

    for (const spouseId of m.spouseIds) {
      if (personById.has(spouseId)) {
        if (!spouseMarriagesByPerson.has(spouseId)) {
          spouseMarriagesByPerson.set(spouseId, []);
        }
        spouseMarriagesByPerson.get(spouseId)!.push(m);
      }
    }
  }

  // BFS / Component assignment
  const visited = new Set<string>();

  for (const person of people) {
    if (visited.has(person.id)) continue;

    // Component BFS
    const queue: { personId: string; gen: number }[] = [{ personId: person.id, gen: 0 }];
    visited.add(person.id);
    personGenerations.set(person.id, 0);

    const componentPeople: string[] = [];

    while (queue.length > 0) {
      const { personId, gen } = queue.shift()!;
      componentPeople.push(personId);

      // 1. Spouses should share the same generation
      const marriagesAsSpouse = spouseMarriagesByPerson.get(personId) ?? [];
      for (const m of marriagesAsSpouse) {
        for (const spouseId of m.spouseIds) {
          if (!visited.has(spouseId) && personById.has(spouseId)) {
            visited.add(spouseId);
            personGenerations.set(spouseId, gen);
            queue.push({ personId: spouseId, gen });
          }
        }

        // 2. Children of this marriage should be gen + 1
        for (const childId of m.childrenIds) {
          if (!visited.has(childId) && personById.has(childId)) {
            visited.add(childId);
            personGenerations.set(childId, gen + 1);
            queue.push({ personId: childId, gen: gen + 1 });
          }
        }
      }

      // 3. Parents of this person should be gen - 1
      const marriagesAsChild = parentMarriagesByChild.get(personId) ?? [];
      for (const m of marriagesAsChild) {
        for (const parentId of m.spouseIds) {
          if (!visited.has(parentId) && personById.has(parentId)) {
            visited.add(parentId);
            personGenerations.set(parentId, gen - 1);
            queue.push({ personId: parentId, gen: gen - 1 });
          }
        }
      }
    }

    // Normalize this connected component so lowest gen starts at 1
    let minGen = Infinity;
    for (const pid of componentPeople) {
      const g = personGenerations.get(pid)!;
      if (g < minGen) minGen = g;
    }

    if (minGen !== Infinity) {
      const offset = 1 - minGen;
      for (const pid of componentPeople) {
        personGenerations.set(pid, personGenerations.get(pid)! + offset);
      }
    }
  }

  // Compute marriage generation (same as spouses' generation)
  for (const m of marriages) {
    let mGen: number | null = null;
    for (const sid of m.spouseIds) {
      if (personGenerations.has(sid)) {
        mGen = personGenerations.get(sid)!;
        break;
      }
    }
    if (mGen === null) {
      // If no spouses found, check if it has children: gen = childGen - 1
      for (const cid of m.childrenIds) {
        if (personGenerations.has(cid)) {
          mGen = Math.max(1, personGenerations.get(cid)! - 1);
          break;
        }
      }
    }
    marriageGenerations.set(m.id, mGen ?? 1);
  }

  return { personGenerations, marriageGenerations };
}
