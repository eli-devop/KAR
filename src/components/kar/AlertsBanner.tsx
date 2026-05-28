import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, Bell, X } from "lucide-react";
import { dismissAlert } from "@/lib/news.functions";
import { useDashboardLive } from "@/hooks/useDashboardLive";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type AlertRow = {
  id: string;
  kind: string;
  severity: "info" | "warning" | "critical" | string;
  title: string;
  summary: string;
  source_url?: string | null;
  created_at: string;
};

export function AlertsBanner() {
  const live = useDashboardLive();
  const qc = useQueryClient();
  const dismiss = useServerFn(dismissAlert);
  const alerts = (live.data?.alerts ?? []) as AlertRow[];

  // Realtime: pop a toast when a new alert lands
  useEffect(() => {
    const ch = supabase
      .channel("labor_alerts_stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "labor_alerts" },
        (payload) => {
          const a = payload.new as AlertRow;
          const isBad = a.severity === "critical" || a.severity === "warning";
          (isBad ? toast.error : toast.message)(a.title, {
            description: a.summary.slice(0, 160) + (a.summary.length > 160 ? "…" : ""),
            duration: 8000,
          });
          qc.invalidateQueries({ queryKey: ["dashboard-live"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  if (!alerts.length) return null;
  const critical = alerts.filter((a) => a.severity === "critical");
  const warning = alerts.filter((a) => a.severity === "warning");
  const top = [...critical, ...warning, ...alerts].slice(0, 3);

  async function onDismiss(id: string) {
    await dismiss({ data: { id } });
    await qc.invalidateQueries({ queryKey: ["dashboard-live"] });
  }

  return (
    <section className="mt-4 space-y-2">
      {top.map((a) => {
        const tone =
          a.severity === "critical"
            ? "border-destructive/40 bg-destructive/10"
            : a.severity === "warning"
            ? "border-warning/40 bg-warning/10"
            : "border-primary/30 bg-primary/5";
        return (
          <div key={a.id} className={`flex items-start gap-3 rounded-xl border ${tone} p-3`}>
            <div className="mt-0.5">
              {a.severity === "critical" ? (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              ) : (
                <Bell className="h-4 w-4 text-warning" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{a.title}</span>
                <span className="rounded-full border border-border bg-card px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {a.severity}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{a.summary}</p>
              {a.source_url && (
                <a
                  href={a.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-[11px] text-primary hover:underline"
                >
                  View source →
                </a>
              )}
            </div>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onDismiss(a.id)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        );
      })}
      {alerts.length > top.length && (
        <div className="text-[11px] text-muted-foreground">+{alerts.length - top.length} more alert(s)</div>
      )}
    </section>
  );
}

export function LaborMarketStory() {
  const live = useDashboardLive();
  const change = live.data?.change as
    | { headline: string; summary: string; detected_at: string; alert_count: number }
    | null;
  const series = (live.data?.series ?? {}) as Record<string, { period: string; value: number }[]>;
  const news = (live.data?.news ?? []) as Array<{
    title: string;
    url: string;
    source?: string | null;
    category: string;
    published_at: string | null;
  }>;

  const latest = (sid: string) => {
    const arr = series[sid];
    return arr && arr.length ? arr[arr.length - 1] : null;
  };
  const prev = (sid: string) => {
    const arr = series[sid];
    return arr && arr.length > 1 ? arr[arr.length - 2] : null;
  };
  const fmtDelta = (sid: string, digits = 2) => {
    const l = latest(sid);
    const p = prev(sid);
    if (!l || !p) return null;
    const d = l.value - p.value;
    if (Math.abs(d) < Math.pow(10, -digits) / 2) return null;
    const sign = d > 0 ? "+" : "";
    return `${sign}${d.toFixed(digits)}`;
  };

  const unr = latest("LNS14000000");
  const lfp = latest("LNS11300000");
  const pay = latest("CES0000000001");
  const ahe = latest("CES0500000003");

  const since24 = Date.now() - 24 * 3600_000;
  const recent = news.filter((n) => n.published_at && new Date(n.published_at).getTime() > since24);
  const aiJobs24 = recent.filter((n) => n.category === "ai_jobs").length;
  const aiLabor24 = recent.filter((n) => n.category === "ai_labor").length;
  const topHeadline = recent[0] ?? news[0];

  const isSteady = (change?.alert_count ?? 0) === 0;
  const headline = isSteady && unr
    ? `U.S. unemployment ${unr.value.toFixed(1)}% · ${recent.length} fresh labor-market stories in 24h`
    : change?.headline || "Awaiting first detection run…";

  const summary = isSteady
    ? [
        unr && `Unemployment ${unr.value.toFixed(1)}% (${unr.period}).`,
        pay && `Nonfarm payrolls ${(pay.value / 1000).toFixed(1)}M.`,
        lfp && `Participation ${lfp.value.toFixed(1)}%.`,
        ahe && `Avg hourly earnings $${ahe.value.toFixed(2)}.`,
        (aiJobs24 || aiLabor24) &&
          `News flow: ${aiJobs24} AI-job-loss + ${aiLabor24} AI-workforce stories in last 24h.`,
      ]
        .filter(Boolean)
        .join(" ")
    : change?.summary || "";

  return (
    <section className="mt-6 rounded-2xl border border-border bg-gradient-to-br from-card to-primary/5 p-5 shadow-card">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-primary">
        <Bell className="h-3.5 w-3.5" /> Labor market story
      </div>
      <h2 className="mt-1 text-xl font-semibold tracking-tight">{headline}</h2>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
        {summary || "After the next refresh, KAR will summarize what moved in the macro series, forecasts, and news velocity."}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Unemployment", v: unr ? `${unr.value.toFixed(1)}%` : "—", d: fmtDelta("LNS14000000", 1), invert: true, suffix: "pp" },
          { label: "Participation", v: lfp ? `${lfp.value.toFixed(1)}%` : "—", d: fmtDelta("LNS11300000", 1), suffix: "pp" },
          { label: "Payrolls", v: pay ? `${(pay.value / 1000).toFixed(1)}M` : "—", d: fmtDelta("CES0000000001", 0), suffix: "K" },
          { label: "Avg hourly $", v: ahe ? `$${ahe.value.toFixed(2)}` : "—", d: fmtDelta("CES0500000003", 2), suffix: "" },
        ].map((m) => {
          const dn = m.d ? parseFloat(m.d) : 0;
          const good = m.invert ? dn < 0 : dn > 0;
          const tone = !m.d ? "text-muted-foreground" : good ? "text-emerald-500" : "text-destructive";
          return (
            <div key={m.label} className="rounded-lg border border-border bg-card/60 p-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.label}</div>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className="text-sm font-semibold">{m.v}</span>
                {m.d && <span className={`text-[11px] ${tone}`}>{m.d}{m.suffix}</span>}
              </div>
            </div>
          );
        })}
      </div>
      {topHeadline && (
        <a
          href={topHeadline.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block truncate text-[11px] text-primary hover:underline"
        >
          Top story: {topHeadline.title}
        </a>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        {change && <span>Detected {new Date(change.detected_at).toLocaleString()}</span>}
        <span>· {change?.alert_count ?? 0} new alert{(change?.alert_count ?? 0) === 1 ? "" : "s"}</span>
        <span>· {recent.length} headlines (24h)</span>
      </div>
    </section>
  );
}
