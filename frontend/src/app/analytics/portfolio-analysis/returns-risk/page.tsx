"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { BarChartPanel } from "@/components/charts/BarChartPanel";
import { CardControls } from "@/components/CardControls";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

function STable({ title, rows, viewMode = "active" }: { title: string; rows: [string, string, string][]; viewMode?: string }) {
  return (
    <Card>
      <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
        <CardTitle className="text-[11px]">{title}</CardTitle>
        <CardControls />
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-border/50">
              <th className="px-2 py-1.5 text-left font-medium text-muted-foreground" />
              {(viewMode === "active" || viewMode === "excess") && (
                <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Active</th>
              )}
              {(viewMode === "benchmark" || viewMode === "excess") && (
                <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Benchmark</th>
              )}
              {viewMode === "excess" && (
                <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Excess</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, active, benchmark], i) => {
              const activeNum = parseFloat(active);
              const benchmarkNum = parseFloat(benchmark);
              const excess = !isNaN(activeNum) && !isNaN(benchmarkNum) ? `${(activeNum - benchmarkNum).toFixed(2)}%` : "--";
              return (
                <tr key={i} className="border-b border-border/30">
                  <td className="px-2 py-1 text-muted-foreground">{label}</td>
                  {(viewMode === "active" || viewMode === "excess") && (
                    <td className="px-2 py-1 text-right tabular-nums">{active}</td>
                  )}
                  {(viewMode === "benchmark" || viewMode === "excess") && (
                    <td className="px-2 py-1 text-right tabular-nums">{benchmark}</td>
                  )}
                  {viewMode === "excess" && (
                    <td className={`px-2 py-1 text-right tabular-nums ${parseFloat(excess) >= 0 ? "text-emerald-400" : "text-red-400"}`}>{excess}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

interface PerformanceData {
  total_return?: number;
  annualised_return?: number;
  factor_return?: number;
  idiosyncratic_return?: number;
  sharpe_ratio?: number;
  volatility?: number;
  max_drawdown?: number;
  num_holdings?: number;
  aum?: number;
  [key: string]: unknown;
}

interface FactorBreakdown {
  factor: string;
  return_contribution: number;
  risk_contribution: number;
  exposure: number;
}

interface DecompositionData {
  factors?: FactorBreakdown[];
  total_factor_return?: number;
  total_idio_return?: number;
  [key: string]: unknown;
}

export default function ReturnsAndRiskPage() {
  const [contributorTab, setContributorTab] = useState("overall");
  const [viewMode, setViewMode] = useState("active");
  const { selectedPortfolioId, selectedFundName } = usePortfolio();
  const { token } = useAuth();

  const [perfData, setPerfData] = useState<PerformanceData | null>(null);
  const [decompData, setDecompData] = useState<DecompositionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!selectedPortfolioId || !token) return;
    setLoading(true);
    setError(null);
    try {
      const [perfRes, decompRes] = await Promise.all([
        fetch(`${API_BASE}/api/analytics/performance/${selectedPortfolioId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/analytics/return-decomposition/${selectedPortfolioId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (!perfRes.ok) throw new Error(`Performance fetch failed: ${perfRes.status}`);
      if (!decompRes.ok) throw new Error(`Decomposition fetch failed: ${decompRes.status}`);
      const perf = await perfRes.json();
      const decomp = await decompRes.json();
      setPerfData(perf);
      setDecompData(decomp);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [selectedPortfolioId, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pct = (v: number | undefined | null) =>
    v != null ? `${(v * 100).toFixed(2)}%` : "—";
  const raw = (v: number | undefined | null) =>
    v != null ? v.toFixed(2) : "—";

  if (!selectedPortfolioId) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold">Performance Summary</h1>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No portfolio selected. Go to Portfolio Construction to upload and select one.
          </CardContent>
        </Card>
      </div>
    );
  }

  // Build factor-based data for charts and tables
  const factors = decompData?.factors ?? [];
  const topFactors = [...factors].sort((a, b) => b.return_contribution - a.return_contribution).slice(0, 10);
  const bottomFactors = [...factors].sort((a, b) => a.return_contribution - b.return_contribution).slice(0, 10);

  const topBarData = topFactors.map((f) => ({ name: f.factor, value: f.return_contribution * 100 }));
  const bottomBarData = bottomFactors.map((f) => ({ name: f.factor, value: f.return_contribution * 100 }));

  // Build holdings bar from top factors
  const topHoldingsBarData = topFactors.slice(0, 10).map((f) => ({
    name: f.factor,
    value: f.return_contribution * 100,
  }));

  // Return decomposition chart data (single point from API)
  const returnDecompChartData = perfData ? [{
    date: "Current",
    total: (perfData.total_return ?? 0) * 100,
    factor: (perfData.factor_return ?? decompData?.total_factor_return ?? 0) * 100,
    idio: (perfData.idiosyncratic_return ?? decompData?.total_idio_return ?? 0) * 100,
  }] : [];

  // Factor contributor rows
  const factorTopRows = topFactors.slice(0, 3).map((f) => [
    "Style", f.factor, f.exposure.toFixed(2), pct(f.return_contribution), pct(f.risk_contribution),
  ]);
  const factorBottomRows = bottomFactors.slice(0, 3).map((f) => [
    "Style", f.factor, f.exposure.toFixed(2), pct(f.return_contribution), pct(f.risk_contribution),
  ]);

  const FACTOR_COLS = ["Factor Type", "Factor Name", "Exposure", "Return (%)", "Risk Contrib (%)"];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Performance Summary{selectedFundName ? ` — ${selectedFundName}` : ""}</h1>
        <Tabs value={viewMode} onValueChange={(v) => { if (typeof v === "string") setViewMode(v); }}>
          <TabsList className="h-7">
            <TabsTrigger value="active" className="text-[10px] h-6">Active</TabsTrigger>
            <TabsTrigger value="benchmark" className="text-[10px] h-6">Benchmark</TabsTrigger>
            <TabsTrigger value="excess" className="text-[10px] h-6">Excess</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      )}

      {error && (
        <Card><CardContent className="p-4 text-center text-red-400">{error}</CardContent></Card>
      )}

      {!loading && !error && perfData && (
        <>
          {/* Summary Tables Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <STable title="Profit and Loss Summary" viewMode={viewMode} rows={[
              ["Total Return (%)", pct(perfData.total_return), "—"],
              ["Factor Return (%)", pct(perfData.factor_return ?? decompData?.total_factor_return), "—"],
              ["Idio Return (%)", pct(perfData.idiosyncratic_return ?? decompData?.total_idio_return), "—"],
              ["Annualised Return (%)", pct(perfData.annualised_return), "—"],
              ["Sharpe Ratio", raw(perfData.sharpe_ratio), "—"],
            ]} />
            <STable title="Risk Summary" viewMode={viewMode} rows={[
              ["Volatility (%)", pct(perfData.volatility), "—"],
              ["Max Drawdown (%)", pct(perfData.max_drawdown), "—"],
            ]} />
            <STable title="Portfolio Info" viewMode={viewMode} rows={[
              ["Holdings", perfData.num_holdings != null ? String(perfData.num_holdings) : "—", "—"],
              ["AUM", perfData.aum != null ? `${(perfData.aum / 10000000).toFixed(2)} Cr` : "—", "—"],
            ]} />
            <STable title="Return Decomposition" viewMode={viewMode} rows={[
              ["Factor Return", pct(decompData?.total_factor_return), "—"],
              ["Idio Return", pct(decompData?.total_idio_return), "—"],
            ]} />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                <CardTitle className="text-[11px]">Return Decomposition (%)</CardTitle>
                <CardControls />
              </CardHeader>
              <CardContent>
                {returnDecompChartData.length > 0 ? (
                  <TimeSeriesChart
                    data={returnDecompChartData}
                    series={[
                      { key: "total", name: "Total", color: "#3b82f6" },
                      { key: "factor", name: "Factor", color: "#10b981" },
                      { key: "idio", name: "Idiosyncratic", color: "#f59e0b" },
                    ]}
                    height={160}
                  />
                ) : (
                  <div className="flex items-center justify-center h-[160px] text-muted-foreground text-xs">No data</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                <CardTitle className="text-[11px]">Factor Returns (%)</CardTitle>
                <CardControls />
              </CardHeader>
              <CardContent>
                {topBarData.length > 0 ? (
                  <BarChartPanel data={topBarData} height={160} color="#10b981" showNegativeColors={false} />
                ) : (
                  <div className="flex items-center justify-center h-[160px] text-muted-foreground text-xs">No factor data</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                <CardTitle className="text-[11px]">Factor Risk Contrib (%)</CardTitle>
                <CardControls />
              </CardHeader>
              <CardContent>
                {factors.length > 0 ? (
                  <BarChartPanel
                    data={factors.map((f) => ({ name: f.factor, value: f.risk_contribution * 100 }))}
                    height={160}
                    color="#3b82f6"
                    showNegativeColors={false}
                  />
                ) : (
                  <div className="flex items-center justify-center h-[160px] text-muted-foreground text-xs">No factor data</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                <CardTitle className="text-[11px]">Factor Exposure</CardTitle>
                <CardControls />
              </CardHeader>
              <CardContent>
                {factors.length > 0 ? (
                  <BarChartPanel
                    data={factors.map((f) => ({ name: f.factor, value: f.exposure }))}
                    height={160}
                  />
                ) : (
                  <div className="flex items-center justify-center h-[160px] text-muted-foreground text-xs">No factor data</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Contributors */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-sm font-semibold">Contributors and Detractors</h2>
              <Tabs value={contributorTab} onValueChange={(v) => { if (typeof v === "string") setContributorTab(v); }}>
                <TabsList className="h-7">
                  <TabsTrigger value="overall" className="text-[10px] h-6">Overall</TabsTrigger>
                  <TabsTrigger value="factor" className="text-[10px] h-6">Factor</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Card>
                <CardHeader className="pb-1 py-2 px-3"><CardTitle className="text-[11px]">
                  {contributorTab === "factor" ? "Top Factors" : "Top Contributors"}
                </CardTitle></CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-[10px]">
                    <thead><tr className="border-b border-border/50">
                      {FACTOR_COLS.map(h => <th key={h} className="px-2 py-1.5 text-left text-muted-foreground font-medium">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {factorTopRows.map((r, i) => (
                        <tr key={i} className="border-b border-border/30">{r.map((c, j) => <td key={j} className="px-2 py-1 tabular-nums">{c}</td>)}</tr>
                      ))}
                      {factorTopRows.length === 0 && (
                        <tr><td colSpan={5} className="px-2 py-4 text-center text-muted-foreground">No data</td></tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1 py-2 px-3"><CardTitle className="text-[11px]">
                  {contributorTab === "factor" ? "Bottom Factors" : "Bottom Detractors"}
                </CardTitle></CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-[10px]">
                    <thead><tr className="border-b border-border/50">
                      {FACTOR_COLS.map(h => <th key={h} className="px-2 py-1.5 text-left text-muted-foreground font-medium">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {factorBottomRows.map((r, i) => (
                        <tr key={i} className="border-b border-border/30">{r.map((c, j) => <td key={j} className={`px-2 py-1 tabular-nums ${c.startsWith("-") ? "text-red-400" : ""}`}>{c}</td>)}</tr>
                      ))}
                      {factorBottomRows.length === 0 && (
                        <tr><td colSpan={5} className="px-2 py-4 text-center text-muted-foreground">No data</td></tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                  <CardTitle className="text-[11px]">Top Factor Returns (%)</CardTitle>
                  <CardControls />
                </CardHeader>
                <CardContent>
                  {topHoldingsBarData.length > 0 ? (
                    <BarChartPanel data={topHoldingsBarData} height={160} />
                  ) : (
                    <div className="flex items-center justify-center h-[160px] text-muted-foreground text-xs">No data</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
