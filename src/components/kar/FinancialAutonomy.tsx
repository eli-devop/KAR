import { useMemo } from "react";
import { DollarSign, Wallet, Banknote, Landmark, ShieldCheck, ArrowRight, Clock } from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, ReferenceDot,
} from "recharts";
import { OCCUPATIONS } from "@/data/occupations";
import { useAllForecasts } from "@/hooks/useForecasts";
import { useHorizon } from "@/contexts/HorizonContext";
import { HORIZONS, horizonLabel } from "@/lib/horizons";
import { fmtCompact } from "@/lib/format";

// Tiers of agent-executed financial autonomy. Each tier has an "exposure gate"
// (the average AI-exposure score required across finance roles) and a maturity
// gate (years of integration before trust is granted).
type Tier = {
  key: string;
  label: string;
  cap: string;           // example transaction cap
  exposureGate: number;  // 0-100
  yearsGate: number;     // integration years
  icon: typeof DollarSign;
  desc: string;
};

const TIERS: Tier[] = [
  { key: "readonly",   label: "Read-only insights",         cap: "$0",          exposureGate: 40, yearsGate: 0,   icon: ShieldCheck, desc: "Categorize spend, flag anomalies, draft journal entries — human posts." },
  { key: "micro",      label: "Micro-payments & expenses",  cap: "≤ $1K",       exposureGate: 55, yearsGate: 0.5, icon: Wallet,      desc: "Approve receipts, route reimbursements, settle SaaS invoices under policy." },
  { key: "ap_ar",      label: "Full A/P & A/R cycles",      cap: "≤ $25K",      exposureGate: 65, yearsGate: 1.5, icon: DollarSign,  desc: "Match POs, schedule payments, dunning, reconcile bank feeds end-to-end." },
  { key: "procurement",label: "Procurement & vendor terms", cap: "≤ $250K",     exposureGate: 75, yearsGate: 2.5, icon: Banknote,    desc: "Negotiate renewals, run RFPs, commit budget within board-approved bands." },
  { key: "treasury",   label: "Treasury & FX execution",    cap: "≤ $5M",       exposureGate: 82, yearsGate: 3.5, icon: Landmark,    desc: "Cash sweeps, FX hedging, money-market placements with audit trail." },
  { key: "capital",    label: "Autonomous capital ops",     cap: "Board-bound", exposureGate: 90, yearsGate: 5,   icon: Landmark,    desc: "Portfolio rebalancing & funding rounds — still subject to board ratification." },
];

const FINANCE_SOCS = new Set([
  "11-3031",  // Financial Managers
  "13-2011",  // Accountants & Auditors
  "13-2051",  // Financial Analysts
  "13-2052",  // Personal Financial Advisors
  "13-2099",  // Other financial specialists
  "13-2072",  // Loan Officers
  "43-3031",  // Bookkeeping & Accounting Clerks
  "43-3011",  // Bill & Account Collectors
  "43-3021",  // Billing & Posting Clerks
  "43-3051",  // Payroll & Timekeeping Clerks
  "43-3071",  // Tellers
  "41-3031",  // Securities & Financial Sales
]);

const FINANCE_CATEGORIES = new Set(["Office", "Management"]);

function financeRoles() {
  // Primary: explicit SOC match. Fallback: any role whose title hints at finance.
  const direct = OCCUPATIONS.filter((o) => FINANCE_SOCS.has(o.soc_code));
  if (direct.length >= 4) return direct;
  return OCCUPATIONS.filter(
    (o) =>
      FINANCE_SOCS.has(o.soc_code) ||
      (FINANCE_CATEGORIES.has(o.category) &&
        /financ|account|bookkeep|payroll|treasur|audit|billing|loan|teller/i.test(o.title))
  );
}

interface Point {
  label: string;
  days: number;
  years: number;
  avgExposure: number;     // weighted exposure across finance roles
  autonomyPct: number;     // 0..100 share of $-volume agents can execute autonomously
  unlocked: string[];      // tier labels unlocked at this horizon
}

const EXPOSURE_DRIFT_PER_YEAR = 5.5; // pp/yr exposure growth fallback

// Top 20 U.S. banks by consolidated assets (USD). Used to translate the
// agent-executable share of finance $-volume into a per-bank live estimate.
type Bank = { rank: number; name: string; parent: string; assets: number };
const TOP_BANKS: Bank[] = [
  { rank: 1,  name: "JPMorgan Chase Bank, N.A.",         parent: "JPMorgan Chase & Co.",          assets: 3_750e9 },
  { rank: 2,  name: "Bank of America, N.A.",             parent: "Bank of America Corp.",         assets: 2_640e9 },
  { rank: 3,  name: "Citibank, N.A.",                    parent: "Citigroup",                     assets: 1_840e9 },
  { rank: 4,  name: "Wells Fargo Bank, N.A.",            parent: "Wells Fargo & Co.",             assets: 1_820e9 },
  { rank: 5,  name: "U.S. Bank, N.A.",                   parent: "U.S. Bancorp",                  assets:   676e9 },
  { rank: 6,  name: "Capital One, N.A.",                 parent: "Capital One Financial Corp.",   assets:   658e9 },
  { rank: 7,  name: "Goldman Sachs Bank USA",            parent: "Goldman Sachs Group",           assets:   645e9 },
  { rank: 8,  name: "PNC Bank, N.A.",                    parent: "PNC Financial Services Group",  assets:   568e9 },
  { rank: 9,  name: "Truist Bank",                       parent: "Truist Financial Corp.",        assets:   540e9 },
  { rank: 10, name: "Bank of New York Mellon",           parent: "BNY Mellon Corp.",              assets:   381e9 },
  { rank: 11, name: "State Street Bank and Trust Co.",   parent: "State Street Corp.",            assets:   361e9 },
  { rank: 12, name: "TD Bank, N.A.",                     parent: "TD Group US Holdings",          assets:   346e9 },
  { rank: 13, name: "Morgan Stanley Private Bank, N.A.", parent: "Morgan Stanley",                assets:   255e9 },
  { rank: 14, name: "Morgan Stanley Bank, N.A.",         parent: "Morgan Stanley",                assets:   253e9 },
  { rank: 15, name: "BMO Bank, N.A.",                    parent: "BMO Financial Corp.",           assets:   252e9 },
  { rank: 16, name: "First-Citizens Bank & Trust Co.",   parent: "First Citizens BancShares",     assets:   229e9 },
  { rank: 17, name: "Citizens Bank, N.A.",               parent: "Citizens Financial Group",      assets:   226e9 },
  { rank: 18, name: "Huntington National Bank",          parent: "Huntington Bancshares",         assets:   224e9 },
  { rank: 19, name: "Fifth Third Bank, N.A.",            parent: "Fifth Third Bancorp",           assets:   214e9 },
  { rank: 20, name: "M&T Bank",                          parent: "M&T Bank Corp.",                assets:   213e9 },
];

function fmtAssets(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `$${Math.round(v / 1e9)}B`;
  return `$${Math.round(v / 1e6)}M`;
}

export function FinancialAutonomy({ variant = "full" }: { variant?: "full" | "compact" }) {
  const { horizon } = useHorizon();
  const { data: forecasts } = useAllForecasts();

  const points: Point[] = useMemo(() => {
    const roles = financeRoles();
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
      let totalEmp = 0;
      for (const r of roles) {
        const f = fc[r.soc_code];
        const emp = f?.emp && f.emp > 0 ? f.emp : r.employment;
        const exp = f?.exp && f.exp > 0 ? f.exp : Math.min(100, r.ai_exposure_score + (h.key === "now" ? 0 : years * EXPOSURE_DRIFT_PER_YEAR));
        weightedExp += exp * emp;
        totalEmp += emp;
      }
      const avgExposure = totalEmp ? weightedExp / totalEmp : 0;
      const unlocked = TIERS.filter((t) => avgExposure >= t.exposureGate && years >= t.yearsGate);
      // Autonomy % = mean of unlocked exposure gates relative to 100, weighted by tier depth.
      const autonomyPct = unlocked.length
        ? Math.min(95, unlocked.reduce((s, t, i) => s + (t.exposureGate * (i + 1)), 0) / unlocked.reduce((s, _, i) => s + (i + 1), 0))
        : Math.max(0, avgExposure - 25);
      return {
        label: h.label,
        days: h.days,
        years,
        avgExposure: Number(avgExposure.toFixed(1)),
        autonomyPct: Number(autonomyPct.toFixed(1)),
        unlocked: unlocked.map((t) => t.label),
      };
    });
  }, [forecasts]);

  const current = points.find((p) => HORIZONS.find((h) => h.label === p.label)?.key === horizon) ?? points[0];

  const liveTier = useMemo(() => {
    const unlocked = TIERS.filter((t) => current.avgExposure >= t.exposureGate && current.years >= t.yearsGate);
    return unlocked[unlocked.length - 1] ?? TIERS[0];
  }, [current]);

  // ETA for the first horizon a tier becomes available
  const tierEta = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of TIERS) {
      const hit = points.find((p) => p.avgExposure >= t.exposureGate && p.years >= t.yearsGate);
      if (!hit) { map[t.key] = "beyond 5y"; continue; }
      const d = new Date();
      d.setDate(d.getDate() + hit.days);
      map[t.key] = hit.days === 0 ? "available now" : d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }
    return map;
  }, [points]);

  if (variant === "compact") {
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <DollarSign className="h-4 w-4 text-primary" /> Agent-executed financial transactions
          </div>
          <span className="text-[11px] text-muted-foreground">{horizonLabel(horizon)}</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <div className="text-2xl font-semibold tracking-tight kar-mono">{current.autonomyPct.toFixed(0)}%</div>
          <div className="text-xs text-muted-foreground">of finance $-volume agents can run unattended</div>
        </div>
        <div className="mt-1 text-xs">
          <span className="text-muted-foreground">Trust ceiling now: </span>
          <span className="font-medium">{liveTier.label}</span>
          <span className="text-muted-foreground"> · cap {liveTier.cap}</span>
        </div>
      </div>
    );
  }

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
            <DollarSign className="h-3 w-3" /> Agent-executed financial transactions
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">When can an AI agent move money?</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Live projection of when enterprises can delegate financial transactions to AI agents — derived from AI-exposure forecasts across {financeRoles().length} finance & accounting occupations and an integration-maturity gate.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-background/60 px-4 py-3 text-right">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">At {horizonLabel(horizon)}</div>
          <div className="mt-0.5 text-3xl font-semibold tracking-tight kar-mono text-primary">{current.autonomyPct.toFixed(0)}%</div>
          <div className="text-[11px] text-muted-foreground">finance $-volume agent-executable</div>
        </div>
      </div>

      {/* Trajectory chart */}
      <div className="mt-5 h-56 rounded-xl border border-border bg-background/40 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="fa-auton" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} stroke="var(--border)" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} stroke="var(--border)" unit="%" />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              formatter={(v: number, n: string) => [`${Number(v).toFixed(1)}%`, n]}
            />
            <Area type="monotone" dataKey="autonomyPct" name="Agent-executable $-volume" stroke="var(--primary)" strokeWidth={2} fill="url(#fa-auton)" />
            <Area type="monotone" dataKey="avgExposure" name="Finance AI exposure" stroke="var(--warning)" strokeWidth={1.25} fill="transparent" />
            <ReferenceDot x={current.label} y={current.autonomyPct} r={5} fill="var(--primary)" stroke="var(--card)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Tier ladder */}
      <div className="mt-5 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {TIERS.map((t) => {
          const unlocked = current.avgExposure >= t.exposureGate && current.years >= t.yearsGate;
          const Icon = t.icon;
          return (
            <div
              key={t.key}
              className={`rounded-xl border p-3 transition-shadow ${
                unlocked ? "border-primary/40 bg-primary/5 shadow-card" : "border-border bg-background/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${unlocked ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="text-sm font-medium leading-tight">{t.label}</div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${unlocked ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                  {unlocked ? "Unlocked" : "Locked"}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t.desc}</p>
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="kar-mono">Cap {t.cap}</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {tierEta[t.key]}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Top 20 U.S. banks — live agent-executable $-volume estimate */}
      <div className="mt-6 rounded-xl border border-border bg-background/40">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border px-4 py-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Top 20 U.S. banks by consolidated assets</div>
            <h3 className="mt-0.5 text-sm font-semibold">Live agent-executable $-volume · {horizonLabel(horizon)}</h3>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Estimate = consolidated assets × <span className="kar-mono text-foreground">{current.autonomyPct.toFixed(0)}%</span> finance autonomy at horizon
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Bank</th>
                <th className="px-3 py-2 text-left">Parent</th>
                <th className="px-3 py-2 text-right">Assets</th>
                <th className="px-3 py-2 text-right">Agent-executable</th>
                <th className="px-3 py-2 text-left">Trust ceiling</th>
              </tr>
            </thead>
            <tbody>
              {TOP_BANKS.map((b) => {
                const executable = b.assets * (current.autonomyPct / 100);
                return (
                  <tr key={b.rank} className="border-t border-border">
                    <td className="px-3 py-2 text-muted-foreground kar-mono">{b.rank}</td>
                    <td className="px-3 py-2 font-medium">{b.name}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{b.parent}</td>
                    <td className="px-3 py-2 text-right kar-mono">{fmtAssets(b.assets)}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="ml-auto flex items-center justify-end gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded bg-muted">
                          <div className="h-full bg-primary" style={{ width: `${Math.min(100, current.autonomyPct)}%` }} />
                        </div>
                        <span className="kar-mono text-foreground">{fmtAssets(executable)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{liveTier.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-muted/30 text-[11px] text-muted-foreground">
              <tr className="border-t border-border">
                <td className="px-3 py-2" colSpan={3}>Top 20 total</td>
                <td className="px-3 py-2 text-right kar-mono">{fmtAssets(TOP_BANKS.reduce((s, b) => s + b.assets, 0))}</td>
                <td className="px-3 py-2 text-right kar-mono text-foreground">
                  {fmtAssets(TOP_BANKS.reduce((s, b) => s + b.assets, 0) * (current.autonomyPct / 100))}
                </td>
                <td className="px-3 py-2">cap {liveTier.cap}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Agent-executable share</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning" /> Finance AI exposure</span>
        <span className="ml-auto inline-flex items-center gap-1">
          Weighted across {fmtCompact(financeRoles().reduce((s, r) => s + r.employment, 0))} finance & accounting workers
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </section>
  );
}
