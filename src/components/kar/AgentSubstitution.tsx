import { useMemo } from "react";
import { Bot, Users, TrendingUp, Gauge } from "lucide-react";
import {
  LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { OCCUPATIONS, TOTAL_EMPLOYMENT } from "@/data/occupations";
import { useAllForecasts } from "@/hooks/useForecasts";
import { useHorizon } from "@/contexts/HorizonContext";
import { HORIZONS, horizonLabel, type HorizonKey } from "@/lib/horizons";
import { fmtCompact } from "@/lib/format";

// Scenario: AI agents perform a share of economic labor while humans supervise.
const SCENARIOS = [
  { share: 0.20, label: "20%", supervisorRatio: 1 / 6,  productivity: 1.12, wageUplift: 0.18, tone: "var(--primary)" },
  { share: 0.35, label: "35%", supervisorRatio: 1 / 8,  productivity: 1.22, wageUplift: 0.26, tone: "var(--warning)" },
  { share: 0.50, label: "50%", supervisorRatio: 1 / 10, productivity: 1.35, wageUplift: 0.34, tone: "var(--destructive)" },
] as const;

type ScenarioImpact = {
  displacedFte: number;
  supervisorJobs: number;
  netAtRisk: number;
  outputIndex: number;
  wageUplift: number;
};

function computeImpact(
  totalEmployment: number,
  weightedExposure: number, // 0..100
  s: typeof SCENARIOS[number]
): ScenarioImpact {
  const exposureFraction = weightedExposure / 100;
  const displacedFte = totalEmployment * exposureFraction * s.share;
  const supervisorJobs = displacedFte * s.supervisorRatio;
  return {
    displacedFte,
    supervisorJobs,
    netAtRisk: Math.max(0, displacedFte - supervisorJobs),
    outputIndex: s.productivity,
    wageUplift: s.wageUplift,
  };
}

export function AgentSubstitution() {
  const { horizon, setHorizon } = useHorizon();
  const { data: forecasts } = useAllForecasts();

  // Build exposure-weighted employment per horizon from forecasts (fallback to today).
  const horizonRows = useMemo(() => {
    const baseByCode = Object.fromEntries(OCCUPATIONS.map((o) => [o.soc_code, o]));
    return HORIZONS.filter((h) => h.key !== "now").map((h) => {
      const fs = (forecasts ?? []).filter((f) => f.horizon === h.key);
      let totalEmp = 0;
      let weightedExp = 0;
      if (fs.length) {
        for (const f of fs) {
          const emp = Number(f.employment) || 0;
          totalEmp += emp;
          weightedExp += emp * (Number(f.ai_exposure) || 0);
        }
      } else {
        for (const o of OCCUPATIONS) {
          totalEmp += o.employment;
          weightedExp += o.employment * o.ai_exposure_score;
        }
      }
      const avgExp = totalEmp ? weightedExp / totalEmp : 0;
      return { horizon: h.key as HorizonKey, label: h.label, totalEmp, avgExp };
    });
  }, [forecasts]);

  // Current horizon impact (for the scenario cards). Default to 1y if "now".
  const activeHorizon = horizon === "now" ? "1y" : horizon;
  const active = horizonRows.find((r) => r.horizon === activeHorizon) ?? horizonRows[0];
  const totalEmpActive = active?.totalEmp ?? TOTAL_EMPLOYMENT;
  const avgExpActive = active?.avgExp ?? 45;

  const scenarioImpacts = SCENARIOS.map((s) => ({
    s,
    impact: computeImpact(totalEmpActive, avgExpActive, s),
  }));

  // Trajectory chart: net at-risk (millions) per horizon per scenario.
  const chartData = horizonRows.map((row) => {
    const point: Record<string, number | string> = { horizon: row.label };
    for (const s of SCENARIOS) {
      const i = computeImpact(row.totalEmp, row.avgExp, s);
      point[`s${s.label}`] = +(i.netAtRisk / 1_000_000).toFixed(2);
    }
    return point;
  });

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning">
            <Bot className="h-3 w-3" /> AI Agent Substitution Scenarios
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">
            What if AI agents perform 20–50% of U.S. economic labor?
          </h2>
          <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
            Live model: applies AI-exposure forecasts across {OCCUPATIONS.length} occupations to three agent-adoption scenarios where humans
            shift into supervision, review, and exception-handling roles. Showing <strong>{horizonLabel(activeHorizon)}</strong> horizon.
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-background px-2 py-1">
          <Gauge className="h-3 w-3 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">Horizon</span>
          <select
            value={activeHorizon}
            onChange={(e) => setHorizon(e.target.value as HorizonKey)}
            className="bg-transparent text-[11px] font-medium outline-none"
          >
            {horizonRows.map((r) => (
              <option key={r.horizon} value={r.horizon}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Scenario cards */}
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {scenarioImpacts.map(({ s, impact }) => (
          <div
            key={s.label}
            className="relative overflow-hidden rounded-xl border border-border bg-background p-4"
            style={{ borderColor: `color-mix(in oklab, ${s.tone} 35%, var(--border))` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ background: `color-mix(in oklab, ${s.tone} 18%, transparent)`, color: s.tone }}
                >
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Agents perform</div>
                  <div className="text-lg font-semibold kar-mono">{s.label} of labor</div>
                </div>
              </div>
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                1 human : {Math.round(1 / s.supervisorRatio)} agents
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Metric
                icon={<Bot className="h-3 w-3" />}
                label="Tasks automated"
                value={`${fmtCompact(impact.displacedFte)} FTE`}
                sub="hours shifted to agents"
              />
              <Metric
                icon={<Users className="h-3 w-3 text-success" />}
                label="New supervisor roles"
                value={fmtCompact(impact.supervisorJobs)}
                sub={`+${Math.round(s.wageUplift * 100)}% wage premium`}
                tone="success"
              />
              <Metric
                icon={<Users className="h-3 w-3 text-destructive" />}
                label="Net jobs at risk"
                value={fmtCompact(impact.netAtRisk)}
                sub={`${((impact.netAtRisk / totalEmpActive) * 100).toFixed(1)}% of workforce`}
                tone="destructive"
              />
              <Metric
                icon={<TrendingUp className="h-3 w-3 text-primary" />}
                label="Output uplift"
                value={`${((impact.outputIndex - 1) * 100).toFixed(0)}%`}
                sub="vs. today's baseline"
                tone="primary"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Trajectory chart */}
      <div className="mt-6 rounded-xl border border-border bg-background p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Net jobs at risk (millions) — trajectory across horizons
          </div>
          <div className="text-[10px] text-muted-foreground">
            Source: BLS + KAR AI exposure forecasts
          </div>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="horizon" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
                formatter={(v: number, name: string) => [`${v}M`, `${name.replace("s", "")} agents`]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => `${String(v).replace("s", "")} agents`} />
              {SCENARIOS.map((s) => (
                <Line
                  key={s.label}
                  type="monotone"
                  dataKey={`s${s.label}`}
                  stroke={s.tone}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">
        Model assumption: displaced task-hours = employment × AI exposure × agent-adoption share. Human supervisor demand scales inversely with
        agent autonomy. Wage premium reflects shift to oversight, judgment, and exception-handling work.
      </p>
    </section>
  );
}

function Metric({
  icon, label, value, sub, tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone?: "default" | "success" | "destructive" | "primary";
}) {
  const toneClass =
    tone === "success" ? "text-success" :
    tone === "destructive" ? "text-destructive" :
    tone === "primary" ? "text-primary" : "text-foreground";
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}{label}
      </div>
      <div className={`mt-0.5 text-base font-semibold kar-mono ${toneClass}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}
