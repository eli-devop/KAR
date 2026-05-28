export type MaturityLevel = "Easy" | "Medium" | "Hard" | "Complex";

export interface Capability {
  id: string;
  name: string;
  maturity: MaturityLevel;
  definition: string;
  enterpriseRelevance: string;
  examples: string[];
  risk: string;
  dataRequirements: string[];
  evalMetrics: string[];
}

export const CAPABILITIES: Capability[] = [
  { id: "physical", name: "Physical-world comprehension", maturity: "Complex", definition: "Grounded understanding of objects, environments, and consequences in 3D space.", enterpriseRelevance: "Field operations, manufacturing, healthcare procedures, logistics handoffs.", examples: ["Robotic pick-and-place", "Site safety supervision", "Inventory audits"], risk: "High — sensor gaps, edge cases, safety liability.", dataRequirements: ["Sensor telemetry", "3D scans", "Calibrated video"], evalMetrics: ["Task success rate", "Intervention frequency", "Mean time between failures"] },
  { id: "memory", name: "Persistent memory", maturity: "Hard", definition: "Reliable long-term recall of facts, preferences, decisions and prior context across sessions.", enterpriseRelevance: "Account history, policy adherence, longitudinal research.", examples: ["Customer relationship recall", "Project context continuity"], risk: "Privacy, drift, stale references.", dataRequirements: ["Vector store", "Provenance", "Consent flags"], evalMetrics: ["Recall@k", "Citation accuracy", "Hallucination rate"] },
  { id: "reasoning", name: "Reasoning", maturity: "Medium", definition: "Multi-step logical inference over evidence with self-consistency.", enterpriseRelevance: "Underwriting, diagnostics, root-cause analysis.", examples: ["Variance investigation", "Differential diagnosis support"], risk: "Confident wrong answers; over-reasoning.", dataRequirements: ["Structured + unstructured ground truth"], evalMetrics: ["Exact match", "Process-level eval", "Calibration"] },
  { id: "planning", name: "Planning", maturity: "Hard", definition: "Decompose goals into ordered, conditional steps with budgets and recovery.", enterpriseRelevance: "Workflow orchestration, multi-tool agents.", examples: ["Workforce transition roadmaps", "Procurement playbooks"], risk: "Plan brittleness; tool misuse.", dataRequirements: ["Tool registry", "Outcome traces"], evalMetrics: ["Plan validity", "Re-plan rate", "Cost per success"] },
  { id: "collab", name: "Human collaboration", maturity: "Medium", definition: "Eliciting intent, surfacing assumptions, accepting overrides, and delivering reviewable artifacts.", enterpriseRelevance: "Analyst, manager and executive workflows.", examples: ["Draft → review loops", "Override panels"], risk: "Over-trust or under-trust.", dataRequirements: ["Reviewer signals"], evalMetrics: ["Acceptance rate", "Override rate", "Time-to-decision"] },
  { id: "digital", name: "Digital task execution", maturity: "Easy", definition: "Operating apps, APIs and documents via tools to complete bounded jobs.", enterpriseRelevance: "Back-office, finance, IT support.", examples: ["Reconciliations", "Ticket triage", "Report generation"], risk: "Silent failures; permission creep.", dataRequirements: ["Tool schemas", "Permission scopes"], evalMetrics: ["Task completion", "Error rate", "Latency"] },
  { id: "24h", name: "24-hour work", maturity: "Medium", definition: "Long-horizon autonomous operation across shifts without context loss.", enterpriseRelevance: "Monitoring, research, knowledge work batches.", examples: ["Overnight research sweeps", "Continuous compliance scans"], risk: "Cascading errors; runaway cost.", dataRequirements: ["Checkpoints", "Budget guards"], evalMetrics: ["Cost per hour", "Drift detection"] },
  { id: "object", name: "Object permanence", maturity: "Hard", definition: "Maintain a consistent world model when entities leave/enter the agent's view.", enterpriseRelevance: "Logistics, inventory, multi-tenant ops.", examples: ["Container tracking", "Tenant isolation"], risk: "State desync.", dataRequirements: ["Event sourcing"], evalMetrics: ["State accuracy", "Reconciliation lag"] },
  { id: "eval", name: "Evaluation framework", maturity: "Medium", definition: "Continuous offline/online evals tied to business KPIs.", enterpriseRelevance: "Governance, risk, ML ops.", examples: ["Golden sets", "A/B with humans"], risk: "Eval-gaming, blind spots.", dataRequirements: ["Labeled datasets"], evalMetrics: ["Eval coverage", "Regression rate"] },
  { id: "offload", name: "Cognitive offload", maturity: "Easy", definition: "Moving routine thinking off humans without losing accountability.", enterpriseRelevance: "Analyst productivity, junior task compression.", examples: ["Draft memos", "Meeting prep"], risk: "Skill atrophy.", dataRequirements: ["Usage analytics"], evalMetrics: ["Time saved", "Quality delta"] },
  { id: "reliability", name: "Capability vs reliability", maturity: "Hard", definition: "Closing the gap between what a model can do once and what it does every time.", enterpriseRelevance: "All production agents.", examples: ["Verification chains", "Self-consistency"], risk: "Latency / cost inflation.", dataRequirements: ["Production traces"], evalMetrics: ["p95 success", "Variance"] },
];
