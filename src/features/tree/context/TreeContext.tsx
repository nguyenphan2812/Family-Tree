"use client";

import { createContext, useContext } from "react";
import { PersonFormData } from "../components/PersonFormModal";

type Direction = "top" | "bottom" | "left" | "right";

interface TreeContextValue {
  isEditor: boolean;
  onAddCard: (personId: string, direction: Direction, data: PersonFormData) => void;
  onAddTree: (data: PersonFormData) => void;
  openAddModal: (onSubmit: (data: PersonFormData) => void) => void;
  onEditPerson: (personId: string) => void;
  onExpandStack: (personId: string) => void;
}

export const TreeContext = createContext<TreeContextValue | null>(null);

export function useTreeContext() {
  const ctx = useContext(TreeContext);
  if (!ctx) throw new Error("useTreeContext must be used inside TreeCanvas");
  return ctx;
}