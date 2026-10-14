import { Node } from "@xyflow/react";
import {
  PERSON_NODE_WIDTH,
  PERSON_NODE_HEIGHT,
  UNION_NODE_SIZE,
  CLUSTER_GAP,
  SPOUSE_UNION_GAP,
} from "./layoutConstants";

export function interleaveGeneration(genPeople: Node[], genUnions: Node[]): Node[] {
  const chain: Node[] = [];
  const usedUnions = new Set<string>();

  for (let i = 0; i < genPeople.length; i++) {
    const p = genPeople[i];
    chain.push(p);

    if (i < genPeople.length - 1) {
      const nextP = genPeople[i + 1];
      const u = genUnions.find(
        (un) =>
          !usedUnions.has(un.id) &&
          (((un.data as { leftNodeId?: string; rightNodeId?: string })?.leftNodeId === p.id &&
            (un.data as { leftNodeId?: string; rightNodeId?: string })?.rightNodeId === nextP.id) ||
            ((un.data as { leftNodeId?: string; rightNodeId?: string })?.leftNodeId === nextP.id &&
              (un.data as { leftNodeId?: string; rightNodeId?: string })?.rightNodeId === p.id))
      );
      if (u) {
        usedUnions.add(u.id);
        chain.push(u);
      }
    }
  }

  for (const u of genUnions) {
    if (!usedUnions.has(u.id)) {
      usedUnions.add(u.id);
      const { leftNodeId, rightNodeId } = (u.data as { leftNodeId?: string; rightNodeId?: string }) ?? {};
      const leftIdx = chain.findIndex((n) => n.id === leftNodeId);
      const rightIdx = chain.findIndex((n) => n.id === rightNodeId);
      if (leftIdx !== -1) {
        chain.splice(leftIdx + 1, 0, u);
      } else if (rightIdx !== -1) {
        chain.splice(rightIdx, 0, u);
      } else {
        chain.push(u);
      }
    }
  }

  return chain;
}

export interface PlaceGen1Params {
  gen1People: Node[];
  gen1Unions: Node[];
  positionById: Map<string, { x: number; y: number }>;
  gen1TierY: number;
  getClusterWidth: (uId: string) => number;
}

export function placeGen1({
  gen1People,
  gen1Unions,
  positionById,
  gen1TierY,
  getClusterWidth,
}: PlaceGen1Params): void {
  const chain = interleaveGeneration(gen1People, gen1Unions);
  const chainUnions = chain.filter((n) => n.type === "union");
  const unionCenterMap = new Map<string, number>();

  if (chainUnions.length > 0) {
    const firstUnionIdx = chain.findIndex((n) => n.type === "union");
    const peopleBefore = Math.max(0, firstUnionIdx);
    let currentUnionCenter =
      40 + peopleBefore * (PERSON_NODE_WIDTH + CLUSTER_GAP) - (peopleBefore > 0 ? CLUSTER_GAP : 0) +
      SPOUSE_UNION_GAP + UNION_NODE_SIZE / 2;

    for (let i = 0; i < chainUnions.length; i++) {
      const u = chainUnions[i];
      unionCenterMap.set(u.id, currentUnionCenter);

      if (i < chainUnions.length - 1) {
        const nextU = chainUnions[i + 1];
        const uIdx = chain.findIndex((n) => n.id === u.id);
        const nextUIdx = chain.findIndex((n) => n.id === nextU.id);
        const peopleBetween = Math.max(1, nextUIdx - uIdx - 1);

        const w1 = getClusterWidth(u.id);
        const w2 = getClusterWidth(nextU.id);

        const minCenterDist = (w1 > 0 ? w1 / 2 : 0) + CLUSTER_GAP + (w2 > 0 ? w2 / 2 : 0);
        const minParentDist =
          peopleBetween * PERSON_NODE_WIDTH +
          (peopleBetween - 1) * CLUSTER_GAP +
          SPOUSE_UNION_GAP * 2 +
          UNION_NODE_SIZE;
        const step = Math.max(minCenterDist, minParentDist);
        currentUnionCenter += step;
      }
    }
  }

  for (let i = 0; i < chain.length; i++) {
    const item = chain[i];
    if (item.type === "union") {
      const center = unionCenterMap.get(item.id) ?? 40;
      const x = center - UNION_NODE_SIZE / 2;
      const y = gen1TierY + (PERSON_NODE_HEIGHT - UNION_NODE_SIZE) / 2;
      positionById.set(item.id, { x, y });
    } else {
      let prevUnion: Node | null = null;
      let nextUnion: Node | null = null;
      for (let j = i - 1; j >= 0; j--) {
        if (chain[j].type === "union") { prevUnion = chain[j]; break; }
      }
      for (let j = i + 1; j < chain.length; j++) {
        if (chain[j].type === "union") { nextUnion = chain[j]; break; }
      }

      let x = 40;
      if (prevUnion && nextUnion) {
        const prevIdx = chain.findIndex((n) => n.id === prevUnion!.id);
        const nextIdx = chain.findIndex((n) => n.id === nextUnion!.id);
        const peopleBetween = nextIdx - prevIdx - 1;

        const prevRight = (unionCenterMap.get(prevUnion.id) ?? 0) + UNION_NODE_SIZE / 2;
        const nextLeft = (unionCenterMap.get(nextUnion.id) ?? 0) - UNION_NODE_SIZE / 2;

        if (peopleBetween === 1) {
          const midX = (prevRight + nextLeft) / 2;
          x = midX - PERSON_NODE_WIDTH / 2;
        } else {
          const personRank = i - prevIdx - 1;
          const availableSpan = nextLeft - SPOUSE_UNION_GAP - (prevRight + SPOUSE_UNION_GAP);
          const totalPeopleW = peopleBetween * PERSON_NODE_WIDTH;
          const gap = Math.max(CLUSTER_GAP, (availableSpan - totalPeopleW) / Math.max(1, peopleBetween - 1));
          x = prevRight + SPOUSE_UNION_GAP + personRank * (PERSON_NODE_WIDTH + gap);
        }
      } else if (nextUnion) {
        const nextIdx = chain.findIndex((n) => n.id === nextUnion.id);
        const personRank = nextIdx - 1 - i;
        const nextLeft = (unionCenterMap.get(nextUnion.id) ?? 0) - UNION_NODE_SIZE / 2;
        x = nextLeft - SPOUSE_UNION_GAP - PERSON_NODE_WIDTH - personRank * (PERSON_NODE_WIDTH + CLUSTER_GAP);
      } else if (prevUnion) {
        const prevIdx = chain.findIndex((n) => n.id === prevUnion.id);
        const personRank = i - prevIdx - 1;
        const prevRight = (unionCenterMap.get(prevUnion.id) ?? 0) + UNION_NODE_SIZE / 2;
        x = prevRight + SPOUSE_UNION_GAP + personRank * (PERSON_NODE_WIDTH + CLUSTER_GAP);
      }
      positionById.set(item.id, { x, y: gen1TierY });
    }
  }
}
