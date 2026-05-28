import { useMemo, useState } from "react";
import { ExternalLink, AlertTriangle, Brain, Briefcase, GraduationCap, DollarSign, Newspaper } from "lucide-react";

type NewsItem = {
  id?: string;
  title: string;
  url: string;
  source?: string | null;
  published_at?: string | null;
  category: string;
};

const CATEGORY_META: Record<string, { label: string; icon: typeof Newspaper; tone: string }> = {
  ai_jobs: { label: "AI job losses", icon: AlertTriangle, tone: "text-destructive" },
  ai_labor: { label: "AI & automation", icon: Brain, tone: "text-primary" },
  labor_market: { label: "Labor market", icon: Briefcase, tone: "text-muted-foreground" },
  education: { label: "Education & reskilling", icon: GraduationCap, tone: "text-success" },
  wages: { label: "Wages & pay", icon: DollarSign, tone: "text-warning" },
};

const RECENCY_OPTIONS = [
  { key: "6h", label: "Last 6h", hours: 6 },
  { key: "24h", label: "Last 24h", hours: 24 },
  { key: "3d", label: "Last 3 days", hours: 72 },
  { key: "7d", label: "Last 7 days", hours: 168 },
  { key: "all", label: "All", hours: Infinity },
] as const;

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function hostOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

export function NewsFeed({ news }: { news: NewsItem[] }) {
  const cats = Object.keys(CATEGORY_META);
  const [active, setActive] = useState<Set<string>>(new Set(cats));
  const [recency, setRecency] = useState<(typeof RECENCY_OPTIONS)[number]["key"]>("24h");

  const filtered = useMemo(() => {
    const hours = RECENCY_OPTIONS.find((r) => r.key === recency)!.hours;
    const cutoff = hours === Infinity ? 0 : Date.now() - hours * 3600_000;
    return news.filter((n) => {
      if (!active.has(n.category)) return false;
      if (cutoff && n.published_at && new Date(n.published_at).getTime() < cutoff) return false;
      return true;
    });
  }, [news, active, recency]);

  function toggle(cat: string) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      if (next.size === 0) cats.forEach((c) => next.add(c));
      return next;
    });
  }

  const allOn = active.size === cats.length;

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-wide">Live headlines</h2>
          <span className="text-[11px] text-muted-foreground">{filtered.length} shown</span>
        </div>
        <div className="flex items-center gap-1">
          {RECENCY_OPTIONS.map((r) => (
            <button
              key={r.key}
              onClick={() => setRecency(r.key)}
              className={`rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
                recency === r.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setActive(new Set(cats))}
          className={`rounded-full border px-2 py-0.5 text-[11px] ${
            allOn ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/40"
          }`}
        >
          All
        </button>
        {cats.map((c) => {
          const meta = CATEGORY_META[c];
          const Icon = meta.icon;
          const on = active.has(c) && !allOn;
          return (
            <button
              key={c}
              onClick={() => toggle(c)}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
                on
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40"
              }`}
            >
              <Icon className={`h-3 w-3 ${on ? "text-primary" : meta.tone}`} />
              {meta.label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-center text-xs text-muted-foreground">
          No headlines match the current filters. Try widening recency or adding categories.
        </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {filtered.slice(0, 24).map((n) => {
            const meta = CATEGORY_META[n.category] ?? CATEGORY_META.labor_market;
            const Icon = meta.icon;
            const host = hostOf(n.url);
            return (
              <a
                key={n.id ?? n.url}
                href={n.url}
                target="_blank"
                rel="noreferrer"
                className="group rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40"
              >
                <div className="flex items-start gap-2">
                  <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${meta.tone}`} />
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-sm font-medium leading-snug group-hover:text-primary">{n.title}</div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                        {meta.label}
                      </span>
                      {n.source && <span className="truncate font-medium text-foreground/80">{n.source}</span>}
                      {host && <span className="truncate text-muted-foreground/80">· {host}</span>}
                      {n.published_at && <span>· {relTime(n.published_at)}</span>}
                      <ExternalLink className="ml-auto h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
}
