import { Node, Edge } from "@xyflow/react";
import { Marriage } from "@/src/types/family";

export const PERSON_NODE_WIDTH = 136;
export const PERSON_NODE_HEIGHT = 144;
export const UNION_NODE_SIZE = 28;

export interface LayoutOptions {
  isCollapsed?: boolean;
}

export interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
}

const SIBLING_GAP = 20;
const CLUSTER_GAP = 56;
const SPOUSE_UNION_GAP = 18;
const VERTICAL_TIER_GAP = 96;

function interleaveGeneration(genPeople: Node[], genUnions: Node[]): Node[] {
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

/**
 * 1. EXPANDED LAYOUT (Mở rộng tất cả)
 * Thuật toán phân tầng thế hệ tất định:
 * - Format nghiêm ngặt: Mỗi đời chỉ nằm trên đúng 1 đường ngang duy nhất (cùng Y tier).
 * - Các cặp vợ chồng (married) nằm ngang hàng nhau (cùng Y tier), node Union nằm giữa 2 vợ chồng.
 * - Line nối từ bố mẹ xuống con bắt đầu STRICTLY từ bên trong line nối 2 bố mẹ (tại node Union giữa 2 người).
 * - Cụm con cái được căn giữa trực tiếp ngay dưới node Union tương ứng, thả thẳng đứng 90 độ xuống bus line.
 * - Khoảng cách ngang giữa các cặp vợ chồng trên Đời 1 tự động mở rộng theo độ rộng của cụm con cái,
 *   đảm bảo các cụm con không bao giờ đè lên nhau và các line không bao giờ cắt chéo nhau.
 */
async function layoutExpanded(nodes: Node[], edges: Edge[]): Promise<LayoutResult> {
  if (nodes.length === 0) return { nodes: [], edges: [] };

  const allGens = Array.from(
    new Set(
      nodes
        .filter((n) => n.type === "person")
        .map((n) => (n.data as { generation?: number })?.generation ?? 1)
    )
  ).sort((a, b) => a - b);

  const genYMap = new Map<number, number>();
  let currentY = 40;
  for (const gen of allGens) {
    genYMap.set(gen, currentY);
    currentY += PERSON_NODE_HEIGHT + VERTICAL_TIER_GAP;
  }

  const nodeById = new Map<string, Node>(nodes.map((n) => [n.id, n]));
  const unionNodes = nodes.filter((n) => n.type === "union");
  const personNodes = nodes.filter((n) => n.type === "person");

  // Map children per union (sorted by birthOrder / createdAt)
  const childrenByUnion = new Map<string, string[]>();

  for (const u of unionNodes) {
    const { leftNodeId, rightNodeId } = (u.data as { leftNodeId?: string; rightNodeId?: string }) ?? {};
    const childEdges = edges.filter(
      (e) => !e.id.startsWith("e-direct-") && e.source === u.id && e.target !== rightNodeId && e.target !== leftNodeId
    );
    const childrenIds = childEdges.map((e) => e.target).filter((id) => nodeById.has(id));

    childrenIds.sort((aId, bId) => {
      const a = (nodeById.get(aId)?.data as { person?: { birthOrder?: number; birthDate?: string; createdAt?: number } })?.person;
      const b = (nodeById.get(bId)?.data as { person?: { birthOrder?: number; birthDate?: string; createdAt?: number } })?.person;
      if (!a || !b) return 0;
      if (a.birthOrder && b.birthOrder) return a.birthOrder - b.birthOrder;
      if (a.birthDate && b.birthDate) return a.birthDate.localeCompare(b.birthDate);
      return (a.createdAt ?? 0) - (b.createdAt ?? 0);
    });

    childrenByUnion.set(u.id, childrenIds);
  }

  // Marriages as spouse per person
  const unionsByPerson = new Map<string, Node[]>();
  for (const u of unionNodes) {
    const { leftNodeId, rightNodeId } = (u.data as { leftNodeId?: string; rightNodeId?: string }) ?? {};
    if (leftNodeId) {
      if (!unionsByPerson.has(leftNodeId)) unionsByPerson.set(leftNodeId, []);
      unionsByPerson.get(leftNodeId)!.push(u);
    }
    if (rightNodeId) {
      if (!unionsByPerson.has(rightNodeId)) unionsByPerson.set(rightNodeId, []);
      unionsByPerson.get(rightNodeId)!.push(u);
    }
  }

  // Bottom-up: compute bounding width of subtree for any child
  function getSubtreeWidth(pId: string): number {
    const pNode = nodeById.get(pId);
    if (!pNode) return 0;
    const gen = (pNode.data as { generation?: number })?.generation ?? 1;
    const pUnions = (unionsByPerson.get(pId) ?? []).filter(
      (u) => ((u.data as { generation?: number })?.generation ?? 1) === gen
    );

    let selfWidth = PERSON_NODE_WIDTH;
    let maxChildWidth = 0;

    for (const u of pUnions) {
      selfWidth += UNION_NODE_SIZE + SPOUSE_UNION_GAP * 2 + PERSON_NODE_WIDTH;
      const children = childrenByUnion.get(u.id) ?? [];
      if (children.length > 0) {
        let cw = 0;
        for (let i = 0; i < children.length; i++) {
          cw += getSubtreeWidth(children[i]);
          if (i > 0) cw += SIBLING_GAP;
        }
        maxChildWidth = Math.max(maxChildWidth, cw);
      }
    }
    return Math.max(selfWidth, maxChildWidth);
  }

  function getClusterWidth(uId: string): number {
    const children = childrenByUnion.get(uId) ?? [];
    if (children.length === 0) return 0;
    let cw = 0;
    for (let i = 0; i < children.length; i++) {
      cw += getSubtreeWidth(children[i]);
      if (i > 0) cw += SIBLING_GAP;
    }
    return cw;
  }

  const positionById = new Map<string, { x: number; y: number }>();

  // 1. Build Gen 1 chain
  const gen1People = personNodes.filter((n) => ((n.data as { generation?: number })?.generation ?? 1) === 1);
  const gen1Unions = unionNodes.filter((n) => ((n.data as { generation?: number })?.generation ?? 1) === 1);
  const chain = interleaveGeneration(gen1People, gen1Unions);

  // Calculate required centers of unions in Gen 1
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

  // Position Gen 1 items
  const gen1TierY = genYMap.get(1) ?? 40;
  for (let i = 0; i < chain.length; i++) {
    const item = chain[i];
    if (item.type === "union") {
      const center = unionCenterMap.get(item.id) ?? 40;
      const x = center - UNION_NODE_SIZE / 2;
      const y = gen1TierY + (PERSON_NODE_HEIGHT - UNION_NODE_SIZE) / 2;
      positionById.set(item.id, { x, y });
    } else {
      // Person
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

  // 2. Position subsequent generations (Gen 2, 3...)
  for (const gen of allGens) {
    if (gen === 1) continue;
    const tierY = genYMap.get(gen) ?? 0;
    const parentUnions = unionNodes
      .filter((u) => ((u.data as { generation?: number })?.generation ?? 1) === gen - 1)
      .sort((a, b) => (positionById.get(a.id)?.x ?? 0) - (positionById.get(b.id)?.x ?? 0));

    for (const pu of parentUnions) {
      const children = childrenByUnion.get(pu.id) ?? [];
      if (children.length === 0) continue;

      const puPos = positionById.get(pu.id);
      const unionCenterX = puPos ? puPos.x + UNION_NODE_SIZE / 2 : 40;

      const clusterW = getClusterWidth(pu.id);
      const startX = unionCenterX - clusterW / 2;

      let curChildX = startX;
      for (const cid of children) {
        const uWidth = getSubtreeWidth(cid);
        positionById.set(cid, { x: curChildX, y: tierY });

        // Position any marriages of this child in this generation
        const cUnions = (unionsByPerson.get(cid) ?? []).filter(
          (u) => ((u.data as { generation?: number })?.generation ?? 1) === gen
        );
        let spouseX = curChildX + PERSON_NODE_WIDTH + SPOUSE_UNION_GAP;
        for (const cu of cUnions) {
          const { leftNodeId, rightNodeId } = (cu.data as { leftNodeId?: string; rightNodeId?: string }) ?? {};
          const spouseId = leftNodeId === cid ? rightNodeId : leftNodeId;
          positionById.set(cu.id, {
            x: spouseX,
            y: tierY + (PERSON_NODE_HEIGHT - UNION_NODE_SIZE) / 2,
          });
          spouseX += UNION_NODE_SIZE + SPOUSE_UNION_GAP;
          if (spouseId && nodeById.has(spouseId)) {
            positionById.set(spouseId, { x: spouseX, y: tierY });
            spouseX += PERSON_NODE_WIDTH + SPOUSE_UNION_GAP;
          }
        }

        curChildX += uWidth + SIBLING_GAP;
      }
    }
  }

  // 3. Staggered busY lanes for orthogonal drop lines
  const unionBusYMap = new Map<string, number>();
  for (const gen of allGens) {
    const gUnions = unionNodes
      .filter((u) => ((u.data as { generation?: number })?.generation ?? 1) === gen)
      .sort((a, b) => (positionById.get(a.id)?.x ?? 0) - (positionById.get(b.id)?.x ?? 0));

    const tierY = genYMap.get(gen) ?? 0;
    const personBottomY = tierY + PERSON_NODE_HEIGHT;
    const busBaseY = personBottomY + 14;

    const nextGen = allGens.find((g) => g > gen);
    const childTopY =
      nextGen !== undefined ? (genYMap.get(nextGen) ?? (busBaseY + 80)) : busBaseY + 80;

    const verticalGap = Math.max(30, childTopY - busBaseY);
    const laneCount = gUnions.length;
    const step = Math.min(16, Math.max(8, (verticalGap - 20) / Math.max(1, laneCount)));

    gUnions.forEach((uNode, idx) => {
      const busY = busBaseY + (idx % 4) * step;
      unionBusYMap.set(uNode.id, busY);
    });
  }

  const updatedEdges = edges.map((e) => {
    if (e.id.startsWith("e-direct-")) return e;
    const busY = unionBusYMap.get(e.source);
    if (busY !== undefined) {
      return {
        ...e,
        data: {
          ...e.data,
          busY,
        },
      };
    }
    return e;
  });

  const positionedNodes = nodes.map((node) => {
    const isUnion = node.type === "union";
    const width = isUnion ? UNION_NODE_SIZE : PERSON_NODE_WIDTH;
    const height = isUnion ? UNION_NODE_SIZE : PERSON_NODE_HEIGHT;
    return {
      ...node,
      width: node.width ?? width,
      height: node.height ?? height,
      initialWidth: node.initialWidth ?? width,
      initialHeight: node.initialHeight ?? height,
      position: positionById.get(node.id) ?? { x: 0, y: 0 },
    };
  });

  return { nodes: positionedNodes, edges: updatedEdges };
}

/**
 * 2. COLLAPSED LAYOUT (Thu gọn các nhánh)
 * Deterministic generational layout:
 * - Đời 1: sắp xếp theo từng marriages cách đều nhau, đẩy những người chưa có mối quan hệ sang bên phải ngoài cùng
 * - Đời 2: sắp xếp tương tự đời 1, vị trí nằm ở bên dưới đời 1
 * - Đời 3: tương tự đời 2 đối với đời 1 (vị trí nằm ở bên dưới đời 2)
 */
function layoutCollapsed(nodes: Node[], edges: Edge[]): LayoutResult {
  const allGens = Array.from(
    new Set(nodes.map((n) => (n.data as { generation?: number })?.generation ?? 1))
  ).sort((a, b) => a - b);

  const genYMap = new Map<number, number>();
  let currentY = 0;
  for (const gen of allGens) {
    genYMap.set(gen, currentY);
    // In collapsed mode, child lines are hidden until hovered; clean vertical spacing of 90px
    currentY += PERSON_NODE_HEIGHT + 90;
  }

  const positionById = new Map<string, { x: number; y: number }>();

  // Map which people are part of marriages in each generation
  const unionNodeBetweenPair = new Set<string>();
  const marriedPersonIdsByGen = new Map<number, Set<string>>();

  for (const node of nodes) {
    if (node.type !== "union") continue;
    const gen = (node.data as { generation?: number })?.generation ?? 1;
    if (!marriedPersonIdsByGen.has(gen)) marriedPersonIdsByGen.set(gen, new Set());

    const { leftNodeId, rightNodeId, marriage } = (node.data as {
      leftNodeId?: string;
      rightNodeId?: string;
      marriage?: Marriage;
    }) ?? {};

    if (leftNodeId) marriedPersonIdsByGen.get(gen)!.add(leftNodeId);
    if (rightNodeId) marriedPersonIdsByGen.get(gen)!.add(rightNodeId);
    if (marriage?.spouseIds) {
      for (const sid of marriage.spouseIds) {
        marriedPersonIdsByGen.get(gen)!.add(sid);
      }
    }

    if (leftNodeId && rightNodeId) {
      unionNodeBetweenPair.add(`${leftNodeId}__${rightNodeId}`);
      unionNodeBetweenPair.add(`${rightNodeId}__${leftNodeId}`);
    }
  }

  const UNION_GAP = 64; // Spacing between spouses for union badge
  const MARRIAGE_GAP = 60; // Spacing between distinct marriage clusters ("cách đều nhau")
  const SIBLING_GAP = 30; // Spacing between unmarried siblings/individuals
  const START_X = 40;

  for (const gen of allGens) {
    const tierY = genYMap.get(gen) ?? 0;
    const genPeople = nodes.filter(
      (n) => n.type === "person" && ((n.data as { generation?: number })?.generation ?? 1) === gen
    );

    const marriedSet = marriedPersonIdsByGen.get(gen) ?? new Set<string>();

    // Separate into married (từng marriages) vs unmarried (chưa có mối quan hệ)
    const marriedPeople: Node[] = [];
    const unmarriedPeople: Node[] = [];

    for (const pNode of genPeople) {
      if (marriedSet.has(pNode.id)) {
        marriedPeople.push(pNode);
      } else {
        unmarriedPeople.push(pNode);
      }
    }

    let currentX = START_X;

    // A. Place married people first ("sắp xếp theo từng marriages cách đều nhau")
    for (let i = 0; i < marriedPeople.length; i++) {
      const pNode = marriedPeople[i];
      positionById.set(pNode.id, { x: currentX, y: tierY });

      if (i < marriedPeople.length - 1) {
        const nextNode = marriedPeople[i + 1];
        const hasUnion = unionNodeBetweenPair.has(`${pNode.id}__${nextNode.id}`);
        // If they share a union node, use UNION_GAP (64px), otherwise MARRIAGE_GAP (60px)
        const gap = hasUnion ? UNION_GAP : MARRIAGE_GAP;
        currentX += PERSON_NODE_WIDTH + gap;
      } else {
        currentX += PERSON_NODE_WIDTH;
      }
    }

    // B. Place unmarried people at the far right ("đẩy những người chưa có mối quan hệ sang bên phải ngoài cùng")
    if (unmarriedPeople.length > 0) {
      if (marriedPeople.length > 0) {
        currentX += MARRIAGE_GAP;
      }
      for (let i = 0; i < unmarriedPeople.length; i++) {
        const pNode = unmarriedPeople[i];
        positionById.set(pNode.id, { x: currentX, y: tierY });
        currentX += PERSON_NODE_WIDTH + SIBLING_GAP;
      }
    }
  }

  // Center union nodes between spouses
  for (const node of nodes) {
    if (node.type !== "union") continue;
    const gen = (node.data as { generation?: number })?.generation ?? 1;
    const tierY = genYMap.get(gen) ?? 0;
    const unionY = tierY + (PERSON_NODE_HEIGHT - UNION_NODE_SIZE) / 2;

    const { leftNodeId, rightNodeId } = (node.data as {
      leftNodeId?: string;
      rightNodeId?: string;
    }) ?? {};

    const leftPos = leftNodeId ? positionById.get(leftNodeId) : null;
    const rightPos = rightNodeId ? positionById.get(rightNodeId) : null;

    if (leftPos && rightPos) {
      const gapMidX = (leftPos.x + PERSON_NODE_WIDTH + rightPos.x) / 2;
      const unionX = gapMidX - UNION_NODE_SIZE / 2;
      positionById.set(node.id, { x: unionX, y: unionY });
    } else if (leftPos) {
      const unionX = leftPos.x + PERSON_NODE_WIDTH + 18;
      positionById.set(node.id, { x: unionX, y: unionY });
    } else if (rightPos) {
      const unionX = rightPos.x - UNION_NODE_SIZE - 18;
      positionById.set(node.id, { x: unionX, y: unionY });
    }
  }

  // Assign unique busY lanes to unions for collision-free highlight lines
  const unionBusYMap = new Map<string, number>();
  const unionsByGen = new Map<number, Node[]>();
  for (const node of nodes) {
    if (node.type !== "union") continue;
    const gen = (node.data as { generation?: number })?.generation ?? 1;
    if (!unionsByGen.has(gen)) unionsByGen.set(gen, []);
    unionsByGen.get(gen)!.push(node);
  }

  for (const [gen, genUnions] of unionsByGen.entries()) {
    genUnions.sort((a, b) => {
      const posA = positionById.get(a.id)?.x ?? 0;
      const posB = positionById.get(b.id)?.x ?? 0;
      return posA - posB;
    });

    const tierY = genYMap.get(gen) ?? 0;
    const personBottomY = tierY + PERSON_NODE_HEIGHT;
    const busBaseY = personBottomY + 12;

    const nextGen = allGens.find((g) => g > gen);
    const childTopY = nextGen !== undefined ? (genYMap.get(nextGen) ?? (busBaseY + 80)) : busBaseY + 80;

    const verticalGap = Math.max(30, childTopY - busBaseY);
    const laneCount = genUnions.length;
    const step = Math.min(16, Math.max(8, (verticalGap - 20) / Math.max(1, laneCount)));

    genUnions.forEach((uNode, idx) => {
      const busY = busBaseY + idx * step;
      unionBusYMap.set(uNode.id, busY);
    });
  }

  const updatedEdges = edges.map((e) => {
    if (e.id.startsWith("e-direct-")) return e;
    const busY = unionBusYMap.get(e.source);
    if (busY !== undefined) {
      return {
        ...e,
        data: {
          ...e.data,
          busY,
        },
      };
    }
    return e;
  });

  const positionedNodes = nodes.map((node) => {
    const isUnion = node.type === "union";
    const width = isUnion ? UNION_NODE_SIZE : PERSON_NODE_WIDTH;
    const height = isUnion ? UNION_NODE_SIZE : PERSON_NODE_HEIGHT;
    return {
      ...node,
      width: node.width ?? width,
      height: node.height ?? height,
      initialWidth: node.initialWidth ?? width,
      initialHeight: node.initialHeight ?? height,
      position: positionById.get(node.id) ?? { x: 0, y: 0 },
    };
  });

  return { nodes: positionedNodes, edges: updatedEdges };
}

/**
 * Main layout entry point.
 * Switches between Expanded Layout (pure ELK hierarchy from commit d2322b5)
 * and Collapsed Layout (compact generational tiers) based on isCollapsed.
 */
export async function layoutGraph(
  nodes: Node[],
  edges: Edge[],
  options?: LayoutOptions
): Promise<LayoutResult> {
  if (nodes.length === 0) return { nodes: [], edges: [] };

  const isCollapsed = options?.isCollapsed ?? false;

  if (!isCollapsed) {
    return layoutExpanded(nodes, edges);
  }

  return layoutCollapsed(nodes, edges);
}