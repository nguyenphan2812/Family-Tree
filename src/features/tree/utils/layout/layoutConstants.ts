import { Node, Edge } from "@xyflow/react";

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

export const SIBLING_GAP = 20;
export const CLUSTER_GAP = 56;
export const SPOUSE_UNION_GAP = 18;
export const VERTICAL_TIER_GAP = 96;
