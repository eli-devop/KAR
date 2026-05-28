import { useMemo, useState } from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import type { Occupation } from "@/data/occupations";
import { OCCUPATIONS } from "@/data/occupations";
import { fmtCompact, fmtUSD, fmtPct } from "@/lib/format";

export type Metric =
  | "outlook"
  | "pay"
  | "education"
  | "ai_exposure"
  | "physical_barrier"
  | "cognitive_offload"
  | "automation_readiness"
  | "hitl"
  | "reliability_risk";

export const METRICS: { value: Metric; label: string; hint: string }[] = [
  { value: "outlook", label: "BLS Outlook", hint: "Projected employment growth" },
  { value: "pay", label: "Median Pay", hint: "Annual USD" },
  { value: "education", label: "Education", hint: "Typical entry-level requirement" },
  { value: "ai_exposure", label: "Digital AI Exposure", hint: "Share of tasks model-augmentable" },
  { value: "physical_barrier", label: "Physical-World Barrier", hint: "Resistance to automation" },
  { value: "cognitive_offload", label: "Cognitive Offload", hint: "Routine thinking compressible" },
  { value: "automation_readiness", label: "Automation Readiness", hint: "Tooling + reliability today" },
  { value: "hitl", label: "Human-in-the-Loop", hint: "Required oversight" },
  { value: "reliability_risk", label: "Reliability Risk", hint: "Cost of an agent error" },
];

const EDU_RANK: Record<Occupation["education"], number> = {
  "No formal": 0, "High school": 1, "Postsecondary": 2, "Associate": 3, "Bachelor": 4, "Master": 5, "Doctoral": 6,
};
const OUTLOOK_RANK: Record<Occupation["outlook"], number> = {
  "Decline": 0, "Slower": 1, "Average": 2, "Faster": 3, "Much faster": 4,
};

function metricValue(o: Occupation, m: Metric): number {
  switch (m) {
    case "outlook": return (o.growth_rate + 20) / 40; // -20..20 → 0..1
    case "pay": return Math.min(1, o.median_pay / 220000);
    case "education": return EDU_RANK[o.education] / 6;
    case "ai_exposure": return o.ai_exposure_score / 100;
    case "physical_barrier": return o.physical_world_barrier_score / 100;
    case "cognitive_offload": return o.cognitive_offload_score / 100;
    case "automation_readiness": return (o.ai_exposure_score * 0.6 + (100 - o.physical_world_barrier_score) * 0.4) / 100;
    case "hitl": return o.reliability_risk_score / 100;
    case "reliability_risk": return o.reliability_risk_score / 100;
  }
}

// Diverging cool→warm palette using design tokens
function colorFor(v: number): string {
  // 0 = cool steel, 0.5 = taupe, 1 = warm danger
  const clamped = Math.max(0, Math.min(1, v));
  // interpolate via oklch in inline style isn't trivial; use 3 anchors
  const anchors = [
    { p: 0, hex: "#6B7C98" },   // steel
    { p: 0.5, hex: "#AB978C" }, // taupe
    { p: 1, hex: "#B5523A" },   // warm warning
  ];
  let a = anchors[0], b = anchors[1];
  if (clamped > 0.5) { a = anchors[1]; b = anchors[2]; }
  const t = (clamped - a.p) / (b.p - a.p);
  const ah = a.hex.match(/.{2}/g)!.slice(1).map(h => parseInt(h, 16));
  const bh = b.hex.match(/.{2}/g)!.slice(1).map(h => parseInt(h, 16));
  // hex format includes leading #; rebuild
  const ar = parseInt(a.hex.slice(1, 3), 16), ag = parseInt(a.hex.slice(3, 5), 16), ab = parseInt(a.hex.slice(5, 7), 16);
  const br = parseInt(b.hex.slice(1, 3), 16), bg = parseInt(b.hex.slice(3, 5), 16), bb = parseInt(b.hex.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  void ah; void bh;
  return `rgb(${r}, ${g}, ${bl})`;
}

type ForecastOverride = {
  employment?: number;
  ai_exposure?: number;
  wage?: number;
  outlook_rank?: number;
  delta_pct?: number;
};

interface Props {
  metric: Metric;
  data?: Occupation[];
  onSelect: (o: Occupation) => void;
  forecastsByCode?: Record<string, ForecastOverride>;
}

interface ContentProps {
  x?: number; y?: number; width?: number; height?: number;
  occupation?: Occupation; metric?: Metric; override?: ForecastOverride;
}

function effectiveMetricValue(o: Occupation, m: Metric, ov?: ForecastOverride): number {
  if (m === "ai_exposure" && ov?.ai_exposure != null) return ov.ai_exposure / 100;
  if (m === "pay" && ov?.wage != null) return Math.min(1, ov.wage / 220000);
  if (m === "outlook" && ov?.delta_pct != null) {
    // map -30..+30 → 0..1
    return Math.max(0, Math.min(1, (ov.delta_pct + 30) / 60));
  }
  return metricValue(o, m);
}

function TreemapContent(props: any) {
  const { metric, onHover, onSelect, forecastsByCode, ...rest } = props;
  const occ = props?.payload?.occupation || props?.occupation;
  const ov = occ && forecastsByCode ? forecastsByCode[occ.soc_code] : undefined;
  return (
    <g
      onMouseEnter={() => occ && onHover(occ)}
      onMouseLeave={() => onHover(null)}
      onClick={() => occ && onSelect(occ)}
    >
      <TreemapCell {...rest} occupation={occ} metric={metric} override={ov} />
    </g>
  );
}

function TreemapCell(p: ContentProps) {
  const { x = 0, y = 0, width = 0, height = 0, occupation, metric, override } = p;
  if (!occupation || width < 1 || height < 1) return null;
  const v = effectiveMetricValue(occupation, metric!, override);
  const fill = colorFor(v);
  const showTitle = width > 70 && height > 36;
  const showSub = width > 110 && height > 60;
  const emp = override?.employment ?? occupation.employment;
  const pay = override?.wage ?? occupation.median_pay;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#E9E6E7" strokeWidth={1} rx={4} style={{ cursor: "pointer", transition: "opacity .15s" }} />
      {showTitle && (
        <text x={x + 8} y={y + 18} fill="#fff" fontSize={11} fontWeight={600} style={{ pointerEvents: "none" }}>
          {occupation.title.length > Math.floor(width / 7) ? occupation.title.slice(0, Math.floor(width / 7) - 1) + "…" : occupation.title}
        </text>
      )}
      {showSub && (
        <text x={x + 8} y={y + 34} fill="rgba(255,255,255,0.82)" fontSize={10} style={{ pointerEvents: "none" }}>
          {fmtCompact(emp)} · {fmtUSD(pay)}
          {override?.delta_pct != null && (
            <tspan dx={6} fontSize={9}>{override.delta_pct > 0 ? "▲" : "▼"} {Math.abs(override.delta_pct).toFixed(1)}%</tspan>
          )}
        </text>
      )}
    </g>
  );
}

export function OccupationTreemap({ metric, data = OCCUPATIONS, onSelect, forecastsByCode }: Props) {
  const [hover, setHover] = useState<Occupation | null>(null);

  const tree = useMemo(() => ({
    name: "root",
    children: data.map(o => {
      const ov = forecastsByCode?.[o.soc_code];
      return {
        name: o.title,
        size: ov?.employment ?? o.employment,
        occupation: o,
      };
    }),
  }), [data, forecastsByCode]);

  const hoverOv = hover && forecastsByCode ? forecastsByCode[hover.soc_code] : undefined;
  const hoverEmp = hoverOv?.employment ?? hover?.employment ?? 0;
  const hoverPay = hoverOv?.wage ?? hover?.median_pay ?? 0;
  const hoverExp = hoverOv?.ai_exposure ?? hover?.ai_exposure_score ?? 0;

  return (
    <div className="relative h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={[tree]}
          dataKey="size"
          nameKey="name"
          stroke="#E9E6E7"
          isAnimationActive={false}
          content={
            (<TreemapContent metric={metric} onHover={setHover} onSelect={onSelect} forecastsByCode={forecastsByCode} />) as any
          }
        >
          <Tooltip content={() => null} />
        </Treemap>
      </ResponsiveContainer>
      {hover && (
        <div className="pointer-events-none absolute left-4 bottom-4 max-w-sm rounded-lg border border-border bg-card p-3 shadow-elegant">
          <div className="text-sm font-semibold">{hover.title}</div>
          <div className="text-[11px] text-muted-foreground kar-mono">SOC {hover.soc_code}</div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div><span className="text-muted-foreground">Employment</span><div className="kar-mono">{fmtCompact(hoverEmp)}{hoverOv?.delta_pct != null && <span className={"ml-1 text-[10px] " + (hoverOv.delta_pct >= 0 ? "text-success" : "text-destructive")}>{hoverOv.delta_pct >= 0 ? "+" : ""}{hoverOv.delta_pct.toFixed(1)}%</span>}</div></div>
            <div><span className="text-muted-foreground">Median pay</span><div className="kar-mono">{fmtUSD(hoverPay)}</div></div>
            <div><span className="text-muted-foreground">Outlook</span><div>{hover.outlook} ({fmtPct(hover.growth_rate)})</div></div>
            <div><span className="text-muted-foreground">Education</span><div>{hover.education}</div></div>
            <div className="col-span-2"><span className="text-muted-foreground">AI exposure</span>
              <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded bg-muted">
                <div className="h-full bg-primary" style={{ width: `${hoverExp}%` }} />
              </div>
            </div>
          </div>
          <p className="mt-2 line-clamp-3 text-[11px] text-muted-foreground">{hover.ai_exposure_rationale}</p>
        </div>
      )}
    </div>
  );
}

export { metricValue };
