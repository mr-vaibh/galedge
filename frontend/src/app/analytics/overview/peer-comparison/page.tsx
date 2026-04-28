"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, X, ChevronDown, Check } from "lucide-react";
import { BarChartPanel } from "@/components/charts/BarChartPanel";
import { CardControls } from "@/components/CardControls";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/currency";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

const overviewTabs = [
  { label: "Performance Summary", href: "/analytics/overview/performance" },
  { label: "Peer Comparison", href: "/analytics/overview/peer-comparison" },
  { label: "Holdings Summary", href: "/analytics/overview/holdings" },
  { label: "Period Analysis", href: "/analytics/overview/period-analysis" },
];

const COLORS = ["#f97316", "#3b82f6", "#10b981", "#a855f7", "#ec4899", "#06b6d4", "#eab308", "#ef4444"];

interface PortfolioSummary {
  id: number;
  fund_name: string;
  scheme_name?: string;
  benchmark?: string;
}

interface PerfMetrics {
  portfolio_id: number;
  fund_name: string;
  total_return?: number;
  annualised_return?: number;
  sharpe_ratio?: number;
  volatility?: number;
  max_drawdown?: number;
  num_holdings?: number;
  total_aum_cr?: number;
  trading_days?: number;
  benchmark?: string;
  benchmark_metrics?: {
    total_return?: number;
    annualised_return?: number;
    sharpe_ratio?: number;
    volatility?: number;
    max_drawdown?: number;
  };
}

// Backend returns values already in percentage form
const pct = (v: number | undefined | null) => (v != null ? `${v.toFixed(2)}%` : "—");
const raw = (v: number | undefined | null) => (v != null ? v.toFixed(2) : "—");

function getMetricsConfig(formatCurrencyCompact: (v: number, from?: string) => string) {
  return [
    { label: "Total Return (%)", key: "total_return", format: pct },
    { label: "CAGR (%)", key: "annualised_return", format: pct },
    { label: "Sharpe Ratio", key: "sharpe_ratio", format: raw },
    { label: "Volatility (%)", key: "volatility", format: pct },
    { label: "Max Drawdown (%)", key: "max_drawdown", format: pct },
    { label: "Holdings", key: "num_holdings", format: (v: number | undefined | null) => (v != null ? String(v) : "—") },
    { label: "AUM", key: "total_aum_cr", format: (v: number | undefined | null) => (v != null ? formatCurrencyCompact(v * 1e7, "INR") : "—") },
    { label: "Trading Days", key: "trading_days", format: (v: number | undefined | null) => (v != null ? String(v) : "—") },
  ] as const;
}

export default function PeerComparisonPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { selectedPortfolioId, selectedFundName } = usePortfolio();
  const { token } = useAuth();
  const { formatCurrencyCompact } = useCurrency();
  const METRICS_CONFIG = getMetricsConfig(formatCurrencyCompact);

  const [availablePortfolios, setAvailablePortfolios] = useState<PortfolioSummary[]>([]);
  const [perfCache, setPerfCache] = useState<Record<number, PerfMetrics>>({});
  const [comparedIds, setComparedIds] = useState<Set<number>>(new Set());
  const [includeBenchmark, setIncludeBenchmark] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingPerf, setLoadingPerf] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Fetch available portfolios on mount
  const fetchPortfolios = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/portfolios/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch portfolios");
      const data: PortfolioSummary[] = await res.json();
      setAvailablePortfolios(data);

      // Auto-add the selected portfolio
      if (selectedPortfolioId) {
        setComparedIds(new Set([selectedPortfolioId]));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [token, selectedPortfolioId]);

  useEffect(() => { fetchPortfolios(); }, [fetchPortfolios]);

  // Fetch performance for a portfolio (cached)
  const fetchPerf = useCallback(async (id: number) => {
    if (perfCache[id] || !token) return;
    setLoadingPerf((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`${API_BASE}/api/analytics/performance/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (!data.error) {
          setPerfCache((prev) => ({ ...prev, [id]: data }));
        }
      }
    } catch { /* skip */ }
    setLoadingPerf((prev) => { const n = new Set(prev); n.delete(id); return n; });
  }, [token, perfCache]);

  // Fetch performance when compared set changes
  useEffect(() => {
    comparedIds.forEach((id) => { if (!perfCache[id]) fetchPerf(id); });
  }, [comparedIds, fetchPerf, perfCache]);

  // Compared portfolios with data
  const comparedPerf = useMemo(() => {
    const result: PerfMetrics[] = [];
    // Selected portfolio always first
    if (selectedPortfolioId && perfCache[selectedPortfolioId] && comparedIds.has(selectedPortfolioId)) {
      result.push(perfCache[selectedPortfolioId]);
    }
    // Then others
    comparedIds.forEach((id) => {
      if (id !== selectedPortfolioId && perfCache[id]) result.push(perfCache[id]);
    });
    return result;
  }, [comparedIds, perfCache, selectedPortfolioId]);

  const selectedPerf = selectedPortfolioId ? perfCache[selectedPortfolioId] : null;
  const benchmarkMetrics = selectedPerf?.benchmark_metrics;
  const benchmarkName = selectedPerf?.benchmark;

  // Add/remove portfolio
  function togglePortfolio(id: number) {
    setComparedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        // Don't allow removing the selected portfolio
        if (id === selectedPortfolioId) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function addAll() {
    setComparedIds(new Set(availablePortfolios.map((p) => p.id)));
  }

  function clearAll() {
    setComparedIds(new Set(selectedPortfolioId ? [selectedPortfolioId] : []));
  }

  // Not-yet-added portfolios for the picker
  const addablePortfolios = availablePortfolios.filter((p) => !comparedIds.has(p.id));

  // Bar chart data
  const returnBarData: { name: string; value: number }[] = comparedPerf.map((p) => ({
    name: p.fund_name.length > 14 ? p.fund_name.slice(0, 14) + "…" : p.fund_name,
    value: p.total_return ?? 0,
  }));
  if (includeBenchmark && benchmarkMetrics?.total_return != null && benchmarkName) {
    returnBarData.push({ name: benchmarkName, value: benchmarkMetrics.total_return });
  }

  const sharpeBarData: { name: string; value: number }[] = comparedPerf.map((p) => ({
    name: p.fund_name.length > 14 ? p.fund_name.slice(0, 14) + "…" : p.fund_name,
    value: p.sharpe_ratio ?? 0,
  }));
  if (includeBenchmark && benchmarkMetrics?.sharpe_ratio != null && benchmarkName) {
    sharpeBarData.push({ name: benchmarkName, value: benchmarkMetrics.sharpe_ratio });
  }

  const volBarData: { name: string; value: number }[] = comparedPerf.map((p) => ({
    name: p.fund_name.length > 14 ? p.fund_name.slice(0, 14) + "…" : p.fund_name,
    value: p.volatility ?? 0,
  }));
  if (includeBenchmark && benchmarkMetrics?.volatility != null && benchmarkName) {
    volBarData.push({ name: benchmarkName, value: benchmarkMetrics.volatility });
  }

  if (!selectedPortfolioId) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Peer Comparison</h1>
            <p className="text-xs text-amber-400">No portfolio selected.</p>
          </div>
          <div className="flex items-center gap-1 bg-card border rounded-lg p-0.5">
            {overviewTabs.map((tab) => (
              <Button key={tab.href} variant={pathname === tab.href ? "secondary" : "ghost"} size="sm" onClick={() => router.push(tab.href)} className="h-7 text-[10px]">{tab.label}</Button>
            ))}
          </div>
        </div>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No portfolio selected. Go to Portfolio Construction to upload and select one.
          </CardContent>
        </Card>
      </div>
    );
  }

  const anyLoading = loading || loadingPerf.size > 0;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Peer Comparison</h1>
          <p className="text-xs text-muted-foreground">
            Comparing <span className="font-medium text-foreground">{comparedPerf.length}</span> portfolio{comparedPerf.length !== 1 ? "s" : ""}
            {includeBenchmark && benchmarkName ? ` + ${benchmarkName}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-card border rounded-lg p-0.5">
          {overviewTabs.map((tab) => (
            <Button key={tab.href} variant={pathname === tab.href ? "secondary" : "ghost"} size="sm" onClick={() => router.push(tab.href)} className="h-7 text-[10px]">{tab.label}</Button>
          ))}
        </div>
      </div>

      {/* ── Portfolio Selector Bar ─────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card py-3 px-4">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Active comparison chips */}
            {comparedPerf.map((p, i) => (
              <div
                key={p.portfolio_id}
                className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full text-[11px] font-medium border"
                style={{ borderColor: COLORS[i % COLORS.length], color: COLORS[i % COLORS.length] }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                {p.fund_name}
                {p.portfolio_id === selectedPortfolioId ? (
                  <span className="text-[8px] opacity-60 ml-0.5">active</span>
                ) : (
                  <button
                    onClick={() => togglePortfolio(p.portfolio_id)}
                    className="ml-0.5 p-0.5 rounded-full hover:bg-muted/40 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}

            {/* Loading chips */}
            {Array.from(loadingPerf).map((id) => (
              <div key={id} className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] text-muted-foreground border border-border">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading...
              </div>
            ))}

            {/* Benchmark toggle */}
            {benchmarkName && (
              <button
                onClick={() => setIncludeBenchmark(!includeBenchmark)}
                className={`flex items-center gap-1.5 pl-2 pr-2 py-1 rounded-full text-[11px] font-medium border transition-all ${
                  includeBenchmark
                    ? "border-blue-500 text-blue-400 bg-blue-500/10"
                    : "border-border text-muted-foreground hover:border-blue-500/50"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${includeBenchmark ? "bg-blue-500" : "bg-muted-foreground/30"}`} />
                {benchmarkName}
                {includeBenchmark && <Check className="h-3 w-3" />}
              </button>
            )}

            {/* Divider */}
            <div className="w-px h-5 bg-border mx-1" />

            {/* Add portfolio dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px] gap-1"
                onClick={() => setPickerOpen(!pickerOpen)}
                disabled={addablePortfolios.length === 0}
              >
                <Plus className="h-3 w-3" />
                Add Portfolio
                <ChevronDown className={`h-3 w-3 transition-transform ${pickerOpen ? "rotate-180" : ""}`} />
              </Button>

              {pickerOpen && addablePortfolios.length > 0 && (
                <>
                  {/* Backdrop */}
                  <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />

                  {/* Dropdown */}
                  <div className="absolute top-full left-0 mt-1 z-50 min-w-[220px] bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl overflow-hidden">
                    <div className="p-1.5 border-b border-neutral-700">
                      <button
                        onClick={() => { addAll(); setPickerOpen(false); }}
                        className="w-full text-left px-2 py-1 text-[10px] text-blue-400 hover:bg-neutral-800 rounded"
                      >
                        Add all ({addablePortfolios.length})
                      </button>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto p-1">
                      {addablePortfolios.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => { togglePortfolio(p.id); setPickerOpen(false); }}
                          className="w-full text-left px-2 py-1.5 text-[11px] text-neutral-200 hover:bg-neutral-800 rounded flex items-center justify-between gap-2"
                        >
                          <span className="font-medium">{p.fund_name}</span>
                          <span className="text-[9px] text-neutral-500">{p.scheme_name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Clear all (if >1 compared) */}
            {comparedIds.size > 1 && (
              <Button variant="ghost" size="sm" className="h-7 text-[10px] text-muted-foreground" onClick={clearAll}>
                Clear peers
              </Button>
            )}
          </div>
      </div>

      {anyLoading && comparedPerf.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Fetching portfolio data...</span>
        </div>
      ) : error ? (
        <Card><CardContent className="p-4 text-center text-red-400">{error}</CardContent></Card>
      ) : comparedPerf.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            No portfolio data available. Upload portfolios to get started.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Comparison Table */}
          <Card>
            <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
              <CardTitle className="text-[11px]">Side-by-Side Comparison</CardTitle>
              <CardControls title="Side-by-Side Comparison" info="Compare metrics across multiple portfolios and benchmark. Green highlight = best in class." expandContent={
                <div className="overflow-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="px-3 py-2 text-left text-muted-foreground font-medium sticky left-0 bg-card z-10">Metric</th>
                        {comparedPerf.map((p, i) => (
                          <th key={p.portfolio_id} className="px-3 py-2 text-right font-medium" style={{ color: COLORS[i % COLORS.length] }}>
                            <div className="flex items-center justify-end gap-1">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                              {p.fund_name}
                            </div>
                          </th>
                        ))}
                        {includeBenchmark && benchmarkMetrics && (
                          <th className="px-3 py-2 text-right font-medium text-blue-400">
                            <div className="flex items-center justify-end gap-1">
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                              {benchmarkName}
                            </div>
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {METRICS_CONFIG.map(({ label, key, format }) => {
                        const vals = comparedPerf.map((p) => p[key as keyof PerfMetrics] as number | undefined).filter((v): v is number => v != null);
                        const isHigherBetter = key !== "volatility" && key !== "max_drawdown";
                        const bestVal = vals.length > 0 ? (isHigherBetter ? Math.max(...vals) : Math.min(...vals)) : null;
                        return (
                          <tr key={label} className="border-b border-border/30 hover:bg-muted/10">
                            <td className="px-3 py-1.5 text-muted-foreground sticky left-0 bg-card z-10">{label}</td>
                            {comparedPerf.map((p) => {
                              const val = p[key as keyof PerfMetrics] as number | undefined;
                              const formatted = format(val ?? null);
                              const isNeg = typeof formatted === "string" && formatted.startsWith("-");
                              const isBest = val != null && bestVal != null && val === bestVal && comparedPerf.length > 1;
                              return (
                                <td key={p.portfolio_id} className={`px-3 py-1.5 text-right tabular-nums font-medium ${isNeg ? "text-red-400" : ""} ${isBest ? "bg-emerald-500/10" : ""}`}>
                                  {formatted}
                                  {isBest && <span className="text-[7px] text-emerald-400 ml-1">best</span>}
                                </td>
                              );
                            })}
                            {includeBenchmark && benchmarkMetrics && (
                              <td className="px-3 py-1.5 text-right tabular-nums text-blue-400/80">
                                {key === "num_holdings" || key === "total_aum_cr" || key === "trading_days"
                                  ? "—"
                                  : format((benchmarkMetrics as Record<string, number>)[key] ?? null)}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              } />
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="px-3 py-2 text-left text-muted-foreground font-medium sticky left-0 bg-card z-10">Metric</th>
                      {comparedPerf.map((p, i) => (
                        <th key={p.portfolio_id} className="px-3 py-2 text-right font-medium" style={{ color: COLORS[i % COLORS.length] }}>
                          <div className="flex items-center justify-end gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            {p.fund_name}
                          </div>
                        </th>
                      ))}
                      {includeBenchmark && benchmarkMetrics && (
                        <th className="px-3 py-2 text-right font-medium text-blue-400">
                          <div className="flex items-center justify-end gap-1">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            {benchmarkName}
                          </div>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {METRICS_CONFIG.map(({ label, key, format }) => {
                      // Find best value for highlighting
                      const vals = comparedPerf.map((p) => p[key as keyof PerfMetrics] as number | undefined).filter((v): v is number => v != null);
                      const isHigherBetter = key !== "volatility" && key !== "max_drawdown";
                      const bestVal = vals.length > 0 ? (isHigherBetter ? Math.max(...vals) : Math.min(...vals)) : null;

                      return (
                        <tr key={label} className="border-b border-border/30 hover:bg-muted/10">
                          <td className="px-3 py-1.5 text-muted-foreground sticky left-0 bg-card z-10">{label}</td>
                          {comparedPerf.map((p) => {
                            const val = p[key as keyof PerfMetrics] as number | undefined;
                            const formatted = format(val ?? null);
                            const isNeg = typeof formatted === "string" && formatted.startsWith("-");
                            const isBest = val != null && bestVal != null && val === bestVal && comparedPerf.length > 1;
                            return (
                              <td key={p.portfolio_id} className={`px-3 py-1.5 text-right tabular-nums font-medium ${isNeg ? "text-red-400" : ""} ${isBest ? "bg-emerald-500/10" : ""}`}>
                                {formatted}
                                {isBest && <span className="text-[7px] text-emerald-400 ml-1">best</span>}
                              </td>
                            );
                          })}
                          {includeBenchmark && benchmarkMetrics && (
                            <td className="px-3 py-1.5 text-right tabular-nums text-blue-400/80">
                              {key === "num_holdings" || key === "total_aum_cr" || key === "trading_days"
                                ? "—"
                                : format((benchmarkMetrics as Record<string, number>)[key] ?? null)}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                <CardTitle className="text-[11px]">Total Return (%)</CardTitle>
                <CardControls filename="return_comparison" title="Total Return (%)" info="Total return comparison across all selected portfolios and benchmark." fullscreen expandContent={
                  <BarChartPanel data={returnBarData} height={600} />
                } />
              </CardHeader>
              <CardContent className="p-2">
                <BarChartPanel data={returnBarData} height={200} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                <CardTitle className="text-[11px]">Sharpe Ratio</CardTitle>
                <CardControls filename="sharpe_comparison" title="Sharpe Ratio" info="Risk-adjusted return comparison. Higher Sharpe = better return per unit of risk." fullscreen expandContent={
                  <BarChartPanel data={sharpeBarData} height={600} />
                } />
              </CardHeader>
              <CardContent className="p-2">
                <BarChartPanel data={sharpeBarData} height={200} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                <CardTitle className="text-[11px]">Volatility (%)</CardTitle>
                <CardControls filename="volatility_comparison" title="Volatility (%)" info="Annualized volatility comparison. Lower = more stable returns." fullscreen expandContent={
                  <BarChartPanel data={volBarData} height={600} />
                } />
              </CardHeader>
              <CardContent className="p-2">
                <BarChartPanel data={volBarData} height={200} />
              </CardContent>
            </Card>
          </div>

          {/* Rankings (only when 2+ portfolios) */}
          {comparedPerf.length > 1 && (
            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                <CardTitle className="text-[11px]">Rankings by Total Return</CardTitle>
                <CardControls title="Rankings by Total Return" info="Portfolios ranked by total return with key risk and return metrics." expandContent={
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-border/50">
                        {["#", "Portfolio", "Return", "Sharpe", "Vol", "Max DD", "Holdings"].map((h) => (
                          <th key={h} className="px-2 py-1.5 text-left text-muted-foreground font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...comparedPerf]
                        .sort((a, b) => (b.total_return ?? 0) - (a.total_return ?? 0))
                        .map((p, i) => {
                          const colorIdx = comparedPerf.indexOf(p);
                          return (
                            <tr key={p.portfolio_id} className="border-b border-border/30 hover:bg-muted/10">
                              <td className="px-2 py-1.5">
                                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold ${
                                  i === 0 ? "bg-amber-500/20 text-amber-400" : i === 1 ? "bg-gray-400/20 text-gray-400" : i === 2 ? "bg-orange-800/20 text-orange-600" : "text-muted-foreground"
                                }`}>{i + 1}</span>
                              </td>
                              <td className="px-2 py-1.5 font-medium">
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[colorIdx % COLORS.length] }} />
                                  {p.fund_name}
                                </span>
                              </td>
                              <td className={`px-2 py-1.5 tabular-nums font-medium ${(p.total_return ?? 0) < 0 ? "text-red-400" : "text-emerald-400"}`}>{pct(p.total_return)}</td>
                              <td className="px-2 py-1.5 tabular-nums">{raw(p.sharpe_ratio)}</td>
                              <td className="px-2 py-1.5 tabular-nums">{pct(p.volatility)}</td>
                              <td className="px-2 py-1.5 tabular-nums text-red-400">{pct(p.max_drawdown)}</td>
                              <td className="px-2 py-1.5 tabular-nums">{p.num_holdings ?? "—"}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                } />
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-border/50">
                      {["#", "Portfolio", "Return", "Sharpe", "Vol", "Max DD", "Holdings"].map((h) => (
                        <th key={h} className="px-2 py-1.5 text-left text-muted-foreground font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...comparedPerf]
                      .sort((a, b) => (b.total_return ?? 0) - (a.total_return ?? 0))
                      .map((p, i) => {
                        const colorIdx = comparedPerf.indexOf(p);
                        return (
                          <tr key={p.portfolio_id} className="border-b border-border/30 hover:bg-muted/10">
                            <td className="px-2 py-1.5">
                              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold ${
                                i === 0 ? "bg-amber-500/20 text-amber-400" : i === 1 ? "bg-gray-400/20 text-gray-400" : i === 2 ? "bg-orange-800/20 text-orange-600" : "text-muted-foreground"
                              }`}>
                                {i + 1}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 font-medium">
                              <span className="inline-flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[colorIdx % COLORS.length] }} />
                                {p.fund_name}
                              </span>
                            </td>
                            <td className={`px-2 py-1.5 tabular-nums font-medium ${(p.total_return ?? 0) < 0 ? "text-red-400" : "text-emerald-400"}`}>{pct(p.total_return)}</td>
                            <td className="px-2 py-1.5 tabular-nums">{raw(p.sharpe_ratio)}</td>
                            <td className="px-2 py-1.5 tabular-nums">{pct(p.volatility)}</td>
                            <td className="px-2 py-1.5 tabular-nums text-red-400">{pct(p.max_drawdown)}</td>
                            <td className="px-2 py-1.5 tabular-nums">{p.num_holdings ?? "—"}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
