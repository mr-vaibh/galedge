"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Filter, Info, Maximize2, RefreshCw } from "lucide-react";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";

function CardControls() {
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-6 w-6"><Filter className="h-3 w-3" /></Button>
      <Button variant="ghost" size="icon" className="h-6 w-6"><Info className="h-3 w-3" /></Button>
      <Button variant="ghost" size="icon" className="h-6 w-6"><Maximize2 className="h-3 w-3" /></Button>
      <Button variant="ghost" size="icon" className="h-6 w-6"><Download className="h-3 w-3" /></Button>
    </div>
  );
}

function MetricRow({ label, active, benchmark, excess }: { label: string; active: string; benchmark: string; excess?: string }) {
  return (
    <tr className="border-b border-border/30 hover:bg-muted/20">
      <td className="px-2 py-1.5 text-[10px] text-muted-foreground">{label}</td>
      <td className="px-2 py-1.5 text-[10px] tabular-nums text-right">{active}</td>
      <td className="px-2 py-1.5 text-[10px] tabular-nums text-right">{benchmark}</td>
      {excess !== undefined && (
        <td className={`px-2 py-1.5 text-[10px] tabular-nums text-right ${parseFloat(excess) >= 0 ? "text-emerald-400" : "text-red-400"}`}>{excess}</td>
      )}
    </tr>
  );
}

function SummaryTable({ title, rows, hasExcess = true }: { title: string; rows: { label: string; active: string; benchmark: string; excess?: string }[]; hasExcess?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-1 flex-row items-center justify-between">
        <CardTitle className="text-xs">{title}</CardTitle>
        <CardControls />
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50">
              <th className="px-2 py-1.5 text-left text-[9px] font-medium text-muted-foreground" />
              <th className="px-2 py-1.5 text-right text-[9px] font-medium text-muted-foreground">Active</th>
              <th className="px-2 py-1.5 text-right text-[9px] font-medium text-muted-foreground">Benchmark</th>
              {hasExcess && <th className="px-2 py-1.5 text-right text-[9px] font-medium text-muted-foreground">Excess</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <MetricRow key={r.label} {...r} />
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

function ChartPanel({ title, data, series, yFmt }: {
  title: string;
  data: Record<string, unknown>[];
  series: { key: string; name: string; color: string }[];
  yFmt?: (v: number) => string;
}) {
  return (
    <Card>
      <CardHeader className="pb-1 flex-row items-center justify-between">
        <CardTitle className="text-xs">{title}</CardTitle>
        <CardControls />
      </CardHeader>
      <CardContent className="p-2">
        <TimeSeriesChart data={data} series={series} height={180} yFormatter={yFmt} />
      </CardContent>
    </Card>
  );
}

// ── Period Selector (global, like screenshots) ───────────────────────────────
function PeriodSelector() {
  const periods = ["1D", "1M", "3M", "6M", "1Y", "WTD", "MTD", "QTD", "YTD"];
  const [active, setActive] = useState("1Y");
  return (
    <div className="flex items-center gap-1 bg-card border rounded-lg p-0.5">
      {periods.map((p) => (
        <Button
          key={p}
          variant={active === p ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActive(p)}
          className="h-6 text-[10px] px-2"
        >
          {p}
        </Button>
      ))}
      <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 ml-1">Custom Periods</Button>
    </div>
  );
}

export default function PerformanceSummaryPage() {
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [equityCurve, setEquityCurve] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/backtest/quick?universe=NIFTY%2050&start=2025-06-01&end=2026-04-24&frequency=Monthly&method=equal`, { method: "POST" })
      .then(r => r.json())
      .then(data => {
        setMetrics(data.metrics);
        setEquityCurve(data.equity_curve || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Derive chart data from equity curve
  const perfData = equityCurve.map(e => ({
    date: String(e.date),
    active: Number(e.value) / 100000, // normalize to 100 base
  }));

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Performance Summary</h1>
        <div className="flex items-center gap-3">
          <PeriodSelector />
          <Button variant="outline" size="sm" className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Analytics sub-nav tabs */}
      <Tabs defaultValue="performance">
        <TabsList className="h-8">
          <TabsTrigger value="performance" className="text-xs h-7">Performance Summary</TabsTrigger>
          <TabsTrigger value="peer" className="text-xs h-7">Peer Comparison</TabsTrigger>
          <TabsTrigger value="holdings" className="text-xs h-7">Holdings Summary</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 6-Panel Grid (2 rows x 3 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Row 1: Summary Tables — from live backtest data */}
        <SummaryTable
          title="Profit and Loss Summary"
          rows={metrics ? [
            { label: "Total Return (%)", active: `${metrics.total_return}%`, benchmark: "—", excess: `${metrics.total_return}%` },
            { label: "CAGR (%)", active: `${metrics.cagr}%`, benchmark: "—", excess: `${metrics.cagr}%` },
            { label: "Sharpe Ratio", active: `${metrics.sharpe_ratio}`, benchmark: "—", excess: "—" },
            { label: "Avg Positions", active: `${metrics.avg_positions}`, benchmark: "—" },
          ] : [
            { label: "Total Return (%)", active: loading ? "..." : "—", benchmark: "—" },
          ]}
        />
        <SummaryTable
          title="Risk Summary"
          rows={metrics ? [
            { label: "Max Drawdown (%)", active: `${metrics.max_drawdown}%`, benchmark: "—" },
            { label: "Avg Turnover (%)", active: `${metrics.avg_turnover}%`, benchmark: "—" },
            { label: "Tx Cost Drag (%)", active: `${metrics.transaction_cost_drag}%`, benchmark: "—" },
          ] : [
            { label: "Max Drawdown (%)", active: loading ? "..." : "—", benchmark: "—" },
          ]}
          hasExcess={false}
        />
        <SummaryTable
          title="Portfolio Summary"
          rows={metrics ? [
            { label: "Initial Capital", active: `₹${(Number(metrics.initial_capital) / 1e7).toFixed(2)} Cr`, benchmark: "—" },
            { label: "Final Value", active: `₹${(Number(metrics.final_value) / 1e7).toFixed(2)} Cr`, benchmark: "—" },
            { label: "Total Trades", active: `${metrics.total_trades}`, benchmark: "—" },
            { label: "Rebalances", active: `${metrics.total_rebalances}`, benchmark: "—" },
          ] : [
            { label: "Initial Capital", active: loading ? "..." : "—", benchmark: "—" },
          ]}
          hasExcess={false}
        />

        {/* Row 2: Charts — from live equity curve */}
        <ChartPanel
          title="Portfolio Value (₹ Lakhs)"
          data={perfData}
          series={[
            { key: "active", name: "Portfolio", color: "#f97316" },
          ]}
          yFmt={(v) => `${v.toFixed(0)}L`}
        />
        <ChartPanel
          title="Drawdown (%)"
          data={equityCurve.map(e => ({ date: String(e.date), drawdown: Number(e.drawdown) }))}
          series={[
            { key: "drawdown", name: "Drawdown", color: "#ef4444" },
          ]}
        />
        <ChartPanel
          title="Portfolio Value Trend"
          data={equityCurve.map((e, i) => ({
            date: String(e.date),
            value: Number(e.value),
          }))}
          series={[
            { key: "value", name: "Value", color: "#10b981" },
          ]}
          yFmt={(v) => `${(v / 1e7).toFixed(2)}Cr`}
        />
      </div>
    </div>
  );
}
