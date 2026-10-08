"use client";

import { createContext, useContext } from "react";
import { PersonFormData } from "../components/PersonFormModal";

interface TreeContextValue {
  isEditor: boolean;
  onEditPerson: (personId: string) => void;
  onAddParent: (childPersonId: string) => void;
  onAddSpouse: (personId: string) => void;
  onAddChildToPerson: (parentPersonId: string) => void;
  onAddChildToMarriage: (marriageId: string) => void;
  onToggleCollapseMarriage: (marriageId: string) => void;
  onSelectPerson: (personId: string) => void;
  onAddTree: (data: PersonFormData) => void;
}

export const TreeContext = createContext<TreeContextValue | null>(null);

export function useTreeContext() {
  const ctx = useContext(TreeContext);
  if (!ctx) throw new Error("useTreeContext must be used inside TreeCanvas");
  return ctx;
}