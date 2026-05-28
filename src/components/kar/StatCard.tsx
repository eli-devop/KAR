interface Props {
  label: string;
  value: string;
  hint?: string;
  accent?: "primary" | "taupe" | "success" | "warning";
}

const accentMap: Record<NonNullable<Props["accent"]>, string> = {
  primary: "bg-primary",
  taupe: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
};

export function StatCard({ label, value, hint, accent = "primary" }: Props) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-card">
      <div className={`absolute left-0 top-0 h-full w-0.5 ${accentMap[accent]}`} />
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1.5 text-2xl font-semibold tracking-tight kar-mono">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
