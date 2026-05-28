import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Database, RefreshCw, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { HorizonSelector } from "./HorizonSelector";
import { useLiveStatus } from "@/hooks/useForecasts";
import { refreshLiveData, generateForecasts } from "@/lib/forecast.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function relTime(iso?: string | null) {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function LiveStatusBar() {
  const status = useLiveStatus();
  const refreshBls = useServerFn(refreshLiveData);
  const genForecasts = useServerFn(generateForecasts);
  const qc = useQueryClient();
  const [busy, setBusy] = useState<"" | "bls" | "ai">("");

  type MacroPoint = { series_id: string; value: number; period_name: string; year: number; fetched_at: string };
  const macro = (status.data?.macro || []) as MacroPoint[];
  const unemp = macro.find((m) => m.series_id === "LNS14000000");
  const lfpr = macro.find((m) => m.series_id === "LNS11300000");
  const ces = macro.find((m) => m.series_id === "CES0000000001");

  const runStatus = status.data?.lastRun?.status;

  async function doRefresh() {
    setBusy("bls");
    const t = toast.loading("Pulling BLS series…");
    try {
      const r = await refreshBls();
      toast.success(r.ok ? `Refreshed ${r.series} BLS series` : `BLS error: ${r.error}`, { id: t });
      await qc.invalidateQueries({ queryKey: ["live-status"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refresh failed", { id: t });
    } finally {
      setBusy("");
    }
  }

  async function doGenerate() {
    setBusy("ai");
    const t = toast.loading("Generating horizon forecasts (this can take ~1 min)…");
    try {
      const r = await genForecasts({ data: {} });
      toast.success(`Generated forecasts for ${r.done} occupations`, { id: t });
      await qc.invalidateQueries({ queryKey: ["forecasts"] });
      await qc.invalidateQueries({ queryKey: ["narratives"] });
      await qc.invalidateQueries({ queryKey: ["live-status"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed", { id: t });
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-6 py-2.5">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {runStatus === "failed" ? (
            <AlertCircle className="h-3.5 w-3.5 text-destructive" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          )}
          <span className="font-medium text-foreground">Live</span>
          <span>· BLS {relTime(status.data?.lastRun?.finished_at || status.data?.lastRun?.started_at)}</span>
          <span className="text-muted-foreground">·</span>
          <span>{status.data?.forecastCount ?? 0} forecasts</span>
        </div>

        <div className="hidden items-center gap-3 text-[11px] md:flex">
          {unemp && <Pill label="Unemployment" value={`${Number(unemp.value).toFixed(1)}%`} />}
          {lfpr && <Pill label="LFPR" value={`${Number(lfpr.value).toFixed(1)}%`} />}
          {ces && <Pill label="Nonfarm" value={`${(Number(ces.value) / 1000).toFixed(2)}M`} />}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <HorizonSelector />
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={doRefresh} disabled={!!busy}>
            <Database className={"h-3 w-3 " + (busy === "bls" ? "animate-pulse" : "")} /> BLS
          </Button>
          <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={doGenerate} disabled={!!busy}>
            <Sparkles className={"h-3 w-3 " + (busy === "ai" ? "animate-spin" : "")} /> Forecast
          </Button>
        </div>
      </div>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </span>
  );
}
