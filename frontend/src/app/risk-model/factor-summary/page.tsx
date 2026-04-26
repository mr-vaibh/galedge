"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, Filter, Info, Maximize2 } from "lucide-react";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";

// ── Sample factor data (will be replaced with API data) ──────────────────────

const FACTORS = [
  { type: "Market", name: "MARKET", cagr: 12.48, cumReturn: 316.92, sharpe: 0.62, dailyReturn: 0.05, maxDD: -38.12, start: "01-Jan-2013", end: "20-Mar-2026" },
  { type: "Style", name: "BETA", cagr: -1.67, cumReturn: -19.46, sharpe: -0.15, dailyReturn: -0.01, maxDD: -43.97, start: "01-Jan-2013", end: "20-Mar-2026" },
  { type: "Style", name: "SIZE", cagr: 4.43, cumReturn: 73.84, sharpe: 0.52, dailyReturn: 0.02, maxDD: -15.42, start: "01-Jan-2013", end: "20-Mar-2026" },
  { type: "Style", name: "EARNYILD", cagr: 1.98, cumReturn: 28.76, sharpe: 0.24, dailyReturn: 0.01, maxDD: -20.31, start: "01-Jan-2013", end: "20-Mar-2026" },
  { type: "Style", name: "LTMOM", cagr: 5.22, cumReturn: 90.18, sharpe: 0.58, dailyReturn: 0.02, maxDD: -12.88, start: "01-Jan-2013", end: "20-Mar-2026" },
  { type: "Style", name: "LIQUIDITY", cagr: -2.34, cumReturn: -26.52, sharpe: -0.21, dailyReturn: -0.01, maxDD: -48.76, start: "01-Jan-2013", end: "20-Mar-2026" },
  { type: "Style", name: "FINLVG", cagr: -0.89, cumReturn: -11.24, sharpe: -0.08, dailyReturn: -0.00, maxDD: -35.62, start: "01-Jan-2013", end: "20-Mar-2026" },
  { type: "Style", name: "PROFIT", cagr: 3.12, cumReturn: 48.15, sharpe: 0.38, dailyReturn: 0.01, maxDD: -18.94, start: "01-Jan-2013", end: "20-Mar-2026" },
  { type: "Style", name: "GROWTH", cagr: 0.67, cumReturn: 9.12, sharpe: 0.07, dailyReturn: 0.00, maxDD: -22.47, start: "01-Jan-2013", end: "20-Mar-2026" },
  { type: "Style", name: "DIVYILD", cagr: 1.45, cumReturn: 20.18, sharpe: 0.18, dailyReturn: 0.01, maxDD: -25.33, start: "01-Jan-2013", end: "20-Mar-2026" },
  { type: "Style", name: "VALUE", cagr: 2.76, cumReturn: 41.89, sharpe: 0.31, dailyReturn: 0.01, maxDD: -19.76, start: "01-Jan-2013", end: "20-Mar-2026" },
];

const CORR_FACTORS = ["AUTOCOMP", "BETA", "CAPGOODS", "CEMENT", "DIVYILD", "EARNYILD", "FINLVG", "GROWTH", "LIQUIDITY", "LTMOM", "MARKET", "PROFIT", "SIZE", "VALUE"];

// Generate sample correlation matrix
function genCorr(): number[][] {
  return CORR_FACTORS.map((_, i) =>
    CORR_FACTORS.map((_, j) => {
      if (i === j) return 1.0;
      const v = (Math.sin(i * 7 + j * 13) * 0.5);
      return Math.round(v * 100) / 100;
    })
  );
}
const CORR_MATRIX = genCorr();

function corrColor(val: number): string {
  if (val >= 0.5) return "rgba(16,185,129,0.7)";
  if (val >= 0.2) return "rgba(16,185,129,0.35)";
  if (val >= 0) return "rgba(16,185,129,0.1)";
  if (val >= -0.2) return "rgba(239,68,68,0.1)";
  if (val >= -0.5) return "rgba(239,68,68,0.35)";
  return "rgba(239,68,68,0.7)";
}

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

export default function FactorSummaryPage() {
  const [universe, setUniverse] = useState("INEC1");

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">Factor Performance Summary</h1>
          <span className="text-sm text-muted-foreground">—</span>
          <Select value={universe} onValueChange={(v) => v && setUniverse(v)}>
            <SelectTrigger className="w-[140px] h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="INEC1">INEC1</SelectItem>
              <SelectItem value="INEC2">INEC2</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> Download Raw Data
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Factor Performance Table */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm">Factor Performance Summary</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border/50">
                    {["Factor Type", "Factor", "CAGR", "Cum. Return", "Sharpe", "Daily Ret", "Max DD", "Start Date", "End Date"].map((h) => (
                      <th key={h} className="px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FACTORS.map((f, i) => (
                    <tr key={f.name} className={`border-b border-border/30 hover:bg-muted/30 cursor-pointer ${i === 0 ? "bg-muted/20" : ""}`}>
                      <td className="px-2 py-1.5 text-muted-foreground">{f.type}</td>
                      <td className="px-2 py-1.5 font-medium">{f.name}</td>
                      <td className={`px-2 py-1.5 tabular-nums ${f.cagr >= 0 ? "text-emerald-400" : "text-red-400"}`}>{f.cagr.toFixed(2)}%</td>
                      <td className={`px-2 py-1.5 tabular-nums ${f.cumReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>{f.cumReturn.toFixed(2)}%</td>
                      <td className="px-2 py-1.5 tabular-nums">{f.sharpe.toFixed(2)}</td>
                      <td className="px-2 py-1.5 tabular-nums">{f.dailyReturn.toFixed(2)}%</td>
                      <td className="px-2 py-1.5 tabular-nums text-red-400">{f.maxDD.toFixed(2)}%</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{f.start}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{f.end}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Factor Correlation Heatmap */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm">Factor Correlation</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent className="p-2">
            <div className="overflow-x-auto">
              <table className="text-[9px]">
                <thead>
                  <tr>
                    <th className="p-1" />
                    {CORR_FACTORS.map((f) => (
                      <th key={f} className="p-1 text-center font-medium text-muted-foreground -rotate-45 origin-center h-12 w-8">
                        <span className="inline-block transform">{f}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CORR_MATRIX.map((row, i) => (
                    <tr key={CORR_FACTORS[i]}>
                      <td className="p-1 font-medium text-muted-foreground whitespace-nowrap text-right pr-2">{CORR_FACTORS[i]}</td>
                      {row.map((val, j) => (
                        <td
                          key={j}
                          className="p-0.5 text-center tabular-nums"
                          style={{ backgroundColor: corrColor(val), minWidth: "28px" }}
                        >
                          {val.toFixed(2)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Factor Returns Time Series */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm">Factor Returns Time Series</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent className="p-2">
            <TimeSeriesChart
              data={Array.from({ length: 120 }, (_, i) => ({
                date: `2024-${String(Math.floor(i / 10) + 1).padStart(2, "0")}-${String((i % 10) * 3 + 1).padStart(2, "0")}`,
                MARKET: 100 + i * 0.3 + Math.sin(i * 0.1) * 10,
                BETA: 100 - i * 0.05 + Math.cos(i * 0.15) * 5,
                SIZE: 100 + i * 0.15 + Math.sin(i * 0.2) * 4,
                LTMOM: 100 + i * 0.2 + Math.sin(i * 0.08) * 8,
                EARNYILD: 100 + i * 0.08 + Math.cos(i * 0.12) * 3,
              }))}
              series={[
                { key: "MARKET", name: "MARKET", color: "#10b981" },
                { key: "BETA", name: "BETA", color: "#3b82f6" },
                { key: "SIZE", name: "SIZE", color: "#f59e0b" },
                { key: "LTMOM", name: "LTMOM", color: "#a855f7" },
                { key: "EARNYILD", name: "EARNYILD", color: "#06b6d4" },
              ]}
              height={240}
              yFormatter={(v) => v.toFixed(0)}
            />
          </CardContent>
        </Card>

        {/* Factor Correlation Time Series */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm">Factor Correlation Time Series — BETA vs SIZE</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent className="p-2">
            <TimeSeriesChart
              data={Array.from({ length: 120 }, (_, i) => ({
                date: `2024-${String(Math.floor(i / 10) + 1).padStart(2, "0")}-${String((i % 10) * 3 + 1).padStart(2, "0")}`,
                correlation: Math.sin(i * 0.05) * 0.3 + 0.15,
              }))}
              series={[{ key: "correlation", name: "BETA vs SIZE", color: "#f97316" }]}
              height={240}
              yFormatter={(v) => v.toFixed(2)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
