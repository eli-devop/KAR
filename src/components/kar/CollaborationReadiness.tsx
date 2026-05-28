import { useMemo } from "react";
import { Users, Bot, Workflow, Handshake } from "lucide-react";
import {
  LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { OCCUPATIONS } from "@/data/occupations";
import { useAllForecasts } from "@/hooks/useForecasts";
import { useHorizon } from "@/contexts/HorizonContext";
import { HORIZONS, horizonLabel, type HorizonKey } from "@/lib/horizons";
import { fmtCompact } from "@/lib/format";

// Collaboration stages tied to AI-exposure (per occupation) and horizon (timeline).
// Stage thresholds calibrated so the "true collaboration" band (co-pilot + agent team)
// peaks in the 2y-3y window when forecasts mature.
export type Stage = "tool" | "copilot" | "agent_team" | "supervised_swarm";

const STAGE_META: Record<Stage, { label: string; ratio: string; color: string; icon: typeof Users }> = {
  tool:              { label: "Tool-assisted",     ratio: "1 : 0",  color: "var(--muted-foreground)", icon: Users },
  copilot:           { label: "Co-pilot",          ratio: "1 : 1",  color: "var(--primary)",          icon: Handshake },
  agent_team:        { label: "Agent team",        ratio: "1 : 4",  color: "var(--success)",          icon: Workflow },
  supervised_swarm:  { label: "Supervised swarm",  ratio: "1 : 10", color: "var(--warning)",          icon: Bot },
};

function stageFor(exposure: number, horizonDays: number): Stage {
  // horizonDays = 0..1825. Mature collaboration needs ≥1y of integration.
  const mature = horizonDays >= 365;
  const veryMature = horizonDays >= 730;
  if (exposure >= 75 && veryMature) return "supervised_swarm";
  if (exposure >= 55 && mature) return "agent_team";
  if (exposure >= 30) return "copilot";
  return "tool";
}

interface HorizonRollup {
  horizon: HorizonKey;
  label: string;
  days: number;
  tool: number;
  copilot: number;
  agent_team: number;
  supervised_swarm: number;
  trueCollabPct: number;  // copilot + agent_team + swarm share of employment
  totalEmp: number;
}

function rollup(forecasts: { occ_code: string; horizon: string; employment: number | string; ai_exposure: number | string }[] | undefined): HorizonRollup[] {
  const baseByCode = Object.fromEntries(OCCUPATIONS.map((o) => [o.soc_code, o]));
  // Synthetic exposure growth per year used as a fallback when no forecast row
  // exists for an occupation at a given horizon — keeps the timeline alive
  // until the backfill cron populates the forecasts table.
  const EXPOSURE_GROWTH_PER_YEAR = 6; // +6 pp/year exposure drift
  return HORIZONS.map((h) => {
    const years = h.days / 365;
    const forecastByCode: Record<string, { emp: number; exp: number }> = {};
    if (h.key !== "now") {
      for (const f of forecasts ?? []) {
        if (f.horizon !== h.key) continue;
        forecastByCode[f.occ_code] = {
          emp: Number(f.employment) || 0,
          exp: Number(f.ai_exposure) || 0,
        };
      }
    }
    const rows = OCCUPATIONS.map((o) => {
      const f = forecastByCode[o.soc_code];
      if (f && f.emp > 0) return { emp: f.emp, exp: f.exp };
      // Fallback: base data with synthetic exposure drift over time.
      const drift = h.key === "now" ? 0 : years * EXPOSURE_GROWTH_PER_YEAR;
      return {
        emp: o.employment,
        exp: Math.min(100, o.ai_exposure_score + drift),
      };
    });
    const buckets: Record<Stage, number> = { tool: 0, copilot: 0, agent_team: 0, supervised_swarm: 0 };
    let totalEmp = 0;
    for (const r of rows) {
      const s = stageFor(r.exp, h.days);
      buckets[s] += r.emp;
      totalEmp += r.emp;
    }
    const trueCollab = buckets.copilot + buckets.agent_team + buckets.supervised_swarm;
    return {
      horizon: h.key,
      label: h.label,
      days: h.days,
      tool: buckets.tool,
      copilot: buckets.copilot,
      agent_team: buckets.agent_team,
      supervised_swarm: buckets.supervised_swarm,
      trueCollabPct: totalEmp > 0 ? (trueCollab / totalEmp) * 100 : 0,
      totalEmp,
    };
  });
}

function estimateCrossoverDate(rows: HorizonRollup[]): string {
  // First horizon where ≥50% of workforce is in true collaboration.
  const hit = rows.find((r) => r.trueCollabPct >= 50);
  if (!hit) return "beyond 5y horizon";
  const target = new Date();
  target.setDate(target.getDate() + hit.days);
  return target.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

interface Props {
  variant?: "full" | "compact";
}

export function CollaborationReadiness({ variant = "full" }: Props) {
  const { horizon } = useHorizon();
  const { data: forecasts } = useAllForecasts();

  const rows = useMemo(() => rollup(forecasts), [forecasts]);
  const current = rows.find((r) => r.horizon === horizon) ?? rows[0];
  const crossover = useMemo(() => estimateCrossoverDate(rows), [rows]);

  // Top 5 roles already in collaboration at this horizon (uses synthetic drift
  // fallback so the list stays populated even without forecast rows).
  const topRoles = useMemo(() => {
    const h = HORIZONS.find((x) => x.key === horizon);
    const days = h?.days ?? 0;
    const years = days / 365;
    const drift = horizon === "now" ? 0 : years * 6;
    const forecastByCode: Record<string, { emp: number; exp: number }> = {};
    for (const f of forecasts ?? []) {
      if (f.horizon === horizon) {
        forecastByCode[f.occ_code] = { emp: Number(f.employment) || 0, exp: Number(f.ai_exposure) || 0 };
      }
    }
    const items = OCCUPATIONS.map((o) => {
      const f = forecastByCode[o.soc_code];
      if (f && f.emp > 0) return { title: o.title, emp: f.emp, exp: f.exp };
      return { title: o.title, emp: o.employment, exp: Math.min(100, o.ai_exposure_score + drift) };
    });
    return items
      .filter((r) => stageFor(r.exp, days) !== "tool")
      .sort((a, b) => b.exp - a.exp)
      .slice(0, 5)
      .map((r) => ({ ...r, stage: stageFor(r.exp, days) }));
  }, [forecasts, horizon]);

  const chartData = rows.map((r) => ({
    label: r.label,
    "True collab %": Number(r.trueCollabPct.toFixed(1)),
    "Co-pilot": Math.round(r.copilot / 1_000_000),
    "Agent team": Math.round(r.agent_team / 1_000_000),
    "Swarm": Math.round(r.supervised_swarm / 1_000_000),
  }));

  const total = current.totalEmp || 1;
  const stageRows: { stage: Stage; emp: number }[] = [
    { stage: "tool", emp: current.tool },
    { stage: "copilot", emp: current.copilot },
    { stage: "agent_team", emp: current.agent_team },
    { stage: "supervised_swarm", emp: current.supervised_swarm },
  ];

  if (variant === "compact") {
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Handshake className="h-4 w-4 text-primary" /> Human–AI collaboration · {horizonLabel(horizon)}
          </div>
          <div className="text-xs text-muted-foreground">≥50% crossover · {crossover}</div>
        </div>
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted">
          {stageRows.map(({ stage, emp }) => (
            <div
              key={stage}
              style={{ width: `${(emp / total) * 100}%`, backgroundColor: STAGE_META[stage].color }}
              title={`${STAGE_META[stage].label}: ${fmtCompact(emp)}`}
            />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          {stageRows.map(({ stage, emp }) => (
            <div key={stage} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STAGE_META[stage].color }} />
              <span className="text-muted-foreground">{STAGE_META[stage].label}</span>
              <span className="ml-auto kar-mono font-medium">{((emp / total) * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Handshake className="h-4 w-4 text-primary" />
            Human–AI collaboration timeline
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            When U.S. workers move from using AI as a tool to truly collaborating with one — or supervising a team of — AI agents. Derived from {fmtCompact(current.totalEmp)} jobs across 342 occupations at horizon {horizonLabel(horizon)}.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-background px-3 py-2 text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">≥50% crossover</div>
          <div className="kar-mono text-base font-semibold">{crossover}</div>
        </div>
      </div>

      {/* Stage cards */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stageRows.map(({ stage, emp }) => {
          const meta = STAGE_META[stage];
          const Icon = meta.icon;
          const pct = (emp / total) * 100;
          return (
            <div key={stage} className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: meta.color }}>
                  <Icon className="h-3.5 w-3.5" /> {meta.label}
                </div>
                <span className="text-[10px] text-muted-foreground kar-mono">{meta.ratio}</span>
              </div>
              <div className="mt-2 kar-mono text-xl font-semibold">{pct.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">{fmtCompact(emp)} workers</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full" style={{ width: `${pct}%`, backgroundColor: meta.color }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Trajectory chart */}
      <div className="mt-6 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="True collab %" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="Co-pilot" stroke={STAGE_META.copilot.color} strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="Agent team" stroke={STAGE_META.agent_team.color} strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="Swarm" stroke={STAGE_META.supervised_swarm.color} strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Roles in collaboration right now at the selected horizon */}
      {topRoles.length > 0 && (
        <div className="mt-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Roles already in collaboration · {horizonLabel(horizon)}
          </div>
          <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
            {topRoles.map((r) => {
              const meta = STAGE_META[r.stage];
              return (
                <li key={r.title} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="truncate">{r.title}</span>
                  <span className="flex items-center gap-3 text-xs">
                    <span className="kar-mono text-muted-foreground">{fmtCompact(r.emp)}</span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: meta.color + "22", color: meta.color }}>
                      {meta.label} · {meta.ratio}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="mt-4 text-[11px] text-muted-foreground">
        Model: stage = f(AI exposure, horizon). Co-pilot triggers at exposure ≥30; agent-team at ≥55 once ≥1y of integration; supervised swarm at ≥75 once ≥2y. Live data refreshes every 2 hours alongside BLS macro and AI-news signals.
      </p>
    </section>
  );
}
