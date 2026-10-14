import { Person, Marriage } from "@/src/types/family";

/**
 * Clusters spouses directly adjacent to each other on the horizontal axis
 * based on bloodline hierarchy.
 */
export function sortPeopleForLayoutExpanded(
  people: Person[],
  personGenerations: Map<string, number>,
  marriageGenerations: Map<string, number>,
  marriagesBySpouse: Map<string, Marriage[]>
): Person[] {
  const personById = new Map<string, Person>();
  for (const p of people) {
    personById.set(p.id, p);
  }

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

    const prevOrdered = orderedPeopleByGen.get(gen - 1) ?? [];
    if (prevOrdered.length > 0) {
      const prevOrderMap = new Map<string, number>();
      prevOrdered.forEach((p, i) => prevOrderMap.set(p.id, i));
      const seenMarriages = new Set<string>();

      for (const parent of prevOrdered) {
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
