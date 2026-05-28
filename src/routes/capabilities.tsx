import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CAPABILITIES, type Capability } from "@/data/capabilities";
import { CollaborationReadiness } from "@/components/kar/CollaborationReadiness";
import { FinancialAutonomy } from "@/components/kar/FinancialAutonomy";
import { AILiteracyEnforcement } from "@/components/kar/AILiteracyEnforcement";
import { HorizonSelector } from "@/components/kar/HorizonSelector";

export const Route = createFileRoute("/capabilities")({
  head: () => ({ meta: [{ title: "Agent Capabilities — KAR" }, { name: "description", content: "Maturity model for the AI agent in the physical world: memory, planning, reliability, and more." }] }),
  component: Page,
});

const maturityColor: Record<Capability["maturity"], string> = {
  "Easy": "bg-success/15 text-success",
  "Medium": "bg-primary/15 text-primary",
  "Hard": "bg-warning/20 text-warning",
  "Complex": "bg-destructive/15 text-destructive",
};

function Page() {
  const [active, setActive] = useState<Capability>(CAPABILITIES[0]);
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Framework</div>
          <h1 className="text-3xl font-semibold tracking-tight">Agent Capability Maturity</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            A practical model for what enterprise AI agents can do today, where they break, and how to evaluate them. Click any capability for definition, examples, risks and metrics.
          </p>
        </div>
        <HorizonSelector compact />
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {CAPABILITIES.map(c => {
            const isActive = c.id === active.id;
            return (
              <button
                key={c.id}
                onClick={() => setActive(c)}
                className={
                  "rounded-xl border bg-card p-4 text-left shadow-card transition-all " +
                  (isActive ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40")
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold">{c.name}</h3>
                  <span className={"shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium " + maturityColor[c.maturity]}>{c.maturity}</span>
                </div>
                <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{c.definition}</p>
              </button>
            );
          })}
        </div>

        <aside className="rounded-xl border border-border bg-card p-5 shadow-elegant lg:sticky lg:top-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{active.name}</h2>
            <span className={"rounded-full px-2 py-0.5 text-[10px] font-medium " + maturityColor[active.maturity]}>{active.maturity}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{active.definition}</p>

          <Section title="Enterprise relevance">{active.enterpriseRelevance}</Section>
          <Section title="Example workflows">
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
              {active.examples.map(e => <li key={e}>{e}</li>)}
            </ul>
          </Section>
          <Section title="Risk profile">{active.risk}</Section>
          <Section title="Data requirements">
            <div className="mt-1 flex flex-wrap gap-1">
              {active.dataRequirements.map(d => <span key={d} className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{d}</span>)}
            </div>
          </Section>
          <Section title="Evaluation metrics">
            <div className="mt-1 flex flex-wrap gap-1">
              {active.evalMetrics.map(d => <span key={d} className="rounded-full bg-accent/30 px-2 py-0.5 text-[10px]">{d}</span>)}
            </div>
          </Section>
        </aside>
      </div>
      <div className="mt-6"><CollaborationReadiness variant="compact" />
        <div className="mt-3"><FinancialAutonomy variant="compact" /></div>
        <div className="mt-3"><AILiteracyEnforcement variant="compact" /></div></div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 border-t border-border pt-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="mt-1 text-xs text-foreground">{children}</div>
    </div>
  );
}
