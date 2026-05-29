"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { AnalyticsEmptyState } from "@/components/analytics/AnalyticsEmptyState";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { CardControls } from "@/components/CardControls";
import { usePortfolio } from "@/lib/portfolio-context";
import { AnalyticsTreeTable, type TreeRow, type TreeColumn } from "@/components/analytics/AnalyticsTreeTable";

// ---------------------------------------------------------------------------
// KPI group definitions
// ---------------------------------------------------------------------------

const RETURN_KPIS = [
  { value: "decomp",         label: "Return Decomposition (%)" },
  { value: "rolling_return", label: "Rolling Return (%)" },
  { value: "rolling_sharpe", label: "Rolling Sharpe Ratio" },
] as const;
type ReturnKpi = typeof RETURN_KPIS[number]["value"];

const RISK_KPIS = [
  { value: "predicted_risk", label: "Predicted Risk (%)" },
  { value: "risk_contrib",   label: "Risk Contribution (%)" },
  { value: "realized_risk",  label: "Rolling 1Y Realized Risk (%)" },
] as const;
type RiskKpi = typeof RISK_KPIS[number]["value"];

const VALUATION_KPIS = [
  { value: "pe",  label: "P/E Ratio" },
  { value: "pb",  label: "P/B Ratio" },
  { value: "roe", label: "ROE (%)" },
] as const;
type ValuationKpi = typeof VALUATION_KPIS[number]["value"];

const DIMENSION_KPIS = [
  { value: "market_cap", label: "Market Cap" },
  { value: "liquidity",  label: "Liquidity" },
  { value: "total_risk", label: "Total Risk" },
  { value: "idio_risk",  label: "Idiosyncratic Risk" },
  { value: "sector",     label: "Sector" },
  { value: "industry",   label: "Industry" },
] as const;
type DimensionKpi = typeof DIMENSION_KPIS[number]["value"];

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

type Pt = Record<string, unknown>;

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

function KpiSelectGeneric<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly { value: T; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="text-[9px] bg-background border border-border rounded px-1.5 py-0.5 text-foreground focus:outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// Rolling annualized vol of a daily decimal series
function rollingVolOf(ts: Pt[], key: string, window = 60): { date: string; portfolio: number }[] {
  const vals = ts.map((p) => Number(p[key] ?? 0));
  const result: { date: string; portfolio: number }[] = [];
  for (let i = window - 1; i < ts.length; i++) {
    const slice = vals.slice(i - window + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / window;
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / (window - 1);
    result.push({
      date: String(ts[i].date),
      portfolio: Math.round(Math.sqrt(variance * 252) * 1000000) / 10000,
    });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Pure SVG bar chart (no recharts)
// ---------------------------------------------------------------------------

interface SvgBarDatum {
  name: string;
  alloc: number;
  select: number;
  interact: number;
}

function SvgBarChart({ data, height = 200 }: { data: SvgBarDatum[]; height?: number }) {
  if (data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-[10px] text-muted-foreground"
      >
        No data
      </div>
    );
  }

  const marginLeft = 8;
  const marginRight = 8;
  const marginTop = 12;
  const marginBottom = 28;
  const innerW = 100; // percentage units via viewBox
  const innerH = height - marginTop - marginBottom;

  const allVals = data.flatMap((d) => [d.alloc, d.select, d.interact]);
  const maxAbs = Math.max(Math.abs(Math.min(...allVals)), Math.abs(Math.max(...allVals)), 0.01);
  const yRange = maxAbs * 1.2;

  const toY = (v: number) => marginTop + innerH / 2 - (v / yRange) * (innerH / 2);
  const zeroY = toY(0);

  const groupW = (100 - marginLeft - marginRight) / data.length;
  const barPad = groupW * 0.08;
  const barW = (groupW - barPad * 2) / 3;

  const colors = ["#6366f1", "#10b981", "#f97316"];
  const series: (keyof SvgBarDatum)[] = ["alloc", "select", "interact"];
  const seriesLabels = ["Alloc", "Select", "Interact"];

  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height }}
    >
      {/* zero line */}
      <line x1={marginLeft} x2={100 - marginRight} y1={zeroY} y2={zeroY} stroke="rgba(255,255,255,0.1)" strokeWidth={0.3} />

      {data.map((d, gi) => {
        const gx = marginLeft + gi * groupW + barPad;
        const labelX = gx + (groupW - barPad * 2) / 2;
        const labelY = height - marginBottom + 10;
        return (
          <g key={gi}>
            {series.map((sk, si) => {
              const v = d[sk] as number;
              const bx = gx + si * barW;
              const by = v >= 0 ? toY(v) : zeroY;
              const bh = Math.abs(toY(v) - zeroY);
              return (
                <rect
                  key={si}
                  x={bx}
                  y={by}
                  width={barW - 0.4}
                  height={Math.max(bh, 0.3)}
                  fill={colors[si]}
                  rx={0.5}
                />
              );
            })}
            <text x={labelX} y={labelY} textAnchor="middle" fontSize={3.5} fill="#71717a">
              {d.name}
            </text>
          </g>
        );
      })}

      {/* legend */}
      {seriesLabels.map((lbl, i) => (
        <g key={i} transform={`translate(${marginLeft + i * 26}, ${height - 6})`}>
          <rect width={5} height={3} fill={colors[i]} rx={0.5} />
          <text x={6} y={3} fontSize={3} fill="#a1a1aa">{lbl}</text>
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Chart card components (each with its own state)
// ---------------------------------------------------------------------------

function ReturnChartCard({ analyticsData }: { analyticsData: Record<string, unknown> }) {
  const [kpi, setKpi] = useState<ReturnKpi>("decomp");

  const factorTs = (analyticsData.factor_decomp_ts as Pt[] | undefined) ?? [];
  const rm = (analyticsData.rolling_metrics as Pt[] | undefined) ?? [];

  let data: Pt[] = [];
  let series: { key: string; name: string; color: string }[] = [];
  let chartType = "line";

  if (kpi === "decomp") {
    // Cumulative compound daily returns for each factor bucket
    const cumulative: Pt[] = [];
    let mktCum = 1, styCum = 1, indCum = 1, idioCum = 1;
    for (const r of factorTs) {
      mktCum  *= 1 + Number(r.market   ?? 0);
      styCum  *= 1 + Number(r.style    ?? 0);
      indCum  *= 1 + Number(r.industry ?? 0);
      idioCum *= 1 + Number(r.idio     ?? 0);
      cumulative.push({
        date:     r.date,
        market:   Math.round((mktCum  - 1) * 10000) / 100,
        style:    Math.round((styCum  - 1) * 10000) / 100,
        industry: Math.round((indCum  - 1) * 10000) / 100,
        idio:     Math.round((idioCum - 1) * 10000) / 100,
      });
    }
    data = cumulative;
    chartType = "stacked_area";
    series = [
      { key: "market",   name: "Market",   color: "#6366f1" },
      { key: "style",    name: "Style",    color: "#10b981" },
      { key: "industry", name: "Industry", color: "#f97316" },
      { key: "idio",     name: "Idio",     color: "#eab308" },
    ];
  } else if (kpi === "rolling_return") {
    data = rm
      .filter((r) => r.rolling_return_1y != null)
      .map((r) => ({ date: r.date, portfolio: Number(r.rolling_return_1y) }));
    series = [{ key: "portfolio", name: "Rolling Return 1Y (%)", color: "#6366f1" }];
  } else {
    // rolling_sharpe
    data = rm
      .filter((r) => r.rolling_sharpe != null)
      .map((r) => ({ date: r.date, portfolio: Number(r.rolling_sharpe) }));
    series = [{ key: "portfolio", name: "Rolling Sharpe", color: "#10b981" }];
  }

  const label = RETURN_KPIS.find((k) => k.value === kpi)?.label ?? kpi;

  return (
    <Card>
      <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
        <KpiSelectGeneric value={kpi} onChange={setKpi} options={RETURN_KPIS} />
        <CardControls
          fullscreen
          expandContent={
            data.length > 0 ? (
              <TimeSeriesChart data={data} series={series} height={600} />
            ) : undefined
          }
        />
      </CardHeader>
      <CardContent className="p-2">
        {data.length > 0 ? (
          <TimeSeriesChart data={data} series={series} height={180} />
        ) : (
          <div className="h-44 flex items-center justify-center text-[10px] text-muted-foreground">
            No data for {label}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RiskChartCard({ analyticsData }: { analyticsData: Record<string, unknown> }) {
  const [kpi, setKpi] = useState<RiskKpi>("predicted_risk");

  const factorTs = (analyticsData.factor_decomp_ts as Pt[] | undefined) ?? [];
  const rm = (analyticsData.rolling_metrics as Pt[] | undefined) ?? [];

  let data: Pt[] = [];
  let series: { key: string; name: string; color: string }[] = [];

  if (kpi === "predicted_risk") {
    data = rm
      .filter((r) => r.rolling_vol != null)
      .map((r) => ({ date: r.date, portfolio: Number(r.rolling_vol) }));
    series = [{ key: "portfolio", name: "Predicted Risk (%)", color: "#ef4444" }];
  } else if (kpi === "risk_contrib") {
    // Factor total vol from factor_decomp_ts
    const rolled = rollingVolOf(factorTs, "factor_total");
    data = rolled.map((r) => ({ date: r.date, portfolio: r.portfolio }));
    series = [{ key: "portfolio", name: "Factor Risk Contribution (%)", color: "#f97316" }];
  } else {
    // realized_risk
    data = rm
      .filter((r) => r.rolling_vol != null)
      .map((r) => ({ date: r.date, portfolio: Number(r.rolling_vol) }));
    series = [{ key: "portfolio", name: "Rolling 1Y Realized Risk (%)", color: "#ef4444" }];
  }

  const label = RISK_KPIS.find((k) => k.value === kpi)?.label ?? kpi;

  return (
    <Card>
      <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
        <KpiSelectGeneric value={kpi} onChange={setKpi} options={RISK_KPIS} />
        <CardControls
          fullscreen
          expandContent={
            data.length > 0 ? (
              <TimeSeriesChart data={data} series={series} height={600} />
            ) : undefined
          }
        />
      </CardHeader>
      <CardContent className="p-2">
        {data.length > 0 ? (
          <TimeSeriesChart data={data} series={series} height={180} />
        ) : (
          <div className="h-44 flex items-center justify-center text-[10px] text-muted-foreground">
            No data for {label}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ValuationChartCard({
  analyticsData,
  pnl,
}: {
  analyticsData: Record<string, unknown>;
  pnl: Record<string, unknown>;
}) {
  const [kpi, setKpi] = useState<ValuationKpi>("pe");

  const vts = (analyticsData.valuation_ts as Pt[] | undefined) ?? [];

  let data: Pt[] = [];
  let series: { key: string; name: string; color: string }[] = [];

  if (kpi === "pe") {
    data = vts.map((r) => ({
      date: String(r.date),
      portfolio: Number(r.portfolio_pe ?? r.pe_ratio ?? r.pe ?? 0),
    }));
    series = [{ key: "portfolio", name: "P/E Ratio", color: "#3b82f6" }];
  } else if (kpi === "pb") {
    data = vts.map((r) => ({
      date: String(r.date),
      portfolio: Number(r.portfolio_pb ?? r.pb_ratio ?? r.pb ?? 0),
    }));
    series = [{ key: "portfolio", name: "P/B Ratio", color: "#8b5cf6" }];
  } else {
    // roe — flat line from pnl_metrics
    const roeVal = Number(pnl.roe_pct ?? 0);
    data =
      vts.length > 0
        ? [
            { date: String(vts[0].date), portfolio: roeVal },
            { date: String(vts[vts.length - 1].date), portfolio: roeVal },
          ]
        : [];
    series = [{ key: "portfolio", name: "ROE (%)", color: "#10b981" }];
  }

  const label = VALUATION_KPIS.find((k) => k.value === kpi)?.label ?? kpi;

  return (
    <Card>
      <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
        <KpiSelectGeneric value={kpi} onChange={setKpi} options={VALUATION_KPIS} />
        <CardControls
          fullscreen
          expandContent={
            data.length > 0 ? (
              <TimeSeriesChart data={data} series={series} height={600} />
            ) : undefined
          }
        />
      </CardHeader>
      <CardContent className="p-2">
        {data.length > 0 ? (
          <TimeSeriesChart data={data} series={series} height={180} />
        ) : (
          <div className="h-44 flex items-center justify-center text-[10px] text-muted-foreground">
            No data for {label}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DimensionChartCard({ analyticsData }: { analyticsData: Record<string, unknown> }) {
  const [kpi, setKpi] = useState<DimensionKpi>("market_cap");

  const ms = (analyticsData.mcap_slicing as Pt[] | undefined) ?? [];

  const label = DIMENSION_KPIS.find((k) => k.value === kpi)?.label ?? kpi;

  const barData: SvgBarDatum[] = ms.map((r) => ({
    name: String(r.bucket ?? r.name ?? ""),
    alloc: Number(r.allocation_effect ?? r.allocation_pct ?? r.allocation ?? 0),
    select: Number(r.selection_effect ?? r.selection_pct ?? r.selection ?? 0),
    interact: Number(r.interaction_effect ?? r.interaction_pct ?? r.interaction ?? 0),
  }));

  return (
    <Card>
      <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
        <KpiSelectGeneric value={kpi} onChange={setKpi} options={DIMENSION_KPIS} />
        <CardControls />
      </CardHeader>
      <CardContent className="p-2">
        {kpi !== "market_cap" ? (
          <div className="h-44 flex items-center justify-center text-[10px] text-muted-foreground">
            No data for {label}
          </div>
        ) : barData.length > 0 ? (
          <SvgBarChart data={barData} height={180} />
        ) : (
          <div className="h-44 flex items-center justify-center text-[10px] text-muted-foreground">
            No data
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tree builders
// ---------------------------------------------------------------------------

function buildPnLTree(pnl: Record<string, unknown>): TreeRow[] {
  const n = (k: string): number | null => (pnl[k] as number | null | undefined) ?? null;
  const diff = (mk: string, bk: string): number | null => {
    const m = n(mk), b = n(bk);
    return m != null && b != null ? Math.round((Number(m) - Number(b)) * 100) / 100 : null;
  };
  const V = (mk: string, bk: string) => ({ Main: n(mk), Benchmark: n(bk), Active: diff(mk, bk) });
  const N = () => ({ Main: null as number | null, Benchmark: null as number | null, Active: null as number | null });

  return [
    {
      id: "tr", label: "Total Return (%)", values: V("total_return_pct", "benchmark_total_return_pct"),
      children: [
        { id: "idio_r", label: "Idiosyncratic Return (%)", values: { Main: n("idio_return_pct"), Benchmark: null, Active: null } },
        {
          id: "fac_r", label: "Factor Return (%)", values: { Main: n("factor_return_pct"), Benchmark: null, Active: null },
          children: [
            { id: "mkt_r", label: "Market Return (%)",   values: { Main: n("market_return_pct"),   Benchmark: null, Active: null } },
            { id: "sty_r", label: "Style Return (%)",    values: { Main: n("style_return_pct"),    Benchmark: null, Active: null } },
            { id: "ind_r", label: "Industry Return (%)", values: { Main: n("industry_return_pct"), Benchmark: null, Active: null } },
          ],
        },
        { id: "div_r", label: "Dividend Return (%)", values: N() },
        { id: "oth_r", label: "Other Return (%)",    values: N() },
        {
          id: "tc_r", label: "Transaction Cost (%)", values: N(),
          children: [
            { id: "mi_r", label: "Market Impact (%)",       values: N() },
            { id: "sp_r", label: "Spread (%)",               values: N() },
            { id: "bf_r", label: "Brokerage and Fees (%)",  values: N() },
          ],
        },
      ],
    },
    {
      id: "cagr", label: "CAGR (%)", values: V("cagr_pct", "benchmark_cagr_pct"),
      children: [
        { id: "idio_cagr", label: "Idiosyncratic CAGR (%)", values: N() },
        {
          id: "fac_cagr", label: "Factor CAGR (%)", values: N(),
          children: [
            { id: "mkt_cagr", label: "Market CAGR (%)",   values: N() },
            { id: "sty_cagr", label: "Style CAGR (%)",    values: N() },
            { id: "ind_cagr", label: "Industry CAGR (%)", values: N() },
          ],
        },
        { id: "div_cagr", label: "Dividend CAGR (%)",          values: N() },
        { id: "oth_cagr", label: "Other CAGR (%)",             values: N() },
        {
          id: "tc_cagr", label: "Transaction Cost CAGR (%)", values: N(),
          children: [
            { id: "mi_cagr",  label: "Market Impact CAGR (%)",       values: N() },
            { id: "sp_cagr",  label: "Spread CAGR (%)",               values: N() },
            { id: "bf_cagr",  label: "Brokerage and Fees CAGR (%)",  values: N() },
          ],
        },
      ],
    },
    {
      id: "sharpe", label: "Sharpe Ratio", values: V("sharpe", "benchmark_sharpe"),
      children: [
        { id: "idio_sharpe", label: "Idiosyncratic Sharpe Ratio", values: N() },
        {
          id: "fac_sharpe", label: "Factor Sharpe Ratio", values: N(),
          children: [
            { id: "mkt_sharpe", label: "Market Sharpe Ratio",   values: N() },
            { id: "sty_sharpe", label: "Style Sharpe Ratio",    values: N() },
            { id: "ind_sharpe", label: "Industry Sharpe Ratio", values: N() },
          ],
        },
      ],
    },
    {
      id: "sortino", label: "Sortino Ratio", values: V("sortino", "benchmark_sortino"),
      children: [
        { id: "idio_sortino", label: "Idiosyncratic Sortino Ratio", values: N() },
        {
          id: "fac_sortino", label: "Factor Sortino Ratio", values: N(),
          children: [
            { id: "mkt_sortino", label: "Market Sortino Ratio",   values: N() },
            { id: "sty_sortino", label: "Style Sortino Ratio",    values: N() },
            { id: "ind_sortino", label: "Industry Sortino Ratio", values: N() },
          ],
        },
      ],
    },
    { id: "treynor", label: "Treynor Ratio", values: V("treynor", "benchmark_treynor") },
    {
      id: "exec_summary", label: "Execution Summary", values: N(),
      children: [
        { id: "ann_turnover", label: "Annualized Turnover",            values: N() },
        {
          id: "tc_bps", label: "Total Transaction Cost (bps)", values: N(),
          children: [
            { id: "mi_bps",  label: "Market Impact Cost (bps)", values: N() },
            { id: "sp_bps",  label: "Spread Cost (bps)",         values: N() },
            {
              id: "bf_bps", label: "Brokerage and Fees (bps)", values: N(),
              children: [
                { id: "brok_bps",  label: "Brokerage (bps)",                   values: N() },
                { id: "etc_bps",   label: "Exchange Transaction Charges (bps)", values: N() },
                { id: "sebi_bps",  label: "SEBI Charges (bps)",                values: N() },
                { id: "stamp_bps", label: "Stamp Charges (bps)",               values: N() },
                { id: "stt_bps",   label: "STT Fees (bps)",                    values: N() },
                { id: "gst_bps",   label: "GST (bps)",                         values: N() },
              ],
            },
          ],
        },
      ],
    },
  ];
}

function buildRiskTree(pnl: Record<string, unknown>): TreeRow[] {
  const n = (k: string): number | null => (pnl[k] as number | null | undefined) ?? null;
  const diff = (mk: string, bk: string): number | null => {
    const m = n(mk), b = n(bk);
    return m != null && b != null ? Math.round((Number(m) - Number(b)) * 100) / 100 : null;
  };
  const V = (mk: string, bk: string) => ({ Main: n(mk), Benchmark: n(bk), Active: diff(mk, bk) });
  const N = () => ({ Main: null as number | null, Benchmark: null as number | null, Active: null as number | null });

  const beta = n("beta");
  return [
    {
      id: "beta", label: "Beta",
      values: { Main: beta, Benchmark: 1.0, Active: beta != null ? Math.round((beta - 1.0) * 10000) / 10000 : null },
    },
    {
      id: "realized_risk", label: "Realized Risk (%)", values: V("volatility_pct", "benchmark_volatility_pct"),
      children: [
        { id: "idio_rr", label: "Idiosyncratic Realized Risk (%)", values: N() },
        {
          id: "fac_rr", label: "Factor Realized Risk (%)", values: N(),
          children: [
            { id: "mkt_rr", label: "Market Realized Risk (%)",   values: N() },
            { id: "sty_rr", label: "Style Realized Risk (%)",    values: N() },
            { id: "ind_rr", label: "Industry Realized Risk (%)", values: N() },
          ],
        },
      ],
    },
    {
      id: "predicted_risk", label: "Total Predicted Risk (%)", values: N(),
      children: [
        { id: "idio_pr", label: "Idiosyncratic Predicted Risk (%)", values: N() },
        {
          id: "fac_pr", label: "Factor Predicted Risk (%)", values: N(),
          children: [
            { id: "mkt_pr", label: "Market Predicted Risk (%)",   values: N() },
            { id: "sty_pr", label: "Style Predicted Risk (%)",    values: N() },
            { id: "ind_pr", label: "Industry Predicted Risk (%)", values: N() },
          ],
        },
      ],
    },
    {
      id: "risk_contrib", label: "Risk Contribution (%)", values: N(),
      children: [
        { id: "idio_rc", label: "Idiosyncratic Risk Contribution (%)", values: N() },
        {
          id: "fac_rc", label: "Factor Risk Contribution (%)", values: N(),
          children: [
            { id: "mkt_rc", label: "Market Risk Contribution (%)",   values: N() },
            { id: "sty_rc", label: "Style Risk Contribution (%)",    values: N() },
            { id: "ind_rc", label: "Industry Risk Contribution (%)", values: N() },
          ],
        },
      ],
    },
    {
      id: "concentration", label: "Portfolio Concentration", values: N(),
      children: [
        {
          id: "top_h", label: "Top Holdings (%)", values: N(),
          children: [
            { id: "top5_h",  label: "Top 5 Holdings (%)",  values: N() },
            { id: "top10_h", label: "Top 10 Holdings (%)", values: N() },
            { id: "top20_h", label: "Top 20 Holdings (%)", values: N() },
          ],
        },
        {
          id: "top_tr", label: "Top Total Risk Contribution (%)", values: N(),
          children: [
            { id: "top5_tr",  label: "Top 5 Total Risk Contribution (%)",  values: N() },
            { id: "top10_tr", label: "Top 10 Total Risk Contribution (%)", values: N() },
            { id: "top20_tr", label: "Top 20 Total Risk Contribution (%)", values: N() },
          ],
        },
        {
          id: "top_ir", label: "Top Idiosyncratic Risk Contribution (%)", values: N(),
          children: [
            { id: "top5_ir",  label: "Top 5 Idiosyncratic Risk Contribution (%)",  values: N() },
            { id: "top10_ir", label: "Top 10 Idiosyncratic Risk Contribution (%)", values: N() },
            { id: "top20_ir", label: "Top 20 Idiosyncratic Risk Contribution (%)", values: N() },
          ],
        },
        {
          id: "top_fr", label: "Top Factor Risk Contribution (%)", values: N(),
          children: [
            { id: "top5_fr",  label: "Top 5 Factor Risk Contribution (%)",  values: N() },
            { id: "top10_fr", label: "Top 10 Factor Risk Contribution (%)", values: N() },
            { id: "top20_fr", label: "Top 20 Factor Risk Contribution (%)", values: N() },
          ],
        },
      ],
    },
    { id: "aum_gross",     label: "Gross AUM (INR cr)",     values: N() },
    { id: "aum_unlevered", label: "Unlevered AUM (INR cr)", values: N() },
  ];
}

function buildValuationTree(pnl: Record<string, unknown>): TreeRow[] {
  const n = (k: string): number | null => (pnl[k] as number | null | undefined) ?? null;
  return [
    { id: "pe",  label: "PE Ratio",             values: { Main: n("pe_ratio"), Benchmark: null, Active: null } },
    { id: "pb",  label: "P/B Ratio",            values: { Main: n("pb_ratio"), Benchmark: null, Active: null } },
    { id: "roe", label: "Return on Equity (%)", values: { Main: n("roe_pct"),  Benchmark: null, Active: null } },
  ];
}

type ContribTab = "overall" | "idio" | "factor";

// ---------------------------------------------------------------------------
// Pure SVG bar for Top Holdings Weight
// ---------------------------------------------------------------------------

function TopHoldingsSvgBar({
  data,
  height = 180,
}: {
  data: { name: string; value: number }[];
  height?: number;
}) {
  if (data.length === 0) return null;

  const W = 320;
  const PAD_L = 72;
  const PAD_R = 44;
  const PAD_T = 6;
  const PAD_B = 10;
  const innerH = height - PAD_T - PAD_B;
  const innerW = W - PAD_L - PAD_R;
  const maxVal = Math.max(...data.map((d) => d.value), 0.01);
  const n = data.length;
  const gap = innerH / n;
  const barH = gap * 0.58;
  const toX = (v: number) => PAD_L + (v / (maxVal * 1.1)) * innerW;

  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height }}
    >
      {data.map((d, i) => {
        const cy = PAD_T + i * gap + gap / 2;
        const barY = cy - barH / 2;
        const bw = Math.max(toX(d.value) - PAD_L, 0.5);
        const label = d.name.length > 10 ? d.name.slice(0, 10) : d.name;
        return (
          <g key={i}>
            <text x={PAD_L - 4} y={cy + 4} textAnchor="end" fontSize={10} fill="#a1a1aa">
              {label}
            </text>
            <rect x={PAD_L} y={barY} width={bw} height={barH} fill="#f97316" rx={2} />
            <text x={PAD_L + bw + 4} y={cy + 4} fontSize={9} fill="#71717a">
              {d.value.toFixed(1)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReturnsAndRiskPage() {
  const { analyticsData, analyticsLoading, selectedSourceId } = usePortfolio();
  const [contributorTab, setContributorTab] = useState<ContribTab>("overall");
  const [chartKpi, setChartKpi] = useState<string>("weight");

  if (analyticsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Computing analytics...</span>
      </div>
    );
  }

  if (!analyticsData || !selectedSourceId) {
    return <AnalyticsEmptyState title="Returns & Risk" />;
  }

  const pnl = (analyticsData.pnl_metrics ?? {}) as Record<string, unknown>;
  const holdings = (analyticsData.holdings_detail as Pt[] | undefined) ?? [];
  const factors = (analyticsData.factor_detail as Pt[] | undefined) ?? [];
  const brinsonObj = (analyticsData.brinson as Record<string, unknown> | undefined) ?? {};
  const brinsonByMcap   = (brinsonObj.by_mcap   as Pt[] | undefined) ?? [];
  const brinsonBySector = (brinsonObj.by_sector  as Pt[] | undefined) ?? [];

  // Contributors & Detractors
  const sortedHoldings = [...holdings] as Array<Record<string, unknown>>;
  const sortedFactors = [...factors] as Array<Record<string, unknown>>;

  // KPI options per contributor tab — controls both chart bar and table sort order
  const CHART_KPIS_BY_TAB = {
    overall: [
      { label: "Top Holdings (%)", value: "weight" },
      { label: "Top Total Risk Contribution (%)", value: "risk_contrib" },
    ],
    idio: [
      { label: "Top Holdings (%)", value: "weight" },
      { label: "Top Idiosyncratic Risk Contribution (%)", value: "idio_risk" },
    ],
    factor: [
      { label: "Top Factor Risk Contribution (%)", value: "factor_risk" },
    ],
  } as const;

  const activeChartKpis = CHART_KPIS_BY_TAB[contributorTab];
  const effectiveChartKpi = activeChartKpis.some((k) => k.value === chartKpi)
    ? chartKpi
    : activeChartKpis[0].value;

  // Table sort key driven by effectiveChartKpi
  const tableSortKey =
    contributorTab === "factor"       ? "risk_contribution_pct" :
    effectiveChartKpi === "risk_contrib" ? "risk_contribution_pct" :
    effectiveChartKpi === "idio_risk" ? "idio_return_pct" :
    "avg_weight";

  const baseList = contributorTab === "factor" ? sortedFactors : sortedHoldings;
  const topList    = [...baseList].sort((a, b) => Number(b[tableSortKey] ?? 0) - Number(a[tableSortKey] ?? 0)).slice(0, 10);
  const bottomList = [...baseList].sort((a, b) => Number(a[tableSortKey] ?? 0) - Number(b[tableSortKey] ?? 0)).slice(0, 10);

  const valueKey =
    contributorTab === "overall" ? "total_return_contribution_pct" :
    contributorTab === "idio"    ? "idio_return_pct" :
    "return_contribution_pct";
  const nameKey = contributorTab === "factor" ? "factor_name" : "symbol";

  const pnlTree  = buildPnLTree(pnl);
  const riskTree = buildRiskTree(pnl);
  const valTree  = buildValuationTree(pnl);

  const treeCols: TreeColumn[] = [
    { key: "Active",    label: "Active",    align: "right" as const },
    { key: "Benchmark", label: "Benchmark", align: "right" as const },
    { key: "Main",      label: "Main",      align: "right" as const },
  ];

  const sumEffects = (arr: Pt[]) => ({
    alloc:    arr.reduce((s, r) => s + Number(r.allocation_effect ?? 0), 0),
    select:   arr.reduce((s, r) => s + Number(r.selection_effect  ?? 0), 0),
    interact: arr.reduce((s, r) => s + Number(r.interaction_effect ?? 0), 0),
  });
  const mcapTotals   = sumEffects(brinsonByMcap);
  const sectorTotals = sumEffects(brinsonBySector);
  const brinsonRows = [
    { category: "Market Cap",         ...mcapTotals },
    { category: "Liquidity",          alloc: null, select: null, interact: null },
    { category: "Total Risk",         alloc: null, select: null, interact: null },
    { category: "Idiosyncratic Risk", alloc: null, select: null, interact: null },
    { category: "Sector",             ...sectorTotals },
    { category: "Industry",           alloc: null, select: null, interact: null },
    { category: "Earnings Window",    alloc: null, select: null, interact: null },
    { category: "IPO",                alloc: null, select: null, interact: null },
    { category: "Financial Type",     alloc: null, select: null, interact: null },
    { category: "Position Age",       alloc: null, select: null, interact: null },
  ];

  // Top holdings weight bar data (avg_weight already in % from backend)
  const topHoldingsBarData = [...holdings]
    .sort((a, b) => Number(b.avg_weight ?? 0) - Number(a.avg_weight ?? 0))
    .slice(0, 10)
    .map((h) => ({
      name: String(h.symbol ?? "").replace(".NS", ""),
      value: Number(h.avg_weight ?? 0),
    }));

  const topRiskContribData = [...holdings]
    .sort((a, b) => Number(b.risk_contribution_pct ?? 0) - Number(a.risk_contribution_pct ?? 0))
    .slice(0, 10)
    .map((h) => ({
      name: String(h.symbol ?? "").replace(".NS", ""),
      value: Number(h.risk_contribution_pct ?? 0),
    }));

  const topFactorRiskData = [...factors]
    .sort((a, b) => Number(b.risk_contribution_pct ?? 0) - Number(a.risk_contribution_pct ?? 0))
    .slice(0, 10)
    .map((f) => ({
      name: String(f.factor_name ?? ""),
      value: Number(f.risk_contribution_pct ?? 0),
    }));

  const chartBarData =
    effectiveChartKpi === "weight" ? topHoldingsBarData :
    effectiveChartKpi === "risk_contrib" ? topRiskContribData :
    effectiveChartKpi === "factor_risk" ? topFactorRiskData :
    [];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Returns &amp; Risk</h1>
      </div>

      {/* Metric tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <AnalyticsTreeTable
          title="Profit and Loss Summary"
          columns={treeCols}
          rows={pnlTree}
          defaultExpanded={new Set(["tr", "sharpe"])}
        />
        <AnalyticsTreeTable title="Risk Summary"      columns={treeCols} rows={riskTree} />
        <AnalyticsTreeTable title="Valuation Summary" columns={treeCols} rows={valTree} />

        {/* Brinson Decomposition Summary */}
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Brinson Decomposition Summary</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-border/50">
                  {["Category", "Allocation Effect (%)", "Selection Effect (%)", "Interaction Effect (%)"].map((h) => (
                    <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {brinsonRows.map((row, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="px-2 py-1.5 font-medium">{row.category}</td>
                    <td className="px-2 py-1.5">
                      {row.alloc != null ? <ColoredCell value={fmt(row.alloc)} /> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-2 py-1.5">
                      {row.select != null ? <ColoredCell value={fmt(row.select)} /> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-2 py-1.5">
                      {row.interact != null ? <ColoredCell value={fmt(row.interact)} /> : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* 4 independent chart cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <ReturnChartCard    analyticsData={analyticsData} />
        <RiskChartCard      analyticsData={analyticsData} />
        <ValuationChartCard analyticsData={analyticsData} pnl={pnl} />
        <DimensionChartCard analyticsData={analyticsData} />
      </div>

      {/* Contributors & Detractors */}
      <div>
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <h2 className="text-sm font-semibold">Contributors &amp; Detractors</h2>
          <div className="flex items-center gap-1 bg-card border rounded-lg p-0.5">
            {(["overall", "idio", "factor"] as ContribTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => { setContributorTab(tab); setChartKpi("weight"); }}
                className={`px-3 py-1 text-[10px] rounded transition-colors ${
                  contributorTab === tab
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "overall" ? "Overall" : tab === "idio" ? "Idio" : "Factor"}
              </button>
            ))}
          </div>
          {activeChartKpis.length > 1 ? (
            <select
              className="text-[9px] bg-background border border-border rounded px-1.5 py-0.5 text-foreground focus:outline-none"
              value={effectiveChartKpi}
              onChange={(e) => setChartKpi(e.target.value)}
            >
              {activeChartKpis.map((k) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
          ) : (
            <span className="text-[9px] text-muted-foreground">{activeChartKpis[0]?.label}</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Top 10 */}
          <Card>
            <CardHeader className="pb-1 py-2 px-3">
              <CardTitle className="text-[11px]">
                Top 10 — {contributorTab === "factor" ? "Factors" : "Holdings"}
                <span className="ml-1 font-normal text-muted-foreground text-[9px]">
                  ({activeChartKpis.find((k) => k.value === effectiveChartKpi)?.label ?? ""})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">
                      {contributorTab === "factor" ? "Factor" : "Symbol"}
                    </th>
                    {contributorTab === "factor" ? (
                      <>
                        <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Type</th>
                        <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Exp (%)</th>
                      </>
                    ) : (
                      <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Wt (%)</th>
                    )}
                    <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Ret (%)</th>
                    {contributorTab !== "factor" && (
                      <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Risk (%)</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {topList.length === 0 ? (
                    <tr><td colSpan={4} className="px-2 py-4 text-center text-muted-foreground">No data</td></tr>
                  ) : topList.map((r, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="px-2 py-1 font-medium">
                        {String(r[nameKey] ?? "—").replace(".NS", "")}
                      </td>
                      {contributorTab === "factor" ? (
                        <>
                          <td className="px-2 py-1 text-right text-muted-foreground text-[9px]">{String(r.factor_type ?? "—")}</td>
                          <td className="px-2 py-1 text-right"><ColoredCell value={fmt(r.exposure_pct)} /></td>
                        </>
                      ) : (
                        <td className="px-2 py-1 text-right tabular-nums">{fmt(r.avg_weight)}</td>
                      )}
                      <td className="px-2 py-1 text-right">
                        <ColoredCell value={fmt(r[valueKey])} />
                      </td>
                      {contributorTab !== "factor" && (
                        <td className="px-2 py-1 text-right tabular-nums">{fmt(r.risk_contribution_pct)}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Bottom 10 */}
          <Card>
            <CardHeader className="pb-1 py-2 px-3">
              <CardTitle className="text-[11px]">
                Bottom 10 — {contributorTab === "factor" ? "Factors" : "Holdings"}
                <span className="ml-1 font-normal text-muted-foreground text-[9px]">
                  ({activeChartKpis.find((k) => k.value === effectiveChartKpi)?.label ?? ""})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">
                      {contributorTab === "factor" ? "Factor" : "Symbol"}
                    </th>
                    {contributorTab === "factor" ? (
                      <>
                        <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Type</th>
                        <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Exp (%)</th>
                      </>
                    ) : (
                      <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Wt (%)</th>
                    )}
                    <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Ret (%)</th>
                    {contributorTab !== "factor" && (
                      <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Risk (%)</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {bottomList.length === 0 ? (
                    <tr><td colSpan={4} className="px-2 py-4 text-center text-muted-foreground">No data</td></tr>
                  ) : bottomList.map((r, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="px-2 py-1 font-medium">
                        {String(r[nameKey] ?? "—").replace(".NS", "")}
                      </td>
                      {contributorTab === "factor" ? (
                        <>
                          <td className="px-2 py-1 text-right text-muted-foreground text-[9px]">{String(r.factor_type ?? "—")}</td>
                          <td className="px-2 py-1 text-right"><ColoredCell value={fmt(r.exposure_pct)} /></td>
                        </>
                      ) : (
                        <td className="px-2 py-1 text-right tabular-nums">{fmt(r.avg_weight)}</td>
                      )}
                      <td className="px-2 py-1 text-right">
                        <ColoredCell value={fmt(r[valueKey])} />
                      </td>
                      {contributorTab !== "factor" && (
                        <td className="px-2 py-1 text-right tabular-nums">{fmt(r.risk_contribution_pct)}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* KPI chart */}
          <Card>
            <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
              <CardTitle className="text-[11px]">
                {activeChartKpis.find((k) => k.value === effectiveChartKpi)?.label ?? "Top Holdings (%)"}
              </CardTitle>
              <CardControls />
            </CardHeader>
            <CardContent className="p-2">
              {chartBarData.length > 0 ? (
                <TopHoldingsSvgBar data={chartBarData} height={220} />
              ) : (
                <div className="h-[220px] flex items-center justify-center text-[10px] text-muted-foreground">
                  No data for this metric
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
