"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Filter, Info, Maximize2 } from "lucide-react";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { BarChartPanel } from "@/components/charts/BarChartPanel";

function CardControls() {
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-5 w-5"><Filter className="h-2.5 w-2.5" /></Button>
      <Button variant="ghost" size="icon" className="h-5 w-5"><Info className="h-2.5 w-2.5" /></Button>
      <Button variant="ghost" size="icon" className="h-5 w-5"><Maximize2 className="h-2.5 w-2.5" /></Button>
      <Button variant="ghost" size="icon" className="h-5 w-5"><Download className="h-2.5 w-2.5" /></Button>
    </div>
  );
}

const EVENTS = [
  { name: "2019 election run-up", start: "01-Mar-2019", end: "23-May-2019", portfolioReturn: 4.1, benchmarkReturn: 3.8, excess: 0.3 },
  { name: "GST rollout & demonetisation", start: "08-Nov-2016", end: "30-Jun-2017", portfolioReturn: -2.3, benchmarkReturn: -4.1, excess: 1.8 },
  { name: "COVID outbreak", start: "20-Feb-2020", end: "23-Mar-2020", portfolioReturn: -35.6, benchmarkReturn: -38.2, excess: 2.6 },
  { name: "2024 election whipsaw & rebound", start: "01-May-2024", end: "30-Jun-2024", portfolioReturn: 1.2, benchmarkReturn: -0.5, excess: 1.7 },
  { name: "Oil shock", start: "01-Oct-2018", end: "31-Dec-2018", portfolioReturn: -8.4, benchmarkReturn: -10.1, excess: 1.7 },
  { name: "ILFS NBFC Crisis", start: "01-Sep-2018", end: "28-Feb-2019", portfolioReturn: -12.1, benchmarkReturn: -14.8, excess: 2.7 },
  { name: "Russia-Ukraine conflict", start: "24-Feb-2022", end: "30-Apr-2022", portfolioReturn: -5.2, benchmarkReturn: -6.8, excess: 1.6 },
  { name: "US banking crisis (SVB)", start: "01-Mar-2023", end: "30-Apr-2023", portfolioReturn: -3.1, benchmarkReturn: -2.4, excess: -0.7 },
  { name: "China stimulus & global rally", start: "01-Oct-2022", end: "31-Jan-2023", portfolioReturn: 8.9, benchmarkReturn: 7.2, excess: 1.7 },
  { name: "Post-COVID recovery", start: "23-Mar-2020", end: "31-Dec-2020", portfolioReturn: 68.4, benchmarkReturn: 62.1, excess: 6.3 },
];

function heatColor(pct: number): string {
  if (pct > 5) return "#15803d";
  if (pct > 2) return "#16a34a";
  if (pct > 0) return "#22c55e";
  if (pct > -2) return "#ef4444";
  if (pct > -5) return "#dc2626";
  return "#991b1b";
}

export default function EventSensitivityPage() {
  const [selectedEvent, setSelectedEvent] = useState<string | null>(EVENTS[0].name);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Event Sensitivity</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Event Summary Table */}
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Event Sensitivity Summary</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-[10px]">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border/50">
                    <th className="px-2 py-1.5 w-6" />
                    {["Event", "Start Date", "End Date", "Portfolio", "Benchmark", "Excess"].map((h) => (
                      <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {EVENTS.map((e) => (
                    <tr
                      key={e.name}
                      className={`border-b border-border/30 hover:bg-muted/30 cursor-pointer ${selectedEvent === e.name ? "bg-muted/40" : ""}`}
                      onClick={() => setSelectedEvent(e.name)}
                    >
                      <td className="px-2 py-1">
                        <input type="checkbox" checked={selectedEvent === e.name} readOnly className="h-3 w-3" />
                      </td>
                      <td className="px-2 py-1 font-medium">{e.name}</td>
                      <td className="px-2 py-1 text-muted-foreground">{e.start}</td>
                      <td className="px-2 py-1 text-muted-foreground">{e.end}</td>
                      <td className={`px-2 py-1 tabular-nums ${e.portfolioReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>{e.portfolioReturn.toFixed(1)}%</td>
                      <td className={`px-2 py-1 tabular-nums ${e.benchmarkReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>{e.benchmarkReturn.toFixed(1)}%</td>
                      <td className={`px-2 py-1 tabular-nums ${e.excess >= 0 ? "text-emerald-400" : "text-red-400"}`}>{e.excess >= 0 ? "+" : ""}{e.excess.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Event Returns Treemap */}
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Event Returns (%)</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-1 h-56">
              {EVENTS.map((e) => {
                const size = Math.max(1, Math.abs(e.portfolioReturn));
                return (
                  <div
                    key={e.name}
                    className="rounded p-1.5 flex flex-col justify-between cursor-pointer hover:brightness-110 transition-all"
                    style={{
                      backgroundColor: heatColor(e.portfolioReturn),
                      gridRow: size > 15 ? "span 2" : "span 1",
                    }}
                  >
                    <span className="text-[8px] text-white/80 leading-tight line-clamp-2">{e.name}</span>
                    <span className="text-[10px] font-bold text-white">{e.portfolioReturn >= 0 ? "+" : ""}{e.portfolioReturn.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Event Drill-Down */}
      {selectedEvent && (
        <>
          <div className="text-sm font-medium text-muted-foreground">
            Selected: <span className="text-foreground">{selectedEvent}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                <CardTitle className="text-[11px]">Portfolio & Common Index Returns</CardTitle>
                <CardControls />
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-border/50">
                      {["Index", "Return (%)"].map((h) => (
                        <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[["Portfolio", "4.1%"], ["NIFTY BANK", "3.2%"], ["NIFTY 500", "3.8%"], ["NIFTY MIDCAP 150", "5.1%"], ["NIFTY SMALLCAP 250", "6.2%"]].map((row, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="px-2 py-1">{row[0]}</td>
                        <td className="px-2 py-1 tabular-nums text-emerald-400">{row[1]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                <CardTitle className="text-[11px]">Contributors and Detractors</CardTitle>
                <CardControls />
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-border/50">
                      {["Factor Type", "Factor Name", "Contribution (%)"].map((h) => (
                        <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[["Market", "MARKET", "2.14%"], ["Style", "LTMOM", "0.89%"], ["Industry", "FINLVG", "-0.42%"]].map((row, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="px-2 py-1">{row[0]}</td>
                        <td className="px-2 py-1 font-medium">{row[1]}</td>
                        <td className={`px-2 py-1 tabular-nums ${row[2].startsWith("-") ? "text-red-400" : "text-emerald-400"}`}>{row[2]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
              <CardHeader className="pb-1 py-2 px-3"><CardTitle className="text-[11px]">Event Returns Time Series</CardTitle></CardHeader>
              <CardContent>
                <TimeSeriesChart
                  data={[
                    { date: "2019-03-01", portfolio: 0, benchmark: 0 },
                    { date: "2019-03-08", portfolio: 0.5, benchmark: 0.4 },
                    { date: "2019-03-15", portfolio: 1.2, benchmark: 0.9 },
                    { date: "2019-03-22", portfolio: 1.8, benchmark: 1.5 },
                    { date: "2019-03-29", portfolio: 2.1, benchmark: 1.8 },
                    { date: "2019-04-05", portfolio: 2.5, benchmark: 2.2 },
                    { date: "2019-04-12", portfolio: 2.9, benchmark: 2.6 },
                    { date: "2019-04-19", portfolio: 3.2, benchmark: 2.9 },
                    { date: "2019-04-26", portfolio: 3.5, benchmark: 3.2 },
                    { date: "2019-05-03", portfolio: 3.8, benchmark: 3.5 },
                    { date: "2019-05-10", portfolio: 4.0, benchmark: 3.7 },
                    { date: "2019-05-17", portfolio: 4.1, benchmark: 3.8 },
                  ]}
                  series={[
                    { key: "portfolio", name: "Portfolio", color: "#3b82f6" },
                    { key: "benchmark", name: "Benchmark", color: "#f59e0b" },
                  ]}
                  height={144}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 py-2 px-3"><CardTitle className="text-[11px]">Top 10 Factor Return Contributors</CardTitle></CardHeader>
              <CardContent>
                <BarChartPanel
                  data={[
                    { name: "MARKET", value: 2.14 },
                    { name: "LTMOM", value: 0.89 },
                    { name: "SIZE", value: 0.72 },
                    { name: "GROWTH", value: 0.58 },
                    { name: "VOLTL", value: 0.45 },
                    { name: "BETA", value: 0.38 },
                    { name: "EARNQLTY", value: 0.31 },
                    { name: "PROFIT", value: 0.27 },
                    { name: "DIVYLD", value: 0.22 },
                    { name: "MGMTQLTY", value: 0.18 },
                  ]}
                  height={144}
                  color="#10b981"
                  showNegativeColors={false}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 py-2 px-3"><CardTitle className="text-[11px]">Bottom 10 Factor Return Detractors</CardTitle></CardHeader>
              <CardContent>
                <BarChartPanel
                  data={[
                    { name: "FINLVG", value: -0.42 },
                    { name: "STMOM", value: -0.38 },
                    { name: "VALUE", value: -0.35 },
                    { name: "LIQUIDITY", value: -0.29 },
                    { name: "EARNVAR", value: -0.24 },
                    { name: "LEVERAGE", value: -0.21 },
                    { name: "RESVOL", value: -0.18 },
                    { name: "BTOP", value: -0.15 },
                    { name: "INDMOM", value: -0.12 },
                    { name: "SEASON", value: -0.08 },
                  ]}
                  height={144}
                  color="#ef4444"
                  showNegativeColors={false}
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
