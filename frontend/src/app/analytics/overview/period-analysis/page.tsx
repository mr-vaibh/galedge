"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart3 } from "lucide-react";
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

type Granularity = "monthly" | "quarterly" | "annual";

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

interface PeriodRow {
  period: string;
  total_return_pct?: number;
  cagr_pct?: number;
  sharpe?: number;
  sortino?: number;
  volatility_pct?: number;
  market_return_pct?: number;
  style_return_pct?: number;
  industry_return_pct?: number;
  idio_return_pct?: number;
  [key: string]: unknown;
}

function getPeriodData(analyticsData: Record<string, unknown>, granularity: Granularity): PeriodRow[] {
  const key =
    granularity === "monthly" ? "period_stats_monthly" :
    granularity === "quarterly" ? "period_stats_quarterly" :
    "period_stats_annual";
  const rows = (analyticsData[key] as PeriodRow[] | undefined) ?? [];
  return rows;
}

function computeStats(rows: PeriodRow[]) {
  const returns = rows.map((r) => Number(r.total_return_pct ?? 0)).filter((n) => !isNaN(n));
  if (returns.length === 0) return null;

  const positive = returns.filter((r) => r > 0).length;
  const hitRate = (positive / returns.length) * 100;
  const sorted = [...returns].sort((a, b) => a - b);
  const p25 = sorted[Math.floor(sorted.length * 0.25)] ?? 0;
  const p75 = sorted[Math.floor(sorted.length * 0.75)] ?? 0;
  const median = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
  const avg = returns.reduce((a, b) => a + b, 0) / returns.length;

  return {
    hitRate: hitRate.toFixed(1),
    max: Math.max(...returns).toFixed(2),
    min: Math.min(...returns).toFixed(2),
    avg: avg.toFixed(2),
    median: median.toFixed(2),
    p25: p25.toFixed(2),
    p75: p75.toFixed(2),
    count: returns.length,
  };
}

const STACKED_COLORS: Record<string, string> = {
  market_return_pct: "#6366f1",
  style_return_pct: "#10b981",
  industry_return_pct: "#f97316",
  idio_return_pct: "#eab308",
};

export default function PeriodAnalysisPage() {
  const { analyticsData, analyticsLoading, selectedSourceId } = usePortfolio();
  const [granularity, setGranularity] = useState<Granularity>("monthly");

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
        <h1 className="text-xl font-bold">Period Analysis</h1>
        <div className="rounded-lg border bg-card p-12 text-center space-y-3">
          <BarChart3 className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-muted-foreground">Select a portfolio or strategy from the sidebar to begin</p>
        </div>
      </div>
    );
  }

  const rows = getPeriodData(analyticsData, granularity);
  const stats = computeStats(rows);

  const decompBarData = rows.map((r) => ({
    period: r.period,
    market_return_pct: Number(r.market_return_pct ?? 0),
    style_return_pct: Number(r.style_return_pct ?? 0),
    industry_return_pct: Number(r.industry_return_pct ?? 0),
    idio_return_pct: Number(r.idio_return_pct ?? 0),
  }));

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Period Analysis</h1>
          <p className="text-xs text-muted-foreground">{rows.length} periods</p>
        </div>
        <div className="flex items-center gap-1 bg-card border rounded-lg p-0.5">
          {(["monthly", "quarterly", "annual"] as Granularity[]).map((g) => (
            <Button key={g} variant={granularity === g ? "secondary" : "ghost"}
              size="sm" onClick={() => setGranularity(g)} className="h-7 text-[10px] px-3 capitalize">
              {g}
            </Button>
          ))}
        </div>
      </div>

      {/* P&L Table by period */}
      <Card>
        <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
          <CardTitle className="text-[11px]">P&amp;L by Period</CardTitle>
          <CardControls />
        </CardHeader>
        <CardContent className="p-0 max-h-72 overflow-y-auto">
          <table className="w-full text-[10px]">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border/50">
                {["Period", "Total Return (%)", "CAGR (%)", "Sharpe", "Sortino", "Vol (%)"].map((h) => (
                  <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.period} className="border-b border-border/30 hover:bg-muted/20">
                  <td className="px-2 py-1.5 font-medium">{r.period}</td>
                  <td className="px-2 py-1.5"><ColoredCell value={fmt(r.total_return_pct)} /></td>
                  <td className="px-2 py-1.5"><ColoredCell value={fmt(r.cagr_pct)} /></td>
                  <td className="px-2 py-1.5"><ColoredCell value={fmt(r.sharpe)} /></td>
                  <td className="px-2 py-1.5"><ColoredCell value={fmt(r.sortino)} /></td>
                  <td className="px-2 py-1.5"><ColoredCell value={fmt(r.volatility_pct)} /></td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="px-2 py-4 text-center text-muted-foreground">No period data available</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Statistics Panel */}
      {stats && (
        <Card>
          <CardHeader className="pb-1 py-2 px-3">
            <CardTitle className="text-[11px]">Period Statistics</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-y divide-border/30">
              {[
                { label: "Hit Rate", value: `${stats.hitRate}%` },
                { label: "Max Return", value: `${stats.max}%` },
                { label: "Min Return", value: `${stats.min}%` },
                { label: "Average", value: `${stats.avg}%` },
                { label: "Median", value: `${stats.median}%` },
                { label: "25th Pct", value: `${stats.p25}%` },
                { label: "75th Pct", value: `${stats.p75}%` },
                { label: "Periods", value: stats.count },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 text-center">
                  <div className="text-[9px] text-muted-foreground">{label}</div>
                  <div className={`text-sm font-semibold tabular-nums mt-0.5 ${
                    typeof value === "string" && value.startsWith("-") ? "text-red-400" : ""
                  }`}>{value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Return Decomposition Stacked Bar */}
      {decompBarData.length > 0 && (
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Return Decomposition by Period</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent className="p-2">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={decompBarData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="period" tick={{ fontSize: 8, fill: "#71717a" }} tickLine={false} axisLine={{ stroke: "#27272a" }} />
                <YAxis tick={{ fontSize: 8, fill: "#71717a" }} tickLine={false} axisLine={{ stroke: "#27272a" }}
                  tickFormatter={(v) => `${v.toFixed(1)}%`} width={40} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: "#a1a1aa" }}
                  formatter={(v) => [`${Number(v).toFixed(2)}%`]}
                />
                <Legend wrapperStyle={{ fontSize: 9, paddingTop: 4 }} />
                {Object.entries(STACKED_COLORS).map(([key, color]) => (
                  <Bar key={key} dataKey={key} stackId="a" fill={color}
                    name={key.replace(/_pct$/, "").replace(/_/g, " ")} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
