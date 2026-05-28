import { HORIZONS, type HorizonKey } from "@/lib/horizons";
import { useHorizon } from "@/contexts/HorizonContext";
import { Clock } from "lucide-react";

export function HorizonSelector({ compact = false }: { compact?: boolean }) {
  const { horizon, setHorizon } = useHorizon();
  return (
    <div className="flex items-center gap-2">
      {!compact && (
        <div className="hidden items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground md:flex">
          <Clock className="h-3 w-3" /> Horizon
        </div>
      )}
      <div className="flex items-center gap-0.5 rounded-full border border-border bg-card p-0.5 shadow-card">
        {HORIZONS.map((h) => {
          const active = h.key === horizon;
          return (
            <button
              key={h.key}
              onClick={() => setHorizon(h.key as HorizonKey)}
              className={
                "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors " +
                (active
                  ? "bg-primary text-primary-foreground shadow-elegant"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent")
              }
            >
              {h.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
