"use client";

import { createContext, useContext } from "react";

interface TreeContextValue {
  isEditor: boolean;
  onEditPerson: (personId: string) => void;
  onViewPerson: (personId: string) => void;
  onAddParent: (childPersonId: string) => void;
  onAddSpouse: (personId: string, direction?: "left" | "right") => void;
  onAddChildToPerson: (parentPersonId: string) => void;
  onAddChildToMarriage: (marriageId: string) => void;
  onToggleCollapseMarriage: (marriageId: string) => void;
  onSelectPerson: (personId: string) => void;
  onRequireAuth: () => void;
  hoveredUnionId: string | null;
  hoveredPersonId: string | null;
  setHoveredUnionId: (id: string | null) => void;
  setHoveredPersonId: (id: string | null) => void;
  selectedPersonId: string | null;
}

export const TreeContext = createContext<TreeContextValue | null>(null);

export function useTreeContext() {
  const ctx = useContext(TreeContext);
  if (!ctx) throw new Error("useTreeContext must be used inside TreeCanvas");
  return ctx;
}