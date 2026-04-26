"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Filter, Info, Maximize2 } from "lucide-react";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";

function CC() {
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-5 w-5"><Filter className="h-2.5 w-2.5" /></Button>
      <Button variant="ghost" size="icon" className="h-5 w-5"><Info className="h-2.5 w-2.5" /></Button>
      <Button variant="ghost" size="icon" className="h-5 w-5"><Maximize2 className="h-2.5 w-2.5" /></Button>
      <Button variant="ghost" size="icon" className="h-5 w-5"><Download className="h-2.5 w-2.5" /></Button>
    </div>
  );
}

const sampleData = Array.from({ length: 60 }, (_, i) => ({
  date: `2025-${String(Math.floor(i / 5) + 1).padStart(2, "0")}-${String((i % 5) * 6 + 1).padStart(2, "0")}`,
  active: 100 + Math.random() * 40 + i * 0.5,
  benchmark: 100 + Math.random() * 30 + i * 0.3,
  main: 100 + Math.random() * 35 + i * 0.4,
}));

const LITE_FACTORS = ["APLTP", "CAPGOODS", "DIVYILD", "EARNYILD", "FINLVG"];

export default function LiteAnalyticsPage() {
  const [selectedFactors, setSelectedFactors] = useState(new Set(LITE_FACTORS));

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Performance Summary</h1>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Download className="h-3 w-3" /> Download Holdings
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* P&L Summary */}
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Profit and Loss Summary</CardTitle>
            <CC />
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="px-2 py-1.5 text-left text-muted-foreground" />
                  <th className="px-2 py-1.5 text-right text-muted-foreground">Active</th>
                  <th className="px-2 py-1.5 text-right text-muted-foreground">Benchmark</th>
                </tr>
              </thead>
              <tbody>
                {[["Total Return (%)", "18.97%", "9.57%"], ["CAGR (%)", "5.07%", "0.07%"], ["Sharpe", "0.52", "0.13"]].map(([l, a, b], i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="px-2 py-1 text-muted-foreground">{l}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{a}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Risk Summary */}
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Risk Summary</CardTitle>
            <CC />
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="px-2 py-1.5 text-left text-muted-foreground" />
                  <th className="px-2 py-1.5 text-right text-muted-foreground">Active</th>
                  <th className="px-2 py-1.5 text-right text-muted-foreground">Benchmark</th>
                </tr>
              </thead>
              <tbody>
                {[["Realized Risk (%)", "14.5%", "16.2%"], ["Predicted Risk (%)", "12.8%", "14.1%"]].map(([l, a, b], i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="px-2 py-1 text-muted-foreground">{l}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{a}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Factor Return Contribution */}
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Factor Return Contribution</CardTitle>
            <CC />
          </CardHeader>
          <CardContent className="p-2">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {LITE_FACTORS.map((f) => (
                <label key={f} className="flex items-center gap-1 text-[9px] cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-3 w-3"
                    checked={selectedFactors.has(f)}
                    onChange={() => {
                      const next = new Set(selectedFactors);
                      if (next.has(f)) next.delete(f); else next.add(f);
                      setSelectedFactors(next);
                    }}
                  />
                  {f}
                </label>
              ))}
            </div>
            <div className="text-[9px] text-muted-foreground">{selectedFactors.size}/{LITE_FACTORS.length} Selected</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Total Return (%)</CardTitle>
            <CC />
          </CardHeader>
          <CardContent className="p-2">
            <TimeSeriesChart
              data={sampleData}
              series={[
                { key: "active", name: "Active", color: "#f97316" },
                { key: "benchmark", name: "Benchmark", color: "#eab308" },
                { key: "main", name: "Main", color: "#10b981" },
              ]}
              height={200}
              yFormatter={(v) => v.toFixed(0)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Total Predicted Risk (%)</CardTitle>
            <CC />
          </CardHeader>
          <CardContent className="p-2">
            <TimeSeriesChart
              data={sampleData.map(d => ({ date: d.date, active: 10 + Math.random() * 8, benchmark: 12 + Math.random() * 6 }))}
              series={[
                { key: "active", name: "Active", color: "#f97316" },
                { key: "benchmark", name: "Benchmark", color: "#eab308" },
              ]}
              height={200}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Factor P/L Time Series — CAPGOODS</CardTitle>
            <CC />
          </CardHeader>
          <CardContent className="p-2">
            <TimeSeriesChart
              data={sampleData.map(d => ({ date: d.date, factor: Math.random() * 5 - 2 }))}
              series={[{ key: "factor", name: "CAPGOODS", color: "#a855f7" }]}
              height={200}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
