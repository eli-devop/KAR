export const fmtInt = (n: number) => new Intl.NumberFormat("en-US").format(n);
export const fmtCompact = (n: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
export const fmtUSD = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
export const fmtPct = (n: number) => `${n > 0 ? "+" : ""}${n}%`;
