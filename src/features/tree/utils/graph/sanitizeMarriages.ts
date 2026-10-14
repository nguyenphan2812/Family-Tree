import { Person, Marriage } from "@/src/types/family";

export interface SanitizeMarriagesResult {
  allPeople: Person[];
  personById: Map<string, Person>;
  sanitizedMarriages: Marriage[];
  marriageById: Map<string, Marriage>;
  marriagesBySpouse: Map<string, Marriage[]>;
  parentMarriageByChild: Map<string, Marriage>;
}

/**
 * Sanitizes marriages for graph generation:
 * - Drops orphaned marriages with 0 valid spouses.
 * - Creates virtual placeholder spouses `(Khuyết danh)` for single-parent marriages.
 * - Produces lookup maps for fast spouse and parent lookups.
 */
export function sanitizeMarriages(
  people: Person[],
  marriages: Marriage[]
): SanitizeMarriagesResult {
  const allPeople: Person[] = [...people];
  const personById = new Map<string, Person>();
  for (const p of allPeople) {
    personById.set(p.id, p);
  }

  const marriageById = new Map<string, Marriage>();
  const marriagesBySpouse = new Map<string, Marriage[]>();
  const sanitizedMarriages: Marriage[] = [];

  for (const m of marriages) {
    const validSpouseIds = m.spouseIds.filter((sid) => personById.has(sid));
    const validChildrenIds = m.childrenIds.filter((cid) => personById.has(cid));

    // A marriage must have at least one valid spouse in the graph.
    // If all spouses were deleted, this is an orphaned marriage and should not produce a union node.
    if (validSpouseIds.length === 0) continue;

    const effectiveSpouseIds = [...validSpouseIds];

    if (validSpouseIds.length === 1) {
      const singleSpouse = personById.get(validSpouseIds[0]);
      if (singleSpouse) {
        const placeholderId = `placeholder-spouse-${m.id}`;
        const placeholderPerson: Person = {
          id: placeholderId,
          firstName: singleSpouse.gender === "female" ? "Chồng" : "Vợ",
          lastName: "(Khuyết danh)",
          gender: singleSpouse.gender === "female" ? "male" : "female",
          spouseLabel:
            m.orderLabel ||
            (singleSpouse.gender === "female" ? `Chồng thứ ${m.order}` : `Bà thứ ${m.order}`),
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

  const parentMarriageByChild = new Map<string, Marriage>();
  for (const m of sanitizedMarriages) {
    for (const cid of m.childrenIds) {
      parentMarriageByChild.set(cid, m);
    }
  }

  return {
    allPeople,
    personById,
    sanitizedMarriages,
    marriageById,
    marriagesBySpouse,
    parentMarriageByChild,
  };
}
