import { Node } from "@xyflow/react";
import {
  PERSON_NODE_WIDTH,
  UNION_NODE_SIZE,
  SIBLING_GAP,
} from "./layoutConstants";

/**
 * Resolves horizontal collisions tier-by-tier.
 * Treats married couples/clusters as rigid blocks so spouses are never torn apart.
 * Iteratively sweeps left-to-right to push overlapping blocks, then re-centers parents above children.
 */
export function resolveTierCollisions(
  allGens: number[],
  nodes: Node[],
  positionById: Map<string, { x: number; y: number }>,
  childrenByUnion: Map<string, string[]>,
  unionsByPerson: Map<string, Node[]>
) {
  const nodeById = new Map<string, Node>(nodes.map((n) => [n.id, n]));

  function getNodeBox(id: string): { left: number; right: number; width: number } | null {
    const pos = positionById.get(id);
    if (!pos) return null;
    const n = nodeById.get(id);
    const width = n?.type === "union" ? UNION_NODE_SIZE : PERSON_NODE_WIDTH;
    return { left: pos.x, right: pos.x + width, width };
  }

  function getGenerationClusters(gen: number): { ids: Set<string>; minX: number; maxX: number }[] {
    // Unpositioned nodes are excluded (layoutExpanded warns about them in dev) so they can't
    // masquerade as sitting at x = 0 and distort the collision sweep.
    const genNodes = nodes.filter(
      (n) => ((n.data as { generation?: number })?.generation ?? 1) === gen && positionById.has(n.id)
    );
    const genNodeIds = new Set(genNodes.map((n) => n.id));
    const visited = new Set<string>();
    const clusters: { ids: Set<string>; minX: number; maxX: number }[] = [];

    for (const node of genNodes) {
      if (visited.has(node.id)) continue;

      const clusterIds = new Set<string>();
      const queue = [node.id];
      visited.add(node.id);

      while (queue.length > 0) {
        const curId = queue.shift()!;
        clusterIds.add(curId);
        const curNode = nodeById.get(curId);
        if (!curNode) continue;

        if (curNode.type === "person") {
          const pUnions = (unionsByPerson.get(curId) ?? []).filter(
            (u) => ((u.data as { generation?: number })?.generation ?? 1) === gen && genNodeIds.has(u.id)
          );
          for (const u of pUnions) {
            if (!visited.has(u.id)) {
              visited.add(u.id);
              queue.push(u.id);
            }
          }
        } else if (curNode.type === "union") {
          const { leftNodeId, rightNodeId } = (curNode.data as { leftNodeId?: string; rightNodeId?: string }) ?? {};
          if (leftNodeId && genNodeIds.has(leftNodeId) && !visited.has(leftNodeId)) {
            visited.add(leftNodeId);
            queue.push(leftNodeId);
          }
          if (rightNodeId && genNodeIds.has(rightNodeId) && !visited.has(rightNodeId)) {
            visited.add(rightNodeId);
            queue.push(rightNodeId);
          }
        }
      }

      let minX = Infinity;
      let maxX = -Infinity;
      for (const id of clusterIds) {
        const box = getNodeBox(id);
        if (!box) continue;
        if (box.left < minX) minX = box.left;
        if (box.right > maxX) maxX = box.right;
      }

      clusters.push({ ids: clusterIds, minX, maxX });
    }

    return clusters;
  }

  function shiftCluster(cluster: { ids: Set<string>; minX: number; maxX: number }, dx: number) {
    if (dx === 0) return;
    for (const id of cluster.ids) {
      const pos = positionById.get(id);
      if (pos) {
        positionById.set(id, { x: pos.x + dx, y: pos.y });
      }
    }
    cluster.minX += dx;
    cluster.maxX += dx;
  }

  function shiftDescendants(personId: string, dx: number, visitedPersons = new Set<string>()) {
    if (visitedPersons.has(personId) || dx === 0) return;
    visitedPersons.add(personId);

    const pUnions = unionsByPerson.get(personId) ?? [];
    for (const u of pUnions) {
      const children = childrenByUnion.get(u.id) ?? [];
      for (const cid of children) {
        const cPos = positionById.get(cid);
        if (cPos) {
          positionById.set(cid, { x: cPos.x + dx, y: cPos.y });
        }
        const cUnions = unionsByPerson.get(cid) ?? [];
        for (const cu of cUnions) {
          const cuPos = positionById.get(cu.id);
          if (cuPos) {
            positionById.set(cu.id, { x: cuPos.x + dx, y: cuPos.y });
          }
          const { leftNodeId, rightNodeId } = (cu.data as { leftNodeId?: string; rightNodeId?: string }) ?? {};
          const spouseId = leftNodeId === cid ? rightNodeId : leftNodeId;
          if (spouseId) {
            const sPos = positionById.get(spouseId);
            if (sPos) {
              positionById.set(spouseId, { x: sPos.x + dx, y: sPos.y });
            }
          }
        }
        shiftDescendants(cid, dx, visitedPersons);
      }
    }
  }

  // Left-to-right sweep on each tier to resolve collisions.
  // withDescendants: also drag the pushed cluster's descendants along (keeps children under parents).
  function sweepTiers(withDescendants: boolean): boolean {
    let shifted = false;
    for (const gen of allGens) {
      const clusters = getGenerationClusters(gen);
      clusters.sort((a, b) => a.minX - b.minX);

      for (let i = 1; i < clusters.length; i++) {
        const prev = clusters[i - 1];
        const curr = clusters[i];
        const minGap = SIBLING_GAP;

        if (curr.minX < prev.maxX + minGap) {
          const shift = prev.maxX + minGap - curr.minX;
          shiftCluster(curr, shift);
          if (withDescendants) {
            for (const id of curr.ids) {
              shiftDescendants(id, shift);
            }
          }
          shifted = true;
        }
      }
    }
    return shifted;
  }

  // Iterative relaxation passes
  const MAX_ITERATIONS = 4;
  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    let hasShift = false;

    // Phase 1: Left-to-right sweep on each tier to resolve collisions
    if (sweepTiers(true)) hasShift = true;

    // Phase 2: Bottom-up centering of parents over their children
    for (let gIdx = allGens.length - 2; gIdx >= 0; gIdx--) {
      const gen = allGens[gIdx];
      const clusters = getGenerationClusters(gen);

      for (const cluster of clusters) {
        const uNodes = Array.from(cluster.ids)
          .map((id) => nodeById.get(id))
          .filter((n): n is Node => n?.type === "union" && (childrenByUnion.get(n.id)?.length ?? 0) > 0);

        if (uNodes.length === 0) continue;

        const primaryU = uNodes[0];
        const children = childrenByUnion.get(primaryU.id) ?? [];
        if (children.length === 0) continue;

        let minChildX = Infinity;
        let maxChildX = -Infinity;
        for (const cid of children) {
          const cPos = positionById.get(cid);
          if (cPos) {
            if (cPos.x < minChildX) minChildX = cPos.x;
            if (cPos.x + PERSON_NODE_WIDTH > maxChildX) maxChildX = cPos.x + PERSON_NODE_WIDTH;
          }
        }

        if (minChildX !== Infinity && maxChildX !== -Infinity) {
          const childrenCenterX = (minChildX + maxChildX) / 2;
          const curUnionPos = positionById.get(primaryU.id);
          if (curUnionPos) {
            const curUnionCenter = curUnionPos.x + UNION_NODE_SIZE / 2;
            const diff = childrenCenterX - curUnionCenter;
            if (Math.abs(diff) > 2) {
              shiftCluster(cluster, diff);
              hasShift = true;
            }
          }
        }
      }
    }

    // Phase 3: Push back to x >= 40 if shifted left
    for (const gen of allGens) {
      const clusters = getGenerationClusters(gen);
      if (clusters.length === 0) continue;
      clusters.sort((a, b) => a.minX - b.minX);
      if (clusters[0].minX < 40) {
        const diff = 40 - clusters[0].minX;
        for (const cluster of clusters) {
          shiftCluster(cluster, diff);
        }
        hasShift = true;
      }
    }

    if (!hasShift) break;
  }

  // Final guarantee: Phase 2 may re-center two parent clusters onto the same spot when their
  // children stand side by side (e.g. groom's parents and bride's parents). Non-overlap wins over
  // perfect centering; descendants are not dragged so the groom's branch isn't pulled along.
  sweepTiers(false);
}
