import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { HorizonKey } from "@/lib/horizons";

type Ctx = { horizon: HorizonKey; setHorizon: (h: HorizonKey) => void };
const HorizonContext = createContext<Ctx | null>(null);

export function HorizonProvider({ children }: { children: ReactNode }) {
  const [horizon, setHorizon] = useState<HorizonKey>("now");
  const value = useMemo(() => ({ horizon, setHorizon }), [horizon]);
  return <HorizonContext.Provider value={value}>{children}</HorizonContext.Provider>;
}

export function useHorizon() {
  const ctx = useContext(HorizonContext);
  if (!ctx) throw new Error("useHorizon must be used inside HorizonProvider");
  return ctx;
}
