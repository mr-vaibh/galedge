"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BarChart3 } from "lucide-react";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { CardControls } from "@/components/CardControls";
import { usePortfolio } from "@/lib/portfolio-context";

type KpiKey = "total_return" | "rolling_risk" | "pe_ratio" | "drawdown";

const KPI_OPTIONS: { value: KpiKey; label: string }[] = [
  { value: "total_return", label: "Total Return (%)" },
  { value: "rolling_risk", label: "Rolling 1Y Realized Risk (%)" },
  { value: "pe_ratio", label: "PE Ratio" },
  { value: "drawdown", label: "Drawdown (%)" },
];

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
  return (
    <span className={`tabular-nums ${n >= 0 ? "text-emerald-500" : "text-red-400"}`}>
      {s}
    </span>
  );
}

function KpiSelector({
  value,
  onChange,
}: {
  value: KpiKey;
  onChange: (v: KpiKey) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as KpiKey)}
      className="text-[9px] bg-background border border-border rounded px-1.5 py-0.5 text-foreground focus:outline-none"
    >
      {KPI_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function MetricTable({
  title,
  rows,
  hasBenchmark = true,
}: {
  title: string;
  rows: { metric: string; active: unknown; benchmark?: unknown }[];
  hasBenchmark?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
        <CardTitle className="text-[11px]">{title}</CardTitle>
        <CardControls />
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-border/50">
              <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Metric</th>
              <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Active</th>
              {hasBenchmark && (
                <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Benchmark</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ metric, active, benchmark }) => (
              <tr key={metric} className="border-b border-border/30">
                <td className="px-2 py-1.5 text-muted-foreground">{metric}</td>
                <td className="px-2 py-1.5 text-right"><ColoredCell value={active} /></td>
                {hasBenchmark && (
                  <td className="px-2 py-1.5 text-right"><ColoredCell value={benchmark} /></td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function buildChartData(analyticsData: Record<string, unknown>, kpi: KpiKey) {
  if (kpi === "total_return") {
    const ec = (analyticsData.equity_curve as Record<string, unknown>[] | undefined) ?? [];
    if (ec.length < 2) return { data: [], series: [] };
    const base = Number(ec[0].value ?? 1);
    const portfolioSeries = ec.map((p) => ({
      date: String(p.date),
      portfolio: base > 0 ? ((Number(p.value) - base) / base) * 100 : 0,
    }));
    // benchmark curve if available
    const bec = (analyticsData.benchmark_equity_curve as Record<string, unknown>[] | undefined) ?? [];
    if (bec.length > 1) {
      const bbase = Number(bec[0].value ?? 1);
      const merged = portfolioSeries.map((p, i) => ({
        ...p,
        benchmark: bec[i] ? ((Number(bec[i].value) - bbase) / bbase) * 100 : undefined,
      }));
      return {
        data: merged,
        series: [
          { key: "portfolio", name: "Portfolio", color: "#f97316" },
          { key: "benchmark", name: "Benchmark", color: "#6366f1" },
        ],
      };
    }
    return {
      data: portfolioSeries,
      series: [{ key: "portfolio", name: "Portfolio", color: "#f97316" }],
    };
  }

  if (kpi === "rolling_risk") {
    const rm = (analyticsData.rolling_metrics as Record<string, unknown>[] | undefined) ?? [];
    return {
      data: rm.map((r) => ({ date: String(r.date), risk: Number(r.rolling_vol ?? 0) * 100 })),
      series: [{ key: "risk", name: "Realized Risk (%)", color: "#ef4444" }],
    };
  }

  if (kpi === "pe_ratio") {
    const vts = (analyticsData.valuation_ts as Record<string, unknown>[] | undefined) ?? [];
    return {
      data: vts.map((r) => ({ date: String(r.date), pe: Number(r.pe_ratio ?? r.pe ?? 0) })),
      series: [{ key: "pe", name: "PE Ratio", color: "#3b82f6" }],
    };
  }

  if (kpi === "drawdown") {
    const ec = (analyticsData.equity_curve as Record<string, unknown>[] | undefined) ?? [];
    return {
      data: ec.map((p) => ({ date: String(p.date), dd: Number(p.drawdown ?? 0) })),
      series: [{ key: "dd", name: "Drawdown (%)", color: "#dc2626" }],
    };
  }

  return { data: [], series: [] };
}

function ChartCard({ analyticsData, index }: { analyticsData: Record<string, unknown>; index: number }) {
  const [kpi, setKpi] = useState<KpiKey>(["total_return", "rolling_risk", "pe_ratio"][index] as KpiKey);
  const { data, series } = buildChartData(analyticsData, kpi);

  return (
    <Card>
      <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
        <KpiSelector value={kpi} onChange={setKpi} />
        <CardControls fullscreen expandContent={
          data.length > 0 ? (
            <TimeSeriesChart data={data} series={series} height={600} />
          ) : undefined
        } />
      </CardHeader>
      <CardContent className="p-2">
        {data.length > 0 ? (
          <TimeSeriesChart data={data} series={series} height={180} />
        ) : (
          <div className="h-44 flex items-center justify-center text-[10px] text-muted-foreground">
            No data for this metric
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PerformanceSummaryPage() {
  const { analyticsData, analyticsLoading, analyticsError, selectedSource, selectedSourceId, selectedBacktestId, loadAnalytics } = usePortfolio();

  if (analyticsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Computing analytics...</span>
      </div>
    );
  }

  if (!analyticsData || !selectedSourceId) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-bold">Performance Summary</h1>
        {analyticsError && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            Error: {analyticsError}
          </div>
        )}
        <div className="rounded-lg border bg-card p-12 text-center space-y-3">
          <BarChart3 className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          {selectedSourceId ? (
            <>
              <p className="text-sm text-muted-foreground">Portfolio selected — click to load analytics</p>
              <button
                onClick={() => selectedSource && loadAnalytics(selectedSource, selectedSourceId, selectedBacktestId ?? undefined)}
                className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors"
              >
                Load Analytics
              </button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select a portfolio or strategy from the sidebar to begin</p>
          )}
        </div>
      </div>
    );
  }

  if (analyticsError) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold">Performance Summary</h1>
        <div className="mt-4 rounded-lg border border-red-500/30 bg-card p-6 text-center text-sm text-red-400">
          {analyticsError}
        </div>
      </div>
    );
  }

  const pnl = (analyticsData.pnl_metrics ?? {}) as Record<string, unknown>;
  const bm = (pnl.benchmark ?? {}) as Record<string, unknown>;

  const pnlRows = [
    { metric: "Total Return (%)", active: fmt(pnl.total_return_pct), benchmark: fmt(bm.total_return_pct) },
    { metric: "CAGR (%)", active: fmt(pnl.cagr_pct), benchmark: fmt(bm.cagr_pct) },
    { metric: "Sharpe Ratio", active: fmt(pnl.sharpe), benchmark: fmt(bm.sharpe) },
    { metric: "Sortino Ratio", active: fmt(pnl.sortino), benchmark: fmt(bm.sortino) },
    { metric: "Treynor Ratio", active: fmt(pnl.treynor), benchmark: "—" },
  ];

  const riskRows = [
    { metric: "Beta", active: fmt(pnl.beta), benchmark: "1.00" },
    { metric: "Volatility (%)", active: fmt(pnl.volatility_pct), benchmark: fmt(bm.volatility_pct) },
    { metric: "Max Drawdown (%)", active: fmt(pnl.max_drawdown_pct), benchmark: fmt(bm.max_drawdown_pct) },
  ];

  const vts = (analyticsData.valuation_ts as Record<string, unknown>[] | undefined) ?? [];
  const latestVals = vts.length > 0 ? vts[vts.length - 1] : {};
  const valuationRows = [
    { metric: "PE Ratio", active: fmt(latestVals.pe_ratio ?? latestVals.pe) },
    { metric: "Sortino Ratio", active: fmt(pnl.sortino) },
  ];

  const sourceName = selectedSource === "portfolio" ? "Portfolio" : "Strategy Backtest";

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Performance Summary</h1>
        <p className="text-xs text-muted-foreground">{sourceName}</p>
      </div>

      {/* Metric tables */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <MetricTable title="P&L Summary" rows={pnlRows} />
        <MetricTable title="Risk Summary" rows={riskRows} />
        <MetricTable title="Valuation Summary" rows={valuationRows} hasBenchmark={false} />
      </div>

      {/* KPI-switchable charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <ChartCard key={i} analyticsData={analyticsData} index={i} />
        ))}
      </div>
    </div>
  );
}
