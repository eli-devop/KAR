import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Download, Share2, FileJson, Activity, TrendingUp, TrendingDown,
  Brain, Newspaper, Layers, Sparkles, ExternalLink, RefreshCw, Radio,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useHorizonOccupations } from "@/hooks/useHorizonOccupations";
import { useDashboardLive } from "@/hooks/useDashboardLive";
import { horizonLabel } from "@/lib/horizons";
import { CollaborationReadiness } from "@/components/kar/CollaborationReadiness";
import { FinancialAutonomy } from "@/components/kar/FinancialAutonomy";
import { AILiteracyEnforcement } from "@/components/kar/AILiteracyEnforcement";
import { fmtCompact, fmtPct, fmtUSD } from "@/lib/format";
import { TOTAL_EMPLOYMENT } from "@/data/occupations";
import { downloadBlob, toCSV } from "@/lib/download";
import { cn } from "@/lib/utils";
import { HorizonSelector } from "@/components/kar/HorizonSelector";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Live Labor Market Reports — KAR" },
      { name: "description", content: "Interactive, real-time U.S. labor market reports with live BLS macro series, news wire, and KAR AI-exposure analysis — inspired by karpathy.ai/jobs." },
    ],
  }),
  component: Page,
});

type ReportId = "pulse" | "exposure" | "shifts" | "karpathy" | "news" | "cohort";
const REPORTS: { id: ReportId; title: string; tag: string; desc: string; icon: typeof Activity }[] = [
  { id: "pulse",    title: "U.S. Labor Pulse",            tag: "Live · BLS",      desc: "Unemployment, LFPR and nonfarm payrolls — live macro series with sparklines.", icon: Activity },
  { id: "exposure", title: "AI Exposure Heatmap",         tag: "Interactive",     desc: "Distribution of AI-exposure scores across 342 occupations, drill into any cell.",  icon: Brain },
  { id: "shifts",   title: "Workforce Shift Tracker",     tag: "Horizon-aware",   desc: "Top movers at the selected horizon — employment, wages and exposure deltas.",     icon: TrendingUp },
  { id: "karpathy", title: "Karpathy Lens",               tag: "Inspired by",     desc: "342 occupations through the karpathy.ai/jobs lens — exposure × physical barrier.", icon: Layers },
  { id: "news",     title: "AI × Labor News Wire",        tag: "Streaming",       desc: "Live RSS of layoffs, automation and reskilling stories — filter by category.",     icon: Newspaper },
  { id: "cohort",   title: "Cohort Risk Composer",        tag: "Build your own",  desc: "Pick occupations, see live aggregate exposure, employment and wage roll-ups.",     icon: Sparkles },
];

function Page() {
  const { horizon, occupations, narrative, isForecast } = useHorizonOccupations();
  const { data: live, isLoading: liveLoading, dataUpdatedAt, refetch, isRefetching } = useDashboardLive();
  const [active, setActive] = useState<ReportId>("pulse");

  const projectedTotal = occupations.reduce((s, o) => s + o.employment_forecast, 0);
  const totalDelta = ((projectedTotal / TOTAL_EMPLOYMENT) - 1) * 100;
  const highRisk = occupations.filter(o => o.ai_exposure_forecast >= 70);
  const highRiskEmployment = highRisk.reduce((s, o) => s + o.employment_forecast, 0);

  const exportRows = () => occupations.map(o => ({
    soc_code: o.soc_code, title: o.title, category: o.category,
    employment_today: o.employment, employment_forecast: Math.round(o.employment_forecast),
    employment_delta_pct: Math.round(o.employment_delta_pct * 10) / 10,
    median_wage: Math.round(o.wage_forecast),
    ai_exposure_today: o.ai_exposure_score,
    ai_exposure_forecast: Math.round(o.ai_exposure_forecast),
    horizon: horizonLabel(horizon),
  }));

  const onExportJSON = () => { downloadBlob(`kar-labor-${horizon}.json`, JSON.stringify({ horizon, narrative, occupations: exportRows() }, null, 2), "application/json"); toast.success("JSON exported"); };
  const onExportCSV = () => { downloadBlob(`kar-labor-${horizon}.csv`, toCSV(exportRows()), "text/csv"); toast.success("CSV exported"); };
  const onShare = async () => { try { await navigator.clipboard.writeText(window.location.href); toast.success("Share link copied"); } catch { toast.error("Could not copy"); } };

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;
  const sinceMin = lastUpdated ? Math.max(0, Math.round((Date.now() - lastUpdated.getTime()) / 60000)) : null;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            Live Reports · BLS {sinceMin !== null ? `${sinceMin}m ago` : "syncing"} · Horizon {horizonLabel(horizon)}
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">U.S. Labor Market — Live</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Interactive, real-time reports on the U.S. labor market — methodology inspired by{" "}
            <a href="https://karpathy.ai/jobs/" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">karpathy.ai/jobs</a>.
            Every panel below is live and clickable.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HorizonSelector compact />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={cn("h-3.5 w-3.5", isRefetching && "animate-spin")} /> Refresh
          </Button>
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={onExportJSON}><FileJson className="h-3.5 w-3.5" /> JSON</Button>
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={onExportCSV}><Download className="h-3.5 w-3.5" /> CSV</Button>
          <Button size="sm" className="gap-1.5" onClick={onShare}><Share2 className="h-3.5 w-3.5" /> Share</Button>
        </div>
      </header>

      {/* Macro hero strip */}
      <MacroStrip series={live?.series} loading={liveLoading} />

      {/* Report tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        {REPORTS.map(r => {
          const Icon = r.icon;
          const isActive = r.id === active;
          return (
            <button
              key={r.id}
              onClick={() => setActive(r.id)}
              className={cn(
                "group flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition",
                isActive
                  ? "border-primary/50 bg-primary/10 text-foreground shadow-card"
                  : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              <Icon className={cn("h-3.5 w-3.5", isActive ? "text-primary" : "")} />
              <div>
                <div className="font-semibold leading-none">{r.title}</div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wider opacity-70">{r.tag}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active report */}
      <section className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-card md:p-6">
        {active === "pulse"    && <PulseReport series={live?.series} loading={liveLoading} />}
        {active === "exposure" && <ExposureHeatmap occupations={occupations} />}
        {active === "shifts"   && <ShiftsReport occupations={occupations} isForecast={isForecast} horizon={horizon} />}
        {active === "karpathy" && <KarpathyLens occupations={occupations} />}
        {active === "news"     && <NewsWire items={live?.news ?? []} loading={liveLoading} />}
        {active === "cohort"   && <CohortComposer occupations={occupations} />}
      </section>

      {/* Auto brief */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Auto-brief · {horizonLabel(horizon)}</div>
            <h2 className="mt-0.5 text-xl font-semibold">
              {narrative?.headline || (isForecast ? `U.S. labor market outlook · ${horizonLabel(horizon)}` : "Where AI agents are reshaping work today")}
            </h2>
          </div>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">Live draft</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Stat label="Projected employment" value={fmtCompact(projectedTotal)} sub={`${fmtPct(Math.round(totalDelta * 10) / 10)} vs today`} tone={totalDelta < 0 ? "neg" : "pos"} />
          <Stat label="High-exposure workforce (≥70)" value={fmtCompact(highRiskEmployment)} sub={`${highRisk.length} occupations`} />
          <Stat label="Macro signals" value={narrative ? `${narrative.unemployment_rate?.toFixed(1)}% U · ${narrative.labor_force_participation?.toFixed(1)}% LFPR` : "—"} sub={narrative ? `AI displacement idx ${Math.round(narrative.ai_displacement_index)}` : "Refresh forecasts"} />
        </div>
        <p className="mt-4 text-sm leading-relaxed text-foreground">
          {narrative?.summary ||
            `Across the BLS Occupational Outlook Handbook, ${highRisk.length} occupations score ≥70 on the KAR AI-exposure rubric, covering ${fmtCompact(highRiskEmployment)} U.S. workers. The largest concentration sits in office, finance, legal and customer-facing categories — mirroring the cognitive-task framing in karpathy.ai/jobs.`}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Methodology inspired by{" "}
          <a href="https://karpathy.ai/jobs/" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">karpathy.ai/jobs</a> · KAR Rubric v1.2 · BLS OOH + live macro series.
        </p>
      </section>

      <div className="mt-6">
        <CollaborationReadiness variant="compact" />
        <div className="mt-3"><FinancialAutonomy variant="compact" /></div>
        <div className="mt-3"><AILiteracyEnforcement variant="compact" /></div>
      </div>
    </div>
  );
}

// ============================================================
// Macro strip
// ============================================================
const MACRO_LABELS: Record<string, { label: string; suffix: string; fmt: (n: number) => string }> = {
  LNS14000000: { label: "Unemployment", suffix: "%", fmt: n => n.toFixed(1) },
  LNS11300000: { label: "LFPR",         suffix: "%", fmt: n => n.toFixed(1) },
  CES0000000001:{label: "Nonfarm Payrolls", suffix: "K", fmt: n => fmtCompact(n) },
};

function MacroStrip({ series, loading }: { series?: Record<string, { period: string; value: number }[]>; loading: boolean }) {
  const keys = Object.keys(MACRO_LABELS);
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {keys.map(k => {
        const cfg = MACRO_LABELS[k];
        const data = series?.[k] ?? [];
        const last = data[data.length - 1]?.value;
        const prev = data[data.length - 2]?.value;
        const delta = last && prev ? last - prev : 0;
        return (
          <div key={k} className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Radio className="h-3 w-3 text-success" />{cfg.label}
              </div>
              {!!last && (
                <div className={cn("text-[11px] kar-mono", delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-muted-foreground")}>
                  {delta > 0 ? "▲" : delta < 0 ? "▼" : "—"} {Math.abs(delta).toFixed(2)}
                </div>
              )}
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <div className="text-2xl font-semibold kar-mono">{last != null ? cfg.fmt(last) : loading ? "…" : "—"}</div>
              <div className="text-xs text-muted-foreground">{cfg.suffix}</div>
            </div>
            <Sparkline points={data.slice(-24).map(d => d.value)} />
          </div>
        );
      })}
    </div>
  );
}

function Sparkline({ points }: { points: number[] }) {
  if (!points.length) return <div className="h-10" />;
  const min = Math.min(...points), max = Math.max(...points);
  const range = max - min || 1;
  const w = 200, h = 40;
  const path = points.map((p, i) => {
    const x = (i / (points.length - 1 || 1)) * w;
    const y = h - ((p - min) / range) * h;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-10 w-full">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary" />
    </svg>
  );
}

// ============================================================
// Reports
// ============================================================
function PulseReport({ series, loading }: { series?: Record<string, { period: string; value: number }[]>; loading: boolean }) {
  const [seriesId, setSeriesId] = useState("LNS14000000");
  const data = series?.[seriesId] ?? [];
  const cfg = MACRO_LABELS[seriesId];
  return (
    <div>
      <ReportHeader title="U.S. Labor Pulse" subtitle="Live macro series from the U.S. Bureau of Labor Statistics" />
      <div className="mt-3 flex flex-wrap gap-2">
        {Object.keys(MACRO_LABELS).map(k => (
          <button key={k} onClick={() => setSeriesId(k)} className={cn(
            "rounded-md border px-3 py-1.5 text-xs",
            k === seriesId ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground"
          )}>{MACRO_LABELS[k].label}</button>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-border bg-background p-4">
        {data.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">{loading ? "Syncing live BLS data…" : "No data yet. Click Refresh."}</div>
        ) : (
          <BigSparkline points={data.map(d => d.value)} labels={data.map(d => d.period)} fmt={cfg.fmt} suffix={cfg.suffix} />
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Source: BLS · auto-refreshes every 5 minutes.</p>
    </div>
  );
}

function BigSparkline({ points, labels, fmt, suffix }: { points: number[]; labels: string[]; fmt: (n: number) => string; suffix: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const min = Math.min(...points), max = Math.max(...points);
  const range = max - min || 1;
  const w = 800, h = 200, pad = 10;
  const xs = points.map((_, i) => pad + (i / (points.length - 1 || 1)) * (w - pad * 2));
  const ys = points.map(p => h - pad - ((p - min) / range) * (h - pad * 2));
  const path = points.map((_, i) => `${i === 0 ? "M" : "L"}${xs[i].toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const area = `${path} L${xs[xs.length - 1].toFixed(1)},${h - pad} L${xs[0].toFixed(1)},${h - pad} Z`;
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-48 w-full" onMouseLeave={() => setHover(null)}>
        <path d={area} className="fill-primary/10" />
        <path d={path} fill="none" className="stroke-primary" strokeWidth="2" />
        {points.map((_, i) => (
          <rect key={i} x={xs[i] - 4} y={0} width={8} height={h} fill="transparent"
            onMouseEnter={() => setHover(i)} />
        ))}
        {hover !== null && (
          <>
            <line x1={xs[hover]} y1={pad} x2={xs[hover]} y2={h - pad} className="stroke-muted-foreground/40" strokeDasharray="3 3" />
            <circle cx={xs[hover]} cy={ys[hover]} r="4" className="fill-primary" />
          </>
        )}
      </svg>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="kar-mono text-muted-foreground">{labels[0]}</span>
        <span className="kar-mono">
          {hover !== null ? `${labels[hover]} · ${fmt(points[hover])}${suffix}` : `Latest: ${fmt(points[points.length - 1])}${suffix}`}
        </span>
        <span className="kar-mono text-muted-foreground">{labels[labels.length - 1]}</span>
      </div>
    </div>
  );
}

function ExposureHeatmap({ occupations }: { occupations: ReturnType<typeof useHorizonOccupations>["occupations"] }) {
  const [selected, setSelected] = useState<{ cat: string; bucket: number } | null>(null);
  const cats = useMemo(() => Array.from(new Set(occupations.map(o => o.category))).sort(), [occupations]);
  const buckets = [0, 20, 40, 60, 80]; // bucket starts
  const grid = useMemo(() => {
    const g: Record<string, Record<number, typeof occupations>> = {};
    for (const c of cats) g[c] = { 0: [], 20: [], 40: [], 60: [], 80: [] };
    for (const o of occupations) {
      const b = buckets[Math.min(4, Math.floor(o.ai_exposure_forecast / 20))];
      g[o.category][b].push(o);
    }
    return g;
  }, [occupations, cats]);

  const maxCell = Math.max(...cats.flatMap(c => buckets.map(b => grid[c][b].reduce((s, o) => s + o.employment_forecast, 0))));

  return (
    <div>
      <ReportHeader title="AI Exposure Heatmap" subtitle="Workers (M) by category × exposure score. Click any cell to drill in." />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left text-muted-foreground font-normal">Category</th>
              {buckets.map(b => <th key={b} className="px-2 py-1 text-center text-muted-foreground font-normal kar-mono">{b}–{b + 20}</th>)}
              <th className="px-2 py-1 text-right text-muted-foreground font-normal">Total</th>
            </tr>
          </thead>
          <tbody>
            {cats.map(c => {
              const rowTotal = buckets.reduce((s, b) => s + grid[c][b].reduce((ss, o) => ss + o.employment_forecast, 0), 0);
              return (
                <tr key={c} className="border-t border-border">
                  <td className="px-2 py-1 font-medium">{c}</td>
                  {buckets.map(b => {
                    const emp = grid[c][b].reduce((s, o) => s + o.employment_forecast, 0);
                    const intensity = maxCell > 0 ? emp / maxCell : 0;
                    const isSel = selected?.cat === c && selected?.bucket === b;
                    return (
                      <td key={b} className="p-0.5">
                        <button
                          onClick={() => setSelected(isSel ? null : { cat: c, bucket: b })}
                          className={cn(
                            "block w-full rounded px-2 py-2 text-center kar-mono transition",
                            isSel ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-primary/40"
                          )}
                          style={{ backgroundColor: `color-mix(in oklab, var(--primary) ${Math.round(intensity * 60)}%, var(--card))` }}
                        >
                          {emp > 0 ? fmtCompact(emp) : "—"}
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-2 py-1 text-right kar-mono text-muted-foreground">{fmtCompact(rowTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {selected && (
        <div className="mt-4 rounded-lg border border-border bg-background p-4 animate-fade-in">
          <div className="text-sm font-semibold">
            {selected.cat} · exposure {selected.bucket}–{selected.bucket + 20}
          </div>
          <ul className="mt-2 divide-y divide-border text-xs">
            {grid[selected.cat][selected.bucket].length === 0 ? (
              <li className="py-2 text-muted-foreground">No occupations in this cell.</li>
            ) : grid[selected.cat][selected.bucket].map(o => (
              <li key={o.id} className="flex items-center justify-between py-1.5">
                <span>{o.title}</span>
                <span className="kar-mono text-muted-foreground">{fmtCompact(o.employment_forecast)} · {Math.round(o.ai_exposure_forecast)}/100</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ShiftsReport({ occupations, isForecast, horizon }: { occupations: ReturnType<typeof useHorizonOccupations>["occupations"]; isForecast: boolean; horizon: string }) {
  const [sortBy, setSortBy] = useState<"emp" | "wage" | "expo">("emp");
  const sorted = useMemo(() => {
    const arr = [...occupations];
    if (sortBy === "emp") arr.sort((a, b) => Math.abs(b.employment_delta_pct) - Math.abs(a.employment_delta_pct));
    if (sortBy === "wage") arr.sort((a, b) => Math.abs(b.wage_delta_pct) - Math.abs(a.wage_delta_pct));
    if (sortBy === "expo") arr.sort((a, b) => Math.abs(b.ai_exposure_forecast - a.ai_exposure_score) - Math.abs(a.ai_exposure_forecast - a.ai_exposure_score));
    return arr.slice(0, 15);
  }, [occupations, sortBy]);

  return (
    <div>
      <ReportHeader
        title={`Workforce Shift Tracker · ${horizon}`}
        subtitle={isForecast ? "Top movers at the selected forecast horizon" : "Switch horizon to see projected shifts"}
      />
      <div className="mt-3 inline-flex rounded-md border border-border bg-background p-0.5">
        {[["emp", "By employment Δ"], ["wage", "By wage Δ"], ["expo", "By exposure Δ"]].map(([k, label]) => (
          <button key={k} onClick={() => setSortBy(k as typeof sortBy)} className={cn("rounded-sm px-3 py-1 text-xs", sortBy === k ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{label}</button>
        ))}
      </div>
      <div className="mt-4 space-y-1.5">
        {sorted.map(o => {
          const ed = o.employment_delta_pct;
          const wd = o.wage_delta_pct;
          const xd = o.ai_exposure_forecast - o.ai_exposure_score;
          return (
            <div key={o.id} className="grid grid-cols-12 items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs">
              <div className="col-span-4 font-medium truncate">{o.title}</div>
              <div className="col-span-2 text-muted-foreground kar-mono truncate">{o.category}</div>
              <Bar label="Emp" value={ed} />
              <Bar label="Wage" value={wd} />
              <Bar label="Expo" value={xd} suffix="pt" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Bar({ label, value, suffix = "%" }: { label: string; value: number; suffix?: string }) {
  const w = Math.min(100, Math.abs(value) * 3);
  const tone = value > 0 ? "bg-success" : value < 0 ? "bg-destructive" : "bg-muted";
  return (
    <div className="col-span-2">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{label}</span>
        <span className={cn("kar-mono", value > 0 ? "text-success" : value < 0 ? "text-destructive" : "")}>{value > 0 ? "+" : ""}{value.toFixed(1)}{suffix}</span>
      </div>
      <div className="mt-0.5 h-1.5 w-full rounded-full bg-muted">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}

function KarpathyLens({ occupations }: { occupations: ReturnType<typeof useHorizonOccupations>["occupations"] }) {
  const W = 560, H = 320, pad = 40;
  const [hover, setHover] = useState<string | null>(null);
  const points = occupations.map(o => {
    const x = pad + (o.ai_exposure_forecast / 100) * (W - pad * 2);
    const y = H - pad - (o.physical_world_barrier_score / 100) * (H - pad * 2);
    const r = Math.max(3, Math.min(18, Math.sqrt(o.employment_forecast / 1e5)));
    return { o, x, y, r };
  });
  const hot = hover ? points.find(p => p.o.id === hover) : null;

  return (
    <div>
      <ReportHeader
        title="Karpathy Lens"
        subtitle={<>342 occupations plotted by AI exposure × physical-world barrier — direct homage to <a href="https://karpathy.ai/jobs/" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">karpathy.ai/jobs</a>.</>}
      />
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-lg border border-border bg-background p-3">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
            <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} className="stroke-border" />
            <line x1={pad} y1={pad} x2={pad} y2={H - pad} className="stroke-border" />
            <text x={W / 2} y={H - 8} textAnchor="middle" className="fill-muted-foreground text-[10px]">AI Exposure →</text>
            <text x={12} y={H / 2} transform={`rotate(-90 12 ${H / 2})`} textAnchor="middle" className="fill-muted-foreground text-[10px]">Physical barrier ↑</text>
            {points.map(p => (
              <circle key={p.o.id} cx={p.x} cy={p.y} r={p.r}
                className={cn("cursor-pointer transition-opacity", hover && hover !== p.o.id ? "opacity-30" : "opacity-80")}
                fill={`color-mix(in oklab, var(--primary) ${Math.round(p.o.ai_exposure_forecast)}%, var(--success))`}
                stroke="var(--background)" strokeWidth="0.5"
                onMouseEnter={() => setHover(p.o.id)} onMouseLeave={() => setHover(null)}>
                <title>{p.o.title}</title>
              </circle>
            ))}
          </svg>
        </div>
        <div className="rounded-lg border border-border bg-background p-4 text-xs">
          {hot ? (
            <div className="animate-fade-in">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{hot.o.category}</div>
              <div className="text-base font-semibold">{hot.o.title}</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <KV k="Exposure" v={`${Math.round(hot.o.ai_exposure_forecast)}/100`} />
                <KV k="Physical barrier" v={`${hot.o.physical_world_barrier_score}/100`} />
                <KV k="Employment" v={fmtCompact(hot.o.employment_forecast)} />
                <KV k="Median wage" v={fmtUSD(hot.o.wage_forecast)} />
              </div>
              <p className="mt-2 text-muted-foreground">{hot.o.rationale_forecast || hot.o.ai_exposure_rationale}</p>
              <a href={hot.o.bls_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-primary hover:underline">
                BLS profile <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ) : (
            <div className="text-muted-foreground">
              Hover any dot. Bubble size = employment. Lower-right = highly automatable knowledge work (the karpathy.ai/jobs "soft" zone). Upper-left = manual, physical, hard to automate.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className="kar-mono text-sm font-semibold">{v}</div>
    </div>
  );
}

type NewsItem = { id: string; title: string; url: string; source: string | null; summary: string | null; category: string; published_at: string | null };
const NEWS_CATS = [
  { k: "all", label: "All" },
  { k: "ai_jobs", label: "AI · Jobs" },
  { k: "ai_labor", label: "AI · Labor" },
  { k: "labor_market", label: "Labor market" },
  { k: "education", label: "Reskilling" },
  { k: "wages", label: "Wages" },
];
function NewsWire({ items, loading }: { items: NewsItem[]; loading: boolean }) {
  const [cat, setCat] = useState("all");
  const filtered = cat === "all" ? items : items.filter(i => i.category === cat);
  return (
    <div>
      <ReportHeader title="AI × Labor News Wire" subtitle="Live RSS aggregation — layoffs, automation, reskilling, wages" />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {NEWS_CATS.map(c => (
          <button key={c.k} onClick={() => setCat(c.k)} className={cn(
            "rounded-full border px-2.5 py-1 text-[11px]",
            cat === c.k ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground"
          )}>{c.label}</button>
        ))}
      </div>
      <div className="mt-4 max-h-[480px] divide-y divide-border overflow-y-auto rounded-lg border border-border bg-background">
        {loading && !filtered.length ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Streaming headlines…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No headlines yet for this category.</div>
        ) : filtered.slice(0, 60).map(n => (
          <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer"
             className="group flex items-start gap-3 px-4 py-3 transition hover:bg-muted/40">
            <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium leading-snug group-hover:text-primary">{n.title}</div>
              <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {n.source || "—"} · {n.published_at ? new Date(n.published_at).toLocaleDateString() : "—"} · <span className="uppercase tracking-wider">{n.category.replace("_", " ")}</span>
              </div>
            </div>
            <ChevronRight className="mt-1 h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
          </a>
        ))}
      </div>
    </div>
  );
}

function CohortComposer({ occupations }: { occupations: ReturnType<typeof useHorizonOccupations>["occupations"] }) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const filtered = occupations.filter(o => o.title.toLowerCase().includes(q.toLowerCase())).slice(0, 30);
  const cohort = occupations.filter(o => picked.has(o.id));
  const emp = cohort.reduce((s, o) => s + o.employment_forecast, 0);
  const wageAvg = cohort.length ? cohort.reduce((s, o) => s + o.wage_forecast * o.employment_forecast, 0) / (emp || 1) : 0;
  const expoAvg = cohort.length ? cohort.reduce((s, o) => s + o.ai_exposure_forecast * o.employment_forecast, 0) / (emp || 1) : 0;
  const toggle = (id: string) => setPicked(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return (
    <div>
      <ReportHeader title="Cohort Risk Composer" subtitle="Pick occupations to assemble a custom workforce cohort — aggregates update live." />
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-lg border border-border bg-background p-3">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search occupations…"
                 className="mb-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {filtered.map(o => (
              <label key={o.id} className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted/40">
                <input type="checkbox" checked={picked.has(o.id)} onChange={() => toggle(o.id)} />
                <span className="flex-1 truncate">{o.title}</span>
                <span className="text-muted-foreground kar-mono">{Math.round(o.ai_exposure_forecast)}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Cohort · {picked.size} occupations</div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <KV k="Workers" v={emp ? fmtCompact(emp) : "—"} />
            <KV k="Avg wage (wt)" v={emp ? fmtUSD(Math.round(wageAvg)) : "—"} />
            <KV k="Avg exposure (wt)" v={emp ? `${Math.round(expoAvg)}/100` : "—"} />
          </div>
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground"><span>Cohort exposure</span><span>{Math.round(expoAvg)}/100</span></div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-gradient-to-r from-success via-warning to-destructive" style={{ width: `${Math.round(expoAvg)}%` }} />
            </div>
          </div>
          {cohort.length > 0 && (
            <ul className="mt-4 max-h-48 divide-y divide-border overflow-y-auto text-xs">
              {cohort.map(o => (
                <li key={o.id} className="flex items-center justify-between py-1.5">
                  <span className="truncate">{o.title}</span>
                  <span className="kar-mono text-muted-foreground">{fmtCompact(o.employment_forecast)} · {Math.round(o.ai_exposure_forecast)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Shared bits
// ============================================================
function ReportHeader({ title, subtitle }: { title: string; subtitle: React.ReactNode }) {
  return (
    <div className="border-b border-border pb-3">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "pos" | "neg" }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold kar-mono">{value}</div>
      {sub && <div className={cn("text-[11px] kar-mono", tone === "neg" ? "text-destructive" : tone === "pos" ? "text-success" : "text-muted-foreground")}>{sub}</div>}
    </div>
  );
}
