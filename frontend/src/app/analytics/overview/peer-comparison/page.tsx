"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, X, ChevronDown, ChevronRight, Check } from "lucide-react";
import { BarChartPanel } from "@/components/charts/BarChartPanel";
import { CardControls } from "@/components/CardControls";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/currency";
import { AnalyticsEmptyState } from "@/components/analytics/AnalyticsEmptyState";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

const overviewTabs = [
  { label: "Performance Summary", href: "/analytics/overview/performance" },
  { label: "Peer Comparison", href: "/analytics/overview/peer-comparison" },
  { label: "Holdings Summary", href: "/analytics/overview/holdings" },
  { label: "Period Analysis", href: "/analytics/overview/period-analysis" },
];

const COLORS = ["#f97316", "#3b82f6", "#10b981", "#a855f7", "#ec4899", "#06b6d4", "#eab308", "#ef4444"];

// ── KPI types ──────────────────────────────────────────────────────────────
type ReturnKpi =
  | "total_return"
  | "rolling_1y_return"
  | "rolling_3y_return"
  | "idio_return"
  | "factor_return"
  | "market_return"
  | "style_return"
  | "industry_return"
  | "rolling_1y_sharpe"
  | "rolling_3y_sharpe";

type RiskKpi =
  | "volatility"
  | "total_predicted_risk"
  | "idio_predicted_risk"
  | "factor_predicted_risk"
  | "market_predicted_risk"
  | "style_predicted_risk"
  | "industry_predicted_risk"
  | "idio_risk_contrib"
  | "factor_risk_contrib"
  | "market_risk_contrib"
  | "style_risk_contrib"
  | "industry_risk_contrib";

type ValuationKpi = "pe" | "pb" | "roe";

const RETURN_KPI_LABELS: Record<ReturnKpi, string> = {
  total_return: "Total Return (%)",
  rolling_1y_return: "Rolling 1Y Return (%)",
  rolling_3y_return: "Rolling 3Y Return (%)",
  idio_return: "Idiosyncratic Return (%)",
  factor_return: "Factor Return (%)",
  market_return: "Market Return (%)",
  style_return: "Style Return (%)",
  industry_return: "Industry Return (%)",
  rolling_1y_sharpe: "Rolling 1Y Sharpe Ratio",
  rolling_3y_sharpe: "Rolling 3Y Sharpe Ratio",
};

const RISK_KPI_LABELS: Record<RiskKpi, string> = {
  volatility: "Rolling 1Y Realized Risk (%)",
  total_predicted_risk: "Total Predicted Risk (%)",
  idio_predicted_risk: "Idiosyncratic Predicted Risk (%)",
  factor_predicted_risk: "Factor Predicted Risk (%)",
  market_predicted_risk: "Market Predicted Risk (%)",
  style_predicted_risk: "Style Predicted Risk (%)",
  industry_predicted_risk: "Industry Predicted Risk (%)",
  idio_risk_contrib: "Idiosyncratic Risk Contribution (%)",
  factor_risk_contrib: "Factor Risk Contribution (%)",
  market_risk_contrib: "Market Risk Contribution (%)",
  style_risk_contrib: "Style Risk Contribution (%)",
  industry_risk_contrib: "Industry Risk Contribution (%)",
};

const VALUATION_KPI_LABELS: Record<ValuationKpi, string> = {
  pe: "PE Ratio",
  pb: "P/B Ratio",
  roe: "Return on Equity (%)",
};

// ── Interfaces ──────────────────────────────────────────────────────────────
interface PortfolioSummary {
  id: number;
  fund_name: string;
  scheme_name?: string;
  benchmark?: string;
}

interface PerfMetrics {
  portfolio_id: number;
  fund_name: string;
  // Core
  total_return?: number;
  annualised_return?: number;
  sharpe_ratio?: number;
  volatility?: number;
  max_drawdown?: number;
  num_holdings?: number;
  total_aum_cr?: number;
  trading_days?: number;
  benchmark?: string;
  // Extended P&L
  sortino?: number;
  treynor?: number;
  beta?: number;
  idio_return?: number;
  factor_return?: number;
  market_return?: number;
  style_return?: number;
  industry_return?: number;
  rolling_1y_return?: number;
  rolling_3y_return?: number;
  rolling_1y_sharpe?: number;
  rolling_3y_sharpe?: number;
  // Predicted risk
  total_predicted_risk?: number;
  idio_predicted_risk?: number;
  factor_predicted_risk?: number;
  market_predicted_risk?: number;
  style_predicted_risk?: number;
  industry_predicted_risk?: number;
  // Risk contributions
  idio_risk_contrib?: number;
  factor_risk_contrib?: number;
  market_risk_contrib?: number;
  style_risk_contrib?: number;
  industry_risk_contrib?: number;
  // Valuation
  pe?: number;
  pb?: number;
  roe?: number;
  // Benchmark metrics
  benchmark_metrics?: {
    total_return?: number;
    annualised_return?: number;
    sharpe_ratio?: number;
    volatility?: number;
    max_drawdown?: number;
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function lastVal(arr: Array<Record<string, unknown>>, key: string): number | undefined {
  for (let i = arr.length - 1; i >= 0; i--) {
    const v = arr[i][key];
    if (v != null && !isNaN(Number(v))) return Number(v);
  }
  return undefined;
}

function factorSum(fd: Array<Record<string, unknown>>, type: string): number | undefined {
  const rows = fd.filter((f) => String(f.factor_type ?? "").toLowerCase() === type.toLowerCase());
  if (!rows.length) return undefined;
  return rows.reduce((s, f) => s + Number(f.return_contribution_pct ?? 0), 0);
}

// ── Formatters ───────────────────────────────────────────────────────────────
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

// ── Table section definitions ─────────────────────────────────────────────────
interface TableRow {
  key: string;
  label: string;
  format: (v: number | undefined | null) => string;
  children?: { key: string; label: string; format: (v: number | undefined | null) => string }[];
}

interface TableSection {
  title: string;
  rows: TableRow[];
}

function getTableSections(): TableSection[] {
  return [
    {
      title: "P&L Summary",
      rows: [
        {
          key: "total_return", label: "Total Return (%)", format: pct,
          children: [
            { key: "idio_return", label: "Idiosyncratic Return (%)", format: pct },
            { key: "factor_return", label: "Factor Return (%)", format: pct },
            { key: "_div_return", label: "Dividend Return (%)", format: pct },
            { key: "_other_return", label: "Other Return (%)", format: pct },
            { key: "_tc_pct", label: "Transaction Cost (%)", format: pct },
          ],
        },
        {
          key: "annualised_return", label: "CAGR (%)", format: pct,
          children: [
            { key: "_idio_cagr", label: "Idio CAGR (%)", format: pct },
            { key: "_factor_cagr", label: "Factor CAGR (%)", format: pct },
            { key: "_div_cagr", label: "Dividend CAGR (%)", format: pct },
            { key: "_other_cagr", label: "Other CAGR (%)", format: pct },
            { key: "_tc_cagr", label: "TC CAGR (%)", format: pct },
          ],
        },
        {
          key: "sharpe_ratio", label: "Sharpe Ratio", format: raw,
          children: [
            { key: "_idio_sharpe", label: "Idio Sharpe", format: raw },
            { key: "_factor_sharpe", label: "Factor Sharpe", format: raw },
          ],
        },
        {
          key: "sortino", label: "Sortino Ratio", format: raw,
          children: [
            { key: "_idio_sortino", label: "Idio Sortino", format: raw },
            { key: "_factor_sortino", label: "Factor Sortino", format: raw },
          ],
        },
        { key: "treynor", label: "Treynor Ratio", format: raw },
        {
          key: "_exec_summary", label: "Execution Summary", format: raw,
          children: [
            { key: "_ann_turnover", label: "Annualized Turnover", format: raw },
            { key: "_tc_bps", label: "Total Transaction Cost (bps)", format: raw },
          ],
        },
      ],
    },
    {
      title: "Risk Summary",
      rows: [
        { key: "beta", label: "Beta", format: raw },
        {
          key: "volatility", label: "Realized Risk (%)", format: pct,
          children: [
            { key: "_idio_realized_risk", label: "Idio Realized Risk (%)", format: pct },
            { key: "_factor_realized_risk", label: "Factor Realized Risk (%)", format: pct },
          ],
        },
        {
          key: "total_predicted_risk", label: "Total Predicted Risk (%)", format: pct,
          children: [
            { key: "idio_predicted_risk", label: "Idio Predicted Risk (%)", format: pct },
            { key: "factor_predicted_risk", label: "Factor Predicted Risk (%)", format: pct },
          ],
        },
        {
          key: "_risk_contrib", label: "Risk Contribution (%)", format: pct,
          children: [
            { key: "idio_risk_contrib", label: "Idio Risk Contribution (%)", format: pct },
            { key: "factor_risk_contrib", label: "Factor Risk Contribution (%)", format: pct },
          ],
        },
        {
          key: "_port_conc", label: "Portfolio Concentration", format: raw,
          children: [
            { key: "_top_holdings", label: "Top Holdings (%)", format: pct },
            { key: "_top_total_rc", label: "Top Total RC (%)", format: pct },
            { key: "_top_idio_rc", label: "Top Idio RC (%)", format: pct },
            { key: "_top_factor_rc", label: "Top Factor RC (%)", format: pct },
          ],
        },
        { key: "total_aum_cr", label: "Gross AUM (INR cr)", format: raw },
      ],
    },
    {
      title: "Valuation Summary",
      rows: [
        { key: "pe", label: "PE Ratio", format: raw },
        { key: "pb", label: "P/B Ratio", format: raw },
        { key: "roe", label: "Return on Equity (%)", format: pct },
      ],
    },
  ];
}

// ── KPI select component ──────────────────────────────────────────────────────
function KpiSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Record<T, string>;
}) {
  return (
    <select
      className="text-[9px] bg-transparent border border-border rounded px-1 py-0.5 text-muted-foreground focus:outline-none"
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {(Object.entries(options) as [T, string][]).map(([k, label]) => (
        <option key={k} value={k}>
          {label}
        </option>
      ))}
    </select>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PeerComparisonPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { selectedPortfolioId } = usePortfolio();
  const { token } = useAuth();
  const { formatCurrencyCompact } = useCurrency();
  const METRICS_CONFIG = getMetricsConfig(formatCurrencyCompact);
  const TABLE_SECTIONS = getTableSections();

  const [availablePortfolios, setAvailablePortfolios] = useState<PortfolioSummary[]>([]);
  const [perfCache, setPerfCache] = useState<Record<number, PerfMetrics>>({});
  const [comparedIds, setComparedIds] = useState<Set<number>>(new Set());
  const [includeBenchmark, setIncludeBenchmark] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingPerf, setLoadingPerf] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Per-chart KPI state
  const [returnKpi, setReturnKpi] = useState<ReturnKpi>("total_return");
  const [riskKpi, setRiskKpi] = useState<RiskKpi>("volatility");
  const [valuationKpi, setValuationKpi] = useState<ValuationKpi>("pe");

  // ── Fetch portfolios ─────────────────────────────────────────────────────
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

  // ── Fetch perf for a portfolio ────────────────────────────────────────────
  const fetchPerf = useCallback(async (id: number) => {
    if (perfCache[id] || !token) return;
    setLoadingPerf((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(
        `${API_BASE}/api/analytics/v2/compute?source=portfolio&source_id=${id}&benchmark=NIFTY+500`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const rawData = await res.json();
        const pnl = (rawData.pnl_metrics ?? {}) as Record<string, unknown>;
        const fd = (rawData.factor_detail ?? []) as Array<Record<string, unknown>>;
        const rm = (rawData.rolling_metrics ?? []) as Array<Record<string, unknown>>;
        const vts = (rawData.valuation_ts ?? []) as Array<Record<string, unknown>>;

        const asNum = (v: unknown) => (v != null && !isNaN(Number(v)) ? Number(v) : undefined);

        const data: PerfMetrics = {
          portfolio_id: id,
          fund_name: String(rawData.fund_name ?? `Portfolio ${id}`),
          benchmark: rawData.benchmark as string | undefined,
          // Core
          total_return: asNum(pnl.total_return_pct),
          annualised_return: asNum(pnl.cagr_pct),
          sharpe_ratio: asNum(pnl.sharpe),
          volatility: asNum(pnl.volatility_pct),
          max_drawdown: asNum(pnl.max_drawdown_pct),
          // Extended P&L
          sortino: asNum(pnl.sortino),
          treynor: asNum(pnl.treynor_ratio),
          beta: asNum(pnl.beta),
          idio_return: asNum(pnl.idio_return_pct),
          factor_return: asNum(pnl.factor_return_pct),
          market_return: factorSum(fd, "Market"),
          style_return: factorSum(fd, "Style"),
          industry_return: factorSum(fd, "Industry"),
          rolling_1y_return: lastVal(rm, "rolling_return_1y"),
          rolling_3y_return: lastVal(rm, "rolling_return_3y"),
          rolling_1y_sharpe: lastVal(rm, "rolling_sharpe"),
          rolling_3y_sharpe: lastVal(rm, "rolling_sharpe_3y"),
          // Predicted risk — use volatility as proxy
          total_predicted_risk: asNum(pnl.volatility_pct),
          idio_predicted_risk: undefined,
          factor_predicted_risk: undefined,
          market_predicted_risk: undefined,
          style_predicted_risk: undefined,
          industry_predicted_risk: undefined,
          // Risk contributions — no data
          idio_risk_contrib: undefined,
          factor_risk_contrib: undefined,
          market_risk_contrib: undefined,
          style_risk_contrib: undefined,
          industry_risk_contrib: undefined,
          // Valuation
          pe: lastVal(vts, "pe"),
          pb: lastVal(vts, "pb"),
          roe: asNum(pnl.roe_pct),
          // Benchmark metrics
          benchmark_metrics: {
            total_return: asNum(pnl.benchmark_total_return_pct),
            annualised_return: asNum(pnl.benchmark_cagr_pct),
            volatility: undefined,
          },
        };
        setPerfCache((prev) => ({ ...prev, [id]: data }));
      }
    } catch { /* skip */ }
    setLoadingPerf((prev) => { const n = new Set(prev); n.delete(id); return n; });
  }, [token, perfCache]);

  useEffect(() => {
    comparedIds.forEach((id) => { if (!perfCache[id]) fetchPerf(id); });
  }, [comparedIds, fetchPerf, perfCache]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const comparedPerf = useMemo(() => {
    const result: PerfMetrics[] = [];
    if (selectedPortfolioId && perfCache[selectedPortfolioId] && comparedIds.has(selectedPortfolioId)) {
      result.push(perfCache[selectedPortfolioId]);
    }
    comparedIds.forEach((id) => {
      if (id !== selectedPortfolioId && perfCache[id]) result.push(perfCache[id]);
    });
    return result;
  }, [comparedIds, perfCache, selectedPortfolioId]);

  const selectedPerf = selectedPortfolioId ? perfCache[selectedPortfolioId] : null;
  const benchmarkMetrics = selectedPerf?.benchmark_metrics;
  const benchmarkName = selectedPerf?.benchmark;

  // ── Actions ───────────────────────────────────────────────────────────────
  function togglePortfolio(id: number) {
    setComparedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
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

  function toggleRow(key: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const addablePortfolios = availablePortfolios.filter((p) => !comparedIds.has(p.id));

  // ── Bar chart data builders ───────────────────────────────────────────────
  function buildBarData(kpi: string) {
    return comparedPerf.map((p) => ({
      name: p.fund_name.length > 14 ? p.fund_name.slice(0, 14) + "…" : p.fund_name,
      value: (p as unknown as Record<string, number | undefined>)[kpi] ?? 0,
    }));
  }

  const returnBarData = buildBarData(returnKpi);
  if (includeBenchmark && benchmarkMetrics && benchmarkName && returnKpi === "total_return" && benchmarkMetrics.total_return != null) {
    returnBarData.push({ name: benchmarkName, value: benchmarkMetrics.total_return });
  }

  const riskBarData = buildBarData(riskKpi);
  if (includeBenchmark && benchmarkMetrics && benchmarkName && riskKpi === "volatility" && benchmarkMetrics.volatility != null) {
    riskBarData.push({ name: benchmarkName, value: benchmarkMetrics.volatility });
  }

  const valuationBarData = buildBarData(valuationKpi);

  if (!selectedPortfolioId) {
    return <AnalyticsEmptyState title="Peer Comparison" />;
  }

  const anyLoading = loading || loadingPerf.size > 0;

  // ── Table rendering helper ────────────────────────────────────────────────
  function renderTableRows(showBenchmark: boolean) {
    return TABLE_SECTIONS.map((section) => (
      <React.Fragment key={section.title}>
        {/* Section header */}
        <tr className="bg-muted/30">
          <td
            className="px-3 py-1.5 font-bold text-foreground sticky left-0 bg-muted/30 z-10"
            colSpan={1 + comparedPerf.length + (showBenchmark && benchmarkMetrics ? 1 : 0)}
          >
            {section.title}
          </td>
        </tr>
        {/* Rows */}
        {section.rows.map((row) => {
          const hasChildren = row.children && row.children.length > 0;
          const isExpanded = expandedRows.has(row.key);
          const vals = comparedPerf
            .map((p) => (p as unknown as Record<string, number | undefined>)[row.key])
            .filter((v): v is number => v != null);
          const isHigherBetter = row.key !== "volatility" && row.key !== "max_drawdown";
          const bestVal = vals.length > 0 && comparedPerf.length > 1 ? (isHigherBetter ? Math.max(...vals) : Math.min(...vals)) : null;

          return (
            <React.Fragment key={row.key}>
              <tr className="border-b border-border/30 hover:bg-muted/10">
                <td className="px-3 py-1.5 text-muted-foreground sticky left-0 bg-card z-10">
                  <span className="flex items-center gap-1">
                    {hasChildren && (
                      <button onClick={() => toggleRow(row.key)} className="opacity-60 hover:opacity-100">
                        {isExpanded
                          ? <ChevronDown className="h-3 w-3" />
                          : <ChevronRight className="h-3 w-3" />}
                      </button>
                    )}
                    {!hasChildren && <span className="w-3" />}
                    {row.label}
                  </span>
                </td>
                {comparedPerf.map((p) => {
                  const val = (p as unknown as Record<string, number | undefined>)[row.key];
                  const formatted = row.format(val ?? null);
                  const isNeg = typeof formatted === "string" && formatted.startsWith("-");
                  const isBest = val != null && bestVal != null && val === bestVal;
                  return (
                    <td
                      key={p.portfolio_id}
                      className={`px-3 py-1.5 text-right tabular-nums font-medium ${isNeg ? "text-red-400" : ""} ${isBest ? "bg-emerald-500/10" : ""}`}
                    >
                      {formatted}
                      {isBest && <span className="text-[7px] text-emerald-400 ml-1">best</span>}
                    </td>
                  );
                })}
                {showBenchmark && benchmarkMetrics && (
                  <td className="px-3 py-1.5 text-right tabular-nums text-blue-400/80">
                    {(["num_holdings", "total_aum_cr", "trading_days", "_exec_summary", "_port_conc"].includes(row.key))
                      ? "—"
                      : row.format((benchmarkMetrics as unknown as Record<string, number>)[row.key] ?? null)}
                  </td>
                )}
              </tr>
              {/* Children rows */}
              {hasChildren && isExpanded && row.children!.map((child) => {
                const childVals = comparedPerf
                  .map((p) => (p as unknown as Record<string, number | undefined>)[child.key])
                  .filter((v): v is number => v != null);
                const childBest = childVals.length > 0 && comparedPerf.length > 1 ? Math.max(...childVals) : null;
                return (
                  <tr key={child.key} className="border-b border-border/20 hover:bg-muted/5">
                    <td className="pl-9 pr-3 py-1 text-muted-foreground/70 sticky left-0 bg-card z-10 text-[9px]">
                      └ {child.label}
                    </td>
                    {comparedPerf.map((p) => {
                      const val = (p as unknown as Record<string, number | undefined>)[child.key];
                      const formatted = child.format(val ?? null);
                      const isNeg = typeof formatted === "string" && formatted.startsWith("-");
                      const isBest = val != null && childBest != null && val === childBest;
                      return (
                        <td
                          key={p.portfolio_id}
                          className={`px-3 py-1 text-right tabular-nums text-[9px] ${isNeg ? "text-red-400" : "text-muted-foreground/70"} ${isBest ? "bg-emerald-500/10" : ""}`}
                        >
                          {formatted}
                        </td>
                      );
                    })}
                    {showBenchmark && benchmarkMetrics && (
                      <td className="px-3 py-1 text-right tabular-nums text-blue-400/60 text-[9px]">—</td>
                    )}
                  </tr>
                );
              })}
            </React.Fragment>
          );
        })}
      </React.Fragment>
    ));
  }

  // ── Render ────────────────────────────────────────────────────────────────
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
                <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
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
          {/* ── Comparison Table (3 sections) ─────────────────────── */}
          <Card>
            <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
              <CardTitle className="text-[11px]">Side-by-Side Comparison</CardTitle>
              <CardControls
                title="Side-by-Side Comparison"
                info="Compare metrics across multiple portfolios and benchmark. Green highlight = best in class. Click the chevron to expand a row's sub-metrics."
                expandContent={
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
                        {/* Legacy flat metrics in expand view */}
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
                }
              />
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
                    {renderTableRows(includeBenchmark)}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* ── Charts (3 independent KPI dropdowns) ──────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Chart 1 — Return */}
            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between gap-2">
                <CardTitle className="text-[11px] shrink-0">Return</CardTitle>
                <KpiSelect<ReturnKpi>
                  value={returnKpi}
                  onChange={setReturnKpi}
                  options={RETURN_KPI_LABELS}
                />
                <CardControls
                  filename="return_comparison"
                  title={RETURN_KPI_LABELS[returnKpi]}
                  info="Return KPI comparison across all selected portfolios."
                  fullscreen
                  expandContent={<BarChartPanel data={returnBarData} height={600} />}
                />
              </CardHeader>
              <CardContent className="p-2">
                <BarChartPanel data={returnBarData} height={200} />
              </CardContent>
            </Card>

            {/* Chart 2 — Risk */}
            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between gap-2">
                <CardTitle className="text-[11px] shrink-0">Risk</CardTitle>
                <KpiSelect<RiskKpi>
                  value={riskKpi}
                  onChange={setRiskKpi}
                  options={RISK_KPI_LABELS}
                />
                <CardControls
                  filename="risk_comparison"
                  title={RISK_KPI_LABELS[riskKpi]}
                  info="Risk KPI comparison across all selected portfolios."
                  fullscreen
                  expandContent={<BarChartPanel data={riskBarData} height={600} />}
                />
              </CardHeader>
              <CardContent className="p-2">
                <BarChartPanel data={riskBarData} height={200} />
              </CardContent>
            </Card>

            {/* Chart 3 — Valuation */}
            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between gap-2">
                <CardTitle className="text-[11px] shrink-0">Valuation</CardTitle>
                <KpiSelect<ValuationKpi>
                  value={valuationKpi}
                  onChange={setValuationKpi}
                  options={VALUATION_KPI_LABELS}
                />
                <CardControls
                  filename="valuation_comparison"
                  title={VALUATION_KPI_LABELS[valuationKpi]}
                  info="Valuation KPI comparison across all selected portfolios."
                  fullscreen
                  expandContent={<BarChartPanel data={valuationBarData} height={600} />}
                />
              </CardHeader>
              <CardContent className="p-2">
                <BarChartPanel data={valuationBarData} height={200} />
              </CardContent>
            </Card>
          </div>

          {/* ── Rankings ──────────────────────────────────────────── */}
          {comparedPerf.length > 1 && (
            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                <CardTitle className="text-[11px]">Rankings by Total Return</CardTitle>
                <CardControls
                  title="Rankings by Total Return"
                  info="Portfolios ranked by total return with key risk and return metrics."
                  expandContent={
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
                  }
                />
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
