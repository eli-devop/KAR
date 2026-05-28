import { createFileRoute } from "@tanstack/react-router";
import { refreshLiveData, generateForecasts } from "@/lib/forecast.functions";
import { refreshNews } from "@/lib/news.functions";
import { detectAlerts } from "@/lib/alerts.functions";

// Called by pg_cron every 2 hours. Refreshes BLS macro + AI/labor news, then detects swings.
export const Route = createFileRoute("/api/public/hooks/refresh-dashboard")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const runForecast = url.searchParams.get("forecast") === "1";
        const results: Record<string, unknown> = {};
        try { results.bls = await refreshLiveData(); } catch (e) { results.bls = { ok: false, error: e instanceof Error ? e.message : "err" }; }
        try { results.news = await refreshNews(); } catch (e) { results.news = { ok: false, error: e instanceof Error ? e.message : "err" }; }
        if (runForecast) {
          try { results.forecasts = await generateForecasts({ data: { limit: 35 } }); }
          catch (e) { results.forecasts = { ok: false, error: e instanceof Error ? e.message : "err" }; }
        }
        try { results.alerts = await detectAlerts(); } catch (e) { results.alerts = { ok: false, error: e instanceof Error ? e.message : "err" }; }
        return new Response(JSON.stringify({ ok: true, at: new Date().toISOString(), results }), {
          headers: { "Content-Type": "application/json" },
        });
      },
      GET: async () =>
        new Response(JSON.stringify({ ok: true, info: "POST to trigger refresh" }), {
          headers: { "Content-Type": "application/json" },
        }),
    },
  },
});
