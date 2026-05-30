"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { CardControls } from "@/components/CardControls";
import { usePortfolio } from "@/lib/portfolio-context";
import { AnalyticsTreeTable, type TreeRow, type TreeColumn } from "@/components/analytics/AnalyticsTreeTable";
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

// ── Derived metric helpers ─────────────────────────────────────────────────────

interface FactorStats { idio: number | null; factor: number | null; market: number | null; style: number | null; industry: number | null }
interface ConcStats { top5_weight: number | null; top10_weight: number | null; top20_weight: number | null; top5_risk: number | null; top10_risk: number | null; top20_risk: number | null }

function computeConcentration(holdings: Pt[]): ConcStats | null {
  if (!holdings.length) return null;
  const byWeight = [...holdings].sort((a, b) => Number(b.avg_weight ?? 0) - Number(a.avg_weight ?? 0));
  const byRisk   = [...holdings].sort((a, b) => Number(b.risk_contribution_pct ?? 0) - Number(a.risk_contribution_pct ?? 0));
  const sum = (arr: Pt[], key: string, n: number) =>
    Math.round(arr.slice(0, n).reduce((s, h) => s + Number(h[key] ?? 0), 0) * 100) / 100;
  return {
    top5_weight:  sum(byWeight, "avg_weight", 5),
    top10_weight: sum(byWeight, "avg_weight", 10),
    top20_weight: sum(byWeight, "avg_weight", 20),
    top5_risk:    sum(byRisk, "risk_contribution_pct", 5),
    top10_risk:   sum(byRisk, "risk_contribution_pct", 10),
    top20_risk:   sum(byRisk, "risk_contribution_pct", 20),
  };
}

function computeFactorSharpe(fdt: Pt[]): FactorStats | null {
  if (fdt.length < 30) return null;
  const sharpe = (key: string): number | null => {
    const vals = fdt.map(p => Number(p[key] ?? 0));
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const std = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (vals.length - 1));
    return std > 1e-9 ? Math.round(mean / std * Math.sqrt(252) * 100) / 100 : null;
  };
  return { idio: sharpe("idio"), factor: sharpe("factor_total"), market: sharpe("market"), style: sharpe("style"), industry: sharpe("industry") };
}

function computeFactorSortino(fdt: Pt[]): FactorStats | null {
  if (fdt.length < 30) return null;
  const sortino = (key: string): number | null => {
    const vals = fdt.map(p => Number(p[key] ?? 0));
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const negVals = vals.filter(v => v < 0);
    if (!negVals.length) return null;
    const downStd = Math.sqrt(negVals.reduce((a, b) => a + b * b, 0) / negVals.length);
    return downStd > 1e-9 ? Math.round(mean / downStd * Math.sqrt(252) * 100) / 100 : null;
  };
  return { idio: sortino("idio"), factor: sortino("factor_total"), market: sortino("market"), style: sortino("style"), industry: sortino("industry") };
}

// ── Build tree rows ───────────────────────────────────────────────────────────

function buildPnLRows(pnl: Record<string, unknown>, fs: FactorStats | null, so: FactorStats | null): TreeRow[] {
  const n = (k: string) => (pnl[k] as number | null | undefined) ?? null;
  const diff = (mk: string, bk: string) => {
    const m = n(mk), b = n(bk);
    return m != null && b != null ? Math.round((Number(m) - Number(b)) * 100) / 100 : null;
  };
  const V = (mk: string, bk?: string) => ({
    Main: n(mk), Benchmark: bk ? n(bk) : null, Active: bk ? diff(mk, bk) : null,
  });
  const N = () => ({ Main: null as null, Benchmark: null as null, Active: null as null });

  return [
    {
      id: "total_return", label: "Total Return (%)",
      values: V("total_return_pct", "benchmark_total_return_pct"),
      children: [
        { id: "idio_ret",    label: "Idiosyncratic Return (%)", values: V("idio_return_pct") },
        { id: "factor_ret",  label: "Factor Return (%)",        values: V("factor_return_pct"),
          children: [
            { id: "market_ret",   label: "Market Return (%)",   values: V("market_return_pct") },
            { id: "style_ret",    label: "Style Return (%)",    values: V("style_return_pct") },
            { id: "industry_ret", label: "Industry Return (%)", values: V("industry_return_pct") },
          ],
        },
        { id: "dividend_ret",  label: "Dividend Return (%)",   values: N() },
        { id: "other_ret",     label: "Other Return (%)",      values: N() },
        { id: "txn_cost",      label: "Transaction Cost (%)",  values: N(),
          children: [
            { id: "market_impact",  label: "Market Impact (%)",      values: N() },
            { id: "spread",         label: "Spread (%)",             values: N() },
            { id: "brokerage_fees", label: "Brokerage and Fees (%)", values: N() },
          ],
        },
      ],
    },
    {
      id: "cagr", label: "CAGR (%)",
      values: V("cagr_pct", "benchmark_cagr_pct"),
      children: [
        { id: "idio_cagr",   label: "Idiosyncratic CAGR (%)", values: N() },
        { id: "factor_cagr", label: "Factor CAGR (%)",         values: N(),
          children: [
            { id: "market_cagr",   label: "Market CAGR (%)",   values: N() },
            { id: "style_cagr",    label: "Style CAGR (%)",    values: N() },
            { id: "industry_cagr", label: "Industry CAGR (%)", values: N() },
          ],
        },
        { id: "dividend_cagr",  label: "Dividend CAGR (%)",          values: N() },
        { id: "other_cagr",     label: "Other CAGR (%)",             values: N() },
        { id: "txn_cost_cagr",  label: "Transaction Cost CAGR (%)",  values: N(),
          children: [
            { id: "market_impact_cagr",  label: "Market Impact CAGR (%)",      values: N() },
            { id: "spread_cagr",         label: "Spread CAGR (%)",             values: N() },
            { id: "brokerage_fees_cagr", label: "Brokerage and Fees CAGR (%)", values: N() },
          ],
        },
      ],
    },
    {
      id: "sharpe", label: "Sharpe Ratio",
      values: V("sharpe", "benchmark_sharpe"),
      children: [
        { id: "idio_sharpe",   label: "Idiosyncratic Sharpe Ratio", values: { Main: fs?.idio    ?? null, Benchmark: null, Active: null } },
        { id: "factor_sharpe", label: "Factor Sharpe Ratio",         values: { Main: fs?.factor  ?? null, Benchmark: null, Active: null },
          children: [
            { id: "market_sharpe",   label: "Market Sharpe Ratio",   values: { Main: fs?.market   ?? null, Benchmark: null, Active: null } },
            { id: "style_sharpe",    label: "Style Sharpe Ratio",    values: { Main: fs?.style    ?? null, Benchmark: null, Active: null } },
            { id: "industry_sharpe", label: "Industry Sharpe Ratio", values: { Main: fs?.industry ?? null, Benchmark: null, Active: null } },
          ],
        },
      ],
    },
    {
      id: "sortino", label: "Sortino Ratio",
      values: V("sortino", "benchmark_sortino"),
      children: [
        { id: "idio_sortino",   label: "Idiosyncratic Sortino Ratio", values: { Main: so?.idio    ?? null, Benchmark: null, Active: null } },
        { id: "factor_sortino", label: "Factor Sortino Ratio",         values: { Main: so?.factor  ?? null, Benchmark: null, Active: null },
          children: [
            { id: "market_sortino",   label: "Market Sortino Ratio",   values: { Main: so?.market   ?? null, Benchmark: null, Active: null } },
            { id: "style_sortino",    label: "Style Sortino Ratio",    values: { Main: so?.style    ?? null, Benchmark: null, Active: null } },
            { id: "industry_sortino", label: "Industry Sortino Ratio", values: { Main: so?.industry ?? null, Benchmark: null, Active: null } },
          ],
        },
      ],
    },
    { id: "treynor", label: "Treynor Ratio", values: V("treynor", "benchmark_treynor") },
    {
      id: "exec_summary", label: "Execution Summary",
      values: N(),
      children: [
        { id: "ann_turnover",   label: "Annualized Turnover",          values: N() },
        { id: "total_txn_cost", label: "Total Transaction Cost (bps)", values: N(),
          children: [
            { id: "market_impact_bps", label: "Market Impact Cost (bps)", values: N() },
            { id: "spread_bps",        label: "Spread Cost (bps)",        values: N() },
            { id: "brokerage_bps",     label: "Brokerage and Fees (bps)", values: N(),
              children: [
                { id: "brokerage_only", label: "Brokerage (bps)",                    values: N() },
                { id: "exchange_bps",   label: "Exchange Transaction Charges (bps)", values: N() },
                { id: "sebi_bps",       label: "SEBI Charges (bps)",                 values: N() },
                { id: "stamp_bps",      label: "Stamp Charges (bps)",                values: N() },
                { id: "stt_bps",        label: "STT Fees (bps)",                     values: N() },
                { id: "gst_bps",        label: "GST (bps)",                          values: N() },
              ],
            },
          ],
        },
      ],
    },
  ];
}

function buildRiskRows(pnl: Record<string, unknown>, conc: ConcStats | null): TreeRow[] {
  const n = (k: string) => (pnl[k] as number | null | undefined) ?? null;
  const diff = (mk: string, bk: string) => {
    const m = n(mk), b = n(bk);
    return m != null && b != null ? Math.round((Number(m) - Number(b)) * 100) / 100 : null;
  };
  const V = (mk: string, bk?: string) => ({
    Main: n(mk), Benchmark: bk ? n(bk) : null, Active: bk ? diff(mk, bk) : null,
  });
  const N = () => ({ Main: null as null, Benchmark: null as null, Active: null as null });

  return [
    { id: "beta", label: "Beta", values: { Main: n("beta"), Benchmark: 1.0, Active: null } },
    {
      id: "realized_risk", label: "Realized Risk (%)",
      values: V("volatility_pct", "benchmark_volatility_pct"),
      children: [
        { id: "idio_rr",   label: "Idiosyncratic Realized Risk (%)", values: N() },
        { id: "factor_rr", label: "Factor Realized Risk (%)",         values: N(),
          children: [
            { id: "market_rr",   label: "Market Realized Risk (%)",   values: N() },
            { id: "style_rr",    label: "Style Realized Risk (%)",    values: N() },
            { id: "industry_rr", label: "Industry Realized Risk (%)", values: N() },
          ],
        },
      ],
    },
    {
      id: "predicted_risk", label: "Total Predicted Risk (%)",
      values: V("volatility_pct", "benchmark_volatility_pct"),
      children: [
        { id: "idio_pr",   label: "Idiosyncratic Predicted Risk (%)", values: N() },
        { id: "factor_pr", label: "Factor Predicted Risk (%)",         values: N(),
          children: [
            { id: "market_pr",   label: "Market Predicted Risk (%)",   values: N() },
            { id: "style_pr",    label: "Style Predicted Risk (%)",    values: N() },
            { id: "industry_pr", label: "Industry Predicted Risk (%)", values: N() },
          ],
        },
      ],
    },
    {
      id: "risk_contrib", label: "Risk Contribution (%)",
      values: N(),
      children: [
        { id: "idio_rc",   label: "Idiosyncratic Risk Contribution (%)", values: N() },
        { id: "factor_rc", label: "Factor Risk Contribution (%)",         values: N(),
          children: [
            { id: "market_rc",   label: "Market Risk Contribution (%)",   values: N() },
            { id: "style_rc",    label: "Style Risk Contribution (%)",    values: N() },
            { id: "industry_rc", label: "Industry Risk Contribution (%)", values: N() },
          ],
        },
      ],
    },
    {
      id: "portfolio_conc", label: "Portfolio Concentration",
      values: N(),
      children: [
        { id: "top_holdings", label: "Top Holdings (%)", values: N(),
          children: [
            { id: "top5_hold",  label: "Top 5 Holdings (%)",  values: { Main: conc?.top5_weight  ?? null, Benchmark: null, Active: null } },
            { id: "top10_hold", label: "Top 10 Holdings (%)", values: { Main: conc?.top10_weight ?? null, Benchmark: null, Active: null } },
            { id: "top20_hold", label: "Top 20 Holdings (%)", values: { Main: conc?.top20_weight ?? null, Benchmark: null, Active: null } },
          ],
        },
        { id: "top_total_rc", label: "Top Total Risk Contribution (%)", values: N(),
          children: [
            { id: "top5_trc",  label: "Top 5 Total Risk Contribution (%)",  values: { Main: conc?.top5_risk  ?? null, Benchmark: null, Active: null } },
            { id: "top10_trc", label: "Top 10 Total Risk Contribution (%)", values: { Main: conc?.top10_risk ?? null, Benchmark: null, Active: null } },
            { id: "top20_trc", label: "Top 20 Total Risk Contribution (%)", values: { Main: conc?.top20_risk ?? null, Benchmark: null, Active: null } },
          ],
        },
        { id: "top_idio_rc", label: "Top Idiosyncratic Risk Contribution (%)", values: N(),
          children: [
            { id: "top5_irc",  label: "Top 5 Idiosyncratic Risk Contribution (%)",  values: N() },
            { id: "top10_irc", label: "Top 10 Idiosyncratic Risk Contribution (%)", values: N() },
            { id: "top20_irc", label: "Top 20 Idiosyncratic Risk Contribution (%)", values: N() },
          ],
        },
        { id: "top_factor_rc", label: "Top Factor Risk Contribution (%)", values: N(),
          children: [
            { id: "top5_frc",  label: "Top 5 Factor Risk Contribution (%)",  values: N() },
            { id: "top10_frc", label: "Top 10 Factor Risk Contribution (%)", values: N() },
            { id: "top20_frc", label: "Top 20 Factor Risk Contribution (%)", values: N() },
          ],
        },
      ],
    },
    { id: "gross_aum",     label: "Gross AUM (INR cr)",     values: N() },
    { id: "unlevered_aum", label: "Unlevered AUM (INR cr)", values: N() },
  ];
}

function buildValuationRows(pnl: Record<string, unknown>): TreeRow[] {
  const n = (k: string) => (pnl[k] as number | null | undefined) ?? null;
  const diff = (mk: string, bk: string) => {
    const m = n(mk), b = n(bk);
    return m != null && b != null ? Math.round((Number(m) - Number(b)) * 100) / 100 : null;
  };
  const V = (mk: string, bk: string) => ({
    Main: n(mk), Benchmark: n(bk), Active: diff(mk, bk),
  });
  return [
    { id: "pe",  label: "PE Ratio",            values: V("pe_ratio",  "benchmark_pe_ratio") },
    { id: "pb",  label: "P/B Ratio",            values: V("pb_ratio",  "benchmark_pb_ratio") },
    { id: "roe", label: "Return on Equity (%)", values: V("roe_pct",   "benchmark_roe_pct") },
  ];
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PerformanceSummaryPage() {
  const { analyticsData, analyticsLoading, analyticsError, selectedSource, selectedSourceId } = usePortfolio();
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
  const holdings     = (d.holdings_detail as Pt[] | undefined) ?? [];
  const fdt          = (d.factor_decomp_ts as Pt[] | undefined) ?? [];
  const conc         = computeConcentration(holdings);
  const factorSharpe  = computeFactorSharpe(fdt);
  const factorSortino = computeFactorSortino(fdt);

  const singleCol: TreeColumn[] = [{ key: "Main", label: "Main", align: "right" }];
  const treeCols: TreeColumn[] = hasBenchmark
    ? [
        { key: "Active",    label: "Active",    align: "right" },
        { key: "Benchmark", label: "Benchmark", align: "right" },
        { key: "Main",      label: "Main",      align: "right" },
      ]
    : singleCol;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Performance Summary</h1>
          <p className="text-xs text-muted-foreground">{selectedSource === "portfolio" ? "Portfolio" : "Strategy Backtest"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <AnalyticsTreeTable title="Profit & Loss Summary" columns={treeCols}   rows={buildPnLRows(pnl, factorSharpe, factorSortino)} defaultExpanded={new Set(["total_return"])} />
        <AnalyticsTreeTable title="Risk Summary"          columns={treeCols}   rows={buildRiskRows(pnl, conc)} />
        <AnalyticsTreeTable title="Valuation Summary"     columns={treeCols}   rows={buildValuationRows(pnl)} />
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
