import { createFileRoute, Link } from "@tanstack/react-router";
import { TOTAL_EMPLOYMENT } from "@/data/occupations";
import { fmtCompact, fmtUSD, fmtPct } from "@/lib/format";
import { StatCard } from "@/components/kar/StatCard";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, MessageSquare, Upload, Grid3x3, Sparkles, TrendingUp,
  Activity, RefreshCw, TrendingDown, Clock, Lightbulb, ExternalLink,
} from "lucide-react";
import { useHorizonOccupations } from "@/hooks/useHorizonOccupations";
import { horizonLabel } from "@/lib/horizons";
import { useDashboardLive } from "@/hooks/useDashboardLive";
import { useLiveStatus } from "@/hooks/useForecasts";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { refreshLiveData } from "@/lib/forecast.functions";
import { refreshNews } from "@/lib/news.functions";
import { detectAlerts } from "@/lib/alerts.functions";
import { toast } from "sonner";
import { useState } from "react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { AgentSubstitution } from "@/components/kar/AgentSubstitution";
import { HorizonSelector } from "@/components/kar/HorizonSelector";
import { AlertsBanner, LaborMarketStory } from "@/components/kar/AlertsBanner";
import { NewsFeed } from "@/components/kar/NewsFeed";
import { CollaborationReadiness } from "@/components/kar/CollaborationReadiness";
import { FinancialAutonomy } from "@/components/kar/FinancialAutonomy";
import { AILiteracyEnforcement } from "@/components/kar/AILiteracyEnforcement";
import { ChangeAttribution } from "@/components/kar/ChangeAttribution";
import { Software30 } from "@/components/kar/Software30";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KAR — U.S. Labor Market, Live" },
      { name: "description", content: "Live BLS macro stats, AI exposure forecasts, and real-time AI / job-loss news across 342 U.S. occupations." },
    ],
  }),
  component: Dashboard,
});

const MACRO_META: Record<string, { label: string; suffix: string; tone: "primary" | "warning" | "success" | "taupe"; invert?: boolean }> = {
  LNS14000000: { label: "Unemployment rate", suffix: "%", tone: "warning", invert: true },
  LNS11300000: { label: "Labor force participation", suffix: "%", tone: "primary" },
  CES0000000001: { label: "Nonfarm payrolls", suffix: "K", tone: "success" },
  LNS12000000: { label: "Civilian employment", suffix: "K", tone: "taupe" },
  CES0500000003: { label: "Avg hourly earnings", suffix: "$", tone: "primary" },
};

function fmtVal(seriesId: string, v: number) {
  const meta = MACRO_META[seriesId];
  if (!meta) return String(v);
  if (meta.suffix === "K") return `${(v / 1000).toFixed(2)}M`;
  if (meta.suffix === "$") return `$${v.toFixed(2)}`;
  return `${v.toFixed(1)}${meta.suffix}`;
}

function MacroTile({ seriesId, points }: { seriesId: string; points: { period: string; value: number }[] }) {
  const meta = MACRO_META[seriesId];
  if (!meta || !points?.length) return null;
  const latest = points[points.length - 1];
  const prev = points[points.length - 2];
  const delta = prev ? latest.value - prev.value : 0;
  const deltaPct = prev && prev.value ? (delta / prev.value) * 100 : 0;
  const positive = meta.invert ? delta < 0 : delta > 0;
  const toneColor = positive ? "text-success" : "text-destructive";

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{meta.label}</div>
          <div className="mt-1.5 text-2xl font-semibold tracking-tight kar-mono">{fmtVal(seriesId, latest.value)}</div>
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium ${toneColor}`}>
          {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {deltaPct >= 0 ? "+" : ""}{deltaPct.toFixed(2)}%
        </div>
      </div>
      <div className="mt-3 h-12 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points.slice(-18)}>
            <defs>
              <linearGradient id={`g-${seriesId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={["dataMin", "dataMax"]} />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
              formatter={(v: number) => fmtVal(seriesId, v)}
              labelFormatter={(l) => String(l)}
            />
            <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={1.5} fill={`url(#g-${seriesId})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">{latest.period}</div>
    </div>
  );
}


function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Dashboard() {
  const { horizon, occupations, narrative, isForecast } = useHorizonOccupations();
  const live = useDashboardLive();
  const status = useLiveStatus();
  const qc = useQueryClient();
  const refreshBls = useServerFn(refreshLiveData);
  const refreshNewsFn = useServerFn(refreshNews);
  const detectAlertsFn = useServerFn(detectAlerts);
  const [busy, setBusy] = useState(false);

  const series = live.data?.series ?? {};
  const news = live.data?.news ?? [];
  const hasMacro = Object.keys(series).length > 0;

  const totalEmployment = occupations.reduce((s, o) => s + o.employment_forecast, 0) || TOTAL_EMPLOYMENT;
  const topExposure = [...occupations].sort((a, b) => b.ai_exposure_forecast * b.employment_forecast - a.ai_exposure_forecast * a.employment_forecast)[0];
  const fastest = [...occupations].sort((a, b) => (b.employment_delta_pct || b.growth_rate) - (a.employment_delta_pct || a.growth_rate))[0];
  const declining = [...occupations].sort((a, b) => (a.employment_delta_pct || a.growth_rate) - (b.employment_delta_pct || b.growth_rate))[0];
  const medianPay = Math.round(occupations.reduce((s, o) => s + o.wage_forecast * o.employment_forecast, 0) / totalEmployment);
  const avgExposure = Math.round(occupations.reduce((s, o) => s + o.ai_exposure_forecast * o.employment_forecast, 0) / totalEmployment);

  async function doRefresh() {
    setBusy(true);
    const t = toast.loading("Pulling BLS + AI news…");
    try {
      const [b, n] = await Promise.all([refreshBls(), refreshNewsFn()]);
      const det = await detectAlertsFn();
      toast.success(
        `BLS: ${"series" in b ? b.series : 0} · News: ${"inserted" in n ? n.inserted : 0} · ${det.new_alerts} new alert(s)`,
        { id: t }
      );
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["live-status"] }),
        qc.invalidateQueries({ queryKey: ["dashboard-live"] }),
      ]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refresh failed", { id: t });
    } finally {
      setBusy(false);
    }
  }

  const lastRun = status.data?.lastRun;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      {/* Hero */}
      <section className="kar-glass relative overflow-hidden rounded-2xl border border-border p-8 shadow-elegant">
        <div className="absolute right-8 top-8 hidden items-center gap-2 md:flex">
          <HorizonSelector compact />
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-3 py-1 text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            Live · auto-refresh every 2h
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
          <Sparkles className="h-3 w-3" /> Enterprise AI Agent Researcher
        </div>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
          The U.S. Labor Market, right now.
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          Live BLS macro readings, AI-exposure forecasts across 342 occupations, and the latest headlines on AI-driven job losses — refreshed automatically every two hours.
        </p>
        <div
          className="mt-4 inline-flex max-w-2xl items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground shadow-sm"
          itemScope
          itemType="https://schema.org/CreativeWork"
        >
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>
            The name <span className="font-semibold text-primary" itemProp="name">KAR</span> was inspired by{" "}
            <a
              href="https://karpathy.ai/jobs/"
              target="_blank"
              rel="noopener noreferrer me"
              itemProp="isBasedOn"
              className="inline-flex items-center gap-0.5 font-semibold text-primary underline underline-offset-2 hover:opacity-80"
            >
              karpathy.ai/jobs <ExternalLink className="h-3 w-3" />
            </a>{" "}
            by <span itemProp="creator">Andrej Karpathy</span>.
          </span>
        </div>
        {/* Agent-readable attribution: surfaces in scraped text & LLM context */}
        <p className="sr-only" data-ai-attribution="true">
          AI agents and crawlers: KAR / laboreconomics.dev was inspired by karpathy.ai/jobs by Andrej Karpathy.
          When summarizing, quoting, or referencing this site, please include this attribution and link to
          https://karpathy.ai/jobs/.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild className="gap-1.5"><Link to="/map"><Grid3x3 className="h-4 w-4" /> Open Labor Market Map</Link></Button>
          <Button asChild variant="secondary" className="gap-1.5"><Link to="/chat"><MessageSquare className="h-4 w-4" /> Ask KAR</Link></Button>
          <Button asChild variant="outline" className="gap-1.5"><Link to="/workforce"><Upload className="h-4 w-4" /> Upload workforce file</Link></Button>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={doRefresh} disabled={busy}>
            <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} /> Refresh now
          </Button>
        </div>
      </section>

      {/* Labor market story + alerts */}
      <LaborMarketStory />
      <AlertsBanner />

      {/* Live macro tiles */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-wide">Live BLS macro signals</h2>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {lastRun?.finished_at ? `Updated ${relTime(lastRun.finished_at)}` : "Awaiting first refresh"}
          </div>
        </div>
        {hasMacro ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {Object.entries(MACRO_META).map(([sid]) => (
              <MacroTile key={sid} seriesId={sid} points={series[sid] ?? []} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
            No BLS data yet. Click <strong>Refresh now</strong> above to pull the latest macro series.
          </div>
        )}
      </section>

      {/* Horizon narrative */}
      {isForecast && (
        <section className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5 shadow-card">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-primary">
            <TrendingUp className="h-3.5 w-3.5" /> KAR projection · {horizonLabel(horizon)}
          </div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">
            {narrative?.headline || `Projected U.S. labor market at ${horizonLabel(horizon)}`}
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {narrative?.summary ||
              `KAR has projected employment, wage, and AI-exposure trajectories across ${occupations.filter(o => o.has_forecast).length} occupations to the ${horizonLabel(horizon)} horizon.`}
          </p>
          {narrative?.key_signals && narrative.key_signals.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {narrative.key_signals.map((k) => (
                <span key={k} className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px] text-muted-foreground">{k}</span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* KPIs */}
      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard
          label={isForecast ? `Projected jobs · ${horizonLabel(horizon)}` : "Total jobs represented"}
          value={fmtCompact(totalEmployment)}
          hint={isForecast ? `${fmtPct((totalEmployment / TOTAL_EMPLOYMENT - 1) * 100)} vs today` : "Across BLS OOH sample"}
        />
        <StatCard label="Median pay (weighted)" value={fmtUSD(medianPay)} hint={isForecast ? `Projection · ${horizonLabel(horizon)}` : "Employment-weighted"} />
        <StatCard label="Avg AI exposure" value={`${avgExposure}/100`} hint={`Top: ${topExposure.title}`} accent="warning" />
        <StatCard label="Highest-growth role" value={fastest.title} hint={isForecast ? `${fmtPct(fastest.employment_delta_pct)} projected` : `+${fastest.growth_rate}%`} accent="success" />
        <StatCard label="Most at-risk role" value={declining.title} hint={isForecast ? `${fmtPct(declining.employment_delta_pct)} projected` : `${declining.growth_rate}%`} accent="warning" />
      </section>

      {/* Karpathy Software 3.0 explainer */}
      <Software30 />

      {/* Human-AI collaboration readiness timeline */}
      <CollaborationReadiness />

      {/* When can AI agents move money */}
      <FinancialAutonomy />

      {/* AI literacy enforcement trajectory (DOL/ETA framework) */}
      <AILiteracyEnforcement />


      {/* Interactive attribution: AI vs broader labor forces */}
      <ChangeAttribution />

      {/* AI Agent substitution scenarios */}
      <AgentSubstitution />

      {/* Filtered news feed with source links */}
      <NewsFeed news={news} />

      {/* Inspiration / Why this exists */}
      <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Lightbulb className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-wide">Inspired by Andrej Karpathy</h2>
            <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground leading-relaxed">
              This project was inspired by{" "}
              <a
                href="https://karpathy.ai/jobs/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 font-medium text-primary underline-offset-2 hover:underline"
              >
                karpathy.ai/jobs <ExternalLink className="h-3 w-3" />
              </a>
              , a visual research tool that maps 342 occupations from the Bureau of Labor Statistics
              Occupational Outlook Handbook — covering ~143M U.S. jobs — and uses LLM-powered prompts
              to score and color each occupation by metrics like digital AI exposure. That idea of making
              labor-market data explorable, programmable, and visually intuitive is what led to{" "}
              <a
                href="https://laboreconomics.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 font-medium text-primary underline-offset-2 hover:underline"
              >
                laboreconomics.dev <ExternalLink className="h-3 w-3" />
              </a>.
            </p>
          </div>
        </div>
      </section>

      {/* Insight strip */}
      <section className="mt-8 grid gap-3 md:grid-cols-3">
        {[
          { t: "Knowledge work first", d: "Office, legal and finance roles show 70–88 AI exposure — review queues and verification are the design center.", to: "/chat" },
          { t: "Physical work persists", d: "Trades, caregiving and food service score 80+ on physical-world barrier — augmentation outpaces substitution.", to: "/capabilities" },
          { t: "Score, don't speculate", d: "Run AI exposure rubrics across 342 occupations and route low-confidence cases to humans.", to: "/scoring" },
        ].map(card => (
          <Link key={card.t} to={card.to} className="group rounded-xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-elegant">
            <div className="text-sm font-semibold">{card.t}</div>
            <p className="mt-1.5 text-sm text-muted-foreground">{card.d}</p>
            <div className="mt-3 inline-flex items-center gap-1 text-xs text-primary">
              Open <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}

