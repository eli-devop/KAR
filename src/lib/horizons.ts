export const HORIZONS = [
  { key: "now", label: "Now", days: 0 },
  { key: "30d", label: "30d", days: 30 },
  { key: "60d", label: "60d", days: 60 },
  { key: "90d", label: "90d", days: 90 },
  { key: "1y", label: "1y", days: 365 },
  { key: "2y", label: "2y", days: 730 },
  { key: "3y", label: "3y", days: 1095 },
  { key: "4y", label: "4y", days: 1460 },
  { key: "5y", label: "5y", days: 1825 },
] as const;

export type HorizonKey = (typeof HORIZONS)[number]["key"];
export const HORIZON_KEYS = HORIZONS.map((h) => h.key) as readonly HorizonKey[];
export const FORECAST_HORIZONS = HORIZONS.filter((h) => h.key !== "now");

export function horizonLabel(k: HorizonKey) {
  return HORIZONS.find((h) => h.key === k)?.label ?? k;
}
