"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { CardControls } from "@/components/CardControls";
import { usePortfolio } from "@/lib/portfolio-context";
import { AnalyticsTreeTable, type TreeRow, type TreeColumn } from "@/components/analytics/AnalyticsTreeTable";
import { ViewToggle, type AnalyticsView } from "@/components/analytics/ViewToggle";
import { AnalyticsEmptyState } from "@/components/analytics/AnalyticsEmptyState";

// ── KPI groups — each chart has its own independent set ──────────────────────

const RETURN_KPIS = [
  { value: "total_return",      label: "Total Return (%)" },
  { value: "rolling_1y_return", label: "Rolling 1Y Return (%)" },
  { value: "rolling_3y_return", label: "Rolling 3Y Return (%)" },
  { value: "idio_return",       label: "Idiosyncratic Return (%)" },
  { value: "factor_return",     label: "Factor Return (%)" },
  { value: "market_return",     label: "Market Return (%)" },
  { value: "style_return",      label: "Style Return (%)" },
  { value: "industry_return",   label: "Industry Return (%)" },
  { value: "rolling_1y_sharpe", label: "Rolling 1Y Sharpe Ratio" },
  { value: "rolling_3y_sharpe", label: "Rolling 3Y Sharpe Ratio" },
] as const;
type ReturnKpi = typeof RETURN_KPIS[number]["value"];

const RISK_KPIS = [
  { value: "rolling_vol",             label: "Rolling 1Y Realized Risk (%)" },
  { value: "total_predicted_risk",    label: "Total Predicted Risk (%)" },
  { value: "idio_predicted_risk",     label: "Idiosyncratic Predicted Risk (%)" },
  { value: "factor_predicted_risk",   label: "Factor Predicted Risk (%)" },
  { value: "market_predicted_risk",   label: "Market Predicted Risk (%)" },
  { value: "style_predicted_risk",    label: "Style Predicted Risk (%)" },
  { value: "industry_predicted_risk", label: "Industry Predicted Risk (%)" },
  { value: "idio_risk_contrib",       label: "Idiosyncratic Risk Contribution (%)" },
  { value: "factor_risk_contrib",     label: "Factor Risk Contribution (%)" },
  { value: "market_risk_contrib",     label: "Market Risk Contribution (%)" },
  { value: "style_risk_contrib",      label: "Style Risk Contribution (%)" },
  { value: "industry_risk_contrib",   label: "Industry Risk Contribution (%)" },
] as const;
type RiskKpi = typeof RISK_KPIS[number]["value"];

const VALUATION_KPIS = [
  { value: "pe",  label: "PE Ratio" },
  { value: "pb",  label: "P/B Ratio" },
  { value: "roe", label: "Return on Equity (%)" },
] as const;
type ValuationKpi = typeof VALUATION_KPIS[number]["value"];

// ── Data builders ─────────────────────────────────────────────────────────────

type Pt = Record<string, unknown>;

// Compound daily decimal returns into a cumulative % series
function cumFromDaily(ts: Pt[], key: string): { date: string; portfolio: number }[] {
  let prod = 1.0;
  return ts
    .filter(p => p[key] != null)
    .map(p => {
      prod *= (1 + Number(p[key]));
      return { date: String(p.date), portfolio: Math.round((prod - 1) * 10000) / 100 };
    });
}

// Rolling annualized volatility of daily decimal series (approximates factor risk contribution)
function rollingVolOf(ts: Pt[], key: string, window = 60): { date: string; portfolio: number }[] {
  const vals = ts.map(p => Number(p[key] ?? 0));
  const result: { date: string; portfolio: number }[] = [];
  for (let i = window - 1; i < ts.length; i++) {
    const slice = vals.slice(i - window + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / window;
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / (window - 1);
    const annVol = Math.sqrt(variance * 252) * 100;
    result.push({ date: String(ts[i].date), portfolio: Math.round(annVol * 10000) / 10000 });
  }
  return result;
}

function buildReturnData(data: Record<string, unknown>, kpi: ReturnKpi) {
  const ec  = (data.equity_curve    as Pt[] | undefined) ?? [];
  const rm  = (data.rolling_metrics as Pt[] | undefined) ?? [];
  const fdt = (data.factor_decomp_ts as Pt[] | undefined) ?? [];

  const portColor = "#f97316";

  if (kpi === "total_return") {
    if (ec.length < 2) return { data: [], series: [] };
    const base = Number(ec[0].value ?? 1);
    return {
      data: ec.map(p => ({ date: String(p.date), portfolio: base > 0 ? ((Number(p.value) - base) / base) * 100 : 0 })),
      series: [{ key: "portfolio", name: "Portfolio", color: portColor }],
    };
  }

  if (kpi === "rolling_1y_return") {
    const pts = rm.filter(r => r.rolling_return_1y != null).map(r => ({ date: String(r.date), portfolio: Number(r.rolling_return_1y) }));
    return { data: pts, series: [{ key: "portfolio", name: "1Y Rolling Return (%)", color: portColor }] };
  }

  if (kpi === "rolling_3y_return") {
    const pts = rm.filter(r => r.rolling_return_3y != null).map(r => ({ date: String(r.date), portfolio: Number(r.rolling_return_3y) }));
    return { data: pts, series: [{ key: "portfolio", name: "3Y Rolling Return (%)", color: portColor }] };
  }

  if (kpi === "rolling_1y_sharpe") {
    return {
      data: rm.map(r => ({ date: String(r.date), portfolio: Number(r.rolling_sharpe ?? 0) })),
      series: [{ key: "portfolio", name: "1Y Sharpe", color: portColor }],
    };
  }

  if (kpi === "rolling_3y_sharpe") {
    const pts = rm.filter(r => r.rolling_sharpe_3y != null).map(r => ({ date: String(r.date), portfolio: Number(r.rolling_sharpe_3y) }));
    return { data: pts, series: [{ key: "portfolio", name: "3Y Sharpe", color: portColor }] };
  }

  // Factor decomposition cumulative returns
  const fdtKeyMap: Partial<Record<ReturnKpi, string>> = {
    idio_return: "idio", factor_return: "factor_total",
    market_return: "market", style_return: "style", industry_return: "industry",
  };
  const fdtKey = fdtKeyMap[kpi];
  if (fdtKey && fdt.length > 0) {
    return {
      data: cumFromDaily(fdt, fdtKey),
      series: [{ key: "portfolio", name: "Portfolio", color: portColor }],
    };
  }

  return { data: [], series: [] };
}

function buildRiskData(data: Record<string, unknown>, kpi: RiskKpi) {
  const rm  = (data.rolling_metrics  as Pt[] | undefined) ?? [];
  const fdt = (data.factor_decomp_ts as Pt[] | undefined) ?? [];
  const riskColor = "#ef4444";

  // Total portfolio realized/predicted risk — use rolling_vol (best available approximation)
  if (kpi === "rolling_vol" || kpi === "total_predicted_risk") {
    const label = kpi === "rolling_vol" ? "Realized Risk (%)" : "Total Risk (%)";
    return {
      data: rm.map(r => ({ date: String(r.date), portfolio: Number(r.rolling_vol ?? 0) })),
      series: [{ key: "portfolio", name: label, color: riskColor }],
    };
  }

  // Factor component risks + risk contributions: rolling annualized vol of each factor's daily contribution
  const fdtKeyMap: Partial<Record<RiskKpi, string>> = {
    idio_predicted_risk:    "idio",
    factor_predicted_risk:  "factor_total",
    market_predicted_risk:  "market",
    style_predicted_risk:   "style",
    industry_predicted_risk:"industry",
    idio_risk_contrib:      "idio",
    factor_risk_contrib:    "factor_total",
    market_risk_contrib:    "market",
    style_risk_contrib:     "style",
    industry_risk_contrib:  "industry",
  };
  const fdtKey = fdtKeyMap[kpi];
  if (fdtKey && fdt.length > 0) {
    return {
      data: rollingVolOf(fdt, fdtKey),
      series: [{ key: "portfolio", name: "Risk (%)", color: riskColor }],
    };
  }

  return { data: [], series: [] };
}

function buildValuationData(data: Record<string, unknown>, kpi: ValuationKpi) {
  const vts = (data.valuation_ts as Pt[] | undefined) ?? [];
  const valColor = "#3b82f6";

  if (kpi === "pe") {
    return {
      data: vts.map(r => ({ date: String(r.date), portfolio: Number(r.portfolio_pe ?? r.pe_ratio ?? 0) })),
      series: [{ key: "portfolio", name: "PE Ratio", color: valColor }],
    };
  }
  if (kpi === "pb") {
    return {
      data: vts.map(r => ({ date: String(r.date), portfolio: Number(r.portfolio_pb ?? r.pb_ratio ?? 0) })),
      series: [{ key: "portfolio", name: "P/B Ratio", color: valColor }],
    };
  }
  if (kpi === "roe") {
    // ROE is a scalar — show as flat reference line across valuation dates
    const pnl = (data.pnl_metrics as Pt | undefined) ?? {};
    const roeVal = pnl.roe_pct != null ? Number(pnl.roe_pct) : null;
    if (roeVal == null || vts.length === 0) return { data: [], series: [] };
    return {
      data: vts.map(r => ({ date: String(r.date), portfolio: roeVal })),
      series: [{ key: "portfolio", name: "Return on Equity (%)", color: valColor }],
    };
  }

  return { data: [], series: [] };
}

// ── Shared chart card ─────────────────────────────────────────────────────────

interface ChartCardProps<T extends string> {
  title: string;
  kpi: T;
  options: readonly { value: T; label: string }[];
  onKpiChange: (k: T) => void;
  chartData: { data: unknown[]; series: unknown[] };
}

function ChartCard<T extends string>({ title, kpi, options, onKpiChange, chartData }: ChartCardProps<T>) {
  const { data, series } = chartData as { data: Record<string, unknown>[]; series: { key: string; name: string; color: string }[] };
  return (
    <Card>
      <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
        <CardTitle className="text-[11px] truncate max-w-[140px]">{title}</CardTitle>
        <div className="flex items-center gap-1.5 shrink-0">
          <select
            value={kpi}
            onChange={e => onKpiChange(e.target.value as T)}
            className="text-[9px] bg-background border border-border rounded px-1.5 py-0.5 text-foreground focus:outline-none max-w-[130px]"
          >
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <CardControls fullscreen expandContent={data.length > 0 ? <TimeSeriesChart data={data} series={series} height={600} /> : undefined} />
        </div>
      </CardHeader>
      <CardContent className="p-2">
        {data.length > 0
          ? <TimeSeriesChart data={data} series={series} height={180} />
          : <div className="h-44 flex items-center justify-center text-[10px] text-muted-foreground">No data for this metric</div>}
      </CardContent>
    </Card>
  );
}

// ── Build tree rows ───────────────────────────────────────────────────────────

function buildPnLRows(pnl: Record<string, unknown>): TreeRow[] {
  const v = (key: string) => pnl[key] as number | null | undefined;
  const M = (k: string) => v(k) ?? null;
  const B = (k: string) => v(k) ?? null;
  const A = (mk: string, bk: string) => {
    const m = v(mk), b = v(bk);
    return m != null && b != null ? Math.round((Number(m) - Number(b)) * 100) / 100 : null;
  };

  return [
    {
      id: "total_return", label: "Total Return (%)",
      values: { Main: M("total_return_pct"), Benchmark: B("benchmark_total_return_pct"), Active: A("total_return_pct", "benchmark_total_return_pct") },
      children: [
        { id: "idio_ret",   label: "Idiosyncratic Return (%)", values: { Main: M("idio_return_pct"),   Benchmark: null, Active: null } },
        { id: "factor_ret", label: "Factor Return (%)",        values: { Main: M("factor_return_pct"), Benchmark: null, Active: null },
          children: [
            { id: "market_ret",   label: "Market Return (%)",   values: { Main: M("market_return_pct"),   Benchmark: null, Active: null } },
            { id: "style_ret",    label: "Style Return (%)",    values: { Main: M("style_return_pct"),    Benchmark: null, Active: null } },
            { id: "industry_ret", label: "Industry Return (%)", values: { Main: M("industry_return_pct"), Benchmark: null, Active: null } },
          ],
        },
      ],
    },
    { id: "cagr",    label: "CAGR (%)",      values: { Main: M("cagr_pct"),  Benchmark: B("benchmark_cagr_pct"),  Active: A("cagr_pct","benchmark_cagr_pct") } },
    { id: "sharpe",  label: "Sharpe Ratio",  values: { Main: M("sharpe"),    Benchmark: B("benchmark_sharpe"),    Active: A("sharpe","benchmark_sharpe") } },
    { id: "sortino", label: "Sortino Ratio", values: { Main: M("sortino"),   Benchmark: B("benchmark_sortino"),   Active: A("sortino","benchmark_sortino") } },
    { id: "treynor", label: "Treynor Ratio", values: { Main: M("treynor"),   Benchmark: B("benchmark_treynor"),   Active: A("treynor","benchmark_treynor") } },
  ];
}

function buildRiskRows(pnl: Record<string, unknown>): TreeRow[] {
  const v = (key: string) => pnl[key] as number | null | undefined;
  const M = (k: string) => v(k) ?? null;
  const B = (k: string) => v(k) ?? null;
  const A = (mk: string, bk: string) => {
    const m = v(mk), b = v(bk);
    return m != null && b != null ? Math.round((Number(m) - Number(b)) * 100) / 100 : null;
  };

  return [
    { id: "beta",   label: "Beta",             values: { Main: M("beta"),             Benchmark: 1.0,                              Active: null } },
    { id: "vol",    label: "Realized Risk (%)", values: { Main: M("volatility_pct"),   Benchmark: B("benchmark_volatility_pct"),   Active: A("volatility_pct","benchmark_volatility_pct") } },
    { id: "max_dd", label: "Max Drawdown (%)",  values: { Main: M("max_drawdown_pct"), Benchmark: B("benchmark_max_drawdown_pct"), Active: A("max_drawdown_pct","benchmark_max_drawdown_pct") } },
  ];
}

function buildValuationRows(pnl: Record<string, unknown>): TreeRow[] {
  return [
    { id: "pe",  label: "PE Ratio",            values: { Main: (pnl.pe_ratio as number) ?? null } },
    { id: "pb",  label: "P/B Ratio",            values: { Main: (pnl.pb_ratio as number) ?? null } },
    { id: "roe", label: "Return on Equity (%)", values: { Main: (pnl.roe_pct as number) ?? null } },
  ];
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PerformanceSummaryPage() {
  const { analyticsData, analyticsLoading, analyticsError, selectedSource, selectedSourceId } = usePortfolio();
  const [view, setView] = useState<AnalyticsView>("Main");

  // Each chart has its own independent KPI selection
  const [returnKpi,    setReturnKpi]    = useState<ReturnKpi>("total_return");
  const [riskKpi,      setRiskKpi]      = useState<RiskKpi>("rolling_vol");
  const [valuationKpi, setValuationKpi] = useState<ValuationKpi>("pe");

  if (analyticsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Computing analytics...</span>
      </div>
    );
  }

  if (!analyticsData || !selectedSourceId) {
    return <AnalyticsEmptyState title="Performance Summary" analyticsError={analyticsError} />;
  }

  const pnl          = (analyticsData.pnl_metrics ?? {}) as Record<string, unknown>;
  const hasBenchmark = pnl.benchmark_total_return_pct != null;
  const d            = analyticsData as Record<string, unknown>;

  const allCols: TreeColumn[]       = [{ key: "Active", label: "Active", align: "right" }, { key: "Benchmark", label: "Benchmark", align: "right" }, { key: "Main", label: "Main", align: "right" }];
  const singleCol: TreeColumn[]     = [{ key: "Main", label: "Main", align: "right" }];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Performance Summary</h1>
          <p className="text-xs text-muted-foreground">{selectedSource === "portfolio" ? "Portfolio" : "Strategy Backtest"}</p>
        </div>
        <ViewToggle view={view} onChange={setView} hasBenchmark={hasBenchmark} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <AnalyticsTreeTable title="Profit & Loss Summary" columns={hasBenchmark ? allCols : singleCol} rows={buildPnLRows(pnl)} defaultExpanded={new Set(["total_return"])} />
        <AnalyticsTreeTable title="Risk Summary"          columns={hasBenchmark ? allCols : singleCol} rows={buildRiskRows(pnl)} />
        <AnalyticsTreeTable title="Valuation Summary"     columns={singleCol}                          rows={buildValuationRows(pnl)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ChartCard
          title={RETURN_KPIS.find(o => o.value === returnKpi)?.label ?? "Return"}
          kpi={returnKpi}
          options={RETURN_KPIS}
          onKpiChange={setReturnKpi}
          chartData={buildReturnData(d, returnKpi)}
        />
        <ChartCard
          title={RISK_KPIS.find(o => o.value === riskKpi)?.label ?? "Risk"}
          kpi={riskKpi}
          options={RISK_KPIS}
          onKpiChange={setRiskKpi}
          chartData={buildRiskData(d, riskKpi)}
        />
        <ChartCard
          title={VALUATION_KPIS.find(o => o.value === valuationKpi)?.label ?? "Valuation"}
          kpi={valuationKpi}
          options={VALUATION_KPIS}
          onKpiChange={setValuationKpi}
          chartData={buildValuationData(d, valuationKpi)}
        />
      </div>
    </div>
  );
}
