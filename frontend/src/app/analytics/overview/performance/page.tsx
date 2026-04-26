"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Filter, Info, Maximize2, BarChart3, RefreshCw } from "lucide-react";

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

function ChartPlaceholder({ title, subtitle, height = "h-52" }: { title: string; subtitle?: string; height?: string }) {
  return (
    <Card>
      <CardHeader className="pb-1 flex-row items-center justify-between">
        <CardTitle className="text-xs">{title}</CardTitle>
        <CardControls />
      </CardHeader>
      <CardContent>
        <div className={`${height} flex items-center justify-center border border-dashed border-border/50 rounded-lg`}>
          <div className="text-center text-muted-foreground">
            <BarChart3 className="h-6 w-6 mx-auto mb-1.5 opacity-30" />
            <p className="text-[10px]">{subtitle || title}</p>
            <div className="flex gap-3 justify-center mt-2">
              {["Active", "Benchmark", "Main"].map((l, i) => (
                <span key={l} className="flex items-center gap-1 text-[8px]">
                  <span className="w-2 h-0.5 rounded" style={{ backgroundColor: ["#f97316", "#eab308", "#10b981"][i] }} />
                  {l}
                </span>
              ))}
            </div>
          </div>
        </div>
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
        {/* Row 1: Summary Tables */}
        <SummaryTable
          title="Profit and Loss Summary"
          rows={[
            { label: "Total Return (%)", active: "18.97%", benchmark: "9.57%", excess: "9.40%" },
            { label: "CAGR (%)", active: "5.07%", benchmark: "0.07%", excess: "5.00%" },
            { label: "Sharpe Ratio", active: "0.52", benchmark: "0.13", excess: "0.39" },
            { label: "Treynor Ratio", active: "4.93", benchmark: "0.07", excess: "4.86" },
          ]}
        />
        <SummaryTable
          title="Risk Summary"
          rows={[
            { label: "Realized Risk (%)", active: "14.5%", benchmark: "16.2%" },
            { label: "Total Predicted Risk (%)", active: "12.8%", benchmark: "14.1%" },
            { label: "Factor Predicted Risk (%)", active: "8.2%", benchmark: "12.5%" },
            { label: "Portfolio Concentration", active: "0.042", benchmark: "0.018" },
          ]}
          hasExcess={false}
        />
        <SummaryTable
          title="Valuation Summary"
          rows={[
            { label: "P/E Ratio", active: "22.5", benchmark: "19.8" },
            { label: "Return on Equity (%)", active: "18.2%", benchmark: "15.7%" },
          ]}
          hasExcess={false}
        />

        {/* Row 2: Charts */}
        <ChartPlaceholder title="Total Return (%)" subtitle="Cumulative return: Active vs Benchmark vs Main" />
        <ChartPlaceholder title="Rolling 1Y Realized Risk (%)" subtitle="Active vs Benchmark risk over time" />
        <ChartPlaceholder title="PE Ratio" subtitle="Portfolio P/E vs Benchmark over time" />
      </div>
    </div>
  );
}
