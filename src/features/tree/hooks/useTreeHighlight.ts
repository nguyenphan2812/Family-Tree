"use client";

import { useMemo } from "react";
import { Node, Edge } from "@xyflow/react";
import { Marriage } from "@/src/types/family";

export interface UseTreeHighlightProps {
  nodes: Node[];
  edges: Edge[];
  marriages: Marriage[];
  hoveredUnionId: string | null;
  hoveredPersonId: string | null;
}

export interface UseTreeHighlightResult {
  displayNodes: Node[];
  displayEdges: Edge[];
  activeNodeIds: Set<string> | null;
  activeEdgeIds: Set<string> | null;
}

export function useTreeHighlight({
  nodes,
  edges,
  marriages,
  hoveredUnionId,
  hoveredPersonId,
}: UseTreeHighlightProps): UseTreeHighlightResult {
  // Lookup maps for fast ancestor & descendant traversal (memoized per marriages)
  const { parentMarriageByChildId, marriagesBySpouseId } = useMemo(() => {
    const parentMap = new Map<string, Marriage>();
    const spouseMap = new Map<string, Marriage[]>();
    for (const m of marriages) {
      for (const cid of m.childrenIds) {
        parentMap.set(cid, m);
      }
      for (const sid of m.spouseIds) {
        if (!spouseMap.has(sid)) {
          spouseMap.set(sid, []);
        }
        spouseMap.get(sid)!.push(m);
      }
    }
    return { parentMarriageByChildId: parentMap, marriagesBySpouseId: spouseMap };
  }, [marriages]);

  // Compute active nodes & edges when hovering on a Union or Person (full recursive bloodline traversal)
  const { activeNodeIds, activeEdgeIds } = useMemo(() => {
    if (!hoveredUnionId && !hoveredPersonId) {
      return { activeNodeIds: null, activeEdgeIds: null };
    }
    const nodeIds = new Set<string>();
    const edgeIds = new Set<string>();

    // Recursive ancestor traversal (parents, grandparents, great-grandparents, ...)
    const visitedAncestors = new Set<string>();
    const addAncestors = (personId: string) => {
      if (visitedAncestors.has(personId)) return;
      visitedAncestors.add(personId);

      const parentM = parentMarriageByChildId.get(personId);
      if (!parentM) return;
      const unionId = `union-${parentM.id}`;
      nodeIds.add(unionId);
      for (const sid of parentM.spouseIds) {
        nodeIds.add(sid);
        addAncestors(sid);
      }
    };

    // Recursive descendant traversal (children, grandchildren, great-grandchildren, ...)
    const visitedDescendants = new Set<string>();
    const addDescendants = (personId: string) => {
      if (visitedDescendants.has(personId)) return;
      visitedDescendants.add(personId);

      const ownMarriages = marriagesBySpouseId.get(personId) ?? [];
      for (const m of ownMarriages) {
        const unionId = `union-${m.id}`;
        nodeIds.add(unionId);
        for (const sid of m.spouseIds) {
          nodeIds.add(sid);
        }
        for (const cid of m.childrenIds) {
          nodeIds.add(cid);
          addDescendants(cid);
        }
      }
    };

    if (hoveredUnionId) {
      const mId = hoveredUnionId.startsWith("union-")
        ? hoveredUnionId.replace("union-", "")
        : hoveredUnionId;
      const marriage = marriages.find((m) => m.id === mId);
      if (marriage) {
        nodeIds.add(`union-${marriage.id}`);
        for (const sid of marriage.spouseIds) {
          nodeIds.add(sid);
          addAncestors(sid);
        }
        for (const cid of marriage.childrenIds) {
          nodeIds.add(cid);
          addDescendants(cid);
        }
      }
    } else if (hoveredPersonId) {
      nodeIds.add(hoveredPersonId);
      // Include direct siblings for immediate family context
      const parentM = parentMarriageByChildId.get(hoveredPersonId);
      if (parentM) {
        nodeIds.add(`union-${parentM.id}`);
        for (const sid of parentM.spouseIds) {
          nodeIds.add(sid);
        }
        for (const cid of parentM.childrenIds) {
          nodeIds.add(cid);
        }
      }
      // Trace all ancestors up to the roots
      addAncestors(hoveredPersonId);
      // Trace all descendants down to the leaves
      addDescendants(hoveredPersonId);
    }

    // Collect all edges connecting the active bloodline nodes
    for (const e of edges) {
      if (nodeIds.has(e.source) && nodeIds.has(e.target)) {
        if (e.id.startsWith("e-direct-")) {
          const edgeData = e.data as { marriageId?: string; sharedId?: string; outerId?: string } | undefined;
          if (hoveredPersonId && edgeData?.sharedId && hoveredPersonId === edgeData.sharedId) {
            continue;
          }
        }
        edgeIds.add(e.id);
      }
    }

    return { activeNodeIds: nodeIds, activeEdgeIds: edgeIds };
  }, [hoveredUnionId, hoveredPersonId, parentMarriageByChildId, marriagesBySpouseId, marriages, edges]);

  // Styled display nodes (dim non-active nodes to 25% when hovering; all nodes stay strictly above edges)
  const displayNodes = useMemo(() => {
    return nodes.map((n) => {
      const isDimmed = activeNodeIds ? !activeNodeIds.has(n.id) : false;
      const isActive = activeNodeIds ? activeNodeIds.has(n.id) : false;
      return {
        ...n,
        style: {
          ...n.style,
          opacity: isDimmed ? 0.25 : 1,
          filter: isDimmed ? "grayscale(40%)" : "none",
          transition: "opacity 0.2s ease, filter 0.2s ease",
          zIndex: isDimmed ? 25 : (isActive ? 50 : 30),
        },
      };
    });
  }, [nodes, activeNodeIds]);

  // Styled display edges (edges stay at zIndex 2/0 behind nodes; highlighted edges get zIndex 20)
  const displayEdges = useMemo(() => {
    return edges.map((e) => {
      const isDirect = e.id.startsWith("e-direct-");
      const isHighlighted = activeEdgeIds ? activeEdgeIds.has(e.id) : false;
      const isCollapsedChild = Boolean(e.data?.isCollapsedChildEdge);

      if (isDirect) {
        return {
          ...e,
          zIndex: isHighlighted ? 20 : 0,
          style: {
            ...e.style,
            opacity: isHighlighted ? 1 : 0,
            strokeWidth: isHighlighted ? 3 : 0,
            pointerEvents: isHighlighted ? ("auto" as const) : ("none" as const),
            transition: "opacity 0.2s ease, stroke-width 0.2s ease",
            zIndex: isHighlighted ? 20 : 0,
          },
        };
      }

      if (isCollapsedChild) {
        return {
          ...e,
          zIndex: isHighlighted ? 20 : 0,
          style: {
            ...e.style,
            opacity: isHighlighted ? 1 : 0,
            strokeWidth: isHighlighted ? 2.5 : 0,
            pointerEvents: isHighlighted ? ("auto" as const) : ("none" as const),
            transition: "opacity 0.2s ease, stroke-width 0.2s ease",
            zIndex: isHighlighted ? 20 : 0,
          },
        };
      }

      if (!activeEdgeIds) {
        return {
          ...e,
          zIndex: 2,
        };
      }

      return {
        ...e,
        zIndex: isHighlighted ? 20 : 1,
        style: {
          ...e.style,
          opacity: isHighlighted ? 1 : 0.12,
          strokeWidth: isHighlighted ? 3 : 1.5,
          transition: "opacity 0.2s ease, stroke-width 0.2s ease",
          zIndex: isHighlighted ? 20 : 1,
        },
      };
    });
  }, [edges, activeEdgeIds]);

  return { displayNodes, displayEdges, activeNodeIds, activeEdgeIds };
}
