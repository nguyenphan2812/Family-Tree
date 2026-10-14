import { Node } from "@xyflow/react";
import {
  PERSON_NODE_WIDTH,
  PERSON_NODE_HEIGHT,
  UNION_NODE_SIZE,
  SPOUSE_UNION_GAP,
} from "./layoutConstants";

export interface PlaceInLawsParams {
  allGens: number[];
  unionNodes: Node[];
  nodeById: Map<string, Node>;
  childrenByUnion: Map<string, string[]>;
  positionById: Map<string, { x: number; y: number }>;
  genYMap: Map<number, number>;
  inLawUnionIds: Set<string>;
}

/**
 * In-law pass (bottom-up): unions that are still unpositioned — typically the parents
 * (and grandparents) of someone who married into the tree at Gen >= 2. Each is placed on its own
 * generation tier, centered above its already-positioned children, with spouses on either side
 * using the same union/spouse spacing as above. Collisions are left to resolveTierCollisions.
 */
export function placeInLaws({
  allGens,
  unionNodes,
  nodeById,
  childrenByUnion,
  positionById,
  genYMap,
  inLawUnionIds,
}: PlaceInLawsParams): boolean {
  let placedAny = false;
  for (let gIdx = allGens.length - 1; gIdx >= 0; gIdx--) {
    const gen = allGens[gIdx];
    const tierY = genYMap.get(gen) ?? 0;
    const unionY = tierY + (PERSON_NODE_HEIGHT - UNION_NODE_SIZE) / 2;

    for (const u of unionNodes) {
      if (((u.data as { generation?: number })?.generation ?? 1) !== gen) continue;
      if (positionById.has(u.id)) continue;

      const { leftNodeId, rightNodeId } = (u.data as { leftNodeId?: string; rightNodeId?: string }) ?? {};
      const leftPos = leftNodeId ? positionById.get(leftNodeId) : undefined;
      const rightPos = rightNodeId ? positionById.get(rightNodeId) : undefined;

      let unionX: number | null = null;
      if (leftPos) {
        unionX = leftPos.x + PERSON_NODE_WIDTH + SPOUSE_UNION_GAP;
      } else if (rightPos) {
        unionX = rightPos.x - SPOUSE_UNION_GAP - UNION_NODE_SIZE;
      } else {
        let minChildX = Infinity;
        let maxChildX = -Infinity;
        for (const cid of childrenByUnion.get(u.id) ?? []) {
          const cPos = positionById.get(cid);
          if (!cPos) continue;
          if (cPos.x < minChildX) minChildX = cPos.x;
          if (cPos.x + PERSON_NODE_WIDTH > maxChildX) maxChildX = cPos.x + PERSON_NODE_WIDTH;
        }
        if (minChildX !== Infinity) {
          unionX = (minChildX + maxChildX) / 2 - UNION_NODE_SIZE / 2;
        }
      }
      if (unionX === null) continue;

      positionById.set(u.id, { x: unionX, y: unionY });
      if (leftNodeId && nodeById.has(leftNodeId) && !leftPos) {
        positionById.set(leftNodeId, { x: unionX - SPOUSE_UNION_GAP - PERSON_NODE_WIDTH, y: tierY });
      }
      if (rightNodeId && nodeById.has(rightNodeId) && !rightPos) {
        positionById.set(rightNodeId, { x: unionX + UNION_NODE_SIZE + SPOUSE_UNION_GAP, y: tierY });
      }
      inLawUnionIds.add(u.id);
      placedAny = true;
    }
  }
  return placedAny;
}
