import { useMemo } from "react";
import { OCCUPATIONS, type Occupation } from "@/data/occupations";
import { useHorizon } from "@/contexts/HorizonContext";
import { useAllForecasts, useNarratives, type ForecastRow } from "@/hooks/useForecasts";

export interface HorizonOccupation extends Occupation {
  employment_forecast: number;
  ai_exposure_forecast: number;
  wage_forecast: number;
  employment_delta_pct: number;
  wage_delta_pct: number;
  rationale_forecast?: string;
  has_forecast: boolean;
}

export function useHorizonOccupations() {
  const { horizon } = useHorizon();
  const { data: forecasts } = useAllForecasts();
  const { data: narratives } = useNarratives();

  const byCode = useMemo(() => {
    const m: Record<string, ForecastRow> = {};
    if (horizon !== "now" && forecasts) {
      for (const f of forecasts) if (f.horizon === horizon) m[f.occ_code] = f;
    }
    return m;
  }, [forecasts, horizon]);

  const occupations = useMemo<HorizonOccupation[]>(
    () =>
      OCCUPATIONS.map((o) => {
        const f = byCode[o.soc_code];
        return {
          ...o,
          employment_forecast: f ? Number(f.employment) : o.employment,
          ai_exposure_forecast: f ? Number(f.ai_exposure) : o.ai_exposure_score,
          wage_forecast: f ? Number(f.wage) : o.median_pay,
          employment_delta_pct: f ? Number(f.employment_delta_pct) : 0,
          wage_delta_pct: f ? Number(f.wage_delta_pct) : 0,
          rationale_forecast: f?.rationale,
          has_forecast: !!f,
        };
      }),
    [byCode]
  );

  const narrative = useMemo(
    () => (horizon === "now" ? undefined : narratives?.find((n) => n.horizon === horizon)),
    [narratives, horizon]
  );

  return { horizon, occupations, narrative, isForecast: horizon !== "now" };
}
