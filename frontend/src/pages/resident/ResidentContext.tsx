import { createContext, useContext } from "react";
import type { Me, Residency } from "../../types/me";

export interface ResidentContextValue {
  me: Me;
  activeResidency: Residency;
}

export const ResidentContext = createContext<ResidentContextValue | null>(null);

export function useResident() {
  const ctx = useContext(ResidentContext);
  if (!ctx) {
    throw new Error("useResident, ResidentLayout içinde kullanılmalı");
  }
  return ctx;
}
