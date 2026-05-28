import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAllForecasts, getNarratives, getLiveStatus } from "@/lib/forecast.functions";
import type { HorizonKey } from "@/lib/horizons";

export interface ForecastRow {
  id: string;
  occ_code: string;
  horizon: HorizonKey;
  employment: number;
  employment_delta_pct: number;
  ai_exposure: number;
  wage: number;
  wage_delta_pct: number;
  outlook: string;
  rationale: string;
  confidence: number;
  drivers: string[];
  generated_at: string;
}

export interface NarrativeRow {
  horizon: HorizonKey;
  headline: string;
  summary: string;
  key_signals: string[];
  unemployment_rate: number;
  labor_force_participation: number;
  ai_displacement_index: number;
}

export function useAllForecasts() {
  const fn = useServerFn(getAllForecasts);
  return useQuery({
    queryKey: ["forecasts", "all"],
    queryFn: async () => (await fn()).forecasts as ForecastRow[],
    staleTime: 60_000,
  });
}

export function useNarratives() {
  const fn = useServerFn(getNarratives);
  return useQuery({
    queryKey: ["narratives"],
    queryFn: async () => (await fn()).narratives as NarrativeRow[],
    staleTime: 60_000,
  });
}

export function useLiveStatus() {
  const fn = useServerFn(getLiveStatus);
  return useQuery({
    queryKey: ["live-status"],
    queryFn: async () => fn(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function pickForecast(
  forecasts: ForecastRow[] | undefined,
  occCode: string,
  horizon: HorizonKey
): ForecastRow | undefined {
  if (!forecasts || horizon === "now") return undefined;
  return forecasts.find((f) => f.occ_code === occCode && f.horizon === horizon);
}
