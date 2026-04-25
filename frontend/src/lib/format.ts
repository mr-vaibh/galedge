export function formatNumber(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  if (Math.abs(n) >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(2);
}

export function formatVolume(v: number | null | undefined): string {
  if (v == null) return "—";
  return formatNumber(v);
}

export function formatPercent(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

export function formatPrice(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return "—";
  return v.toFixed(2);
}

export function formatChange(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}`;
}

export function changeColor(v: number | null | undefined): string {
  if (v == null || v === 0) return "text-zinc-400";
  return v > 0 ? "text-emerald-500" : "text-red-500";
}

export function changeBg(v: number | null | undefined): string {
  if (v == null || v === 0) return "bg-zinc-800";
  return v > 0 ? "bg-emerald-500/10" : "bg-red-500/10";
}
