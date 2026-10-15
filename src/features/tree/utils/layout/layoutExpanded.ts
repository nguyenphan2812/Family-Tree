import { Node, Edge } from "@xyflow/react";
import {
  PERSON_NODE_WIDTH,
  PERSON_NODE_HEIGHT,
  UNION_NODE_SIZE,
  SIBLING_GAP,
  SPOUSE_UNION_GAP,
  VERTICAL_TIER_GAP,
  LayoutResult,
} from "./layoutConstants";
import { resolveTierCollisions } from "./resolveTierCollisions";
import { placeGen1 } from "./layoutGen1";
import { placeInLaws } from "./placeInLaws";
import { finalizeLayoutNodesAndEdges } from "./layoutBusLanes";

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
export async function layoutExpanded(nodes: Node[], edges: Edge[]): Promise<LayoutResult> {
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
      const { leftNodeId, rightNodeId } = (u.data as { leftNodeId?: string; rightNodeId?: string }) ?? {};
      const hasSpouse = (leftNodeId === pId ? rightNodeId : leftNodeId) != null;
      selfWidth += SPOUSE_UNION_GAP * 2 + UNION_NODE_SIZE + (hasSpouse ? PERSON_NODE_WIDTH : 0);
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

  // 1. Build Gen 1 chain & positions
  const gen1People = personNodes.filter((n) => ((n.data as { generation?: number })?.generation ?? 1) === 1);
  const gen1Unions = unionNodes.filter((n) => ((n.data as { generation?: number })?.generation ?? 1) === 1);
  const gen1TierY = genYMap.get(1) ?? 40;

  placeGen1({
    gen1People,
    gen1Unions,
    positionById,
    gen1TierY,
    getClusterWidth,
  });

  // Unions placed by the in-law pass below (parents of someone who married into the tree).
  // Their not-yet-positioned children (siblings of the in-law) are appended next to the
  // already-positioned child instead of being centered under the union.
  const inLawUnionIds = new Set<string>();

  // 2. Position subsequent generations (Gen 2, 3...)
  // Re-run after each in-law pass so siblings of in-laws (and their descendants) get placed too.
  const placeDescendants = () => {
    for (const gen of allGens) {
      if (gen === 1) continue;
      const tierY = genYMap.get(gen) ?? 0;
      const parentUnions = unionNodes
        .filter((u) => ((u.data as { generation?: number })?.generation ?? 1) === gen - 1)
        .sort((a, b) => (positionById.get(a.id)?.x ?? 0) - (positionById.get(b.id)?.x ?? 0));

      for (const pu of parentUnions) {
        const children = childrenByUnion.get(pu.id) ?? [];
        if (children.length === 0) continue;

        // A union without a position (e.g. parents of an in-law at Gen >= 2) must not place its
        // children at a fallback x — that would steal the in-law away from their spouse.
        // The in-law pass below positions such unions above their children afterwards.
        const puPos = positionById.get(pu.id);
        if (!puPos) continue;
        const unionCenterX = puPos.x + UNION_NODE_SIZE / 2;

        const clusterW = getClusterWidth(pu.id);
        const startX = unionCenterX - clusterW / 2;

        let curChildX = startX;
        if (inLawUnionIds.has(pu.id)) {
          let rightmostPlacedX = -Infinity;
          for (const [id, pos] of positionById.entries()) {
            const n = nodeById.get(id);
            if (n && ((n.data as { generation?: number })?.generation ?? 1) === gen) {
              const w = n.type === "union" ? UNION_NODE_SIZE : PERSON_NODE_WIDTH;
              if (pos.x + w > rightmostPlacedX) rightmostPlacedX = pos.x + w;
            }
          }
          if (rightmostPlacedX !== -Infinity) {
            curChildX = rightmostPlacedX + SIBLING_GAP;
          }
        }
        for (const cid of children) {
          if (inLawUnionIds.has(pu.id) && positionById.has(cid)) continue;
          const uWidth = getSubtreeWidth(cid);
          if (!positionById.has(cid)) {
            positionById.set(cid, { x: curChildX, y: tierY });
          }

          // Position any marriages of this child in this generation
          const cUnions = (unionsByPerson.get(cid) ?? []).filter(
            (u) => ((u.data as { generation?: number })?.generation ?? 1) === gen
          );
          let spouseX = (positionById.get(cid)?.x ?? curChildX) + PERSON_NODE_WIDTH + SPOUSE_UNION_GAP;
          for (const cu of cUnions) {
            const { leftNodeId, rightNodeId } = (cu.data as { leftNodeId?: string; rightNodeId?: string }) ?? {};
            const spouseId = leftNodeId === cid ? rightNodeId : leftNodeId;
            if (!positionById.has(cu.id)) {
              positionById.set(cu.id, {
                x: spouseX,
                y: tierY + (PERSON_NODE_HEIGHT - UNION_NODE_SIZE) / 2,
              });
            }
            spouseX += UNION_NODE_SIZE + SPOUSE_UNION_GAP;
            if (spouseId && nodeById.has(spouseId) && !positionById.has(spouseId)) {
              positionById.set(spouseId, { x: spouseX, y: tierY });
              spouseX += PERSON_NODE_WIDTH + SPOUSE_UNION_GAP;
            }
          }

          let marriageWidth = PERSON_NODE_WIDTH;
          for (const cu of cUnions) {
            const { leftNodeId, rightNodeId } = (cu.data as { leftNodeId?: string; rightNodeId?: string }) ?? {};
            const hasSpouse = (leftNodeId === cid ? rightNodeId : leftNodeId) != null;
            marriageWidth += SPOUSE_UNION_GAP * 2 + UNION_NODE_SIZE + (hasSpouse ? PERSON_NODE_WIDTH : 0);
          }
          const totalW = Math.max(marriageWidth, uWidth);
          curChildX += totalW + SIBLING_GAP;
        }
      }
    }
  };

  placeDescendants();
  for (let pass = 0; pass <= allGens.length; pass++) {
    const placed = placeInLaws({
      allGens,
      unionNodes,
      nodeById,
      childrenByUnion,
      positionById,
      genYMap,
      inLawUnionIds,
    });
    if (!placed) break;
    placeDescendants();
  }

  if (process.env.NODE_ENV !== "production") {
    const unpositioned = nodes.filter((n) => !positionById.has(n.id));
    if (unpositioned.length > 0) {
      console.warn(
        "[layoutGraph] Nodes without a computed position (will render at 0,0):",
        unpositioned.map((n) => ({
          id: n.id,
          type: n.type,
          generation: (n.data as { generation?: number })?.generation,
        }))
      );
    }
  }

  // 3. Resolve all tier collisions and iteratively align parents above children
  resolveTierCollisions(
    allGens,
    nodes,
    positionById,
    childrenByUnion,
    unionsByPerson
  );

  // 4. Staggered busY lanes & final node/edge positioning
  return finalizeLayoutNodesAndEdges(
    nodes,
    edges,
    allGens,
    unionNodes,
    positionById,
    genYMap
  );
}
