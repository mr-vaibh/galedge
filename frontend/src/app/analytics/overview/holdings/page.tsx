"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { AnalyticsEmptyState } from "@/components/analytics/AnalyticsEmptyState";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { CardControls } from "@/components/CardControls";
import { usePortfolio } from "@/lib/portfolio-context";
import { ViewToggle, type AnalyticsView } from "@/components/analytics/ViewToggle";

function fmt(v: unknown, decimals = 2): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return n.toFixed(decimals);
}

function ColoredCell({ value }: { value: unknown }) {
  const n = Number(value);
  const s = fmt(value);
  if (s === "—") return <span className="tabular-nums">{s}</span>;
  return <span className={`tabular-nums ${n >= 0 ? "text-emerald-500" : "text-red-400"}`}>{s}</span>;
}

interface HoldingDetail {
  symbol: string;
  holdings_pct?: number;
  avg_weight?: number;
  raw_return_pct?: number;
  total_return_contribution_pct?: number;
  total_risk_contribution_pct?: number;
  idio_return_pct?: number;
  [key: string]: unknown;
}

interface FactorDetail {
  factor_type?: string;
  factor_name?: string;
  factor?: string;
  exposure_pct?: number;
  raw_return_pct?: number;
  return_contribution_pct?: number;
  risk_contribution_pct?: number;
  [key: string]: unknown;
}

const COLORS = ["#f97316", "#10b981", "#3b82f6", "#a855f7", "#eab308", "#ef4444", "#06b6d4", "#ec4899"];

export default function HoldingsSummaryPage() {
  const { analyticsData, analyticsLoading, selectedSourceId } = usePortfolio();
  const [view, setView] = useState<AnalyticsView>("Main");
  const [selectedHoldings, setSelectedHoldings] = useState<Set<string>>(new Set());
  const [selectedFactors, setSelectedFactors] = useState<Set<string>>(new Set());

  // Initialize with top 5 holdings and top 5 factors by weight/exposure
  useEffect(() => {
    if (!analyticsData) return;
    const h = (analyticsData.holdings_detail as HoldingDetail[] | undefined) ?? [];
    const top5 = [...h].sort((a, b) => Number(b.avg_weight ?? 0) - Number(a.avg_weight ?? 0)).slice(0, 5).map(x => x.symbol);
    setSelectedHoldings(new Set(top5));
    const f = (analyticsData.factor_detail as FactorDetail[] | undefined) ?? [];
    const top5f = [...f].sort((a, b) => Math.abs(Number(b.exposure_pct ?? 0)) - Math.abs(Number(a.exposure_pct ?? 0))).slice(0, 5).map(x => x.factor_name ?? x.factor ?? "");
    setSelectedFactors(new Set(top5f.filter(Boolean)));
  }, [analyticsData]);

  if (analyticsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Computing analytics...</span>
      </div>
    );
  }

  if (!analyticsData || !selectedSourceId) {
    return <AnalyticsEmptyState title="Holdings & Factor Summary" />;
  }

  const holdings: HoldingDetail[] = (analyticsData.holdings_detail as HoldingDetail[] | undefined) ?? [];
  const factors: FactorDetail[] = (analyticsData.factor_detail as FactorDetail[] | undefined) ?? [];
  const factorDecompTs: Record<string, unknown>[] = (analyticsData.factor_decomp_ts as Record<string, unknown>[] | undefined) ?? [];
  const equityCurve: Record<string, unknown>[] = (analyticsData.equity_curve as Record<string, unknown>[] | undefined) ?? [];

  function toggleHolding(sym: string) {
    setSelectedHoldings((prev) => {
      const next = new Set(prev);
      if (next.has(sym)) next.delete(sym);
      else next.add(sym);
      return next;
    });
  }

  function toggleFactor(name: string) {
    setSelectedFactors((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  // Build holdings weight time series (flat lines from equity curve dates)
  const holdingChartData = equityCurve.map((pt) => {
    const row: Record<string, unknown> = { date: pt.date };
    Array.from(selectedHoldings).forEach((sym) => {
      const h = holdings.find((x) => x.symbol === sym);
      row[sym] = h ? Number(h.avg_weight ?? h.holdings_pct ?? 0) : 0;
    });
    return row;
  });

  const holdingSeries = Array.from(selectedHoldings).map((sym, i) => ({
    key: sym,
    name: sym,
    color: COLORS[i % COLORS.length],
  }));

  // Build factor exposure time series: flat lines from factor_detail (static exposures)
  // Use equity curve dates as time axis, factor exposures as constant values
  const factorExposureMap: Record<string, number> = {};
  factors.forEach(f => {
    const name = String(f.factor_name ?? f.factor ?? "");
    if (name) factorExposureMap[name] = Number(f.exposure_pct ?? 0);
  });

  const factorChartData = equityCurve.map((pt) => {
    const row: Record<string, unknown> = { date: pt.date };
    Array.from(selectedFactors).forEach((fn) => {
      row[fn] = factorExposureMap[fn] ?? 0;
    });
    return row;
  });

  const factorSeries = Array.from(selectedFactors).map((fn, i) => ({
    key: fn,
    name: fn,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Holdings &amp; Factor Summary</h1>
          <p className="text-xs text-muted-foreground">{holdings.length} holdings · {factors.length} factors</p>
        </div>
        <ViewToggle view={view} onChange={setView} hasBenchmark={false} />
      </div>

      {/* Top section: two tables side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Holdings Summary Table */}
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <div>
              <CardTitle className="text-[11px]">Holdings Summary</CardTitle>
              <span className="text-[9px] text-muted-foreground">{selectedHoldings.size}/{holdings.length} selected</span>
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" className="text-[9px] h-5 px-1.5"
                onClick={() => setSelectedHoldings(new Set(holdings.map(h => h.symbol)))}>All</Button>
              <Button size="sm" variant="ghost" className="text-[9px] h-5 px-1.5"
                onClick={() => setSelectedHoldings(new Set())}>None</Button>
              <CardControls />
            </div>
          </CardHeader>
          <CardContent className="p-0 max-h-64 overflow-y-auto">
            <table className="w-full text-[10px]">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border/50">
                  <th className="px-2 py-1.5 w-6" />
                  {["Symbol", "Weight (%)", "Raw Ret (%)", "Tot Ret (%)", "Risk Contrib (%)", "Idio Ret (%)"].map((h) => (
                    <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...holdings].sort((a, b) => Number(b.avg_weight ?? 0) - Number(a.avg_weight ?? 0)).map((h) => (
                  <tr key={h.symbol} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="px-2 py-1">
                      <input type="checkbox" checked={selectedHoldings.has(h.symbol)}
                        onChange={() => toggleHolding(h.symbol)} className="h-3 w-3" />
                    </td>
                    <td className="px-2 py-1 font-medium">{h.symbol}</td>
                    <td className="px-2 py-1"><ColoredCell value={fmt(Number(h.avg_weight ?? h.holdings_pct ?? 0))} /></td>
                    <td className="px-2 py-1"><ColoredCell value={fmt(h.raw_return_pct)} /></td>
                    <td className="px-2 py-1"><ColoredCell value={fmt(h.total_return_contribution_pct)} /></td>
                    <td className="px-2 py-1"><ColoredCell value={fmt(h.total_risk_contribution_pct)} /></td>
                    <td className="px-2 py-1"><ColoredCell value={fmt(h.idio_return_pct)} /></td>
                  </tr>
                ))}
                {holdings.length === 0 && (
                  <tr><td colSpan={7} className="px-2 py-4 text-center text-muted-foreground">No holdings data</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Factor Summary Table */}
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <div>
              <CardTitle className="text-[11px]">Factor Summary</CardTitle>
              <span className="text-[9px] text-muted-foreground">{selectedFactors.size}/{factors.length} selected</span>
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" className="text-[9px] h-5 px-1.5"
                onClick={() => setSelectedFactors(new Set(factors.map(f => String(f.factor_name ?? f.factor ?? ""))))}>All</Button>
              <Button size="sm" variant="ghost" className="text-[9px] h-5 px-1.5"
                onClick={() => setSelectedFactors(new Set())}>None</Button>
              <CardControls />
            </div>
          </CardHeader>
          <CardContent className="p-0 max-h-64 overflow-y-auto">
            <table className="w-full text-[10px]">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border/50">
                  <th className="px-2 py-1.5 w-6" />
                  {["Type", "Factor", "Exposure (%)", "Raw Ret (%)", "Ret Contrib (%)", "Risk Contrib (%)"].map((h) => (
                    <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...factors].sort((a, b) => Math.abs(Number(b.exposure_pct ?? 0)) - Math.abs(Number(a.exposure_pct ?? 0))).map((f, i) => {
                  const fname = String(f.factor_name ?? f.factor ?? `factor_${i}`);
                  return (
                    <tr key={fname} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="px-2 py-1">
                        <input type="checkbox" checked={selectedFactors.has(fname)}
                          onChange={() => toggleFactor(fname)} className="h-3 w-3" />
                      </td>
                      <td className="px-2 py-1 text-muted-foreground">{f.factor_type ?? "Style"}</td>
                      <td className="px-2 py-1 font-medium">{fname}</td>
                      <td className="px-2 py-1"><ColoredCell value={fmt(f.exposure_pct)} /></td>
                      <td className="px-2 py-1"><ColoredCell value={fmt(f.raw_return_pct)} /></td>
                      <td className="px-2 py-1"><ColoredCell value={fmt(f.return_contribution_pct)} /></td>
                      <td className="px-2 py-1"><ColoredCell value={fmt(f.risk_contribution_pct)} /></td>
                    </tr>
                  );
                })}
                {factors.length === 0 && (
                  <tr><td colSpan={7} className="px-2 py-4 text-center text-muted-foreground">No factor data</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Bottom: charts for selected holdings and factors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Holdings Weight Over Time</CardTitle>
            <CardControls fullscreen expandContent={
              holdingChartData.length > 0 && holdingSeries.length > 0 ? (
                <TimeSeriesChart data={holdingChartData} series={holdingSeries} height={600}
                  yFormatter={(v) => `${v.toFixed(2)}%`} />
              ) : undefined
            } />
          </CardHeader>
          <CardContent className="p-2">
            {holdingChartData.length > 0 && holdingSeries.length > 0 ? (
              <TimeSeriesChart data={holdingChartData} series={holdingSeries} height={200}
                yFormatter={(v) => `${v.toFixed(2)}%`} />
            ) : (
              <div className="h-[200px] flex items-center justify-center text-[10px] text-muted-foreground">
                Select holdings above to display chart
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Factor Exposure Over Time</CardTitle>
            <CardControls fullscreen expandContent={
              factorChartData.length > 0 && factorSeries.length > 0 ? (
                <TimeSeriesChart data={factorChartData} series={factorSeries} height={600}
                  yFormatter={(v) => `${v.toFixed(2)}`} />
              ) : undefined
            } />
          </CardHeader>
          <CardContent className="p-2">
            {factorChartData.length > 0 && factorSeries.length > 0 ? (
              <TimeSeriesChart data={factorChartData} series={factorSeries} height={200}
                yFormatter={(v) => `${v.toFixed(2)}`} />
            ) : (
              <div className="h-[200px] flex items-center justify-center text-[10px] text-muted-foreground">
                Select factors above to display chart
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
