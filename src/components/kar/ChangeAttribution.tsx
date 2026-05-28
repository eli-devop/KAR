import { useMemo, useState } from "react";
import { Sliders, Cpu, TrendingUp, Layers } from "lucide-react";
import {
  BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend, ReferenceLine,
} from "recharts";
import { OCCUPATIONS } from "@/data/occupations";
import { useAllForecasts } from "@/hooks/useForecasts";
import { useHorizon } from "@/contexts/HorizonContext";
import { HORIZONS, horizonLabel, type HorizonKey } from "@/lib/horizons";
import { fmtCompact } from "@/lib/format";

// Decomposition model -------------------------------------------------------
// For each occupation at a chosen horizon, we attribute the projected
// employment change to three drivers:
//
//   1. AI exposure pressure (substitution/augmentation):
//        ai_jobs = -k * (exposure/100) * employment * years_weight
//      `k` is the user-adjustable AI sensitivity (0 = no AI effect,
//      2 = double the baseline coefficient).
//
//   2. Baseline labor-market trend (BLS OOH growth, demographics, demand):
//        base_jobs = growth_rate/100 * employment * years
//
//   3. Other forces (residual the forecast attributes to wages, policy,
//      cyclical demand, or unexplained variance):
//        other_jobs = forecast_delta - ai_jobs - base_jobs
//
// When no forecast row exists we still show baseline + AI components.

const STAGE_COLOR = {
  ai: "var(--destructive)",
  base: "var(--success)",
  other: "var(--accent)",
} as const;

function yearsFor(h: HorizonKey) {
  return (HORIZONS.find((x) => x.key === h)?.days ?? 0) / 365;
}

interface Row {
  title: string;
  category: string;
  employment: number;
  ai: number;     // jobs
  base: number;   // jobs
  other: number;  // jobs
  total: number;  // jobs (net delta)
}

function computeRows(
  horizon: HorizonKey,
  forecasts: { occ_code: string; horizon: string; employment: number | string; employment_delta_pct: number | string }[] | undefined,
  sensitivity: number,
): Row[] {
  const years = yearsFor(horizon);
  // Baseline AI coefficient: ~0.8pp displacement per year for a fully-exposed
  // role at exposure=100. Tuned so default sensitivity=1 gives realistic
  // shares vs the 2026 BLS outlook.
  const AI_BASE_K = 0.008;
  const forecastByCode: Record<string, number> = {};
  for (const f of forecasts ?? []) {
    if (f.horizon === horizon) forecastByCode[f.occ_code] = Number(f.employment_delta_pct) || 0;
  }
  return OCCUPATIONS.map((o) => {
    const aiJobs = -AI_BASE_K * sensitivity * (o.ai_exposure_score / 100) * o.employment * Math.max(years, 0.08);
    const baseJobs = (o.growth_rate / 100) * o.employment * years;
    const forecastDeltaPct = forecastByCode[o.soc_code];
    let totalJobs: number;
    let otherJobs: number;
    if (forecastDeltaPct !== undefined) {
      totalJobs = (forecastDeltaPct / 100) * o.employment;
      otherJobs = totalJobs - aiJobs - baseJobs;
    } else {
      // No forecast row → total = ai + base (residual unknown, set to 0).
      totalJobs = aiJobs + baseJobs;
      otherJobs = 0;
    }
    return {
      title: o.title,
      category: o.category,
      employment: o.employment,
      ai: aiJobs,
      base: baseJobs,
      other: otherJobs,
      total: totalJobs,
    };
  });
}

type Mode = "top_loss" | "top_gain" | "category";

export function ChangeAttribution() {
  const { horizon: ctxHorizon } = useHorizon();
  const { data: forecasts } = useAllForecasts();
  const [horizon, setHorizon] = useState<HorizonKey>(ctxHorizon === "now" ? "1y" : ctxHorizon);
  const [sensitivity, setSensitivity] = useState(1); // 0..2
  const [mode, setMode] = useState<Mode>("top_loss");

  const rows = useMemo(() => computeRows(horizon, forecasts, sensitivity), [horizon, forecasts, sensitivity]);

  const totals = useMemo(() => {
    const t = rows.reduce(
      (a, r) => ({ ai: a.ai + r.ai, base: a.base + r.base, other: a.other + r.other, total: a.total + r.total, employment: a.employment + r.employment }),
      { ai: 0, base: 0, other: 0, total: 0, employment: 0 },
    );
    const absSum = Math.abs(t.ai) + Math.abs(t.base) + Math.abs(t.other) || 1;
    return {
      ...t,
      aiShare: (Math.abs(t.ai) / absSum) * 100,
      baseShare: (Math.abs(t.base) / absSum) * 100,
      otherShare: (Math.abs(t.other) / absSum) * 100,
    };
  }, [rows]);

  const chartData = useMemo(() => {
    if (mode === "category") {
      const byCat: Record<string, Row> = {};
      for (const r of rows) {
        if (!byCat[r.category]) {
          byCat[r.category] = { title: r.category, category: r.category, employment: 0, ai: 0, base: 0, other: 0, total: 0 };
        }
        byCat[r.category].employment += r.employment;
        byCat[r.category].ai += r.ai;
        byCat[r.category].base += r.base;
        byCat[r.category].other += r.other;
        byCat[r.category].total += r.total;
      }
      return Object.values(byCat)
        .sort((a, b) => b.employment - a.employment)
        .slice(0, 10)
        .map((r) => ({
          label: r.title,
          "AI exposure": Math.round(r.ai / 1000),
          "Baseline trend": Math.round(r.base / 1000),
          "Other forces": Math.round(r.other / 1000),
        }));
    }
    const sorted = [...rows].sort((a, b) => a.total - b.total);
    const picked = mode === "top_loss" ? sorted.slice(0, 10) : sorted.slice(-10).reverse();
    return picked.map((r) => ({
      label: r.title.length > 28 ? r.title.slice(0, 26) + "…" : r.title,
      "AI exposure": Math.round(r.ai / 1000),
      "Baseline trend": Math.round(r.base / 1000),
      "Other forces": Math.round(r.other / 1000),
    }));
  }, [rows, mode]);

  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Layers className="h-4 w-4 text-primary" />
            Change attribution · AI vs broader labor forces
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Decompose the projected employment change at <span className="kar-mono">{horizonLabel(horizon)}</span> into AI-exposure pressure, baseline BLS trend, and other macro forces. Slide AI sensitivity to stress-test the assumption.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {HORIZONS.filter((h) => h.key !== "now").map((h) => (
            <button
              key={h.key}
              onClick={() => setHorizon(h.key)}
              className={
                "rounded-md border px-2.5 py-1 text-xs transition-colors " +
                (h.key === horizon ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")
              }
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>

      {/* Headline shares */}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <ShareTile label="AI exposure" jobs={totals.ai} share={totals.aiShare} color={STAGE_COLOR.ai} icon={Cpu} />
        <ShareTile label="Baseline trend" jobs={totals.base} share={totals.baseShare} color={STAGE_COLOR.base} icon={TrendingUp} />
        <ShareTile label="Other forces" jobs={totals.other} share={totals.otherShare} color={STAGE_COLOR.other} icon={Layers} />
      </div>

      <div className="mt-2 text-xs text-muted-foreground">
        Net projected change: <span className={"kar-mono font-medium " + (totals.total < 0 ? "text-destructive" : "text-success")}>
          {totals.total >= 0 ? "+" : ""}{fmtCompact(totals.total)}
        </span> jobs across {fmtCompact(totals.employment)} workers.
      </div>

      {/* Stacked bar of the chosen slice */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {([
            { id: "top_loss", label: "Top losses" },
            { id: "top_gain", label: "Top gains" },
            { id: "category", label: "By category" },
          ] as const).map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={
                "rounded-md border px-2.5 py-1 text-xs transition-colors " +
                (m.id === mode ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")
              }
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sliders className="h-3.5 w-3.5" />
          <span>AI sensitivity</span>
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={sensitivity}
            onChange={(e) => setSensitivity(Number(e.target.value))}
            className="h-1 w-40 cursor-pointer accent-[var(--primary)]"
          />
          <span className="kar-mono w-9 text-right text-foreground">{sensitivity.toFixed(2)}×</span>
        </div>
      </div>

      <div className="mt-4 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }} stackOffset="sign">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} unit="k" />
            <YAxis dataKey="label" type="category" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={170} />
            <ReferenceLine x={0} stroke="var(--border)" />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => `${v > 0 ? "+" : ""}${v}k jobs`}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="AI exposure" stackId="s" fill={STAGE_COLOR.ai} />
            <Bar dataKey="Baseline trend" stackId="s" fill={STAGE_COLOR.base} />
            <Bar dataKey="Other forces" stackId="s" fill={STAGE_COLOR.other} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">
        Model: <span className="kar-mono">aiJobs = −0.008 · sensitivity · (exposure/100) · employment · years</span>. Baseline uses BLS OOH growth rate over the horizon; other forces are the residual vs the live forecast. Drag the slider to see how much of the story is AI-driven vs structural.
      </p>
    </section>
  );
}

function ShareTile({
  label, jobs, share, color, icon: Icon,
}: { label: string; jobs: number; share: number; color: string; icon: typeof Cpu }) {
  const positive = jobs >= 0;
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color }}>
          <Icon className="h-3.5 w-3.5" /> {label}
        </div>
        <span className="kar-mono text-[10px] text-muted-foreground">{share.toFixed(0)}% of change</span>
      </div>
      <div className={"mt-2 kar-mono text-xl font-semibold " + (positive ? "text-success" : "text-destructive")}>
        {positive ? "+" : ""}{fmtCompact(jobs)}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full" style={{ width: `${Math.min(100, share)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
