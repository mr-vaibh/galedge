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
import { RefreshCw, Loader2, Download } from "lucide-react";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";

import { api, FactorSummaryRow } from "@/lib/api";
import { CardControls } from "@/components/CardControls";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

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
  const [corrPair, setCorrPair] = useState<[string, string]>(["", ""]);
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
      if (corr.factors.length >= 2) {
        setCorrPair([corr.factors[0], corr.factors[1]]);
      }

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
      // Auto-build the model if it doesn't exist
      try {
        setError(null);
        setLoading(true);
        await fetch(`${API_BASE}/api/data/risk-model/build?model_name=${universe}`, { method: "POST" });
        // Retry loading after build
        const summary = await api.factorSummary(universe);
        setFactors(summary.factors);
        const corr = await api.factorCorrelation(universe);
        setCorrFactors(corr.factors);
        setCorrMatrix(corr.matrix);
        if (corr.factors.length >= 2) {
          setCorrPair([corr.factors[0], corr.factors[1]]);
        }
      } catch {
        setError("Failed to load or build factor data. Make sure the backend is running and data has been ingested.");
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
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            if (factors.length > 0) {
              const { downloadCSV } = require("@/lib/csv");
              downloadCSV(factors.map(f => ({
                Factor_Type: f.factor_type,
                Factor: f.factor,
                CAGR: f.cagr,
                Cumulative_Return: f.cumulative_return,
                Sharpe: f.sharpe,
                Daily_Return: f.daily_return,
                Max_Drawdown: f.max_drawdown,
                Start: f.start_date,
                End: f.end_date,
              })), `factor_summary_${universe}`);
            }
          }}
          disabled={factors.length === 0}
        >
          <Download className="h-3.5 w-3.5" /> Download Raw Data
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Factor Performance Table */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm">Factor Performance Summary</CardTitle>
            <CardControls data={factors.map(f => ({...f}))} filename="factors" title="Factor Performance Summary" info="CAGR, cumulative return, Sharpe ratio, and max drawdown for each factor in the risk model." expandContent={
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
                    <tr><td colSpan={9} className="px-2 py-8 text-center text-muted-foreground text-xs">No factor data yet. Upload a portfolio first — the risk model builds automatically.</td></tr>
                  )}
                </tbody>
              </table>
            } />
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
                    <tr><td colSpan={9} className="px-2 py-8 text-center text-muted-foreground text-xs">No factor data yet. Upload a portfolio first — the risk model builds automatically.</td></tr>
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
            <CardControls title="Factor Correlation" info="Pairwise correlation matrix between all factors. Red = negative, green = positive correlation." fullscreen expandContent={
              corrFactors.length > 0 ? (
                <div className="w-full h-full overflow-auto">
                  <table className="w-full h-full text-[10px]" style={{ tableLayout: "fixed" }}>
                    <colgroup>
                      <col style={{ width: "90px" }} />
                      {corrFactors.map((f) => <col key={f} />)}
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="p-1" />
                        {corrFactors.map((f) => (
                          <th key={f} className="p-1 text-center font-medium text-muted-foreground" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", height: "70px" }}>
                            {f}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {corrMatrix.map((row, i) => (
                        <tr key={corrFactors[i]}>
                          <td className="p-1 font-medium text-muted-foreground whitespace-nowrap text-right pr-2 text-[9px]">{corrFactors[i]}</td>
                          {row.map((val, j) => (
                            <td key={j} className="text-center tabular-nums" style={{ backgroundColor: corrColor(val) }}>
                              {val.toFixed(2)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : undefined
            } />
          </CardHeader>
          <CardContent className="p-1">
            {corrFactors.length > 0 ? (
              <table style={{ width: "100%", tableLayout: "fixed", fontSize: "6.5px", borderCollapse: "collapse" }}>
                <colgroup>
                  <col style={{ width: "52px" }} />
                  {corrFactors.map((f) => <col key={f} />)}
                </colgroup>
                <thead>
                  <tr>
                    <th />
                    {corrFactors.map((f) => (
                      <th key={f} style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", height: "52px", fontWeight: 500, color: "var(--muted-foreground)", textAlign: "center", verticalAlign: "bottom", paddingBottom: "2px" }}>
                        {f}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {corrMatrix.map((row, i) => (
                    <tr key={corrFactors[i]}>
                      <td style={{ textAlign: "right", paddingRight: "4px", fontWeight: 500, color: "var(--muted-foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {corrFactors[i]}
                      </td>
                      {row.map((val, j) => (
                        <td key={j} style={{ textAlign: "center", backgroundColor: corrColor(val), padding: "1px 0" }}>
                          {val.toFixed(2)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
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
            <CardControls filename="factor_returns_ts" title="Factor Returns Time Series" info="Cumulative factor returns over time. Shows how each factor performed historically." fullscreen expandContent={
              factorReturnsData.length > 0 ? (
                <TimeSeriesChart
                  data={factorReturnsData}
                  series={factorSeries}
                  height={600}
                  yFormatter={(v) => v.toFixed(0)}
                />
              ) : undefined
            } />
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
            <CardControls title="Factor Correlation Time Series" info="Select two factors to see their correlation value. Strong (>0.7), moderate (0.3-0.7), or weak (<0.3)." expandContent={
              <div className="space-y-2">
                <div className="flex gap-2 items-center">
                  <Select value={corrPair[0]} onValueChange={(v) => { if (typeof v === "string") setCorrPair([v, corrPair[1]]); }}>
                    <SelectTrigger className="h-7 w-[120px] text-[10px]"><SelectValue placeholder="Factor 1" /></SelectTrigger>
                    <SelectContent>
                      {corrFactors.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <span className="text-[10px] text-muted-foreground">vs</span>
                  <Select value={corrPair[1]} onValueChange={(v) => { if (typeof v === "string") setCorrPair([corrPair[0], v]); }}>
                    <SelectTrigger className="h-7 w-[120px] text-[10px]"><SelectValue placeholder="Factor 2" /></SelectTrigger>
                    <SelectContent>
                      {corrFactors.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {corrPair[0] && corrPair[1] && corrMatrix.length > 0 ? (() => {
                  const f1Idx = corrFactors.indexOf(corrPair[0]);
                  const f2Idx = corrFactors.indexOf(corrPair[1]);
                  const corrVal = (f1Idx >= 0 && f2Idx >= 0 && corrMatrix[f1Idx]) ? corrMatrix[f1Idx][f2Idx] : 0;
                  return (
                    <div className="h-48 flex flex-col items-center justify-center">
                      <div className="text-[10px] text-muted-foreground mb-2">{corrPair[0]} vs {corrPair[1]}</div>
                      <div className={`text-4xl font-bold tabular-nums ${corrVal >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {corrVal.toFixed(4)}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-2">
                        {Math.abs(corrVal) > 0.7 ? "Strong" : Math.abs(corrVal) > 0.3 ? "Moderate" : "Weak"} {corrVal >= 0 ? "positive" : "negative"} correlation
                      </div>
                    </div>
                  );
                })() : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-xs">
                    Select two factors above to view correlation
                  </div>
                )}
              </div>
            } />
          </CardHeader>
          <CardContent className="p-2 space-y-2">
            <div className="flex gap-2 items-center">
              <Select value={corrPair[0]} onValueChange={(v) => { if (typeof v === "string") setCorrPair([v, corrPair[1]]); }}>
                <SelectTrigger className="h-7 w-[120px] text-[10px]"><SelectValue placeholder="Factor 1" /></SelectTrigger>
                <SelectContent>
                  {corrFactors.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-[10px] text-muted-foreground">vs</span>
              <Select value={corrPair[1]} onValueChange={(v) => { if (typeof v === "string") setCorrPair([corrPair[0], v]); }}>
                <SelectTrigger className="h-7 w-[120px] text-[10px]"><SelectValue placeholder="Factor 2" /></SelectTrigger>
                <SelectContent>
                  {corrFactors.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {corrPair[0] && corrPair[1] && corrMatrix.length > 0 ? (() => {
              const f1Idx = corrFactors.indexOf(corrPair[0]);
              const f2Idx = corrFactors.indexOf(corrPair[1]);
              const corrVal = (f1Idx >= 0 && f2Idx >= 0 && corrMatrix[f1Idx]) ? corrMatrix[f1Idx][f2Idx] : 0;
              return (
                <div className="h-48 flex flex-col items-center justify-center">
                  <div className="text-[10px] text-muted-foreground mb-2">{corrPair[0]} vs {corrPair[1]}</div>
                  <div className={`text-4xl font-bold tabular-nums ${corrVal >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {corrVal.toFixed(4)}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-2">
                    {Math.abs(corrVal) > 0.7 ? "Strong" : Math.abs(corrVal) > 0.3 ? "Moderate" : "Weak"} {corrVal >= 0 ? "positive" : "negative"} correlation
                  </div>
                </div>
              );
            })() : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-xs">
                Select two factors above to view correlation
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
