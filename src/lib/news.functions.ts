import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Google News RSS queries we want to track.
const FEEDS = [
  { category: "ai_jobs", q: "AI job losses layoffs" },
  { category: "ai_labor", q: "artificial intelligence workforce automation" },
  { category: "labor_market", q: "US labor market unemployment hiring" },
  { category: "education", q: "workforce education reskilling training AI" },
  { category: "wages", q: "US wages pay salary inflation labor" },
];
export const NEWS_CATEGORIES = ["ai_jobs", "ai_labor", "labor_market", "education", "wages"] as const;

function decode(s: string) {
  return s
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function parseRss(xml: string) {
  const items: { title: string; url: string; source: string; summary: string; published_at: string | null }[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml))) {
    const block = m[1];
    const title = decode(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "");
    const url = decode(block.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "");
    const desc = decode(block.match(/<description>([\s\S]*?)<\/description>/)?.[1] || "");
    const source = decode(block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || "");
    const pub = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim();
    let publishedIso: string | null = null;
    if (pub) {
      const d = new Date(pub);
      if (!isNaN(d.getTime())) publishedIso = d.toISOString();
    }
    if (title && url) items.push({ title, url, source, summary: desc, published_at: publishedIso });
  }
  return items;
}

export const refreshNews = createServerFn({ method: "POST" }).handler(async () => {
  const { data: run } = await supabaseAdmin
    .from("forecast_runs")
    .insert({ scope: "news", status: "running" })
    .select()
    .single();

  let inserted = 0;
  const errors: string[] = [];
  try {
    for (const feed of FEEDS) {
      try {
        const url = `https://news.google.com/rss/search?q=${encodeURIComponent(feed.q)}&hl=en-US&gl=US&ceid=US:en`;
        const r = await fetch(url, { headers: { "User-Agent": "KAR-Agent/0.4" } });
        if (!r.ok) throw new Error(`${feed.category} ${r.status}`);
        const items = parseRss(await r.text()).slice(0, 15);
        if (!items.length) continue;
        const rows = items.map((i) => ({ ...i, category: feed.category }));
        const { error, count } = await supabaseAdmin
          .from("news_items")
          .upsert(rows, { onConflict: "url", count: "exact", ignoreDuplicates: true });
        if (error) throw new Error(error.message);
        inserted += count ?? rows.length;
      } catch (e) {
        errors.push(`${feed.category}: ${e instanceof Error ? e.message : "err"}`);
      }
    }
    await supabaseAdmin
      .from("forecast_runs")
      .update({
        status: errors.length && !inserted ? "failed" : "succeeded",
        finished_at: new Date().toISOString(),
        occupations_count: inserted,
        message: errors.length ? errors.join(" | ") : `Fetched ${inserted} headlines`,
      })
      .eq("id", run!.id);
    return { ok: true, inserted, errors };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    await supabaseAdmin
      .from("forecast_runs")
      .update({ status: "failed", finished_at: new Date().toISOString(), message: msg })
      .eq("id", run!.id);
    return { ok: false, error: msg };
  }
});

export const getDashboardLive = createServerFn({ method: "GET" }).handler(async () => {
  const [{ data: news }, { data: macroHistory }, { data: runs }, { data: alerts }, { data: changes }] = await Promise.all([
    supabaseAdmin
      .from("news_items")
      .select("id, title, url, source, summary, category, published_at")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(80),
    supabaseAdmin
      .from("occupation_snapshots")
      .select("series_id, value, period, period_name, year, fetched_at")
      .eq("occ_code", "_macro")
      .order("year", { ascending: true })
      .order("period", { ascending: true })
      .limit(500),
    supabaseAdmin
      .from("forecast_runs")
      .select("scope, status, finished_at, message, occupations_count")
      .order("started_at", { ascending: false })
      .limit(10),
    supabaseAdmin
      .from("labor_alerts")
      .select("*")
      .is("dismissed_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
    supabaseAdmin
      .from("dashboard_changes")
      .select("*")
      .order("detected_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const series: Record<string, { period: string; value: number }[]> = {};
  for (const row of macroHistory ?? []) {
    const key = row.series_id;
    series[key] = series[key] || [];
    series[key].push({ period: `${row.year} ${row.period_name}`, value: Number(row.value) });
  }
  return { news: news ?? [], series, runs: runs ?? [], alerts: alerts ?? [], change: changes ?? null };
});

export const dismissAlert = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    const v = d as { id?: string };
    if (!v?.id) throw new Error("id required");
    return { id: v.id };
  })
  .handler(async ({ data }) => {
    await supabaseAdmin
      .from("labor_alerts")
      .update({ dismissed_at: new Date().toISOString() })
      .eq("id", data.id);
    return { ok: true };
  });
