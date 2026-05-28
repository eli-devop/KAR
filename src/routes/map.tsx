import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { OccupationTreemap, METRICS, type Metric } from "@/components/kar/OccupationTreemap";
import { OccupationDrawer } from "@/components/kar/OccupationDrawer";
import { CollaborationReadiness } from "@/components/kar/CollaborationReadiness";
import { FinancialAutonomy } from "@/components/kar/FinancialAutonomy";
import { AILiteracyEnforcement } from "@/components/kar/AILiteracyEnforcement";
import { OCCUPATIONS, CATEGORIES, type Occupation } from "@/data/occupations";
import { fmtCompact } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { HorizonSelector } from "@/components/kar/HorizonSelector";
import { useHorizon } from "@/contexts/HorizonContext";
import { useAllForecasts } from "@/hooks/useForecasts";
import { horizonLabel } from "@/lib/horizons";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Labor Market Map — KAR" },
      { name: "description", content: "Interactive treemap of U.S. occupations sized by employment and colored by metric." },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  const [metric, setMetric] = useState<Metric>("ai_exposure");
  const [q, setQ] = useState("");
  const [cats, setCats] = useState<string[]>([]);
  const [selected, setSelected] = useState<Occupation | null>(null);
  const { horizon } = useHorizon();
  const { data: forecasts } = useAllForecasts();

  const forecastsByCode = useMemo(() => {
    if (horizon === "now" || !forecasts) return undefined;
    const map: Record<string, { employment: number; ai_exposure: number; wage: number; delta_pct: number }> = {};
    for (const f of forecasts) {
      if (f.horizon === horizon) {
        map[f.occ_code] = {
          employment: Number(f.employment),
          ai_exposure: Number(f.ai_exposure),
          wage: Number(f.wage),
          delta_pct: Number(f.employment_delta_pct),
        };
      }
    }
    return map;
  }, [forecasts, horizon]);

  const data = useMemo(() => {
    return OCCUPATIONS.filter(o => {
      if (cats.length && !cats.includes(o.category)) return false;
      if (q && !o.title.toLowerCase().includes(q.toLowerCase()) && !o.category.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [q, cats]);

  const totalEmp = data.reduce((s, o) => {
    const ov = forecastsByCode?.[o.soc_code];
    return s + (ov?.employment ?? o.employment);
  }, 0);

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col md:h-screen">
      <header className="flex flex-col gap-3 border-b border-border bg-card/70 px-6 py-4 backdrop-blur">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Labor Market Map · <span className="text-primary">{horizonLabel(horizon)}</span></h1>
            <p className="text-xs text-muted-foreground">
              {data.length} occupations · {fmtCompact(totalEmp)} workers · area = forecasted employment · color = {METRICS.find(m => m.value === metric)?.label}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <HorizonSelector compact />
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search occupations" className="h-9 w-56 pl-8 text-sm" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {METRICS.map(m => (
            <button
              key={m.value}
              onClick={() => setMetric(m.value)}
              title={m.hint}
              className={
                "rounded-md border px-2.5 py-1 text-xs transition-colors " +
                (metric === m.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground")
              }
            >{m.label}</button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Sectors</span>
          {CATEGORIES.map(c => {
            const active = cats.includes(c);
            return (
              <button
                key={c}
                onClick={() => setCats(prev => active ? prev.filter(x => x !== c) : [...prev, c])}
                className={
                  "rounded-full border px-2 py-0.5 text-[11px] transition-colors " +
                  (active ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:text-foreground")
                }
              >{c}</button>
            );
          })}
          {cats.length > 0 && (
            <button onClick={() => setCats([])} className="text-[11px] text-primary hover:underline">Clear</button>
          )}
        </div>
      </header>

      <div className="flex-1 space-y-4 p-4">
        <CollaborationReadiness variant="compact" />
        <div className="mt-3"><FinancialAutonomy variant="compact" /></div>
        <div className="mt-3"><AILiteracyEnforcement variant="compact" /></div>
        <div className="h-[600px] w-full overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <OccupationTreemap metric={metric} data={data} onSelect={setSelected} forecastsByCode={forecastsByCode} />
        </div>
      </div>

      <OccupationDrawer occupation={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </div>
  );
}
