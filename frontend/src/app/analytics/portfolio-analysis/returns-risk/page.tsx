"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BarChart3 } from "lucide-react";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { CardControls } from "@/components/CardControls";
import { usePortfolio } from "@/lib/portfolio-context";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

type ChartKpi = "decomp" | "realized_risk" | "pe_ratio" | "allocation_effect";
type ContribTab = "overall" | "idio" | "factor";

const CHART_OPTIONS: { value: ChartKpi; label: string }[] = [
  { value: "decomp", label: "Return Decomposition" },
  { value: "realized_risk", label: "Realized Risk (%)" },
  { value: "pe_ratio", label: "PE Ratio" },
  { value: "allocation_effect", label: "Allocation Effect" },
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
  return <span className={`tabular-nums ${n >= 0 ? "text-emerald-500" : "text-red-400"}`}>{s}</span>;
}

function MetricTable({
  title,
  rows,
}: {
  title: string;
  rows: { metric: string; value: unknown }[];
}) {
  return (
    <Card>
      <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
        <CardTitle className="text-[11px]">{title}</CardTitle>
        <CardControls />
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-[10px]">
          <tbody>
            {rows.map(({ metric, value }) => (
              <tr key={metric} className="border-b border-border/30">
                <td className="px-2 py-1.5 text-muted-foreground">{metric}</td>
                <td className="px-2 py-1.5 text-right"><ColoredCell value={value} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function KpiSelect({ value, onChange }: { value: ChartKpi; onChange: (v: ChartKpi) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as ChartKpi)}
      className="text-[9px] bg-background border border-border rounded px-1.5 py-0.5 text-foreground focus:outline-none">
      {CHART_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function buildChart(analyticsData: Record<string, unknown>, kpi: ChartKpi) {
  const factorTs = (analyticsData.factor_decomp_ts as Record<string, unknown>[] | undefined) ?? [];
  const rm = (analyticsData.rolling_metrics as Record<string, unknown>[] | undefined) ?? [];
  const vts = (analyticsData.valuation_ts as Record<string, unknown>[] | undefined) ?? [];

  if (kpi === "decomp") {
    const data = factorTs.map((r) => ({
      date: r.date,
      market: Number(r.market_return_pct ?? r.market ?? 0),
      style: Number(r.style_return_pct ?? r.style ?? 0),
      industry: Number(r.industry_return_pct ?? r.industry ?? 0),
      idio: Number(r.idio_return_pct ?? r.idio ?? 0),
    }));
    return {
      data, type: "stacked_area",
      series: [
        { key: "market", name: "Market", color: "#6366f1" },
        { key: "style", name: "Style", color: "#10b981" },
        { key: "industry", name: "Industry", color: "#f97316" },
        { key: "idio", name: "Idio", color: "#eab308" },
      ],
    };
  }

  if (kpi === "realized_risk") {
    return {
      data: rm.map((r) => ({ date: r.date, risk: Number(r.rolling_vol ?? 0) * 100 })),
      type: "line",
      series: [{ key: "risk", name: "Realized Risk (%)", color: "#ef4444" }],
    };
  }

  if (kpi === "pe_ratio") {
    return {
      data: vts.map((r) => ({ date: r.date, pe: Number(r.pe_ratio ?? r.pe ?? 0) })),
      type: "line",
      series: [{ key: "pe", name: "PE Ratio", color: "#3b82f6" }],
    };
  }

  // allocation_effect from mcap_slicing
  const ms = (analyticsData.mcap_slicing as Record<string, unknown>[] | undefined) ?? [];
  return {
    data: ms.map((r) => ({ date: String(r.bucket ?? r.name ?? ""), alloc: Number(r.allocation_effect_pct ?? 0) })),
    type: "line",
    series: [{ key: "alloc", name: "Allocation Effect (%)", color: "#a855f7" }],
  };
}

function AnalyticsChart({ analyticsData, defaultKpi }: { analyticsData: Record<string, unknown>; defaultKpi: ChartKpi }) {
  const [kpi, setKpi] = useState<ChartKpi>(defaultKpi);
  const { data, series } = buildChart(analyticsData, kpi);

  return (
    <Card>
      <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
        <KpiSelect value={kpi} onChange={setKpi} />
        <CardControls fullscreen expandContent={
          data.length > 0 ? <TimeSeriesChart data={data as Record<string, unknown>[]} series={series} height={600} /> : undefined
        } />
      </CardHeader>
      <CardContent className="p-2">
        {data.length > 0 ? (
          <TimeSeriesChart data={data as Record<string, unknown>[]} series={series} height={180} />
        ) : (
          <div className="h-44 flex items-center justify-center text-[10px] text-muted-foreground">No data</div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ReturnsAndRiskPage() {
  const { analyticsData, analyticsLoading, selectedSourceId } = usePortfolio();
  const [contributorTab, setContributorTab] = useState<ContribTab>("overall");

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
        <h1 className="text-xl font-bold">Returns &amp; Risk</h1>
        <div className="rounded-lg border bg-card p-12 text-center space-y-3">
          <BarChart3 className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-muted-foreground">Select a portfolio or strategy from the sidebar to begin</p>
        </div>
      </div>
    );
  }

  const pnl = (analyticsData.pnl_metrics ?? {}) as Record<string, unknown>;
  const bm = (pnl.benchmark ?? {}) as Record<string, unknown>;
  const vts = (analyticsData.valuation_ts as Record<string, unknown>[] | undefined) ?? [];
  const latestV = vts.length > 0 ? vts[vts.length - 1] : {};
  const holdings = (analyticsData.holdings_detail as Record<string, unknown>[] | undefined) ?? [];
  const factors = (analyticsData.factor_detail as Record<string, unknown>[] | undefined) ?? [];
  const brinson = (analyticsData.brinson as Record<string, unknown> | undefined) ?? {};
  const mcapBrinson = (brinson.by_mcap as Record<string, unknown>[] | undefined) ?? [];

  // Build tables
  const pnlRows = [
    { metric: "Total Return (%)", value: fmt(pnl.total_return_pct) },
    { metric: "CAGR (%)", value: fmt(pnl.cagr_pct) },
    { metric: "Sharpe Ratio", value: fmt(pnl.sharpe) },
    { metric: "Sortino Ratio", value: fmt(pnl.sortino) },
    { metric: "Treynor Ratio", value: fmt(pnl.treynor) },
  ];

  const riskRows = [
    { metric: "Beta", value: fmt(pnl.beta) },
    { metric: "Volatility (%)", value: fmt(pnl.volatility_pct) },
    { metric: "Max Drawdown (%)", value: fmt(pnl.max_drawdown_pct) },
  ];

  const valuationRows = [
    { metric: "PE Ratio", value: fmt(latestV.pe_ratio ?? latestV.pe) },
    { metric: "PB Ratio", value: fmt(latestV.pb_ratio ?? latestV.pb) },
    { metric: "ROE (%)", value: fmt(latestV.roe_pct ?? latestV.roe) },
  ];

  // Contributors & Detractors
  const sortedHoldings = [...holdings] as Array<Record<string, unknown>>;
  const topOverall = [...sortedHoldings].sort((a, b) =>
    Number(b.total_return_contribution_pct ?? 0) - Number(a.total_return_contribution_pct ?? 0)
  ).slice(0, 10);
  const bottomOverall = [...sortedHoldings].sort((a, b) =>
    Number(a.total_return_contribution_pct ?? 0) - Number(b.total_return_contribution_pct ?? 0)
  ).slice(0, 10);

  const topIdio = [...sortedHoldings].sort((a, b) =>
    Number(b.idio_return_pct ?? 0) - Number(a.idio_return_pct ?? 0)
  ).slice(0, 10);
  const bottomIdio = [...sortedHoldings].sort((a, b) =>
    Number(a.idio_return_pct ?? 0) - Number(b.idio_return_pct ?? 0)
  ).slice(0, 10);

  const sortedFactors = [...factors] as Array<Record<string, unknown>>;
  const topFactor = [...sortedFactors].sort((a, b) =>
    Number(b.return_contribution_pct ?? 0) - Number(a.return_contribution_pct ?? 0)
  ).slice(0, 10);
  const bottomFactor = [...sortedFactors].sort((a, b) =>
    Number(a.return_contribution_pct ?? 0) - Number(b.return_contribution_pct ?? 0)
  ).slice(0, 10);

  const topList = contributorTab === "overall" ? topOverall : contributorTab === "idio" ? topIdio : topFactor;
  const bottomList = contributorTab === "overall" ? bottomOverall : contributorTab === "idio" ? bottomIdio : bottomFactor;
  const valueKey = contributorTab === "overall" ? "total_return_contribution_pct"
    : contributorTab === "idio" ? "idio_return_pct"
    : "return_contribution_pct";
  const nameKey = contributorTab === "factor" ? "factor_name" : "symbol";

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Returns &amp; Risk</h1>

      {/* 4 summary tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricTable title="P&amp;L Summary" rows={pnlRows} />
        <MetricTable title="Risk Summary" rows={riskRows} />
        <MetricTable title="Valuation Summary" rows={valuationRows} />
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Brinson by Market Cap</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-border/50">
                  {["Bucket", "Alloc (%)", "Select (%)", "Interact (%)"].map((h) => (
                    <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mcapBrinson.map((row, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="px-2 py-1.5 font-medium">{String(row.bucket ?? row.name ?? "—")}</td>
                    <td className="px-2 py-1.5"><ColoredCell value={fmt(row.allocation_pct)} /></td>
                    <td className="px-2 py-1.5"><ColoredCell value={fmt(row.selection_pct)} /></td>
                    <td className="px-2 py-1.5"><ColoredCell value={fmt(row.interaction_pct)} /></td>
                  </tr>
                ))}
                {mcapBrinson.length === 0 && (
                  <tr><td colSpan={4} className="px-2 py-4 text-center text-muted-foreground">No Brinson data</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* 4 charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <AnalyticsChart analyticsData={analyticsData} defaultKpi="decomp" />
        <AnalyticsChart analyticsData={analyticsData} defaultKpi="realized_risk" />
        <AnalyticsChart analyticsData={analyticsData} defaultKpi="pe_ratio" />
        <AnalyticsChart analyticsData={analyticsData} defaultKpi="allocation_effect" />
      </div>

      {/* Contributors & Detractors */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-semibold">Contributors &amp; Detractors</h2>
          <div className="flex items-center gap-1 bg-card border rounded-lg p-0.5">
            {(["overall", "idio", "factor"] as ContribTab[]).map((tab) => (
              <button key={tab} onClick={() => setContributorTab(tab)}
                className={`px-3 py-1 text-[10px] rounded transition-colors ${
                  contributorTab === tab ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}>
                {tab === "overall" ? "Overall" : tab === "idio" ? "Idio" : "Factor"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card>
            <CardHeader className="pb-1 py-2 px-3">
              <CardTitle className="text-[11px]">Top 10 — {contributorTab === "factor" ? "Factors" : "Holdings"}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Name</th>
                    <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Return (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {topList.map((r, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="px-2 py-1 font-medium">{String(r[nameKey] ?? "—")}</td>
                      <td className="px-2 py-1 text-right"><ColoredCell value={fmt(r[valueKey])} /></td>
                    </tr>
                  ))}
                  {topList.length === 0 && (
                    <tr><td colSpan={2} className="px-2 py-4 text-center text-muted-foreground">No data</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 py-2 px-3">
              <CardTitle className="text-[11px]">Bottom 10 — {contributorTab === "factor" ? "Factors" : "Holdings"}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Name</th>
                    <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Return (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {bottomList.map((r, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="px-2 py-1 font-medium">{String(r[nameKey] ?? "—")}</td>
                      <td className="px-2 py-1 text-right"><ColoredCell value={fmt(r[valueKey])} /></td>
                    </tr>
                  ))}
                  {bottomList.length === 0 && (
                    <tr><td colSpan={2} className="px-2 py-4 text-center text-muted-foreground">No data</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Top Holdings chart */}
      {holdings.length > 0 && (
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Top Holdings Weight (%)</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent className="p-2">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={[...holdings]
                  .sort((a, b) => Number(b.holdings_pct ?? 0) - Number(a.holdings_pct ?? 0))
                  .slice(0, 10)
                  .map((h) => ({ name: String(h.symbol ?? ""), value: Number(h.holdings_pct ?? 0) }))}
                margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#71717a" }} tickLine={false} />
                <YAxis tick={{ fontSize: 8, fill: "#71717a" }} tickLine={false}
                  tickFormatter={(v) => `${v.toFixed(1)}%`} width={35} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 11 }}
                  formatter={(v) => [`${Number(v).toFixed(2)}%`]}
                />
                <Bar dataKey="value" fill="#f97316" name="Weight (%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
