import { useMemo } from "react";
import { GraduationCap, FileCheck, Building2, ShieldCheck, Gavel, Clock, ExternalLink } from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, ReferenceDot,
} from "recharts";
import { OCCUPATIONS } from "@/data/occupations";
import { useAllForecasts } from "@/hooks/useForecasts";
import { useHorizon } from "@/contexts/HorizonContext";
import { HORIZONS, horizonLabel } from "@/lib/horizons";
import { fmtCompact } from "@/lib/format";

// Source: DOL/ETA AI Literacy Framework, released Feb 13, 2026.
// https://www.dol.gov/newsroom/releases/eta/eta20260213
// Today the framework is voluntary guidance + WIOA funding eligibility. This
// component projects when AI literacy moves from guidance → conditional funding
// → state mandates → federal hiring requirement → broad employer-side rule,
// using AI-exposure forecasts as the demand-side driver.

type Stage = {
  key: string;
  label: string;
  status: string;          // short policy status badge
  exposureGate: number;    // workforce-weighted exposure needed for the stage to be politically/operationally viable
  yearsGate: number;       // earliest years from today before the stage is realistic
  icon: typeof GraduationCap;
  desc: string;
};

const STAGES: Stage[] = [
  { key: "framework",  label: "DOL AI Literacy Framework",       status: "Released Feb 2026",  exposureGate: 0,  yearsGate: 0,   icon: GraduationCap, desc: "Five content areas, seven delivery principles. Voluntary guidance for workforce & education systems." },
  { key: "wioa",       label: "WIOA-funded AI skill programs",   status: "Active (TEGL 03-25)", exposureGate: 35, yearsGate: 0.25, icon: FileCheck,     desc: "Workforce Innovation & Opportunity Act funds + governor's reserve money flow to AI skill development." },
  { key: "federal",    label: "Federal contractor & hire rule",   status: "Likely 1–2y",         exposureGate: 50, yearsGate: 1,   icon: Building2,     desc: "Federal hiring & contractor onboarding requires baseline AI literacy attestation for affected roles." },
  { key: "state",      label: "State-level mandates",             status: "Likely 2–3y",         exposureGate: 60, yearsGate: 2,   icon: ShieldCheck,   desc: "Leading states (CA, NY, TX, WA, IL) codify AI literacy into licensing, K-12 graduation, and CTE." },
  { key: "employer",   label: "Broad employer mandate",           status: "Likely 3–5y",         exposureGate: 70, yearsGate: 3.5, icon: Gavel,         desc: "OSHA-style rule or amended FLSA guidance: covered employers must certify role-appropriate AI literacy." },
  { key: "universal",  label: "Universal worker requirement",     status: "Aspirational ≥5y",    exposureGate: 80, yearsGate: 5,   icon: Gavel,         desc: "Federal floor: every W-2 worker in covered occupations holds a verified AI literacy credential." },
];

const EXPOSURE_DRIFT_PER_YEAR = 5.5; // pp/yr fallback when forecasts table is empty

export function AILiteracyEnforcement({ variant = "full" }: { variant?: "full" | "compact" }) {
  const { horizon } = useHorizon();
  const { data: forecasts } = useAllForecasts();

  const points = useMemo(() => {
    const byHorizon: Record<string, Record<string, { emp: number; exp: number }>> = {};
    for (const f of forecasts ?? []) {
      (byHorizon[f.horizon] ??= {})[f.occ_code] = {
        emp: Number(f.employment) || 0,
        exp: Number(f.ai_exposure) || 0,
      };
    }
    return HORIZONS.map((h) => {
      const years = h.days / 365;
      const fc = byHorizon[h.key] ?? {};
      let weightedExp = 0;
      let coveredEmp = 0;
      let totalEmp = 0;
      for (const o of OCCUPATIONS) {
        const f = fc[o.soc_code];
        const emp = f?.emp && f.emp > 0 ? f.emp : o.employment;
        const exp = f?.exp && f.exp > 0 ? f.exp : Math.min(100, o.ai_exposure_score + (h.key === "now" ? 0 : years * EXPOSURE_DRIFT_PER_YEAR));
        weightedExp += exp * emp;
        totalEmp += emp;
        // A worker is "in scope" of an AI literacy rule once their role exposure crosses ~30.
        if (exp >= 30) coveredEmp += emp;
      }
      const avgExposure = totalEmp ? weightedExp / totalEmp : 0;
      const inScopePct = totalEmp ? (coveredEmp / totalEmp) * 100 : 0;
      const reachedStages = STAGES.filter((s) => avgExposure >= s.exposureGate && years >= s.yearsGate);
      const current = reachedStages[reachedStages.length - 1] ?? STAGES[0];
      // Enforcement maturity index = (stage depth / total stages) * 100, blended with in-scope coverage.
      const stageDepth = (reachedStages.length / STAGES.length) * 100;
      const enforcementIdx = Math.round(stageDepth * 0.6 + inScopePct * 0.4);
      return {
        label: h.label,
        days: h.days,
        years,
        avgExposure: Number(avgExposure.toFixed(1)),
        inScopePct: Number(inScopePct.toFixed(1)),
        coveredEmp,
        enforcementIdx,
        stageKey: current.key,
        stageLabel: current.label,
      };
    });
  }, [forecasts]);

  const current = points.find((p) => HORIZONS.find((h) => h.label === p.label)?.key === horizon) ?? points[0];
  const currentStage = STAGES.find((s) => s.key === current.stageKey) ?? STAGES[0];

  const stageEta = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of STAGES) {
      const hit = points.find((p) => p.avgExposure >= s.exposureGate && p.years >= s.yearsGate);
      if (!hit) { map[s.key] = "beyond 5y"; continue; }
      if (hit.days === 0) { map[s.key] = "in effect now"; continue; }
      const d = new Date();
      d.setDate(d.getDate() + hit.days);
      map[s.key] = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }
    return map;
  }, [points]);

  if (variant === "compact") {
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <GraduationCap className="h-4 w-4 text-primary" /> AI literacy enforcement
          </div>
          <span className="text-[11px] text-muted-foreground">{horizonLabel(horizon)}</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <div className="text-2xl font-semibold tracking-tight kar-mono">{current.enforcementIdx}</div>
          <div className="text-xs text-muted-foreground">/100 enforcement maturity</div>
        </div>
        <div className="mt-1 text-xs">
          <span className="text-muted-foreground">Active stage: </span>
          <span className="font-medium">{currentStage.label}</span>
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          {fmtCompact(current.coveredEmp)} workers in scope · DOL ETA framework Feb 2026
        </div>
      </div>
    );
  }

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
            <GraduationCap className="h-3 w-3" /> AI literacy · enforcement trajectory
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">When does AI literacy become required?</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Live projection from the{" "}
            <a
              href="https://www.dol.gov/newsroom/releases/eta/eta20260213"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-primary underline-offset-2 hover:underline"
            >
              DOL/ETA AI Literacy Framework <ExternalLink className="h-3 w-3" />
            </a>{" "}
            (Feb 2026) through universal-worker enforcement — driven by exposure forecasts across {OCCUPATIONS.length} U.S. occupations.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-background/60 px-4 py-3 text-right">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">At {horizonLabel(horizon)}</div>
          <div className="mt-0.5 text-3xl font-semibold tracking-tight kar-mono text-primary">{current.enforcementIdx}</div>
          <div className="text-[11px] text-muted-foreground">/100 enforcement maturity</div>
        </div>
      </div>

      {/* Trajectory chart */}
      <div className="mt-5 h-56 rounded-xl border border-border bg-background/40 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="ail-cov" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="ail-idx" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--success)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} stroke="var(--border)" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} stroke="var(--border)" unit="%" />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              formatter={(v: number, n: string) => [`${Number(v).toFixed(1)}${n.includes("scope") ? "%" : "/100"}`, n]}
            />
            <Area type="monotone" dataKey="inScopePct" name="Workforce in scope" stroke="var(--primary)" strokeWidth={2} fill="url(#ail-cov)" />
            <Area type="monotone" dataKey="enforcementIdx" name="Enforcement maturity" stroke="var(--success)" strokeWidth={1.5} fill="url(#ail-idx)" />
            <ReferenceDot x={current.label} y={current.enforcementIdx} r={5} fill="var(--success)" stroke="var(--card)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stage ladder */}
      <div className="mt-5 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {STAGES.map((s) => {
          const reached = current.avgExposure >= s.exposureGate && current.years >= s.yearsGate;
          const Icon = s.icon;
          return (
            <div
              key={s.key}
              className={`rounded-xl border p-3 transition-shadow ${
                reached ? "border-primary/40 bg-primary/5 shadow-card" : "border-border bg-background/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${reached ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="text-sm font-medium leading-tight">{s.label}</div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${reached ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                  {reached ? "Reached" : "Pending"}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{s.desc}</p>
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="kar-mono">{s.status}</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {stageEta[s.key]}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Workforce in scope (exposure ≥ 30)</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" /> Enforcement maturity index</span>
        <span className="ml-auto inline-flex items-center gap-1">
          {fmtCompact(current.coveredEmp)} workers in scope at {horizonLabel(horizon)}
        </span>
      </div>
    </section>
  );
}
