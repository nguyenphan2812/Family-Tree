export interface Family {
  name: string;
  editorEmails: string[];
}

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  deathDate?: string;
  gender?: "male" | "female" | "other";
  photoURL?: string;
  bio?: string;
  marriageIds: string[];
  position?: { x: number; y: number };
  createdBy?: string;
  createdAt?: number;
  updatedAt?: number;
}

export type MarriageStatus = "married" | "divorced" | "widowed" | "unknown";

export interface Marriage {
  id: string;
  spouseIds: string[]; // usually 2; can be 1 for "unknown spouse" placeholder
  order: number; // 1 = first marriage, 2 = second, etc.
  status: MarriageStatus;
  date?: string;
  childrenIds: string[];
  isPlaceholder?: boolean; // true for auto-created "unknown spouse" unions
}