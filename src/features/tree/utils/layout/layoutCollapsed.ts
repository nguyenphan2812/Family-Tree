import { Node, Edge } from "@xyflow/react";
import { Marriage } from "@/src/types/family";
import {
  PERSON_NODE_WIDTH,
  PERSON_NODE_HEIGHT,
  UNION_NODE_SIZE,
  LayoutResult,
} from "./layoutConstants";

/**
 * 2. COLLAPSED LAYOUT (Thu gọn các nhánh)
 * Deterministic generational layout:
 * - Đời 1: sắp xếp theo từng marriages cách đều nhau, đẩy những người chưa có mối quan hệ sang bên phải ngoài cùng
 * - Đời 2: sắp xếp tương tự đời 1, vị trí nằm ở bên dưới đời 1
 * - Đời 3: tương tự đời 2 đối với đời 1 (vị trí nằm ở bên dưới đời 2)
 */
export function layoutCollapsed(nodes: Node[], edges: Edge[]): LayoutResult {
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
