import { Node, Edge } from "@xyflow/react";
import {
  PERSON_NODE_WIDTH,
  PERSON_NODE_HEIGHT,
  UNION_NODE_SIZE,
  LayoutOptions,
  LayoutResult,
} from "./layout/layoutConstants";
import { layoutExpanded } from "./layout/layoutExpanded";
import { layoutCollapsed } from "./layout/layoutCollapsed";

export { PERSON_NODE_WIDTH, PERSON_NODE_HEIGHT, UNION_NODE_SIZE };
export type { LayoutOptions, LayoutResult };

/**
 * Main layout entry point.
 * Switches between Expanded Layout (hierarchical tree with collision resolution)
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