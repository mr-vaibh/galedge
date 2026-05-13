"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BarChart3 } from "lucide-react";
import { CardControls } from "@/components/CardControls";
import { usePortfolio } from "@/lib/portfolio-context";
import { AnalyticsTreeTable, type TreeRow, type TreeColumn } from "@/components/analytics/AnalyticsTreeTable";
import { ViewToggle, type AnalyticsView } from "@/components/analytics/ViewToggle";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer,
} from "recharts";

type Granularity = "annual" | "quarterly" | "monthly";

function getPeriodData(data: Record<string, unknown>, gran: Granularity) {
  const key = gran === "annual" ? "period_stats_annual"
    : gran === "quarterly" ? "period_stats_quarterly"
    : "period_stats_monthly";
  return (data[key] as Record<string, unknown>[] | undefined) ?? [];
}

function pct75(arr: number[]) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length * 0.75)] ?? null;
}
function pct25(arr: number[]) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length * 0.25)] ?? null;
}
function median(arr: number[]) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : ((s[m - 1] + s[m]) / 2);
}

// Build the P&L tree table rows with periods as columns
function buildPnLRows(periods: Record<string, unknown>[]): TreeRow[] {
  const vals = (key: string) =>
    Object.fromEntries(periods.map(p => [String(p.period ?? p.label ?? "?"), p[key] as number | null ?? null]));

  return [
    {
      id: "tr", label: "Total Return (%)",
      values: vals("total_return_pct"),
      children: [
        { id: "idio_ret",   label: "Idiosyncratic Return (%)", values: vals("idio_return_pct") },
        { id: "factor_ret", label: "Factor Return (%)",        values: vals("factor_return_pct"),
          children: [
            { id: "mkt_ret", label: "Market Return (%)",   values: vals("market_return_pct") },
            { id: "sty_ret", label: "Style Return (%)",    values: vals("style_return_pct") },
            { id: "ind_ret", label: "Industry Return (%)", values: vals("industry_return_pct") },
          ]
        },
      ],
    },
    { id: "cagr",    label: "CAGR (%)",       values: vals("cagr_pct") },
    { id: "sharpe",  label: "Sharpe Ratio",   values: vals("sharpe") },
    { id: "sortino", label: "Sortino Ratio",  values: vals("sortino") },
  ];
}

function buildRiskRows(periods: Record<string, unknown>[]): TreeRow[] {
  const vals = (key: string) =>
    Object.fromEntries(periods.map(p => [String(p.period ?? p.label ?? "?"), p[key] as number | null ?? null]));
  return [
    { id: "vol",   label: "Volatility (%)",   values: vals("volatility_pct") },
    { id: "beta",  label: "Beta",             values: vals("beta") },
  ];
}

// P&L Statistics (3rd table) — computed across periods
function buildStatRows(periods: Record<string, unknown>[], kpiKey: string): TreeRow[] {
  const returns = periods.map(p => Number(p[kpiKey] ?? 0)).filter(v => isFinite(v));
  if (!returns.length) return [];
  const pos = returns.filter(v => v > 0).length;
  const neg = returns.filter(v => v < 0).length;
  const total = returns.length;
  const avg = returns.reduce((s, v) => s + v, 0) / total;
  const med = median(returns);
  const p25 = pct25(returns);
  const p75 = pct75(returns);

  return [
    {
      id: "hitrate", label: "Hit Rate (%)",
      values: { Active: total > 0 ? Math.round((pos / total) * 10000) / 100 : null },
      children: [
        { id: "pos",   label: "Positive Periods Count", values: { Active: pos } },
        { id: "neg",   label: "Negative Periods Count", values: { Active: neg } },
        { id: "total", label: "Total Periods",           values: { Active: total } },
      ],
    },
    { id: "max",    label: "Max Period Return",               values: { Active: Math.max(...returns) } },
    { id: "min",    label: "Min Period Return",               values: { Active: Math.min(...returns) } },
    { id: "avg",    label: "Average Return Across Periods",   values: { Active: Math.round(avg * 100) / 100 } },
    { id: "median", label: "Median Return Across Periods",    values: { Active: med } },
    { id: "p25",    label: "25th Percentile Return",          values: { Active: p25 } },
    { id: "p75",    label: "75th Percentile Return",          values: { Active: p75 } },
  ];
}

const RETURN_KPI_OPTIONS = [
  { key: "total_return_pct",    label: "Total Return (%)" },
  { key: "idio_return_pct",     label: "Idiosyncratic Return (%)" },
  { key: "factor_return_pct",   label: "Factor Return (%)" },
  { key: "market_return_pct",   label: "Market Return (%)" },
  { key: "style_return_pct",    label: "Style Return (%)" },
  { key: "industry_return_pct", label: "Industry Return (%)" },
];

export default function PeriodAnalysisPage() {
  const { analyticsData, analyticsLoading, selectedSourceId } = usePortfolio();
  const [gran, setGran] = useState<Granularity>("annual");
  const [view, setView] = useState<AnalyticsView>("Main");
  const [statKpi, setStatKpi] = useState("total_return_pct");

  // ALL hooks MUST be before any conditional returns
  const periods = useMemo(
    () => analyticsData ? getPeriodData(analyticsData as Record<string, unknown>, gran) : [],
    [analyticsData, gran]
  );
  const pnlRows  = useMemo(() => buildPnLRows(periods),         [periods]);
  const riskRows = useMemo(() => buildRiskRows(periods),        [periods]);
  const statRows = useMemo(() => buildStatRows(periods, statKpi),[periods, statKpi]);
  const periodCols: TreeColumn[] = useMemo(() => periods.map(p => ({
    key: String(p.period ?? p.label ?? "?"),
    label: String(p.period ?? p.label ?? "?"),
    align: "right" as const,
  })), [periods]);
  const statCols: TreeColumn[] = [{ key: "Active", label: "Active", align: "right" }];
  const chartData = useMemo(() => periods.map(p => ({
    period: String(p.period ?? p.label),
    market: Number(p.market_return_pct ?? 0),
    style:  Number(p.style_return_pct  ?? 0),
    industry: Number(p.industry_return_pct ?? 0),
    idio:   Number(p.idio_return_pct   ?? 0),
  })), [periods]);

  if (analyticsLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /><span className="ml-2 text-sm text-muted-foreground">Computing analytics...</span></div>;
  if (!analyticsData || !selectedSourceId) return (
    <div className="p-6 space-y-4"><h1 className="text-xl font-bold">Period Analysis</h1>
      <div className="rounded-lg border bg-card p-12 text-center"><BarChart3 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">Select a portfolio or strategy from the sidebar to begin</p></div>
    </div>
  );

  const hasBenchmark = false;


  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Period Analysis</h1>
          <p className="text-xs text-muted-foreground">Calendar year breakdown</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5 bg-muted/30 rounded-lg p-0.5 border border-border/40">
            {(["annual","quarterly","monthly"] as Granularity[]).map(g => (
              <button key={g} onClick={() => setGran(g)}
                className={`px-2 py-1 text-[10px] font-medium rounded-md capitalize transition-all ${gran === g ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {g}
              </button>
            ))}
          </div>
          <ViewToggle view={view} onChange={setView} hasBenchmark={hasBenchmark} />
        </div>
      </div>

      {periods.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">No period data available</div>
      ) : (
        <>
          {/* P&L + Risk tree tables with period columns */}
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

          {/* P&L Statistics table */}
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">P&L Statistics</h2>
            <select
              value={statKpi}
              onChange={e => setStatKpi(e.target.value)}
              className="text-[9px] bg-background border border-border rounded px-1.5 py-0.5 text-foreground focus:outline-none ml-auto"
            >
              {RETURN_KPI_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
          <AnalyticsTreeTable
            title={`Profit & Loss Statistics — ${RETURN_KPI_OPTIONS.find(o => o.key === statKpi)?.label ?? ""}`}
            columns={statCols}
            rows={statRows}
            defaultExpanded={new Set(["hitrate"])}
          />

          {/* Return decomposition chart */}
          <Card>
            <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
              <CardTitle className="text-[11px]">Return Decomposition (%)</CardTitle>
              <CardControls />
            </CardHeader>
            <CardContent className="p-2">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: "#71717a" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#71717a" }} tickLine={false} width={40} tickFormatter={v => `${v}%`} />
                  <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }} formatter={(v: unknown) => [`${Number(v).toFixed(2)}%`]} />
                  <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="market"   name="Market"        fill="#3b82f6" stackId="a" />
                  <Bar dataKey="style"    name="Style"         fill="#a855f7" stackId="a" />
                  <Bar dataKey="industry" name="Industry"      fill="#10b981" stackId="a" />
                  <Bar dataKey="idio"     name="Idiosyncratic" fill="#f97316" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
