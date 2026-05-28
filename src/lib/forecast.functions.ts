import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { OCCUPATIONS } from "@/data/occupations";
import { HORIZONS, FORECAST_HORIZONS } from "@/lib/horizons";

// Strip secrets / key fragments from text before persisting to a publicly-readable table.
// BLS error messages embed the caller's API key (e.g. "The key:xxxxxxxx provided by the User is invalid").
function sanitizeLogMessage(msg: string): string {
  return msg
    // BLS-style: "key:abc123" or "key=abc123"
    .replace(/\bkey\s*[:=]\s*[A-Za-z0-9_\-]{8,}/gi, "key:[REDACTED]")
    // Bearer tokens
    .replace(/\bBearer\s+[A-Za-z0-9._\-]{10,}/gi, "Bearer [REDACTED]")
    // Authorization headers
    .replace(/\bauthorization\s*[:=]\s*\S+/gi, "authorization: [REDACTED]")
    // Generic long hex/base64 token blobs (24+ chars)
    .replace(/\b[A-Fa-f0-9]{24,}\b/g, "[REDACTED]")
    .replace(/\b[A-Za-z0-9_\-]{32,}\b/g, "[REDACTED]")
    .slice(0, 500);
}

// ---------- BLS public API ----------
// Series we always pull for the macro panel.
const MACRO_SERIES = [
  { id: "LNS14000000", label: "Unemployment Rate" },
  { id: "LNS11300000", label: "Labor Force Participation" },
  { id: "CES0000000001", label: "Total Nonfarm Employment" },
  { id: "LNS12000000", label: "Civilian Employment" },
  { id: "CES0500000003", label: "Avg Hourly Earnings (Private)" },
] as const;

type BlsSeriesPoint = { year: string; period: string; periodName: string; value: string };
type BlsResponse = {
  status: string;
  message?: string[];
  Results?: { series: Array<{ seriesID: string; data: BlsSeriesPoint[] }> };
};

async function fetchBls(seriesIds: string[]): Promise<BlsResponse> {
  const key = process.env.BLS_API_KEY;
  const base: Record<string, unknown> = {
    seriesid: seriesIds,
    startyear: String(new Date().getFullYear() - 2),
    endyear: String(new Date().getFullYear()),
  };
  async function call(withKey: boolean): Promise<BlsResponse> {
    const body = withKey && key ? { ...base, registrationkey: key } : base;
    const res = await fetch("https://api.bls.gov/publicAPI/v2/timeseries/data/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`BLS ${res.status}: ${await res.text()}`);
    return (await res.json()) as BlsResponse;
  }
  let json = await call(true);
  if (json.status !== "REQUEST_SUCCEEDED" && (json.message ?? []).some((m) => /invalid/i.test(m))) {
    json = await call(false);
  }
  return json;
}

export const refreshLiveData = createServerFn({ method: "POST" }).handler(async () => {
  const { data: run } = await supabaseAdmin
    .from("forecast_runs")
    .insert({ scope: "bls_macro", status: "running" })
    .select()
    .single();

  try {
    const bls = await fetchBls(MACRO_SERIES.map((s) => s.id));
    if (bls.status !== "REQUEST_SUCCEEDED") {
      throw new Error(bls.message?.join("; ") || "BLS request failed");
    }
    const rows: Array<{
      occ_code: string; series_id: string; value: number | null;
      period: string; period_name: string; year: number;
    }> = [];
    for (const s of bls.Results?.series ?? []) {
      const latest = s.data?.[0];
      if (!latest) continue;
      rows.push({
        occ_code: "_macro",
        series_id: s.seriesID,
        value: Number(latest.value),
        period: latest.period,
        period_name: latest.periodName,
        year: Number(latest.year),
      });
    }
    if (rows.length) await supabaseAdmin.from("occupation_snapshots").insert(rows);

    await supabaseAdmin
      .from("forecast_runs")
      .update({
        status: "succeeded",
        finished_at: new Date().toISOString(),
        occupations_count: rows.length,
        message: `Refreshed ${rows.length} BLS series`,
      })
      .eq("id", run!.id);

    return { ok: true, series: rows.length };
  } catch (e) {
    const raw = e instanceof Error ? e.message : "Unknown error";
    const message = sanitizeLogMessage(raw);
    await supabaseAdmin
      .from("forecast_runs")
      .update({ status: "failed", finished_at: new Date().toISOString(), message })
      .eq("id", run!.id);
    return { ok: false, error: message };
  }
});

// ---------- AI forecast generation ----------
async function callAi(messages: unknown, tool?: unknown) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const body: Record<string, unknown> = {
    model: "google/gemini-3-flash-preview",
    messages,
    stream: false,
  };
  if (tool) {
    body.tools = [tool];
    body.tool_choice = { type: "function", function: { name: (tool as { function: { name: string } }).function.name } };
  }
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`AI ${r.status}: ${await r.text()}`);
  return r.json();
}

const HORIZON_KEYS_LIST = FORECAST_HORIZONS.map((h) => h.key);

const forecastTool = {
  type: "function",
  function: {
    name: "emit_forecasts",
    description: "Emit per-horizon projections for one occupation.",
    parameters: {
      type: "object",
      properties: {
        horizons: {
          type: "array",
          items: {
            type: "object",
            properties: {
              horizon: { type: "string", enum: HORIZON_KEYS_LIST },
              employment_delta_pct: { type: "number", description: "% change vs today" },
              ai_exposure: { type: "number", description: "0-100 forecasted exposure" },
              wage_delta_pct: { type: "number" },
              outlook: { type: "string", enum: ["Decline", "Slower", "Average", "Faster", "Much faster"] },
              confidence: { type: "number", description: "0-1" },
              rationale: { type: "string", description: "<=240 chars" },
              drivers: { type: "array", items: { type: "string" }, maxItems: 4 },
            },
            required: ["horizon", "employment_delta_pct", "ai_exposure", "wage_delta_pct", "outlook", "confidence", "rationale", "drivers"],
            additionalProperties: false,
          },
        },
      },
      required: ["horizons"],
      additionalProperties: false,
    },
  },
};

export const generateForecasts = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ occCode: z.string().optional(), limit: z.number().min(1).max(40).optional() }).parse(d)
  )
  .handler(async ({ data }) => {
    const { data: run } = await supabaseAdmin
      .from("forecast_runs")
      .insert({ scope: data.occCode ? `forecast:${data.occCode}` : "forecast:all", status: "running" })
      .select()
      .single();

    const targets = data.occCode
      ? OCCUPATIONS.filter((o) => o.id === data.occCode || o.soc_code === data.occCode)
      : OCCUPATIONS.slice(0, data.limit ?? OCCUPATIONS.length);

    let done = 0;
    const errors: string[] = [];

    // Macro context snapshot
    const { data: macro } = await supabaseAdmin
      .from("occupation_snapshots")
      .select("series_id, value, period_name, year")
      .eq("occ_code", "_macro")
      .order("fetched_at", { ascending: false })
      .limit(20);
    const macroSummary = (macro || [])
      .map((m) => `${m.series_id}=${m.value} (${m.period_name} ${m.year})`)
      .join(", ");

    for (const occ of targets) {
      try {
        const messages = [
          {
            role: "system",
            content:
              "You are KAR, an enterprise AI labor-market analyst. Given an occupation and current BLS context, produce calibrated horizon forecasts. Be conservative; reflect known AI diffusion curves, demographics, immigration policy, capital deployment, and physical-world barriers. Use realistic % deltas (rarely > ±30% even at 5y).",
          },
          {
            role: "user",
            content: `Occupation: ${occ.title} (SOC ${occ.soc_code}, ${occ.category})
Today: employment=${occ.employment}, median_pay=$${occ.median_pay}, growth_rate=${occ.growth_rate}%, ai_exposure_today=${occ.ai_exposure_score}/100, physical_world_barrier=${occ.physical_world_barrier_score}/100.
BLS macro context: ${macroSummary || "n/a"}.
Emit forecasts for horizons: ${HORIZON_KEYS_LIST.join(", ")}.`,
          },
        ];
        const j = await callAi(messages, forecastTool);
        const args = j?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        if (!args) throw new Error("no tool_call");
        const parsed = JSON.parse(args) as {
          horizons: Array<{
            horizon: string; employment_delta_pct: number; ai_exposure: number;
            wage_delta_pct: number; outlook: string; confidence: number;
            rationale: string; drivers: string[];
          }>;
        };
        const rows = parsed.horizons.map((h) => ({
          occ_code: occ.soc_code,
          horizon: h.horizon,
          employment: Math.round(occ.employment * (1 + h.employment_delta_pct / 100)),
          employment_delta_pct: h.employment_delta_pct,
          ai_exposure: Math.max(0, Math.min(100, h.ai_exposure)),
          wage: Math.round(occ.median_pay * (1 + h.wage_delta_pct / 100)),
          wage_delta_pct: h.wage_delta_pct,
          outlook: h.outlook,
          rationale: h.rationale,
          confidence: h.confidence,
          drivers: h.drivers,
        }));
        await supabaseAdmin.from("forecasts").upsert(rows, { onConflict: "occ_code,horizon" });
        done++;
      } catch (e) {
        errors.push(`${occ.soc_code}: ${e instanceof Error ? e.message : "err"}`);
      }
    }

    // Generate market narrative per horizon
    try {
      const narrativeTool = {
        type: "function",
        function: {
          name: "emit_narratives",
          description: "Emit one narrative per horizon for the overall U.S. labor market.",
          parameters: {
            type: "object",
            properties: {
              narratives: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    horizon: { type: "string", enum: HORIZON_KEYS_LIST },
                    headline: { type: "string" },
                    summary: { type: "string" },
                    key_signals: { type: "array", items: { type: "string" }, maxItems: 5 },
                    unemployment_rate: { type: "number" },
                    labor_force_participation: { type: "number" },
                    ai_displacement_index: { type: "number", description: "0-100, share of tasks under active AI substitution pressure" },
                  },
                  required: ["horizon", "headline", "summary", "key_signals", "unemployment_rate", "labor_force_participation", "ai_displacement_index"],
                  additionalProperties: false,
                },
              },
            },
            required: ["narratives"],
            additionalProperties: false,
          },
        },
      };
      const j = await callAi(
        [
          { role: "system", content: "You are KAR. Produce calibrated horizon narratives for the U.S. labor market. Use current BLS readings as the anchor at horizon 30d." },
          { role: "user", content: `BLS macro context: ${macroSummary || "n/a"}. Horizons: ${HORIZON_KEYS_LIST.join(", ")}.` },
        ],
        narrativeTool
      );
      const args = j?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (args) {
        const parsed = JSON.parse(args) as { narratives: Array<Record<string, unknown>> };
        const rows = parsed.narratives.map((n) => ({
          horizon: n.horizon as string,
          headline: n.headline as string,
          summary: n.summary as string,
          key_signals: n.key_signals as string[],
          unemployment_rate: n.unemployment_rate as number,
          labor_force_participation: n.labor_force_participation as number,
          ai_displacement_index: n.ai_displacement_index as number,
        }));
        await supabaseAdmin.from("market_narratives").upsert(rows, { onConflict: "horizon" });
      }
    } catch (e) {
      errors.push(`narratives: ${e instanceof Error ? e.message : "err"}`);
    }

    await supabaseAdmin
      .from("forecast_runs")
      .update({
        status: errors.length && !done ? "failed" : "succeeded",
        finished_at: new Date().toISOString(),
        occupations_count: done,
        message: sanitizeLogMessage(errors.length ? errors.slice(0, 5).join(" | ") : `Generated ${done} forecasts`),
      })
      .eq("id", run!.id);

    return { ok: true, done, errors: errors.length };
  });

// ---------- Read APIs ----------
export const getLiveStatus = createServerFn({ method: "GET" }).handler(async () => {
  const [{ data: lastRun }, { data: macro }, { count }] = await Promise.all([
    supabaseAdmin.from("forecast_runs").select("*").order("started_at", { ascending: false }).limit(1).single(),
    supabaseAdmin.from("occupation_snapshots").select("series_id, value, period_name, year, fetched_at").eq("occ_code", "_macro").order("fetched_at", { ascending: false }).limit(20),
    supabaseAdmin.from("forecasts").select("*", { count: "exact", head: true }),
  ]);
  // dedupe by series
  const latestBySeries = new Map<string, typeof macro extends Array<infer T> ? T : never>();
  for (const m of macro || []) if (!latestBySeries.has(m.series_id)) latestBySeries.set(m.series_id, m as never);
  return {
    lastRun: lastRun ?? null,
    macro: Array.from(latestBySeries.values()),
    forecastCount: count ?? 0,
  };
});

export const getAllForecasts = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await supabaseAdmin.from("forecasts").select("*");
  return { forecasts: data ?? [] };
});

export const getNarratives = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await supabaseAdmin.from("market_narratives").select("*");
  return { narratives: data ?? [] };
});

export const getOccupationForecasts = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ occCode: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { data: rows } = await supabaseAdmin
      .from("forecasts")
      .select("*")
      .eq("occ_code", data.occCode);
    return { forecasts: rows ?? [] };
  });

export { HORIZONS };
