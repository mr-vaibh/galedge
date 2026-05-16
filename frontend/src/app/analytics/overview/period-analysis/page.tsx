"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BarChart3 } from "lucide-react";
import { CardControls } from "@/components/CardControls";
import { usePortfolio } from "@/lib/portfolio-context";
import { AnalyticsTreeTable, type TreeRow, type TreeColumn } from "@/components/analytics/AnalyticsTreeTable";
import { ViewToggle, type AnalyticsView } from "@/components/analytics/ViewToggle";
import { AnalyticsEmptyState } from "@/components/analytics/AnalyticsEmptyState";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from "recharts";

type Granularity = "annual" | "quarterly" | "monthly";

function getPeriodData(data: Record<string, unknown>, gran: Granularity): Record<string, unknown>[] {
  const key = gran === "annual" ? "period_stats_annual"
    : gran === "quarterly" ? "period_stats_quarterly"
    : "period_stats_monthly";
  return (data[key] as Record<string, unknown>[] | undefined) ?? [];
}

function safeNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return isNaN(n) || !isFinite(n) ? null : n;
}

function buildCols(periods: Record<string, unknown>[]): TreeColumn[] {
  return periods.map(p => ({
    key: String(p.period ?? p.label ?? "?"),
    label: String(p.period ?? p.label ?? "?"),
    align: "right" as const,
  }));
}

function buildPnLRows(periods: Record<string, unknown>[]): TreeRow[] {
  const row = (key: string): Record<string, number | null> =>
    Object.fromEntries(periods.map(p => [String(p.period ?? p.label ?? "?"), safeNum(p[key])]));

  return [
    {
      id: "tr", label: "Total Return (%)", values: row("total_return_pct"),
      children: [
        { id: "idio",   label: "Idiosyncratic Return (%)", values: row("idio_return_pct") },
        { id: "factor", label: "Factor Return (%)",        values: row("factor_return_pct"),
          children: [
            { id: "mkt", label: "Market Return (%)",   values: row("market_return_pct") },
            { id: "sty", label: "Style Return (%)",    values: row("style_return_pct") },
            { id: "ind", label: "Industry Return (%)", values: row("industry_return_pct") },
          ]
        },
      ],
    },
    { id: "cagr",    label: "CAGR (%)",      values: row("cagr_pct") },
    { id: "sharpe",  label: "Sharpe Ratio",  values: row("sharpe") },
    { id: "sortino", label: "Sortino Ratio", values: row("sortino") },
  ];
}

function buildRiskRows(periods: Record<string, unknown>[]): TreeRow[] {
  const row = (key: string): Record<string, number | null> =>
    Object.fromEntries(periods.map(p => [String(p.period ?? p.label ?? "?"), safeNum(p[key])]));
  return [
    { id: "vol",  label: "Volatility (%)",  values: row("volatility_pct") },
    { id: "beta", label: "Beta",            values: row("beta") },
  ];
}

function buildStatRows(periods: Record<string, unknown>[], kpiKey: string): TreeRow[] {
  const nums = periods.map(p => safeNum(p[kpiKey])).filter((v): v is number => v != null);
  if (!nums.length) return [];
  const sorted = [...nums].sort((a, b) => a - b);
  const total = nums.length;
  const pos   = nums.filter(v => v > 0).length;
  const neg   = nums.filter(v => v < 0).length;
  const avg   = nums.reduce((s, v) => s + v, 0) / total;
  const med   = total % 2 ? sorted[Math.floor(total / 2)] : (sorted[total / 2 - 1] + sorted[total / 2]) / 2;
  const p25   = sorted[Math.floor(total * 0.25)] ?? null;
  const p75   = sorted[Math.floor(total * 0.75)] ?? null;
  const fmt2  = (v: number | null) => v != null ? Math.round(v * 100) / 100 : null;

  return [
    {
      id: "hitrate", label: "Hit Rate (%)",
      values: { Active: fmt2(total > 0 ? (pos / total) * 100 : null) },
      children: [
        { id: "pos_c",   label: "Positive Periods Count", values: { Active: pos } },
        { id: "neg_c",   label: "Negative Periods Count", values: { Active: neg } },
        { id: "total_c", label: "Total Periods",           values: { Active: total } },
      ],
    },
    { id: "max",    label: "Max Period Return",             values: { Active: fmt2(Math.max(...nums)) } },
    { id: "min",    label: "Min Period Return",             values: { Active: fmt2(Math.min(...nums)) } },
    { id: "avg",    label: "Average Return Across Periods", values: { Active: fmt2(avg) } },
    { id: "median", label: "Median Return Across Periods",  values: { Active: fmt2(med) } },
    { id: "p25",    label: "25th Percentile Return",        values: { Active: fmt2(p25) } },
    { id: "p75",    label: "75th Percentile Return",        values: { Active: fmt2(p75) } },
  ];
}

const STAT_KPI_OPTIONS = [
  { key: "total_return_pct",    label: "Total Return (%)" },
  { key: "idio_return_pct",     label: "Idiosyncratic Return (%)" },
  { key: "factor_return_pct",   label: "Factor Return (%)" },
  { key: "market_return_pct",   label: "Market Return (%)" },
  { key: "style_return_pct",    label: "Style Return (%)" },
  { key: "industry_return_pct", label: "Industry Return (%)" },
];

export default function PeriodAnalysisPage() {
  const { analyticsData, analyticsLoading, analyticsError, selectedSourceId } = usePortfolio();
  const [gran,    setGran]    = useState<Granularity>("annual");
  const [view,    setView]    = useState<AnalyticsView>("Main");
  const [statKpi, setStatKpi] = useState("total_return_pct");
  const [mounted, setMounted] = useState(false);
  const [chartWidth, setChartWidth] = useState(0);
  const chartContainerRef = useCallback((el: HTMLDivElement | null) => {
    if (el) setChartWidth(el.offsetWidth);
  }, []);

  useEffect(() => { setMounted(true); }, []);

  const periods    = useMemo(() => analyticsData ? getPeriodData(analyticsData as Record<string, unknown>, gran) : [], [analyticsData, gran]);
  const periodCols = useMemo(() => buildCols(periods),              [periods]);
  const pnlRows    = useMemo(() => buildPnLRows(periods),           [periods]);
  const riskRows   = useMemo(() => buildRiskRows(periods),          [periods]);
  const statRows   = useMemo(() => buildStatRows(periods, statKpi), [periods, statKpi]);
  const chartData  = useMemo(() => periods.map(p => ({
    period:   String(p.period ?? p.label),
    market:   safeNum(p.market_return_pct)   ?? 0,
    style:    safeNum(p.style_return_pct)    ?? 0,
    industry: safeNum(p.industry_return_pct) ?? 0,
    idio:     safeNum(p.idio_return_pct)     ?? 0,
  })), [periods]);

  const statCols: TreeColumn[] = [{ key: "Active", label: "Active", align: "right" }];

  if (analyticsLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <span className="ml-2 text-sm text-muted-foreground">Computing analytics...</span>
    </div>
  );

  if (!analyticsData || !selectedSourceId) {
    return <AnalyticsEmptyState title="Period Analysis" analyticsError={analyticsError} />;
  }

  const statKpiLabel = STAT_KPI_OPTIONS.find(o => o.key === statKpi)?.label ?? "";

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Period Analysis</h1>
          <p className="text-xs text-muted-foreground">Calendar year breakdown</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5 bg-muted/30 rounded-lg p-0.5 border border-border/40">
            {(["annual", "quarterly", "monthly"] as Granularity[]).map(g => (
              <button key={g} onClick={() => setGran(g)}
                className={`px-2 py-1 text-[10px] font-medium rounded-md capitalize transition-all ${gran === g ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {g}
              </button>
            ))}
          </div>
          <ViewToggle view={view} onChange={setView} hasBenchmark={false} />
        </div>
      </div>

      {periods.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          No period data available
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <AnalyticsTreeTable
              title="Profit & Loss Summary"
              columns={periodCols}
              rows={pnlRows}
              defaultExpanded={new Set(["tr"])}
            />
            <AnalyticsTreeTable
              title="Risk Summary"
              columns={periodCols}
              rows={riskRows}
            />
          </div>

          <div className="flex items-center gap-2">
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">P&L Statistics</h2>
            <select value={statKpi} onChange={e => setStatKpi(e.target.value)}
              className="text-[9px] bg-background border border-border rounded px-1.5 py-0.5 text-foreground focus:outline-none ml-auto">
              {STAT_KPI_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
          {statRows.length > 0 && (
            <AnalyticsTreeTable
              title={`Profit & Loss Statistics — ${statKpiLabel}`}
              columns={statCols}
              rows={statRows}
              defaultExpanded={new Set(["hitrate"])}
            />
          )}

          <Card>
            <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
              <CardTitle className="text-[11px]">Return Decomposition (%)</CardTitle>
              <CardControls />
            </CardHeader>
            <CardContent className="p-2">
              <div ref={chartContainerRef} style={{ width: "100%", height: 220 }}>
                {mounted && chartWidth > 0 && (
                  <BarChart width={chartWidth} height={220} data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="period" tick={{ fontSize: 9, fill: "#71717a" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#71717a" }} tickLine={false} width={40} tickFormatter={v => `${v}%`} />
                    <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }}
                      formatter={(v: unknown) => [`${Number(v).toFixed(2)}%`]} />
                    <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="market"   name="Market"        fill="#3b82f6" stackId="a" isAnimationActive={false} />
                    <Bar dataKey="style"    name="Style"         fill="#a855f7" stackId="a" isAnimationActive={false} />
                    <Bar dataKey="industry" name="Industry"      fill="#10b981" stackId="a" isAnimationActive={false} />
                    <Bar dataKey="idio"     name="Idiosyncratic" fill="#f97316" stackId="a" isAnimationActive={false} />
                  </BarChart>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
