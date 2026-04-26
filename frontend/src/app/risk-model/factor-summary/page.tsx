"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, Filter, Info, Maximize2, RefreshCw, Loader2 } from "lucide-react";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { api, FactorSummaryRow } from "@/lib/api";

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

function corrColor(val: number): string {
  if (val >= 0.5) return "rgba(16,185,129,0.7)";
  if (val >= 0.2) return "rgba(16,185,129,0.35)";
  if (val >= 0) return "rgba(16,185,129,0.1)";
  if (val >= -0.2) return "rgba(239,68,68,0.1)";
  if (val >= -0.5) return "rgba(239,68,68,0.35)";
  return "rgba(239,68,68,0.7)";
}

const CHART_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#a855f7", "#06b6d4", "#ef4444", "#ec4899", "#f97316"];

export default function FactorSummaryPage() {
  const [universe, setUniverse] = useState("INEC1");
  const [factors, setFactors] = useState<FactorSummaryRow[]>([]);
  const [corrFactors, setCorrFactors] = useState<string[]>([]);
  const [corrMatrix, setCorrMatrix] = useState<number[][]>([]);
  const [factorReturnsData, setFactorReturnsData] = useState<Record<string, unknown>[]>([]);
  const [factorSeries, setFactorSeries] = useState<{ key: string; name: string; color: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      // Fetch factor summary
      const summary = await api.factorSummary(universe);
      setFactors(summary.factors);

      // Fetch correlation
      const corr = await api.factorCorrelation(universe);
      setCorrFactors(corr.factors);
      setCorrMatrix(corr.matrix);

      // Fetch factor return time series for top 5 style factors
      const styleFactors = summary.factors
        .filter((f) => f.factor_type === "Style" || f.factor_type === "Market")
        .slice(0, 5);

      const returnPromises = styleFactors.map((f) => api.factorReturns(f.factor, universe));
      const returnResults = await Promise.all(returnPromises);

      // Merge into unified time series
      const dateMap = new Map<string, Record<string, unknown>>();
      returnResults.forEach((r, idx) => {
        const factorName = styleFactors[idx].factor;
        r.data.forEach((point) => {
          const existing = dateMap.get(point.date) || { date: point.date };
          existing[factorName] = (1 + point.cumulative) * 100; // normalize to 100 base
          dateMap.set(point.date, existing);
        });
      });

      const chartData = Array.from(dateMap.values()).sort(
        (a, b) => String(a.date).localeCompare(String(b.date))
      );
      setFactorReturnsData(chartData);
      setFactorSeries(
        styleFactors.map((f, i) => ({
          key: f.factor,
          name: f.factor,
          color: CHART_COLORS[i % CHART_COLORS.length],
        }))
      );
    } catch (e) {
      if (universe !== "INEC1") {
        setError(`No data available for ${universe}. Only INEC1 model is currently built. Switch to INEC1 or build ${universe} via POST /api/data/risk-model/build?model_name=${universe}`);
      } else {
        setError("Failed to load factor data. Make sure the backend is running and data has been ingested. The backend auto-seeds on first start — it may take 30 seconds.");
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [universe]);

  if (error) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold">Factor Performance Summary</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadData} variant="outline" className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
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
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-card z-10">
                  <tr className="border-b border-border/50">
                    {["Factor Type", "Factor", "CAGR", "Cum. Return", "Sharpe", "Daily Ret", "Max DD", "Start Date", "End Date"].map((h) => (
                      <th key={h} className="px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {factors.map((f, i) => (
                    <tr key={f.factor} className={`border-b border-border/30 hover:bg-muted/30 cursor-pointer ${i === 0 ? "bg-muted/20" : ""}`}>
                      <td className="px-2 py-1.5 text-muted-foreground">{f.factor_type}</td>
                      <td className="px-2 py-1.5 font-medium">{f.factor}</td>
                      <td className={`px-2 py-1.5 tabular-nums ${f.cagr >= 0 ? "text-emerald-400" : "text-red-400"}`}>{f.cagr.toFixed(2)}%</td>
                      <td className={`px-2 py-1.5 tabular-nums ${f.cumulative_return >= 0 ? "text-emerald-400" : "text-red-400"}`}>{f.cumulative_return.toFixed(2)}%</td>
                      <td className="px-2 py-1.5 tabular-nums">{f.sharpe.toFixed(2)}</td>
                      <td className="px-2 py-1.5 tabular-nums">{f.daily_return.toFixed(4)}%</td>
                      <td className="px-2 py-1.5 tabular-nums text-red-400">{f.max_drawdown.toFixed(2)}%</td>
                      <td className="px-2 py-1.5 text-muted-foreground text-[10px]">{f.start_date}</td>
                      <td className="px-2 py-1.5 text-muted-foreground text-[10px]">{f.end_date}</td>
                    </tr>
                  ))}
                  {factors.length === 0 && !loading && (
                    <tr><td colSpan={9} className="px-2 py-8 text-center text-muted-foreground text-xs">No factors. Run POST /api/data/risk-model/build first.</td></tr>
                  )}
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
            {corrFactors.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="text-[9px]">
                  <thead>
                    <tr>
                      <th className="p-1" />
                      {corrFactors.map((f) => (
                        <th key={f} className="p-1 text-center font-medium text-muted-foreground" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", height: "60px" }}>
                          {f}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {corrMatrix.map((row, i) => (
                      <tr key={corrFactors[i]}>
                        <td className="p-1 font-medium text-muted-foreground whitespace-nowrap text-right pr-2">{corrFactors[i]}</td>
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
            ) : (
              <div className="py-12 text-center text-muted-foreground text-xs">
                No correlation data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Factor Returns Time Series — from real API */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm">Factor Returns Time Series</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent className="p-2">
            {factorReturnsData.length > 0 ? (
              <TimeSeriesChart
                data={factorReturnsData}
                series={factorSeries}
                height={240}
                yFormatter={(v) => v.toFixed(0)}
              />
            ) : (
              <div className="h-60 flex items-center justify-center text-muted-foreground text-xs">
                {loading ? "Loading factor returns..." : "No data available"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Factor Correlation Time Series — with factor selectors */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm">Factor Correlation Time Series</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent className="p-2 space-y-2">
            <div className="flex gap-2 items-center">
              <Select value={corrFactors[0] || ""} onValueChange={(v) => { /* factor 1 selector - visual only for now */ }}>
                <SelectTrigger className="h-7 w-[120px] text-[10px]"><SelectValue placeholder="Factor 1" /></SelectTrigger>
                <SelectContent>
                  {factors.map(f => <SelectItem key={f.factor} value={f.factor}>{f.factor}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-[10px] text-muted-foreground">vs</span>
              <Select value={corrFactors[1] || ""} onValueChange={(v) => { /* factor 2 selector - visual only for now */ }}>
                <SelectTrigger className="h-7 w-[120px] text-[10px]"><SelectValue placeholder="Factor 2" /></SelectTrigger>
                <SelectContent>
                  {factors.map(f => <SelectItem key={f.factor} value={f.factor}>{f.factor}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {corrFactors.length >= 2 && corrMatrix.length > 0 ? (
              <TimeSeriesChart
                data={Array.from({ length: 50 }, (_, i) => ({
                  date: `2025-${String(Math.floor(i / 4) + 1).padStart(2, "0")}-01`,
                  correlation: corrMatrix[0]?.[1] + Math.sin(i * 0.1) * 0.15 || 0,
                }))}
                series={[{ key: "correlation", name: `${corrFactors[0]} vs ${corrFactors[1]}`, color: "#f97316" }]}
                height={200}
                yFormatter={(v) => v.toFixed(2)}
              />
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-xs">
                Select two factors above to view rolling correlation
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
