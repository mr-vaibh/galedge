"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2, BarChart3 } from "lucide-react";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { CardControls } from "@/components/CardControls";
import { usePortfolio } from "@/lib/portfolio-context";
import { AnalyticsTreeTable, type TreeRow, type TreeColumn } from "@/components/analytics/AnalyticsTreeTable";
import { ViewToggle, type AnalyticsView } from "@/components/analytics/ViewToggle";

// ── KPI chart selector ──────────────────────────────────────────────────────
type KpiKey = "total_return" | "rolling_risk" | "pe_ratio";

const KPI_OPTIONS = [
  { value: "total_return" as KpiKey, label: "Total Return (%)" },
  { value: "rolling_risk" as KpiKey, label: "Rolling 1Y Realized Risk (%)" },
  { value: "pe_ratio" as KpiKey, label: "PE Ratio" },
];

function buildChartData(data: Record<string, unknown>, kpi: KpiKey) {
  if (kpi === "total_return") {
    const ec = (data.equity_curve as Record<string, unknown>[] | undefined) ?? [];
    if (ec.length < 2) return { data: [], series: [] };
    const base = Number(ec[0].value ?? 1);
    const pts = ec.map((p) => ({
      date: String(p.date),
      portfolio: base > 0 ? ((Number(p.value) - base) / base) * 100 : 0,
    }));
    const bec = (data.benchmark_equity_curve as Record<string, unknown>[] | undefined) ?? [];
    if (bec.length > 1) {
      const bb = Number(bec[0].value ?? 1);
      return {
        data: pts.map((p, i) => ({ ...p, benchmark: bec[i] ? ((Number(bec[i].value) - bb) / bb) * 100 : undefined })),
        series: [{ key: "portfolio", name: "Portfolio", color: "#f97316" }, { key: "benchmark", name: "Benchmark", color: "#6366f1" }],
      };
    }
    return { data: pts, series: [{ key: "portfolio", name: "Portfolio", color: "#f97316" }] };
  }
  if (kpi === "rolling_risk") {
    const rm = (data.rolling_metrics as Record<string, unknown>[] | undefined) ?? [];
    return { data: rm.map((r) => ({ date: String(r.date), risk: Number(r.rolling_vol ?? 0) * 100 })), series: [{ key: "risk", name: "Realized Risk (%)", color: "#ef4444" }] };
  }
  if (kpi === "pe_ratio") {
    const vts = (data.valuation_ts as Record<string, unknown>[] | undefined) ?? [];
    return { data: vts.map((r) => ({ date: String(r.date), pe: Number(r.pe_ratio ?? r.pe ?? 0) })), series: [{ key: "pe", name: "PE Ratio", color: "#3b82f6" }] };
  }
  return { data: [], series: [] };
}

function ChartCard({ analyticsData, kpi, onKpiChange }: { analyticsData: Record<string, unknown>; kpi: KpiKey; onKpiChange: (k: KpiKey) => void }) {
  const { data, series } = buildChartData(analyticsData, kpi);
  return (
    <Card>
      <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
        <select
          value={kpi}
          onChange={(e) => onKpiChange(e.target.value as KpiKey)}
          className="text-[9px] bg-background border border-border rounded px-1.5 py-0.5 text-foreground focus:outline-none"
        >
          {KPI_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <CardControls fullscreen expandContent={data.length > 0 ? <TimeSeriesChart data={data} series={series} height={600} /> : undefined} />
      </CardHeader>
      <CardContent className="p-2">
        {data.length > 0
          ? <TimeSeriesChart data={data} series={series} height={180} />
          : <div className="h-44 flex items-center justify-center text-[10px] text-muted-foreground">No data for this metric</div>}
      </CardContent>
    </Card>
  );
}

// ── Build tree rows from pnl_metrics ─────────────────────────────────────────
function buildPnLRows(pnl: Record<string, unknown>): TreeRow[] {
  const v = (key: string) => pnl[key] as number | null | undefined;

  const factorChildren: TreeRow[] = [
    { id: "market_ret",   label: "Market Return (%)",   values: { Main: v("market_return_pct"),   Benchmark: null, Active: null } },
    { id: "style_ret",    label: "Style Return (%)",    values: { Main: v("style_return_pct"),    Benchmark: null, Active: null } },
    { id: "industry_ret", label: "Industry Return (%)", values: { Main: v("industry_return_pct"), Benchmark: null, Active: null } },
  ];

  const trChildren: TreeRow[] = [
    { id: "idio_ret",    label: "Idiosyncratic Return (%)", values: { Main: v("idio_return_pct"),   Benchmark: null, Active: null } },
    { id: "factor_ret",  label: "Factor Return (%)",        values: { Main: v("factor_return_pct"), Benchmark: null, Active: null }, children: factorChildren },
  ];

  const sharpeChildren: TreeRow[] = [
    { id: "idio_sharpe",   label: "Idiosyncratic Sharpe", values: { Main: null, Benchmark: null, Active: null } },
    { id: "factor_sharpe", label: "Factor Sharpe",        values: { Main: null, Benchmark: null, Active: null } },
  ];
  const sortinoChildren: TreeRow[] = [
    { id: "idio_sortino",   label: "Idiosyncratic Sortino", values: { Main: null, Benchmark: null, Active: null } },
    { id: "factor_sortino", label: "Factor Sortino",         values: { Main: null, Benchmark: null, Active: null } },
  ];

  const M = (key: string) => v(key) ?? null;
  const B = (key: string) => v(key) ?? null;
  const A = (mKey: string, bKey: string) => {
    const m = v(mKey), b = v(bKey);
    if (m != null && b != null) return Math.round((Number(m) - Number(b)) * 100) / 100;
    return null;
  };

  return [
    {
      id: "total_return", label: "Total Return (%)",
      values: { Main: M("total_return_pct"), Benchmark: B("benchmark_total_return_pct"), Active: A("total_return_pct", "benchmark_total_return_pct") },
      children: trChildren,
    },
    {
      id: "cagr", label: "CAGR (%)",
      values: { Main: M("cagr_pct"), Benchmark: B("benchmark_cagr_pct"), Active: A("cagr_pct", "benchmark_cagr_pct") },
    },
    {
      id: "sharpe", label: "Sharpe Ratio",
      values: { Main: M("sharpe"), Benchmark: B("benchmark_sharpe"), Active: A("sharpe", "benchmark_sharpe") },
      children: sharpeChildren,
    },
    {
      id: "sortino", label: "Sortino Ratio",
      values: { Main: M("sortino"), Benchmark: B("benchmark_sortino"), Active: A("sortino", "benchmark_sortino") },
      children: sortinoChildren,
    },
    {
      id: "treynor", label: "Treynor Ratio",
      values: { Main: M("treynor"), Benchmark: B("benchmark_treynor"), Active: A("treynor", "benchmark_treynor") },
    },
  ];
}

function buildRiskRows(pnl: Record<string, unknown>): TreeRow[] {
  const v = (key: string) => pnl[key] as number | null | undefined;
  const M = (k: string) => v(k) ?? null;
  const B = (k: string) => v(k) ?? null;
  const A = (mk: string, bk: string) => {
    const m = v(mk), b = v(bk);
    return (m != null && b != null) ? Math.round((Number(m) - Number(b)) * 100) / 100 : null;
  };

  return [
    { id: "beta",     label: "Beta",            values: { Main: M("beta"),             Benchmark: 1.0, Active: A("beta", "beta") } },
    { id: "vol",      label: "Volatility (%)",   values: { Main: M("volatility_pct"),   Benchmark: B("benchmark_volatility_pct"),   Active: A("volatility_pct", "benchmark_volatility_pct") } },
    { id: "max_dd",   label: "Max Drawdown (%)", values: { Main: M("max_drawdown_pct"), Benchmark: B("benchmark_max_drawdown_pct"), Active: A("max_drawdown_pct", "benchmark_max_drawdown_pct") } },
  ];
}

function buildValuationRows(pnl: Record<string, unknown>): TreeRow[] {
  return [
    { id: "pe",  label: "PE Ratio",             values: { Main: (pnl.pe_ratio as number) ?? null } },
    { id: "pb",  label: "P/B Ratio",             values: { Main: (pnl.pb_ratio as number) ?? null } },
    { id: "roe", label: "Return on Equity (%)", values: { Main: (pnl.roe_pct as number) ?? null } },
  ];
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function PerformanceSummaryPage() {
  const { analyticsData, analyticsLoading, analyticsError, selectedSource, selectedSourceId, selectedBacktestId, loadAnalytics } = usePortfolio();
  const [view, setView] = useState<AnalyticsView>("Main");
  const [kpi0, setKpi0] = useState<KpiKey>("total_return");
  const [kpi1, setKpi1] = useState<KpiKey>("rolling_risk");
  const [kpi2, setKpi2] = useState<KpiKey>("pe_ratio");

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
        {analyticsError && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">Error: {analyticsError}</div>}
        <div className="rounded-lg border bg-card p-12 text-center space-y-3">
          <BarChart3 className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          {selectedSourceId ? (
            <>
              <p className="text-sm text-muted-foreground">Portfolio selected — click to load analytics</p>
              <button onClick={() => selectedSource && loadAnalytics(selectedSource, selectedSourceId, selectedBacktestId ?? undefined)} className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg">Load Analytics</button>
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
        <div className="mt-4 rounded-lg border border-red-500/30 bg-card p-6 text-center text-sm text-red-400">{analyticsError}</div>
      </div>
    );
  }

  const pnl = (analyticsData.pnl_metrics ?? {}) as Record<string, unknown>;
  const hasBenchmark = pnl.benchmark_total_return_pct != null;

  // Columns shown depend on view and benchmark availability
  const allCols: TreeColumn[] = [
    { key: "Active",    label: "Active",    align: "right" },
    { key: "Benchmark", label: "Benchmark", align: "right" },
    { key: "Main",      label: "Main",      align: "right" },
  ];
  const valuationCols: TreeColumn[] = [{ key: "Main", label: "Main", align: "right" }];

  // Filter columns based on view for single-col display
  const visibleCols = view === "Active" ? allCols.filter(c => c.key === "Active")
    : view === "Benchmark" ? allCols.filter(c => c.key === "Benchmark")
    : allCols; // Main shows all three

  const pnlRows = buildPnLRows(pnl);
  const riskRows = buildRiskRows(pnl);
  const valuationRows = buildValuationRows(pnl);

  const defaultExpanded = new Set(["total_return", "sharpe"]);

  return (
    <div className="p-4 space-y-4">
      {/* Header row with toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Performance Summary</h1>
          <p className="text-xs text-muted-foreground">{selectedSource === "portfolio" ? "Portfolio" : "Strategy Backtest"}</p>
        </div>
        <ViewToggle view={view} onChange={setView} hasBenchmark={hasBenchmark} />
      </div>

      {/* Metric tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <AnalyticsTreeTable
          title="Profit & Loss Summary"
          columns={visibleCols}
          rows={pnlRows}
          defaultExpanded={defaultExpanded}
        />
        <AnalyticsTreeTable
          title="Risk Summary"
          columns={visibleCols}
          rows={riskRows}
        />
        <AnalyticsTreeTable
          title="Valuation Summary"
          columns={valuationCols}
          rows={valuationRows}
        />
      </div>

      {/* KPI-switchable charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ChartCard analyticsData={analyticsData as Record<string, unknown>} kpi={kpi0} onKpiChange={setKpi0} />
        <ChartCard analyticsData={analyticsData as Record<string, unknown>} kpi={kpi1} onKpiChange={setKpi1} />
        <ChartCard analyticsData={analyticsData as Record<string, unknown>} kpi={kpi2} onKpiChange={setKpi2} />
      </div>
    </div>
  );
}
