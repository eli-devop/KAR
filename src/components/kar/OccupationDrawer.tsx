import type { Occupation } from "@/data/occupations";
import { fmtInt, fmtUSD, fmtPct } from "@/lib/format";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ExternalLink, MessageSquare, FileText, GitCompare, Route as RouteIcon } from "lucide-react";
import { useAllForecasts } from "@/hooks/useForecasts";
import { FORECAST_HORIZONS } from "@/lib/horizons";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

interface Props {
  occupation: Occupation | null;
  onOpenChange: (open: boolean) => void;
}

function Bar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{label}</span><span className="kar-mono">{value}/{max}</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded bg-muted">
        <div className="h-full bg-primary" style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  );
}

export function OccupationDrawer({ occupation, onOpenChange }: Props) {
  const { data: forecasts } = useAllForecasts();
  const occForecasts = occupation
    ? (forecasts || []).filter((f) => f.occ_code === occupation.soc_code)
    : [];

  const trajectory = occupation
    ? [
        { horizon: "now", employment: occupation.employment, ai_exposure: occupation.ai_exposure_score, wage: occupation.median_pay },
        ...FORECAST_HORIZONS.map((h) => {
          const f = occForecasts.find((x) => x.horizon === h.key);
          return f
            ? { horizon: h.label, employment: Number(f.employment), ai_exposure: Number(f.ai_exposure), wage: Number(f.wage) }
            : { horizon: h.label, employment: occupation.employment, ai_exposure: occupation.ai_exposure_score, wage: occupation.median_pay };
        }),
      ]
    : [];

  return (
    <Sheet open={!!occupation} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl" side="right">
        {occupation && (
          <>
            <SheetHeader className="pb-2">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground kar-mono">{occupation.category} · SOC {occupation.soc_code}</div>
              <SheetTitle className="text-2xl">{occupation.title}</SheetTitle>
            </SheetHeader>

            <div className="grid grid-cols-4 gap-2 py-3">
              {[
                { l: "Employment", v: fmtInt(occupation.employment) },
                { l: "Median pay", v: fmtUSD(occupation.median_pay) },
                { l: "Growth", v: fmtPct(occupation.growth_rate) },
                { l: "Education", v: occupation.education },
              ].map(s => (
                <div key={s.l} className="rounded-md border border-border bg-card p-2">
                  <div className="text-[10px] text-muted-foreground">{s.l}</div>
                  <div className="text-sm font-semibold kar-mono">{s.v}</div>
                </div>
              ))}
            </div>

            {occForecasts.length > 0 && (
              <section className="rounded-lg border border-border bg-card/60 p-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Forecast trajectory</h3>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">AI-generated · 8 horizons</span>
                </div>
                <div className="mt-2 h-40 w-full">
                  <ResponsiveContainer>
                    <LineChart data={trajectory} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <XAxis dataKey="horizon" tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                      <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="#9CA3AF" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                      <Line yAxisId="left" type="monotone" dataKey="employment" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} />
                      <Line yAxisId="right" type="monotone" dataKey="ai_exposure" stroke="#B5523A" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-1.5 text-[10px]">
                  {occForecasts
                    .sort((a, b) => FORECAST_HORIZONS.findIndex(h => h.key === a.horizon) - FORECAST_HORIZONS.findIndex(h => h.key === b.horizon))
                    .map((f) => (
                      <div key={f.horizon} className="rounded border border-border p-1.5">
                        <div className="text-muted-foreground">{f.horizon}</div>
                        <div className={"font-medium kar-mono " + (f.employment_delta_pct >= 0 ? "text-success" : "text-destructive")}>
                          {f.employment_delta_pct >= 0 ? "+" : ""}{Number(f.employment_delta_pct).toFixed(1)}%
                        </div>
                        <div className="text-muted-foreground">exp {Math.round(Number(f.ai_exposure))}</div>
                      </div>
                    ))}
                </div>
              </section>
            )}

            <section className="space-y-3 py-2">
              <h3 className="text-sm font-semibold">AI exposure & rationale</h3>
              <Bar label="Digital AI exposure" value={occupation.ai_exposure_score} />
              <Bar label="Physical-world barrier" value={occupation.physical_world_barrier_score} />
              <Bar label="Cognitive offload potential" value={occupation.cognitive_offload_score} />
              <Bar label="Reliability risk if agent fails" value={occupation.reliability_risk_score} />
              <p className="text-sm text-muted-foreground">{occupation.ai_exposure_rationale}</p>
            </section>

            {occForecasts[0]?.rationale && (
              <section className="rounded-md border border-border bg-card p-3">
                <h4 className="text-xs font-semibold">KAR forecast rationale (5y)</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  {occForecasts.find((f) => f.horizon === "5y")?.rationale || occForecasts[0]?.rationale}
                </p>
                {(occForecasts.find((f) => f.horizon === "5y")?.drivers || []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(occForecasts.find((f) => f.horizon === "5y")?.drivers || []).map((d) => (
                      <span key={d} className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">{d}</span>
                    ))}
                  </div>
                )}
              </section>
            )}

            <div className="flex flex-wrap gap-2 py-3">
              <Button size="sm" className="gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Ask KAR about this role</Button>
              <Button size="sm" variant="secondary" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Generate executive brief</Button>
              <Button size="sm" variant="secondary" className="gap-1.5"><GitCompare className="h-3.5 w-3.5" /> Compare roles</Button>
              <Button size="sm" variant="secondary" className="gap-1.5"><RouteIcon className="h-3.5 w-3.5" /> Transition plan</Button>
              <a href={occupation.bls_url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline">
                BLS source <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
