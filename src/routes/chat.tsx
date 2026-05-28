import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, Send, MessageSquarePlus, Database, Brain, Search, FileSearch, Layers, GitCompare, FileText, RouteIcon, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useHorizonOccupations } from "@/hooks/useHorizonOccupations";
import { horizonLabel, type HorizonKey } from "@/lib/horizons";
import { aggregateMarket, searchJobs, projectJob, formatJobs } from "@/lib/karpathyPredict";
import { KARPATHY_TOTALS } from "@/data/karpathyJobs";
import { CollaborationReadiness } from "@/components/kar/CollaborationReadiness";
import { FinancialAutonomy } from "@/components/kar/FinancialAutonomy";
import { AILiteracyEnforcement } from "@/components/kar/AILiteracyEnforcement";
import { HorizonSelector } from "@/components/kar/HorizonSelector";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "Ask KAR — AI Agent Researcher" }, { name: "description", content: "Chat with KAR, the enterprise AI agent for U.S. labor market research." }] }),
  component: ChatPage,
});

interface Msg { id: string; role: "user" | "agent"; content: string; sources?: string[]; confidence?: number; }

const SEED_PROMPTS = [
  "Which large occupations have high AI exposure but strong projected growth?",
  "Compare software developers, registered nurses, electricians, teachers, and accountants.",
  "Create an executive brief on where AI agents will reshape knowledge work first.",
  "Which jobs have the strongest physical-world barrier to automation?",
  "Map my uploaded workforce file to BLS occupations and create a reskilling plan.",
  "Generate a board-ready summary of AI exposure across the U.S. labor market.",
];

const STATES = ["Observing", "Retrieving memory", "Planning", "Calling tools", "Verifying", "Responding"] as const;

function karResponse(prompt: string, horizonKey: HorizonKey) {
  const hLabel = horizonLabel(horizonKey);
  const agg = aggregateMarket(horizonKey);
  const matches = searchJobs(prompt);
  const focus = matches.length ? matches.slice(0, 5).map(j => projectJob(j, horizonKey)) : agg.topExposed.slice(0, 5);

  const fmtRow = (p: ReturnType<typeof projectJob>) => {
    const dPct = p.employmentDeltaPct;
    const wPct = p.wageDeltaPct;
    const arrow = dPct > 0 ? "▲" : dPct < 0 ? "▼" : "→";
    return `• **${p.job.title}** — exposure ${Math.round(p.exposureAtHorizon)}/100 · ${formatJobs(p.employmentAtHorizon)} jobs ${arrow} ${dPct >= 0 ? "+" : ""}${dPct.toFixed(1)}% · wage ${wPct >= 0 ? "+" : ""}${wPct.toFixed(1)}% · risk: ${p.displacementRisk}`;
  };

  const focusBlock = focus.map(fmtRow).join("\n");
  const moversBlock = matches.length ? "" : `\n\n**Top movers @ ${hLabel}**\n` +
    `↑ Growth leaders:\n${agg.topGrowers.slice(0, 3).map(fmtRow).join("\n")}\n\n` +
    `↓ Decliners:\n${agg.topDecliners.slice(0, 3).map(fmtRow).join("\n")}`;

  const macro =
    `**U.S. labor market @ ${hLabel}** — ${formatJobs(agg.totalJobs)} jobs projected ` +
    `(${agg.jobsDeltaPct >= 0 ? "+" : ""}${agg.jobsDeltaPct.toFixed(2)}% vs base), ` +
    `job-weighted AI exposure ${agg.weightedExposure.toFixed(2)}/10. ` +
    `Severe-risk roles: ${formatJobs(agg.severeRiskJobs)} jobs · High-risk: ${formatJobs(agg.highRiskJobs)}.`;

  const header = matches.length
    ? `KAR mapped "${prompt}" to ${matches.length} BLS occupations (Karpathy 342-occ corpus). Horizon: ${hLabel}.`
    : `KAR scanned all ${KARPATHY_TOTALS.count} BLS occupations for "${prompt}". Horizon: ${hLabel}.`;

  return `${header}\n\n${macro}\n\n**Focus occupations**\n${focusBlock}${moversBlock}\n\n` +
    `**Method**: BLS OOH 2023 base employment & pay · karpathy.ai/jobs LLM exposure scores (0–10) · ` +
    `KAR horizon model projects employment using BLS outlook + exposure-driven productivity headwind ` +
    `(−0.12 %/yr per exposure point), exposure drift (saturating, +0.0–0.35/yr), and 3% nominal wage baseline.\n` +
    `**Confidence**: medium. Long horizons (3y+) carry compounding model uncertainty.`;
}

export function ChatPage() {
  const { horizon, narrative, isForecast } = useHorizonOccupations();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [agentState, setAgentState] = useState<typeof STATES[number] | null>(null);
  const [streaming, setStreaming] = useState<string>("");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const attachRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const send = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages(m => [...m, userMsg]);
    setInput("");

    // Walk through agent states
    for (const s of STATES) {
      setAgentState(s);
      await new Promise(r => setTimeout(r, 350));
    }

    const reply = karResponse(text, horizon);
    setAgentState(null);
    setStreaming("");
    // Token-by-token simulation
    for (let i = 0; i < reply.length; i += 8) {
      await new Promise(r => setTimeout(r, 20));
      setStreaming(reply.slice(0, i + 8));
    }
    setStreaming("");
    setMessages(m => [...m, { id: crypto.randomUUID(), role: "agent", content: reply, sources: ["BLS OOH 2023", "karpathy.ai/jobs (342 occ)", "KAR Horizon Model v2"], confidence: 0.82 }]);
  };

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-[260px_1fr_300px]">
      {/* Left: threads */}
      <aside className="hidden flex-col border-r border-border bg-sidebar p-3 lg:flex">
        <Button variant="secondary" className="justify-start gap-2" onClick={() => { setMessages([]); setInput(""); setStreaming(""); toast.success("New thread"); }}><MessageSquarePlus className="h-4 w-4" /> New research thread</Button>
        <div className="mt-4 px-2 text-[11px] uppercase tracking-wider text-muted-foreground">Saved threads</div>
        <div className="mt-2 space-y-1 text-sm">
          {[
            { t: "Knowledge work exposure", q: "Which large knowledge-work occupations have the highest AI exposure today?" },
            { t: "Trades vs office", q: "Compare AI exposure and projected growth for skilled trades versus office occupations." },
            { t: "Reskilling for accountants", q: "Build a reskilling plan for accountants and auditors given AI exposure trends." },
          ].map(s => (
            <button key={s.t} onClick={() => send(s.q)} className="block w-full truncate rounded-md px-2 py-1.5 text-left text-muted-foreground hover:bg-sidebar-accent hover:text-foreground">{s.t}</button>
          ))}
        </div>
        <div className="mt-6 px-2 text-[11px] uppercase tracking-wider text-muted-foreground">Datasets</div>
          <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2"><Database className="h-3.5 w-3.5" /> BLS OOH 2023 · 342 occupations</div>
            <div className="flex items-center gap-2"><Database className="h-3.5 w-3.5" /> karpathy.ai/jobs exposure scores</div>
            <div className="flex items-center gap-2"><Database className="h-3.5 w-3.5" /> KAR Horizon Model v2 (Now → 5y)</div>
          </div>
        <div className="mt-6 px-2 text-[11px] uppercase tracking-wider text-muted-foreground">Tools</div>
        <div className="mt-2 space-y-1.5 text-xs">
          {[{ i: Search, l: "Occupation search" }, { i: FileSearch, l: "BLS retriever" }, { i: Brain, l: "Memory recall" }, { i: ShieldCheck, l: "Verifier" }].map(({ i: I, l }) => (
            <div key={l} className="flex items-center gap-2 text-muted-foreground"><I className="h-3.5 w-3.5" /> {l}</div>
          ))}
        </div>
      </aside>

      {/* Center: chat */}
      <section className="flex h-full min-w-0 flex-col">
        <header className="flex items-center justify-between border-b border-border px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground"><Sparkles className="h-3.5 w-3.5" /></div>
            <div>
              <div className="text-sm font-semibold">Ask KAR</div>
              <div className="text-[11px] text-muted-foreground">Governed enterprise agent · streaming</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HorizonSelector compact />
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> Audit logged · No PII to model
            </div>
          </div>
        </header>

        <div ref={scrollerRef} className="flex-1 overflow-y-auto px-6 py-6">
          {messages.length === 0 && (
            <div className="mx-auto max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight">How can KAR help today?</h2>
              <p className="mt-1 text-sm text-muted-foreground">Pick a prompt or describe your research question.</p>
              <div className="mt-5 grid gap-2 md:grid-cols-2">
                {SEED_PROMPTS.map(p => (
                  <button key={p} onClick={() => send(p)} className="rounded-lg border border-border bg-card p-3 text-left text-sm transition-colors hover:border-primary/50">
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mx-auto max-w-3xl space-y-4">
            {messages.map(m => (
              <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
                <div className={
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed " +
                  (m.role === "user" ? "bg-primary text-primary-foreground" : "border border-border bg-card")
                }>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                  {m.sources && (
                    <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
                      {m.sources.map(s => <span key={s} className="rounded bg-muted px-1.5 py-0.5">{s}</span>)}
                      <span className="ml-auto">Confidence {Math.round((m.confidence ?? 0) * 100)}%</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {streaming && (
              <div>
                <div className="max-w-[85%] rounded-2xl border border-border bg-card px-4 py-3 text-sm leading-relaxed">
                  <div className="whitespace-pre-wrap">{streaming}<span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-primary align-middle" /></div>
                </div>
              </div>
            )}
            {agentState && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                {agentState}…
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <footer className="border-t border-border bg-card px-4 py-3">
          <div className="mx-auto max-w-3xl">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {[
                { i: Search, l: "Research", p: "Research: " },
                { i: Layers, l: "Analyze", p: "Analyze: " },
                { i: GitCompare, l: "Compare", p: "Compare " },
                { i: FileText, l: "Brief", p: "Write a one-page brief on " },
                { i: RouteIcon, l: "Plan", p: "Build a 12-month plan for " },
                { i: ShieldCheck, l: "Score AI Exposure", p: "Score AI exposure for " },
              ].map(({ i: I, l, p }) => (
                <button key={l} type="button" onClick={() => setInput(prev => (prev.startsWith(p) ? prev : p + prev))} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground">
                  <I className="h-3 w-3" /> {l}
                </button>
              ))}
            </div>
            <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex items-end gap-2 rounded-xl border border-border bg-background p-2">
              <input ref={attachRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) toast.success(`Attached ${f.name}`); }} />
              <button type="button" onClick={() => attachRef.current?.click()} className="rounded-md p-2 text-muted-foreground hover:bg-muted" title="Attach"><Paperclip className="h-4 w-4" /></button>
              <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about an occupation, sector, or strategy…" className="border-0 bg-transparent shadow-none focus-visible:ring-0" />
              <select className="rounded-md border border-border bg-card px-2 py-1.5 text-xs">
                <option>Standard</option><option>Deep research</option><option>Fast</option>
              </select>
              <select className="rounded-md border border-border bg-card px-2 py-1.5 text-xs">
                <option>Narrative</option><option>Bullets</option><option>Brief</option><option>JSON</option>
              </select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => {
                  setMessages([]);
                  setInput("");
                  setStreaming("");
                  setAgentState(null);
                  toast.success("Chat cleared");
                }}
                title="Clear chat"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </Button>
              <Button type="submit" size="sm" className="gap-1"><Send className="h-3.5 w-3.5" /> Send</Button>
            </form>
            <div className="mt-1.5 px-2 text-[11px] text-muted-foreground">KAR shows reasoning summaries, not hidden chain-of-thought. Always review before publishing.</div>
          </div>
        </footer>
      </section>

      {/* Right: context */}
      <aside className="hidden flex-col border-l border-border bg-sidebar p-4 lg:flex">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Active horizon</div>
        <div className="mt-2 rounded-md border border-primary/30 bg-primary/5 p-3">
          <div className="text-sm font-semibold text-primary">{horizonLabel(horizon)}</div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {isForecast
              ? `KAR answers will use projected employment, wage and AI exposure at ${horizonLabel(horizon)}.`
              : "Answers grounded in present-day BLS data. Change horizon to project forward."}
          </p>
          {narrative && (
            <p className="mt-2 text-[11px] text-foreground">{narrative.headline}</p>
          )}
        </div>
        <div className="mt-5 text-[11px] uppercase tracking-wider text-muted-foreground">Memory hits</div>
        <div className="mt-2 space-y-2 text-xs">
          {["Prior: knowledge-work exposure brief", "Pref: bullet format for execs", "Policy: do not export PII"].map(m => (
            <div key={m} className="rounded-md border border-border bg-card p-2">
              <div className="font-medium">{m}</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">Confidence 0.84 · used because topic matches</div>
            </div>
          ))}
        </div>
        <div className="mt-5 text-[11px] uppercase tracking-wider text-muted-foreground">Tool calls</div>
        <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
          <div className="kar-mono">bls.search("software developers")</div>
          <div className="kar-mono">memory.recall(topic="exposure")</div>
          <div className="kar-mono">verifier.check(claims=3)</div>
        </div>
        <div className="mt-5"><CollaborationReadiness variant="compact" />
        <div className="mt-3"><FinancialAutonomy variant="compact" /></div>
        <div className="mt-3"><AILiteracyEnforcement variant="compact" /></div></div>
      </aside>
    </div>
  );
}
