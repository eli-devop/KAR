import { useState } from "react";
import { Code2, Brain, Sparkles, ExternalLink, ShieldCheck, GitBranch, Eye, AlertTriangle, Clock, Rocket } from "lucide-react";
import { useHorizon } from "@/contexts/HorizonContext";
import { HORIZONS, horizonLabel, type HorizonKey } from "@/lib/horizons";

// Software 3.0 real-world adoption trajectory — anchored to today (May 2026).
// Sourced from a synthesis of Karpathy's 2025 YC talk, McKinsey State of AI 2025,
// Gartner agent-adoption forecasts, and DOL/ETA AI literacy timeline.
const SW30_TIMELINE: Record<HorizonKey, {
  date: string;
  stage: string;
  enterpriseAdoption: number; // % of Fortune 1000 running production agents
  autonomy: "assistive" | "supervised" | "bounded-autonomous" | "autonomous";
  signal: string;
  blocker: string;
  what: string;
}> = {
  now: {
    date: "May 2026",
    stage: "Copilot-everywhere, agents-in-pilot",
    enterpriseAdoption: 18,
    autonomy: "assistive",
    signal: "Coding copilots in 70%+ of dev teams; ~18% of F1000 have ≥1 production agent.",
    blocker: "Evals, audit trails, and liability frameworks are still bespoke per team.",
    what: "Software 3.0 is real in code editors and customer support. Most other workflows are still Software 1.0 with an LLM bolted on.",
  },
  "30d": {
    date: "Jun 2026",
    stage: "Agent procurement RFPs go mainstream",
    enterpriseAdoption: 20,
    autonomy: "assistive",
    signal: "Procurement teams add 'agent governance' to standard vendor questionnaires.",
    blocker: "SOC2/ISO controls for agent actions still under draft at most auditors.",
    what: "Buyers start demanding generator–verifier evidence, not just demos.",
  },
  "60d": {
    date: "Jul 2026",
    stage: "First waves of supervised agents in back-office",
    enterpriseAdoption: 23,
    autonomy: "supervised",
    signal: "AP/AR, IT helpdesk, and L1 support see double-digit ticket deflection from agents.",
    blocker: "Human-in-the-loop fatigue — review queues grow faster than ops capacity.",
    what: "Agents handle drafts; humans approve. The bottleneck moves to verification UX.",
  },
  "90d": {
    date: "Aug 2026",
    stage: "Agent SLAs and insurance products emerge",
    enterpriseAdoption: 26,
    autonomy: "supervised",
    signal: "Lloyd's-style underwriters publish first 'agent error & omissions' policies.",
    blocker: "Liability allocation between model vendor, integrator, and operator still unclear.",
    what: "Insurance + contractual SLAs unlock board-level approval for broader rollouts.",
  },
  "1y": {
    date: "May 2027",
    stage: "Bounded-autonomous agents in revenue workflows",
    enterpriseAdoption: 38,
    autonomy: "bounded-autonomous",
    signal: "Agents close low-risk sales, schedule field service, and execute routine procurement under $10K.",
    blocker: "DOL/ETA AI-literacy mandates create compliance-training backlog for managers.",
    what: "Spend caps, action allow-lists, and rollback rails make agents safe enough to act without per-step approval.",
  },
  "2y": {
    date: "May 2028",
    stage: "Agent-of-agents orchestration in the enterprise",
    enterpriseAdoption: 55,
    autonomy: "bounded-autonomous",
    signal: "Majority of F1000 run multi-agent workflows spanning CRM, ERP, and analytics.",
    blocker: "Cross-agent observability and 'who did what' attribution remain weak.",
    what: "Software 3.0 becomes the default integration layer between SaaS systems — replacing a lot of iPaaS / RPA.",
  },
  "3y": {
    date: "May 2029",
    stage: "Software 3.0 native applications ship",
    enterpriseAdoption: 68,
    autonomy: "bounded-autonomous",
    signal: "Net-new SaaS launches are agent-first; legacy vendors expose 'agent surfaces' (MCP-like) by default.",
    blocker: "Skill displacement in junior knowledge work outpaces reskilling programs.",
    what: "UIs assume an agent is the primary user. Humans use the same product through chat, voice, and dashboards.",
  },
  "4y": {
    date: "May 2030",
    stage: "Agents move money, hire, and ship code with autonomy",
    enterpriseAdoption: 78,
    autonomy: "autonomous",
    signal: "Treasury, recruiting, and engineering teams run agents with multi-million-dollar spend authority.",
    blocker: "Sector-specific regulators (FINRA, EEOC, FDA) finalize agent-action rules.",
    what: "The generator–verifier loop is mostly machine-to-machine; humans review exceptions and policy.",
  },
  "5y": {
    date: "May 2031",
    stage: "Software 3.0 is the default stack",
    enterpriseAdoption: 85,
    autonomy: "autonomous",
    signal: "Most knowledge-work apps are LLM-orchestrated by default; 1.0 + 2.0 are infra layers below.",
    blocker: "Concentration risk — a handful of model providers underpin most production agents.",
    what: "Karpathy's three paradigms coexist, but 3.0 owns the user-facing surface for most workflows.",
  },
};

const AUTONOMY_LABEL: Record<string, { label: string; tone: string }> = {
  "assistive":            { label: "Assistive",            tone: "bg-muted text-muted-foreground" },
  "supervised":           { label: "Supervised",           tone: "bg-primary/15 text-primary" },
  "bounded-autonomous":   { label: "Bounded-autonomous",   tone: "bg-warning/15 text-warning" },
  "autonomous":           { label: "Autonomous",           tone: "bg-destructive/15 text-destructive" },
};


type EraKey = "1.0" | "2.0" | "3.0";

const ERAS: Record<EraKey, {
  label: string;
  tagline: string;
  programmer: string;
  runtime: string;
  example: string;
  icon: typeof Code2;
  tone: string;
}> = {
  "1.0": {
    label: "Software 1.0",
    tagline: "Humans write explicit instructions.",
    programmer: "Python, C++, JavaScript",
    runtime: "CPU/GPU executes explicit instructions",
    example: "Traditional app logic — payroll engines, CRUD APIs, ledgers.",
    icon: Code2,
    tone: "text-foreground",
  },
  "2.0": {
    label: "Software 2.0",
    tagline: "Behavior is learned from data.",
    programmer: "Data, labels, objectives, architecture",
    runtime: "Neural-net weights execute learned behavior",
    example: "Vision models, speech recognizers, demand forecasters.",
    icon: Brain,
    tone: "text-primary",
  },
  "3.0": {
    label: "Software 3.0",
    tagline: "Prompts and context program the LLM.",
    programmer: "Prompts, context, tool specs, examples, policies",
    runtime: "LLM executes intent through language and tools",
    example: "AI agents, coding copilots, workflow co-workers.",
    icon: Sparkles,
    tone: "text-primary",
  },
};

const LOOP = [
  { label: "User intent", icon: Eye },
  { label: "System instruction", icon: ShieldCheck },
  { label: "Retrieved context", icon: GitBranch },
  { label: "Model reasoning", icon: Brain },
  { label: "Tool / action", icon: Sparkles },
  { label: "Execution", icon: Code2 },
  { label: "Verification", icon: ShieldCheck },
  { label: "Memory / update", icon: GitBranch },
  { label: "User result", icon: Eye },
];

export function Software30() {
  const [active, setActive] = useState<EraKey>("3.0");
  const era = ERAS[active];
  const Icon = era.icon;
  const { horizon, setHorizon } = useHorizon();
  const t = SW30_TIMELINE[horizon];
  const autonomy = AUTONOMY_LABEL[t.autonomy];

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
            <Sparkles className="h-3 w-3" /> Andrej Karpathy · Software 3.0
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            Software 3.0, in plain English.
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground leading-relaxed">
            Karpathy's framing: large language models turned neural networks into a
            <em> programmable substrate</em>. The strategic bottleneck shifts from writing
            deterministic instructions to designing <strong>reliable intent systems</strong> —
            prompts, context, tools, evaluations, and review loops around the model.
          </p>
        </div>
        <a
          href="https://www.youtube.com/results?search_query=Andrej+Karpathy+Software+3.0+YC"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          Karpathy 2025 YC talk <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Era tabs */}
      <div className="mt-5 flex flex-wrap gap-2">
        {(Object.keys(ERAS) as EraKey[]).map((k) => {
          const e = ERAS[k];
          const I = e.icon;
          const isActive = k === active;
          return (
            <button
              key={k}
              onClick={() => setActive(k)}
              className={
                "group inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm transition-all " +
                (isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-elegant"
                  : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-primary/40")
              }
            >
              <I className="h-4 w-4" />
              <span className="font-medium">{e.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active era detail */}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Programmer writes</div>
          <div className="mt-1.5 flex items-start gap-2">
            <Icon className={`h-4 w-4 mt-0.5 ${era.tone}`} />
            <div className="text-sm font-medium leading-snug">{era.programmer}</div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Runtime executes</div>
          <div className="mt-1.5 text-sm font-medium leading-snug">{era.runtime}</div>
        </div>
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Example</div>
          <div className="mt-1.5 text-sm leading-snug text-muted-foreground">{era.example}</div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
        <span className={`font-semibold ${era.tone}`}>{era.label}: </span>
        <span className="text-foreground">{era.tagline}</span>
      </div>

      {/* Horizon-aware adoption timeline — "when will this be real?" */}
      <div className="mt-6 rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
              <Rocket className="h-3 w-3" /> When does Software 3.0 ship in the real world?
            </div>
            <h3 className="mt-2 text-lg font-semibold tracking-tight">
              {t.date} · {t.stage}
            </h3>
          </div>
          <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${autonomy.tone}`}>
            <ShieldCheck className="h-3 w-3" /> Autonomy: {autonomy.label}
          </div>
        </div>

        {/* Horizon picker — scoped to this section */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Clock className="h-3 w-3" /> Horizon
          </div>
          <div className="flex flex-wrap items-center gap-0.5 rounded-full border border-border bg-card p-0.5">
            {HORIZONS.map((h) => {
              const isActive = h.key === horizon;
              return (
                <button
                  key={h.key}
                  onClick={() => setHorizon(h.key as HorizonKey)}
                  className={
                    "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors " +
                    (isActive
                      ? "bg-primary text-primary-foreground shadow-elegant"
                      : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent")
                  }
                >
                  {h.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Adoption progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Fortune 1000 running production agents</span>
            <span className="kar-mono font-medium text-foreground">{t.enterpriseAdoption}%</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
              style={{ width: `${t.enterpriseAdoption}%` }}
            />
          </div>
        </div>

        {/* What / Signal / Blocker */}
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-background p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">What it looks like</div>
            <p className="mt-1.5 text-xs leading-relaxed text-foreground">{t.what}</p>
          </div>
          <div className="rounded-xl border border-success/30 bg-success/5 p-3">
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-success">
              <Sparkles className="h-3 w-3" /> Leading signal
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-foreground">{t.signal}</p>
          </div>
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-3">
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-warning">
              <AlertTriangle className="h-3 w-3" /> Active blocker
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-foreground">{t.blocker}</p>
          </div>
        </div>

        {/* Mini horizon trajectory */}
        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            Adoption trajectory · {horizonLabel(horizon)} highlighted
          </div>
          <div className="flex items-end gap-1.5">
            {HORIZONS.map((h) => {
              const v = SW30_TIMELINE[h.key as HorizonKey].enterpriseAdoption;
              const isActive = h.key === horizon;
              return (
                <button
                  key={h.key}
                  onClick={() => setHorizon(h.key as HorizonKey)}
                  className="group flex flex-1 flex-col items-center gap-1"
                  title={`${SW30_TIMELINE[h.key as HorizonKey].date} · ${v}%`}
                >
                  <div
                    className={
                      "w-full rounded-t transition-all " +
                      (isActive ? "bg-primary" : "bg-primary/30 group-hover:bg-primary/50")
                    }
                    style={{ height: `${Math.max(8, v * 0.7)}px` }}
                  />
                  <div className={"text-[10px] " + (isActive ? "font-semibold text-foreground" : "text-muted-foreground")}>
                    {h.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Generator-verifier loop */}
      <div className="mt-6">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold tracking-wide">The generator–verifier loop</h3>
        </div>
        <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
          In production, Software 3.0 isn't just a prompt — it's the controlled loop
          around the model. The LLM proposes; another layer checks, tests, logs, or escalates.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {LOOP.map((step, i) => {
            const I = step.icon;
            return (
              <div key={step.label} className="flex items-center gap-1.5">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium">
                  <I className="h-3 w-3 text-primary" />
                  {step.label}
                </div>
                {i < LOOP.length - 1 && <span className="text-muted-foreground">→</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Coexistence callout */}
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {(Object.keys(ERAS) as EraKey[]).map((k) => {
          const e = ERAS[k];
          const I = e.icon;
          return (
            <div key={k} className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center gap-2">
                <I className={`h-4 w-4 ${e.tone}`} />
                <div className="text-sm font-semibold">{e.label}</div>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                {k === "1.0" && "For precise execution: infra, security, databases, observability."}
                {k === "2.0" && "For learned perception and prediction at scale."}
                {k === "3.0" && "For language-driven reasoning, orchestration, and agentic workflows."}
              </p>
            </div>
          );
        })}
      </div>

      {/* Socratic checkpoint */}
      <div className="mt-5 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div>
          <span className="font-semibold">Socratic checkpoint: </span>
          <span className="text-muted-foreground">
            Would you trust a junior employee to act without review on payroll, legal, medical,
            or production infrastructure? Treat Software 3.0 the same way — permissions, review
            gates, tests, monitoring, and escalation paths are the product.
          </span>
        </div>
      </div>
    </section>
  );
}
