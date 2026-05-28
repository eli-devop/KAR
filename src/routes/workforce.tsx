import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { fmtInt, fmtUSD, fmtPct } from "@/lib/format";
import { useHorizonOccupations } from "@/hooks/useHorizonOccupations";
import { horizonLabel } from "@/lib/horizons";
import { CollaborationReadiness } from "@/components/kar/CollaborationReadiness";
import { FinancialAutonomy } from "@/components/kar/FinancialAutonomy";
import { AILiteracyEnforcement } from "@/components/kar/AILiteracyEnforcement";
import { downloadBlob, toCSV } from "@/lib/download";
import { HorizonSelector } from "@/components/kar/HorizonSelector";

export const Route = createFileRoute("/workforce")({
  head: () => ({ meta: [{ title: "Enterprise Workforce Upload — KAR" }, { name: "description", content: "Map internal roles to BLS occupations and produce AI exposure and reskilling priorities." }] }),
  component: Page,
});

interface InternalRole { id: string; title: string; headcount: number; mappedSoc: string; }
const MOCK_ROLES: InternalRole[] = [
  { id: "1", title: "Senior Software Engineer", headcount: 420, mappedSoc: "15-1252" },
  { id: "2", title: "Customer Success Rep", headcount: 180, mappedSoc: "43-4051" },
  { id: "3", title: "Staff Accountant", headcount: 95, mappedSoc: "13-2011" },
  { id: "4", title: "Field Service Technician", headcount: 240, mappedSoc: "47-2111" },
  { id: "5", title: "Operations Manager", headcount: 60, mappedSoc: "11-1021" },
  { id: "6", title: "Paralegal", headcount: 35, mappedSoc: "23-2011" },
];

function Page() {
  const { horizon, occupations, isForecast } = useHorizonOccupations();
  const [uploaded, setUploaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const totalHeadcount = MOCK_ROLES.reduce((s, r) => s + r.headcount, 0);
  const atRisk = MOCK_ROLES.reduce((s, r) => {
    const bls = occupations.find(o => o.soc_code === r.mappedSoc);
    return bls && bls.ai_exposure_forecast > 70 ? s + r.headcount : s;
  }, 0);

  const onFile = (f?: File) => {
    if (!f) return;
    setUploaded(true);
    toast.success(`Mapped ${f.name}`, { description: `${MOCK_ROLES.length} roles matched to BLS occupations` });
  };

  const exportCSV = () => {
    const rows = MOCK_ROLES.map(r => {
      const bls = occupations.find(o => o.soc_code === r.mappedSoc);
      const exposure = bls ? Math.round(bls.ai_exposure_forecast) : 0;
      return {
        role: r.title,
        headcount: r.headcount,
        soc_code: r.mappedSoc,
        bls_title: bls?.title ?? "",
        median_wage: bls ? Math.round(bls.wage_forecast) : "",
        employment_delta_pct: bls ? Math.round(bls.employment_delta_pct * 10) / 10 : "",
        ai_exposure: exposure,
        priority: exposure > 70 ? "High" : exposure > 45 ? "Medium" : "Low",
      };
    });
    downloadBlob(`workforce-mapping-${horizon}.csv`, toCSV(rows), "text/csv");
    toast.success("Workforce mapping exported");
  };

  const generatePlan = () => {
    toast.success("Reskilling plan generated", { description: `${MOCK_ROLES.length} roles · horizon ${horizonLabel(horizon)}` });
  };



  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Enterprise</div>
          <h1 className="text-3xl font-semibold tracking-tight">Workforce Mapping · <span className="text-primary">{horizonLabel(horizon)}</span></h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Upload a CSV of internal roles. KAR maps them to BLS occupations and projects exposure, augmentation and reskilling priorities at the selected horizon.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <HorizonSelector compact />
        </div>
        {uploaded && (
          <div className="flex gap-3">
            <div className="rounded-md border border-border bg-card px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total headcount</div>
              <div className="text-lg font-semibold kar-mono">{fmtInt(totalHeadcount)}</div>
            </div>
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-destructive">At-risk {isForecast ? `@ ${horizonLabel(horizon)}` : "today"}</div>
              <div className="text-lg font-semibold kar-mono text-destructive">{fmtInt(atRisk)} ({Math.round((atRisk / totalHeadcount) * 100)}%)</div>
            </div>
          </div>
        )}
      </header>

      {!uploaded ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center shadow-card">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Upload className="h-5 w-5" /></div>
          <h2 className="mt-3 text-lg font-semibold">Upload workforce CSV</h2>
          <p className="mt-1 text-sm text-muted-foreground">Required columns: <span className="kar-mono">role_title, headcount, department</span> (optional: <span className="kar-mono">pay_band, location</span>)</p>
          <div className="mt-5 flex justify-center gap-2">
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={e => onFile(e.target.files?.[0])} />
            <Button onClick={() => fileRef.current?.click()}><Upload className="mr-1.5 h-4 w-4" /> Choose file</Button>
            <Button variant="secondary" onClick={() => { setUploaded(true); toast.success("Sample workforce loaded"); }}><FileSpreadsheet className="mr-1.5 h-4 w-4" /> Use sample data</Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold">Internal roles → BLS occupations</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={exportCSV}>Export CSV</Button>
              <Button size="sm" onClick={generatePlan}>Generate reskilling plan</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr><th className="px-4 py-2 text-left">Internal role</th><th className="px-4 py-2 text-right">Headcount</th><th className="px-4 py-2 text-left">BLS match</th><th className="px-4 py-2 text-right">Median pay</th><th className="px-4 py-2 text-right">Δ employment</th><th className="px-4 py-2 text-right">AI exposure</th><th className="px-4 py-2 text-left">Priority</th><th className="px-4 py-2 text-left">Pathway</th></tr>
              </thead>
              <tbody>
                {MOCK_ROLES.map(r => {
                  const bls = occupations.find(o => o.soc_code === r.mappedSoc);
                  if (!bls) return null;
                  const exposure = Math.round(bls.ai_exposure_forecast);
                  const priority = exposure > 70 ? "High" : exposure > 45 ? "Medium" : "Low";
                  const priorityColor = priority === "High" ? "bg-destructive/15 text-destructive" : priority === "Medium" ? "bg-warning/20 text-warning" : "bg-success/15 text-success";
                  const pathway = exposure > 70 ? "Verification & review workflows" : exposure > 45 ? "Tool fluency + prompt design" : "Domain depth + safety";
                  const empDelta = bls.employment_delta_pct;
                  return (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{r.title}</td>
                      <td className="px-4 py-3 text-right kar-mono">{fmtInt(r.headcount)}</td>
                      <td className="px-4 py-3"><div className="text-sm">{bls.title}</div><div className="text-[11px] text-muted-foreground kar-mono">SOC {bls.soc_code}</div></td>
                      <td className="px-4 py-3 text-right kar-mono">{fmtUSD(Math.round(bls.wage_forecast))}</td>
                      <td className={"px-4 py-3 text-right kar-mono " + (empDelta < 0 ? "text-destructive" : empDelta > 0 ? "text-success" : "text-muted-foreground")}>
                        {isForecast ? fmtPct(empDelta) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="ml-auto h-1.5 w-28 overflow-hidden rounded bg-muted">
                          <div className="h-full bg-primary" style={{ width: `${exposure}%` }} />
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground kar-mono">{exposure}/100</div>
                      </td>
                      <td className="px-4 py-3"><span className={"rounded-full px-2 py-0.5 text-[11px] " + priorityColor}>{priority}</span></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{pathway}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="mt-6"><CollaborationReadiness variant="compact" />
        <div className="mt-3"><FinancialAutonomy variant="compact" /></div>
        <div className="mt-3"><AILiteracyEnforcement variant="compact" /></div></div>
    </div>
  );
}
