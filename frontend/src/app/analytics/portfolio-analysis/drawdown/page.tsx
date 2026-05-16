"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { AnalyticsEmptyState } from "@/components/analytics/AnalyticsEmptyState";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { CardControls } from "@/components/CardControls";
import { D3Treemap } from "@/components/charts/D3Treemap";
import { usePortfolio } from "@/lib/portfolio-context";

interface DrawdownEntry {
  id?: number;
  start_date?: string;
  bottom_date?: string;
  end_date?: string;
  loss_pct?: number;
  loss?: number;
  [key: string]: unknown;
}

interface HoldingDetail {
  symbol?: string;
  total_return_contribution_pct?: number;
  [key: string]: unknown;
}

interface FactorDecompPoint {
  date?: string;
  market_return_pct?: number;
  style_return_pct?: number;
  industry_return_pct?: number;
  idio_return_pct?: number;
  [key: string]: unknown;
}

interface EquityCurvePoint {
  date?: string;
  value?: number;
  benchmark_value?: number;
}

function fmt(v: unknown, decimals = 2): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return n.toFixed(decimals);
}

function sumRange(
  ts: FactorDecompPoint[],
  startDate: string,
  endDate: string
): Record<string, number> {
  const filtered = ts.filter((p) => {
    const d = String(p.date ?? "");
    return d >= startDate && d <= (endDate || "9999-99-99");
  });
  const result: Record<string, number> = {
    market: 0, style: 0, industry: 0, idio: 0,
  };
  for (const p of filtered) {
    result.market += Number(p.market ?? 0);
    result.style += Number(p.style ?? 0);
    result.industry += Number(p.industry ?? 0);
    result.idio += Number(p.idio ?? 0);
  }
  // Convert decimal daily sums to %
  return { market: result.market * 100, style: result.style * 100, industry: result.industry * 100, idio: result.idio * 100 };
}

export default function DrawdownPage() {
  const { analyticsData, analyticsLoading, selectedSourceId } = usePortfolio();
  const [selectedDrawdownIdx, setSelectedDrawdownIdx] = useState<number | null>(0);
  const [detractorTab, setDetractorTab] = useState<"overall" | "factor">("overall");

  if (analyticsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Computing analytics...</span>
      </div>
    );
  }

  if (!analyticsData || !selectedSourceId) {
    return <AnalyticsEmptyState title="Drawdown Analysis" />;
  }

  const drawdowns: DrawdownEntry[] = (analyticsData.drawdowns as DrawdownEntry[] | undefined) ?? [];
  const holdings: HoldingDetail[] = (analyticsData.holdings_detail as HoldingDetail[] | undefined) ?? [];
  const factorDecompTs: FactorDecompPoint[] = (analyticsData.factor_decomp_ts as FactorDecompPoint[] | undefined) ?? [];
  const equityCurve: EquityCurvePoint[] = (analyticsData.equity_curve as EquityCurvePoint[] | undefined) ?? [];

  const selectedDD = selectedDrawdownIdx != null ? drawdowns[selectedDrawdownIdx] : null;

  // Drop detractors: bottom 5 holdings by total_return_contribution
  const dropDetractors = [...holdings]
    .sort((a, b) => Number(a.total_return_contribution_pct ?? 0) - Number(b.total_return_contribution_pct ?? 0))
    .slice(0, 5);

  // Recovery contributors: top 5
  const recoveryContributors = [...holdings]
    .sort((a, b) => Number(b.total_return_contribution_pct ?? 0) - Number(a.total_return_contribution_pct ?? 0))
    .slice(0, 5);

  // Factor decomp for selected drawdown
  const decompSums =
    selectedDD && selectedDD.start_date
      ? sumRange(factorDecompTs, String(selectedDD.start_date), String(selectedDD.end_date ?? ""))
      : null;

  // Equity curve chart data with highlighted drawdown region approximated
  const ecChartData = equityCurve.map((pt) => {
    const row: Record<string, unknown> = {
      date: pt.date,
      portfolio: Number(pt.value ?? 0),
    };
    if (pt.benchmark_value != null) {
      row.benchmark = Number(pt.benchmark_value);
    }
    return row;
  });

  const ecSeries = [
    { key: "portfolio", name: "Portfolio", color: "#f97316" },
  ];
  if (equityCurve.some((p) => p.benchmark_value != null)) {
    ecSeries.push({ key: "benchmark", name: "Benchmark", color: "#6366f1" });
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Drawdown Analysis</h1>

      {/* Top section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Drawdown Summary Table */}
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Drawdown Summary</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent className="p-0 max-h-72 overflow-y-auto">
            <table className="w-full text-[10px]">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border/50">
                  <th className="px-2 py-1.5 w-6" />
                  {["#", "Start Date", "Bottom Date", "End Date", "Loss %"].map((h) => (
                    <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drawdowns.map((dd, i) => {
                  const lossPct = Number(dd.loss_pct ?? dd.loss ?? 0);
                  return (
                    <tr
                      key={i}
                      className={`border-b border-border/30 cursor-pointer hover:bg-muted/20 ${
                        selectedDrawdownIdx === i ? "bg-muted/40" : ""
                      }`}
                      onClick={() => setSelectedDrawdownIdx(selectedDrawdownIdx === i ? null : i)}
                    >
                      <td className="px-2 py-1.5">
                        <input type="radio" checked={selectedDrawdownIdx === i} readOnly className="h-3 w-3" />
                      </td>
                      <td className="px-2 py-1.5">{i + 1}</td>
                      <td className="px-2 py-1.5">{String(dd.start_date ?? "—")}</td>
                      <td className="px-2 py-1.5">{String(dd.bottom_date ?? "—")}</td>
                      <td className="px-2 py-1.5">{String(dd.end_date ?? "—")}</td>
                      <td
                        className="px-2 py-1.5 font-medium tabular-nums text-red-400"
                        style={{ fontSize: Math.max(8, Math.min(12, 8 + Math.abs(lossPct) / 5)) }}
                      >
                        {lossPct.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
                {drawdowns.length === 0 && (
                  <tr><td colSpan={6} className="px-2 py-4 text-center text-muted-foreground">No drawdown data available</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Drawdown D3 Treemap */}
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Drawdown Loss Map (%)</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent className="p-2">
            {drawdowns.length > 0 ? (
              <D3Treemap
                height={260}
                nodes={drawdowns.map((dd, i) => {
                  const lossPct = Math.abs(Number(dd.loss_pct ?? dd.loss ?? 0));
                  const startYM = String(dd.start_date ?? "").slice(0, 7);
                  const endYM = String(dd.end_date ?? "ongoing").slice(0, 7);
                  return {
                    id: String(i),
                    label: `${startYM} → ${endYM}`,
                    value: -lossPct,
                    size: Math.max(lossPct, 0.5),
                  };
                })}
                selectedId={selectedDrawdownIdx != null ? String(selectedDrawdownIdx) : null}
                onSelect={(id) => {
                  const idx = Number(id);
                  setSelectedDrawdownIdx(selectedDrawdownIdx === idx ? null : idx);
                }}
              />
            ) : (
              <div className="h-[260px] flex items-center justify-center text-[10px] text-muted-foreground">No drawdowns computed</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Selected drawdown detail */}
      {selectedDD && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground">
            Selected drawdown:{" "}
            <span className="text-foreground">
              {String(selectedDD.start_date ?? "—")} → {String(selectedDD.end_date ?? "ongoing")}
              {" "}({fmt(selectedDD.loss_pct ?? selectedDD.loss)}%)
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Contributors & Detractors */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-sm font-semibold">Drop / Recovery</h2>
                <div className="flex items-center gap-1 bg-card border rounded-lg p-0.5">
                  {(["overall", "factor"] as const).map((tab) => (
                    <button key={tab} onClick={() => setDetractorTab(tab)}
                      className={`px-2 py-1 text-[10px] rounded transition-colors ${
                        detractorTab === tab ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}>
                      {tab === "overall" ? "Overall" : "Factor"}
                    </button>
                  ))}
                </div>
              </div>

              {detractorTab === "overall" ? (
                <>
                  <Card>
                    <CardHeader className="pb-1 py-2 px-3">
                      <CardTitle className="text-[10px] text-red-400">Drop Detractors (Bottom 5)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className="border-b border-border/50">
                            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Symbol</th>
                            <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Return Contrib (%)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dropDetractors.map((h, i) => (
                            <tr key={i} className="border-b border-border/30">
                              <td className="px-2 py-1 font-medium">{String(h.symbol ?? "—")}</td>
                              <td className="px-2 py-1 text-right text-red-400 tabular-nums">
                                {fmt(h.total_return_contribution_pct)}%
                              </td>
                            </tr>
                          ))}
                          {dropDetractors.length === 0 && (
                            <tr><td colSpan={2} className="px-2 py-4 text-center text-muted-foreground">No data</td></tr>
                          )}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-1 py-2 px-3">
                      <CardTitle className="text-[10px] text-emerald-500">Recovery Contributors (Top 5)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className="border-b border-border/50">
                            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Symbol</th>
                            <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Return Contrib (%)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recoveryContributors.map((h, i) => (
                            <tr key={i} className="border-b border-border/30">
                              <td className="px-2 py-1 font-medium">{String(h.symbol ?? "—")}</td>
                              <td className="px-2 py-1 text-right text-emerald-500 tabular-nums">
                                {fmt(h.total_return_contribution_pct)}%
                              </td>
                            </tr>
                          ))}
                          {recoveryContributors.length === 0 && (
                            <tr><td colSpan={2} className="px-2 py-4 text-center text-muted-foreground">No data</td></tr>
                          )}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardHeader className="pb-1 py-2 px-3">
                    <CardTitle className="text-[11px]">Factor Decomposition During Drawdown</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Factor</th>
                          <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Return (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {decompSums ? (
                          Object.entries(decompSums).map(([factor, val]) => (
                            <tr key={factor} className="border-b border-border/30">
                              <td className="px-2 py-1.5 capitalize">{factor}</td>
                              <td className={`px-2 py-1.5 text-right tabular-nums ${val >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                                {val.toFixed(2)}%
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan={2} className="px-2 py-4 text-center text-muted-foreground">No decomposition data</td></tr>
                        )}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Portfolio vs Benchmark chart */}
            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                <CardTitle className="text-[11px]">Portfolio vs Benchmark</CardTitle>
                <CardControls fullscreen expandContent={
                  ecChartData.length > 0 ? (
                    <TimeSeriesChart data={ecChartData} series={ecSeries} height={600} />
                  ) : undefined
                } />
              </CardHeader>
              <CardContent className="p-2">
                {ecChartData.length > 0 ? (
                  <TimeSeriesChart data={ecChartData} series={ecSeries} height={220} />
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-[10px] text-muted-foreground">No equity curve data</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Full equity curve always visible when no drawdown selected */}
      {!selectedDD && ecChartData.length > 0 && (
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Portfolio Equity Curve</CardTitle>
            <CardControls fullscreen expandContent={<TimeSeriesChart data={ecChartData} series={ecSeries} height={600} />} />
          </CardHeader>
          <CardContent className="p-2">
            <TimeSeriesChart data={ecChartData} series={ecSeries} height={220} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
