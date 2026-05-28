import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Macro series thresholds for "major swing"
const SWING_THRESHOLDS: Record<string, { absDelta: number; label: string; invert?: boolean }> = {
  LNS14000000: { absDelta: 0.2, label: "Unemployment rate", invert: true }, // 0.2pp
  LNS11300000: { absDelta: 0.3, label: "Labor force participation" },
  CES0000000001: { absDelta: 200, label: "Nonfarm payrolls (K)" }, // 200K
  CES0500000003: { absDelta: 0.15, label: "Avg hourly earnings ($)" },
};

type Alert = {
  kind: string;
  severity: "info" | "warning" | "critical";
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  source_url?: string | null;
};

export const detectAlerts = createServerFn({ method: "POST" }).handler(async () => {
  const alerts: Alert[] = [];
  const changes: { label: string; delta: number; direction: "up" | "down" }[] = [];

  // 1) Macro swing detection: compare two latest snapshots per series
  const { data: macro } = await supabaseAdmin
    .from("occupation_snapshots")
    .select("series_id, value, period, period_name, year, fetched_at")
    .eq("occ_code", "_macro")
    .order("year", { ascending: false })
    .order("period", { ascending: false })
    .limit(400);

  const bySeries: Record<string, { value: number; period: string }[]> = {};
  for (const row of macro ?? []) {
    const key = row.series_id;
    bySeries[key] = bySeries[key] || [];
    bySeries[key].push({ value: Number(row.value), period: `${row.year} ${row.period_name}` });
  }

  for (const [sid, points] of Object.entries(bySeries)) {
    const cfg = SWING_THRESHOLDS[sid];
    if (!cfg || points.length < 2) continue;
    const latest = points[0];
    const prev = points[1];
    const delta = latest.value - prev.value;
    if (Math.abs(delta) < cfg.absDelta) continue;
    const direction: "up" | "down" = delta > 0 ? "up" : "down";
    const isBad = cfg.invert ? direction === "up" : direction === "down";
    changes.push({ label: cfg.label, delta, direction });
    alerts.push({
      kind: `macro_swing:${sid}`,
      severity: isBad ? (Math.abs(delta) > cfg.absDelta * 2 ? "critical" : "warning") : "info",
      title: `${cfg.label} ${direction === "up" ? "↑" : "↓"} ${Math.abs(delta).toFixed(2)}`,
      summary: `${cfg.label} moved from ${prev.value} to ${latest.value} (${latest.period}). ${
        isBad ? "This is a concerning shift" : "This is a positive signal"
      } for the U.S. labor market.`,
      payload: { series_id: sid, previous: prev.value, current: latest.value, delta, period: latest.period },
    });
  }

  // 2) Forecast flips: occupations now in the bottom 5 by employment_delta_pct at 1y
  const { data: f1y } = await supabaseAdmin
    .from("forecasts")
    .select("occ_code, employment_delta_pct, ai_exposure, rationale")
    .eq("horizon", "1y")
    .order("employment_delta_pct", { ascending: true })
    .limit(5);

  // Look back at the last detection's payload to see which were previously at-risk
  const { data: lastChange } = await supabaseAdmin
    .from("dashboard_changes")
    .select("key_changes")
    .order("detected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const prevAtRisk = new Set<string>(
    Array.isArray((lastChange?.key_changes as Array<{ at_risk?: string[] }> | undefined))
      ? ((lastChange!.key_changes as Array<{ at_risk?: string[] }>).flatMap((c) => c.at_risk ?? []))
      : []
  );

  const currentAtRisk = (f1y ?? []).map((r) => r.occ_code);
  const newlyAtRisk = currentAtRisk.filter((c) => !prevAtRisk.has(c));

  for (const occ of newlyAtRisk.slice(0, 3)) {
    const row = (f1y ?? []).find((r) => r.occ_code === occ);
    if (!row) continue;
    alerts.push({
      kind: `role_flip:${occ}`,
      severity: "warning",
      title: `New at-risk role: ${occ}`,
      summary: `Occupation ${occ} flipped into the top-5 most at-risk roles at the 1-year horizon (projected ${Number(
        row.employment_delta_pct
      ).toFixed(1)}% employment, AI exposure ${Math.round(Number(row.ai_exposure))}/100). ${
        row.rationale ?? ""
      }`.trim(),
      payload: { occ_code: occ, employment_delta_pct: row.employment_delta_pct, ai_exposure: row.ai_exposure },
    });
  }

  // 3) News burst: >=3 fresh ai_jobs headlines in the last 6h
  const sinceIso = new Date(Date.now() - 6 * 3600_000).toISOString();
  const { count: recentAiJobs, data: topNews } = await supabaseAdmin
    .from("news_items")
    .select("title, url, source, published_at", { count: "exact" })
    .eq("category", "ai_jobs")
    .gte("published_at", sinceIso)
    .order("published_at", { ascending: false })
    .limit(3);
  if ((recentAiJobs ?? 0) >= 3 && topNews?.length) {
    alerts.push({
      kind: "news_burst:ai_jobs",
      severity: "warning",
      title: `${recentAiJobs} new AI job-loss stories in the last 6h`,
      summary: `Headline cluster detected. Top story: "${topNews[0].title}" (${topNews[0].source ?? "news"}).`,
      payload: { count: recentAiJobs, samples: topNews },
      source_url: topNews[0].url,
    });
  }

  // De-duplicate against recent (last 24h) alerts of same kind
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data: recent } = await supabaseAdmin
    .from("labor_alerts")
    .select("kind")
    .gte("created_at", since);
  const recentKinds = new Set((recent ?? []).map((r) => r.kind));
  const fresh = alerts.filter((a) => !recentKinds.has(a.kind));

  if (fresh.length) {
    await supabaseAdmin.from("labor_alerts").insert(fresh as never);
  }

  // 4) Compose dashboard "story" snapshot
  const headline =
    fresh.length === 0
      ? "Labor market steady since last refresh"
      : fresh.find((a) => a.severity === "critical")?.title ||
        fresh.find((a) => a.severity === "warning")?.title ||
        `${fresh.length} new labor-market signals`;

  const summaryParts: string[] = [];
  if (changes.length) {
    summaryParts.push(
      "Macro: " +
        changes
          .map((c) => `${c.label} ${c.direction === "up" ? "+" : ""}${c.delta.toFixed(2)}`)
          .join(", ") +
        "."
    );
  }
  if (newlyAtRisk.length) {
    summaryParts.push(`${newlyAtRisk.length} role(s) flipped into top at-risk: ${newlyAtRisk.join(", ")}.`);
  }
  if ((recentAiJobs ?? 0) >= 3) {
    summaryParts.push(`${recentAiJobs} fresh AI job-loss stories clustered in the last 6 hours.`);
  }
  if (!summaryParts.length) {
    summaryParts.push("No material moves in macro series, forecasts, or news velocity since the previous refresh.");
  }

  await supabaseAdmin.from("dashboard_changes").insert({
    headline,
    summary: summaryParts.join(" "),
    key_changes: [
      { macro: changes },
      { at_risk: currentAtRisk },
      { newly_at_risk: newlyAtRisk },
      { ai_jobs_burst: recentAiJobs ?? 0 },
    ],
    alert_count: fresh.length,
  });

  return { ok: true, new_alerts: fresh.length, headline };
});
