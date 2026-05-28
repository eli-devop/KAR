// Horizon-aware prediction helpers built on karpathy/jobs 342-occupation dataset.
// Used by KAR to ground answers about U.S. labor market across Now → 5y horizons.

import { KARPATHY_JOBS, KARPATHY_TOTALS, type KarpathyJob } from "@/data/karpathyJobs";
import type { HorizonKey } from "@/lib/horizons";

// Horizon → year offset for projection math.
const HORIZON_YEARS: Record<HorizonKey, number> = {
  now: 0, "30d": 30 / 365, "60d": 60 / 365, "90d": 90 / 365,
  "1y": 1, "2y": 2, "3y": 3, "4y": 4, "5y": 5,
};

export interface KarpathyProjection {
  job: KarpathyJob;
  exposure0to100: number;          // current exposure on 0-100 scale
  exposureAtHorizon: number;       // projected exposure at horizon (0-100)
  employmentAtHorizon: number;     // projected jobs
  employmentDeltaPct: number;      // % change vs current
  wageAtHorizon: number;           // projected median pay
  wageDeltaPct: number;            // % change vs current
  displacementRisk: "low" | "moderate" | "high" | "severe";
}

// BLS 10-year outlook code → annualized employment growth %.
// Codes follow BLS OOH "outlook" enumeration used in karpathy's data.
function outlookAnnualPct(o: number | null): number {
  switch (o) {
    case 5: return 1.5;    // Much faster than average
    case 4: return 0.9;    // Faster than average
    case 3: return 0.4;    // Average
    case 2: return 0.1;    // Slower than average
    case 1: return -0.3;   // Little or no change
    case 0: return -0.7;   // Decline
    default: return 0.3;
  }
}

// Higher AI exposure compounds an additional employment headwind over longer horizons.
// Empirical anchor: 10/10 exposure ≈ -1.2% annualized productivity-driven headcount drag.
function exposureHeadwindPct(exposure: number | null): number {
  if (exposure == null) return 0;
  return -0.12 * exposure; // -1.2% / yr at 10/10
}

// Exposure scores drift upward as AI capability improves. Capped at 10.
function exposureDriftPerYear(exposure: number | null): number {
  if (exposure == null) return 0;
  // Saturating: low-exposure jobs gain more relative exposure as AI moves into the physical world.
  return Math.max(0, 0.35 - 0.025 * exposure);
}

function classifyRisk(exposure: number, deltaPct: number): KarpathyProjection["displacementRisk"] {
  if (exposure >= 8 && deltaPct <= -3) return "severe";
  if (exposure >= 7 && deltaPct <= 0) return "high";
  if (exposure >= 5) return "moderate";
  return "low";
}

export function projectJob(job: KarpathyJob, horizon: HorizonKey): KarpathyProjection {
  const years = HORIZON_YEARS[horizon];
  const expCur = job.exposure ?? 0;
  const expProjected10 = Math.min(10, expCur + exposureDriftPerYear(expCur) * years);
  const emp0 = job.jobs;
  const annualPct = outlookAnnualPct(job.outlook) + exposureHeadwindPct(expCur);
  const empProjected = emp0 * Math.pow(1 + annualPct / 100, years);
  const wage0 = job.pay;
  // Wages: 3% nominal baseline, dampened slightly for high-exposure roles past 1y.
  const wageGrowth = 3.0 - (years > 1 ? 0.1 * expCur : 0);
  const wageProjected = wage0 * Math.pow(1 + wageGrowth / 100, years);
  const deltaPct = emp0 ? ((empProjected - emp0) / emp0) * 100 : 0;
  return {
    job,
    exposure0to100: expCur * 10,
    exposureAtHorizon: expProjected10 * 10,
    employmentAtHorizon: empProjected,
    employmentDeltaPct: deltaPct,
    wageAtHorizon: wageProjected,
    wageDeltaPct: ((wageProjected - wage0) / wage0) * 100,
    displacementRisk: classifyRisk(expProjected10, deltaPct),
  };
}

export function projectAll(horizon: HorizonKey): KarpathyProjection[] {
  return KARPATHY_JOBS.map(j => projectJob(j, horizon));
}

export interface MarketAggregate {
  totalJobs: number;
  totalWages: number;
  jobsDeltaPct: number;
  weightedExposure: number;        // 0-10 (BLS-weighted)
  severeRiskJobs: number;
  highRiskJobs: number;
  topGrowers: KarpathyProjection[];
  topDecliners: KarpathyProjection[];
  topExposed: KarpathyProjection[];
  mostProtected: KarpathyProjection[];
}

export function aggregateMarket(horizon: HorizonKey): MarketAggregate {
  const projections = projectAll(horizon);
  const totalJobs = projections.reduce((s, p) => s + p.employmentAtHorizon, 0);
  const totalWages = projections.reduce((s, p) => s + p.employmentAtHorizon * p.wageAtHorizon, 0);
  const weighted = totalJobs
    ? projections.reduce((s, p) => s + (p.exposureAtHorizon / 10) * p.employmentAtHorizon, 0) / totalJobs
    : 0;
  const severeRiskJobs = projections.filter(p => p.displacementRisk === "severe").reduce((s, p) => s + p.employmentAtHorizon, 0);
  const highRiskJobs = projections.filter(p => p.displacementRisk === "high").reduce((s, p) => s + p.employmentAtHorizon, 0);
  const byJobs = [...projections].sort((a, b) => b.job.jobs - a.job.jobs);
  const sorted = (key: (p: KarpathyProjection) => number, asc = false) =>
    [...byJobs].filter(p => p.job.jobs > 5000).sort((a, b) => asc ? key(a) - key(b) : key(b) - key(a));
  return {
    totalJobs,
    totalWages,
    jobsDeltaPct: ((totalJobs - KARPATHY_TOTALS.total_jobs) / KARPATHY_TOTALS.total_jobs) * 100,
    weightedExposure: weighted,
    severeRiskJobs,
    highRiskJobs,
    topGrowers: sorted(p => p.employmentDeltaPct).slice(0, 5),
    topDecliners: sorted(p => p.employmentDeltaPct, true).slice(0, 5),
    topExposed: sorted(p => p.exposureAtHorizon).slice(0, 5),
    mostProtected: sorted(p => p.exposureAtHorizon, true).slice(0, 5),
  };
}

// Lightweight semantic-ish matcher over titles + categories + rationales.
export function searchJobs(query: string, limit = 6): KarpathyJob[] {
  const q = query.toLowerCase();
  const tokens = q.split(/[^a-z0-9]+/).filter(t => t.length > 2);
  if (!tokens.length) return [];
  const scored = KARPATHY_JOBS.map(j => {
    const hay = `${j.title} ${j.category} ${j.rationale}`.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (j.title.toLowerCase().includes(t)) score += 5;
      if (j.category.toLowerCase().includes(t)) score += 2;
      if (hay.includes(t)) score += 1;
    }
    return { j, score };
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.j);
}

export function formatJobs(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toFixed(0);
}
