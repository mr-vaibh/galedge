"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { CardControls } from "@/components/CardControls";
import { usePortfolio } from "@/lib/portfolio-context";
import { AnalyticsTreeTable, type TreeRow, type TreeColumn } from "@/components/analytics/AnalyticsTreeTable";
import { ViewToggle, type AnalyticsView } from "@/components/analytics/ViewToggle";
import { AnalyticsEmptyState } from "@/components/analytics/AnalyticsEmptyState";

// --- Pure SVG stacked bar chart (no recharts — avoids Safari WebKit renderer crash) ---

const SERIES = [
  { key: "market",   name: "Market",        color: "#3b82f6" },
  { key: "style",    name: "Style",         color: "#a855f7" },
  { key: "industry", name: "Industry",      color: "#10b981" },
  { key: "idio",     name: "Idiosyncratic", color: "#f97316" },
] as const;

type SeriesKey = "market" | "style" | "industry" | "idio";

interface BarDatum { period: string; market: number; style: number; industry: number; idio: number; }

function StackedBarChart({ data, width, height = 220 }: { data: BarDatum[]; width: number; height?: number }) {
  const ML = 46, MR = 10, MT = 8, MB = 28;
  const iW = width - ML - MR;
  const iH = height - MT - MB;

  let maxVal = 0, minVal = 0;
  data.forEach(d => {
    let pos = 0, neg = 0;
    SERIES.forEach(s => { const v = d[s.key]; if (v > 0) pos += v; else neg += v; });
    if (pos > maxVal) maxVal = pos;
    if (neg < minVal) minVal = neg;
  });

  const range = (maxVal - minVal) || 1;
  const rawStep = range / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(rawStep, 1e-9))));
  const step = Math.ceil(rawStep / mag) * mag || 1;
  const yMin = Math.floor(minVal / step) * step;
  const yMax = Math.ceil(maxVal / step) * step;
  const yRange = (yMax - yMin) || 1;

  const yTicks: number[] = [];
  for (let t = yMin; t <= yMax + 1e-9; t = Math.round((t + step) * 1e9) / 1e9) yTicks.push(t);

  const toY = (v: number) => MT + iH * (1 - (v - yMin) / yRange);
  const zeroY = toY(0);
  const barStep = iW / (data.length || 1);
  const barW = Math.max(3, barStep * 0.65);

  return (
    <svg width={width} height={height} style={{ display: "block", overflow: "visible" }}>
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={ML} x2={ML + iW} y1={toY(t)} y2={toY(t)} stroke="#27272a" strokeDasharray="3 3" />
          <text x={ML - 4} y={toY(t)} textAnchor="end" dominantBaseline="middle" fontSize={9} fill="#71717a">
            {`${t % 1 === 0 ? t.toFixed(0) : t.toFixed(1)}%`}
          </text>
        </g>
      ))}
      <line x1={ML} x2={ML + iW} y1={zeroY} y2={zeroY} stroke="#52525b" strokeWidth={1.5} />
      {data.map((d, i) => {
        const cx = ML + i * barStep + barStep / 2;
        const x = cx - barW / 2;
        let posOff = 0, negOff = 0;
        return (
          <g key={d.period}>
            {SERIES.map(s => {
              const v = d[s.key];
              if (!v) return null;
              let y: number, h: number;
              if (v > 0) { y = toY(posOff + v); h = toY(posOff) - y; posOff += v; }
              else        { y = toY(negOff);     h = toY(negOff + v) - y; negOff += v; }
              return <rect key={s.key} x={x} y={y} width={barW} height={Math.max(1, h)} fill={s.color} />;
            })}
            <text x={cx} y={height - MB + 12} textAnchor="middle" fontSize={9} fill="#71717a">{d.period}</text>
          </g>
        );
      })}
    </svg>
  );
}

// --- Pure SVG multi-series line chart (no recharts) ---

interface LineDatum { date: string; [key: string]: number | string; }
interface LineSeries { key: string; name: string; color: string; }

function SVGLineChart({
  data,
  series,
  width,
  height = 220,
  yLabel = "%",
}: {
  data: LineDatum[];
  series: LineSeries[];
  width: number;
  height?: number;
  yLabel?: string;
}) {
  const ML = 46, MR = 10, MT = 8, MB = 28;
  const iW = width - ML - MR;
  const iH = height - MT - MB;

  if (!data.length || !series.length) {
    return (
      <svg width={width} height={height} style={{ display: "block" }}>
        <text x={width / 2} y={height / 2} textAnchor="middle" fontSize={11} fill="#71717a">No data</text>
      </svg>
    );
  }

  // Compute y-axis bounds across all series
  let maxVal = -Infinity, minVal = Infinity;
  data.forEach(d => {
    series.forEach(s => {
      const v = Number(d[s.key]);
      if (isFinite(v)) { if (v > maxVal) maxVal = v; if (v < minVal) minVal = v; }
    });
  });
  if (!isFinite(maxVal)) { maxVal = 1; minVal = 0; }
  if (maxVal === minVal) { maxVal += 1; minVal -= 0; }

  const range = maxVal - minVal || 1;
  const rawStep = range / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(rawStep, 1e-9))));
  const step = Math.ceil(rawStep / mag) * mag || 1;
  const yMin = Math.floor(minVal / step) * step;
  const yMax = Math.ceil(maxVal / step) * step;
  const yRange = (yMax - yMin) || 1;

  const yTicks: number[] = [];
  for (let t = yMin; t <= yMax + 1e-9; t = Math.round((t + step) * 1e9) / 1e9) yTicks.push(t);

  const toY = (v: number) => MT + iH * (1 - (v - yMin) / yRange);
  const toX = (i: number) => ML + (i / Math.max(data.length - 1, 1)) * iW;

  // X-axis: show ~6 labels evenly
  const xTickStep = Math.max(1, Math.floor(data.length / 6));
  const xTicks = data.map((d, i) => ({ i, label: String(d.date).slice(0, 10) })).filter((_, i) => i % xTickStep === 0);

  return (
    <svg width={width} height={height} style={{ display: "block", overflow: "visible" }}>
      {/* Grid lines */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={ML} x2={ML + iW} y1={toY(t)} y2={toY(t)} stroke="#27272a" strokeDasharray="3 3" />
          <text x={ML - 4} y={toY(t)} textAnchor="end" dominantBaseline="middle" fontSize={9} fill="#71717a">
            {`${t % 1 === 0 ? t.toFixed(0) : t.toFixed(1)}${yLabel}`}
          </text>
        </g>
      ))}
      {/* Zero line if in range */}
      {yMin <= 0 && yMax >= 0 && (
        <line x1={ML} x2={ML + iW} y1={toY(0)} y2={toY(0)} stroke="#52525b" strokeWidth={1.5} />
      )}
      {/* X labels */}
      {xTicks.map(({ i, label }) => (
        <text key={i} x={toX(i)} y={height - MB + 12} textAnchor="middle" fontSize={9} fill="#71717a">{label}</text>
      ))}
      {/* Lines */}
      {series.map(s => {
        const points = data.map((d, i) => {
          const v = Number(d[s.key]);
          return isFinite(v) ? `${toX(i)},${toY(v)}` : null;
        });
        // Build path segments (skip nulls)
        const segments: string[] = [];
        let seg = "";
        points.forEach((pt, i) => {
          if (pt == null) { if (seg) { segments.push(seg); seg = ""; } return; }
          seg += (seg ? " L" : "M") + pt;
          if (i === points.length - 1 && seg) segments.push(seg);
        });
        return (
          <g key={s.key}>
            {segments.map((d, si) => (
              <path key={si} d={d} fill="none" stroke={s.color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// --- Rolling vol helper (mirrors performance page) ---

type Pt = Record<string, unknown>;

function rollingVolOf(ts: Pt[], key: string, window = 60): number[] {
  const vals = ts.map(p => Number(p[key] ?? 0));
  const result: number[] = new Array(ts.length).fill(NaN);
  for (let i = window - 1; i < ts.length; i++) {
    const slice = vals.slice(i - window + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / window;
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / (window - 1);
    result[i] = Math.sqrt(variance * 252) * 100;
  }
  return result;
}

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

/** Returns a per-period value map for a given backend key */
function makeRow(periods: Record<string, unknown>[], key: string): Record<string, number | null> {
  return Object.fromEntries(periods.map(p => [String(p.period ?? p.label ?? "?"), safeNum(p[key])]));
}

/** Returns a map where every period has null (data not available from backend) */
function nullRow(periods: Record<string, unknown>[]): Record<string, number | null> {
  return Object.fromEntries(periods.map(p => [String(p.period ?? p.label ?? "?"), null]));
}

function buildPnLRows(periods: Record<string, unknown>[]): TreeRow[] {
  const row = (key: string) => makeRow(periods, key);
  const nul = () => nullRow(periods);

  return [
    {
      id: "tr", label: "Total Return (%)", values: row("total_return_pct"),
      children: [
        { id: "idio_ret",   label: "Idiosyncratic Return", values: row("idio_return_pct") },
        { id: "factor_ret", label: "Factor Return",        values: row("factor_return_pct") },
        { id: "div_ret",    label: "Dividend Return",      values: nul() },
        { id: "other_ret",  label: "Other Return",         values: nul() },
        { id: "txn_ret",    label: "Transaction Cost",     values: nul() },
      ],
    },
    {
      id: "cagr", label: "CAGR (%)", values: row("cagr_pct"),
      children: [
        { id: "idio_cagr",   label: "Idiosyncratic CAGR", values: nul() },
        { id: "factor_cagr", label: "Factor CAGR",        values: nul() },
        { id: "div_cagr",    label: "Dividend CAGR",      values: nul() },
        { id: "other_cagr",  label: "Other CAGR",         values: nul() },
        { id: "txn_cagr",    label: "Transaction Cost CAGR", values: nul() },
      ],
    },
    {
      id: "sharpe", label: "Sharpe Ratio", values: row("sharpe"),
      children: [
        { id: "idio_sharpe",   label: "Idiosyncratic Sharpe Ratio", values: nul() },
        { id: "factor_sharpe", label: "Factor Sharpe Ratio",        values: nul() },
      ],
    },
    {
      id: "sortino", label: "Sortino Ratio", values: row("sortino"),
      children: [
        { id: "idio_sortino",   label: "Idiosyncratic Sortino Ratio", values: nul() },
        { id: "factor_sortino", label: "Factor Sortino Ratio",        values: nul() },
      ],
    },
    { id: "treynor", label: "Treynor Ratio", values: nul() },
    {
      id: "exec_summary", label: "Execution Summary", values: nul(),
      children: [
        { id: "ann_turnover", label: "Annualized Turnover",        values: nul() },
        { id: "total_txn",    label: "Total Transaction Cost (bps)", values: nul() },
      ],
    },
  ];
}

function buildRiskRows(periods: Record<string, unknown>[]): TreeRow[] {
  const row = (key: string) => makeRow(periods, key);
  const nul = () => nullRow(periods);

  return [
    { id: "beta", label: "Beta", values: row("beta") },
    {
      id: "realized_risk", label: "Realized Risk (%)", values: row("volatility_pct"),
      children: [
        { id: "idio_real_risk",   label: "Idiosyncratic Realized Risk (%)", values: nul() },
        { id: "factor_real_risk", label: "Factor Realized Risk (%)",        values: nul() },
      ],
    },
    {
      id: "pred_risk", label: "Total Predicted Risk (%)", values: nul(),
      children: [
        { id: "idio_pred_risk",   label: "Idiosyncratic Predicted Risk (%)", values: nul() },
        { id: "factor_pred_risk", label: "Factor Predicted Risk (%)",        values: nul() },
      ],
    },
    {
      id: "risk_contrib", label: "Risk Contribution (%)", values: nul(),
      children: [
        { id: "idio_rc",   label: "Idiosyncratic Risk Contribution (%)", values: nul() },
        { id: "factor_rc", label: "Factor Risk Contribution (%)",        values: nul() },
      ],
    },
    {
      id: "concentration", label: "Portfolio Concentration", values: nul(),
      children: [
        { id: "top_holdings",    label: "Top Holdings (%)",                      values: nul() },
        { id: "top_total_rc",    label: "Top Total Risk Contribution (%)",        values: nul() },
        { id: "top_idio_rc",     label: "Top Idiosyncratic Risk Contribution (%)", values: nul() },
        { id: "top_factor_rc",   label: "Top Factor Risk Contribution (%)",       values: nul() },
      ],
    },
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

// Chart KPI options for the chart section
const CHART_KPI_OPTIONS = [
  { key: "return_decomp", label: "Return Decomposition (%)" },
  { key: "risk_contrib",  label: "Risk Contribution (%)" },
] as const;
type ChartKpi = typeof CHART_KPI_OPTIONS[number]["key"];

// Risk contribution series (rolling vol of each factor stream)
const RISK_SERIES: LineSeries[] = [
  { key: "market",   name: "Market",        color: "#3b82f6" },
  { key: "style",    name: "Style",         color: "#a855f7" },
  { key: "industry", name: "Industry",      color: "#10b981" },
  { key: "idio",     name: "Idiosyncratic", color: "#f97316" },
];

export default function PeriodAnalysisPage() {
  const { analyticsData, analyticsLoading, analyticsError, selectedSourceId } = usePortfolio();
  const [gran,     setGran]     = useState<Granularity>("annual");
  const [view,     setView]     = useState<AnalyticsView>("Main");
  const [statKpi,  setStatKpi]  = useState("total_return_pct");
  const [chartKpi, setChartKpi] = useState<ChartKpi>("return_decomp");
  const [chartWidth, setChartWidth] = useState(0);
  const containerElRef = useRef<HTMLDivElement | null>(null);
  const chartContainerRef = useCallback((el: HTMLDivElement | null) => {
    containerElRef.current = el;
    if (el) setChartWidth(el.offsetWidth);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (containerElRef.current) setChartWidth(containerElRef.current.offsetWidth);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  // Risk contribution line chart data — rolling vol of factor_decomp_ts streams
  const riskLineData = useMemo((): LineDatum[] => {
    if (!analyticsData) return [];
    const fdt = ((analyticsData as Record<string, unknown>).factor_decomp_ts as Pt[] | undefined) ?? [];
    if (!fdt.length) return [];
    const mkVol  = rollingVolOf(fdt, "market");
    const styVol = rollingVolOf(fdt, "style");
    const indVol = rollingVolOf(fdt, "industry");
    const idioVol = rollingVolOf(fdt, "idio");
    return fdt.map((p, i) => ({
      date:     String(p.date ?? ""),
      market:   isFinite(mkVol[i])   ? Math.round(mkVol[i]   * 10000) / 10000 : NaN,
      style:    isFinite(styVol[i])  ? Math.round(styVol[i]  * 10000) / 10000 : NaN,
      industry: isFinite(indVol[i])  ? Math.round(indVol[i]  * 10000) / 10000 : NaN,
      idio:     isFinite(idioVol[i]) ? Math.round(idioVol[i] * 10000) / 10000 : NaN,
    })).filter(d => d.date);
  }, [analyticsData]);

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

  const statKpiLabel  = STAT_KPI_OPTIONS.find(o => o.key === statKpi)?.label ?? "";
  const chartKpiLabel = CHART_KPI_OPTIONS.find(o => o.key === chartKpi)?.label ?? "";

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
              <CardTitle className="text-[11px]">{chartKpiLabel}</CardTitle>
              <div className="flex items-center gap-2">
                <select
                  value={chartKpi}
                  onChange={e => setChartKpi(e.target.value as ChartKpi)}
                  className="text-[9px] bg-background border border-border rounded px-1.5 py-0.5 text-foreground focus:outline-none"
                >
                  {CHART_KPI_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
                <CardControls />
              </div>
            </CardHeader>
            <CardContent className="p-2">
              <div ref={chartContainerRef} style={{ width: "100%" }}>
                {chartWidth > 0 && chartKpi === "return_decomp" && (
                  <StackedBarChart data={chartData} width={chartWidth} height={220} />
                )}
                {chartWidth > 0 && chartKpi === "risk_contrib" && (
                  <SVGLineChart
                    data={riskLineData}
                    series={RISK_SERIES}
                    width={chartWidth}
                    height={220}
                    yLabel="%"
                  />
                )}
              </div>
              <div className="flex items-center gap-4 flex-wrap justify-center mt-2">
                {SERIES.map(s => (
                  <div key={s.key} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-[10px] text-muted-foreground">{s.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
