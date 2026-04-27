"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { BarChartPanel } from "@/components/charts/BarChartPanel";
import { CardControls } from "@/components/CardControls";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

const peerTabs = [
  { label: "Peer Returns and Risks", href: "/analytics/peer-intelligence" },
  { label: "Peer Breakdown", href: "/analytics/peer-intelligence/peer-breakdown" },
];

interface EquityPoint { date: string; value: number; drawdown?: number }

interface FactorBreakdown {
  factor: string;
  factor_type?: string;
  return_contribution: number;
  risk_contribution: number;
  exposure: number;
}

export default function PeerIntelligencePage() {
  const router = useRouter();
  const pathname = usePathname();
  const { selectedPortfolioId, selectedFundName } = usePortfolio();
  const { token } = useAuth();

  const [equityCurve, setEquityCurve] = useState<EquityPoint[]>([]);
  const [factors, setFactors] = useState<FactorBreakdown[]>([]);
  const [perfData, setPerfData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contributorTab, setContributorTab] = useState<"overall" | "style" | "industry">("overall");

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

      if (perfRes.ok) {
        const data = await perfRes.json();
        setPerfData(data);
        setEquityCurve(data.equity_curve || []);
      }

      if (decompRes.ok) {
        const data = await decompRes.json();
        setFactors(data.factors || []);
      }
    } catch {
      setError("Could not connect to API");
    } finally {
      setLoading(false);
    }
  }, [selectedPortfolioId, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Build return chart: portfolio cumulative return vs benchmark
  const returnChartData = equityCurve.length > 0
    ? equityCurve.map((p) => ({
        date: p.date,
        portfolio: ((p.value - equityCurve[0].value) / equityCurve[0].value) * 100,
      }))
    : [];

  // Factor bar chart: top contributors/detractors sorted by absolute contribution
  const sortedFactors = [...factors].sort((a, b) => b.return_contribution - a.return_contribution);
  const factorBarData = sortedFactors
    .filter((f) => f.return_contribution !== 0)
    .map((f) => ({
      name: f.factor,
      value: parseFloat((f.return_contribution * 100).toFixed(2)),
    }));

  // Filter factors by tab
  const filteredFactors = contributorTab === "overall"
    ? sortedFactors
    : contributorTab === "style"
      ? sortedFactors.filter((f) => f.factor_type === "Style")
      : sortedFactors.filter((f) => f.factor_type === "Industry" || f.factor_type === "Market");

  const topContributors = filteredFactors.filter((f) => f.return_contribution > 0).slice(0, 5);
  const topDetractors = [...filteredFactors].sort((a, b) => a.return_contribution - b.return_contribution).filter((f) => f.return_contribution < 0).slice(0, 5);

  // If no detractors with negative contribution, show lowest
  const detractors = topDetractors.length > 0
    ? topDetractors
    : [...filteredFactors].sort((a, b) => a.return_contribution - b.return_contribution).slice(0, 5);

  if (!selectedPortfolioId) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Peer Intelligence</h1>
          <div className="flex items-center gap-1 bg-card border rounded-lg p-0.5">
            {peerTabs.map((tab) => (
              <Button key={tab.href} variant={pathname === tab.href ? "secondary" : "ghost"} size="sm" onClick={() => router.push(tab.href)} className="h-7 text-[10px]">{tab.label}</Button>
            ))}
          </div>
        </div>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No portfolio selected. <button className="underline text-blue-400" onClick={() => router.push("/portfolio-construction/select")}>Select a portfolio</button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Peer Intelligence</h1>
          {selectedFundName && (
            <p className="text-xs text-muted-foreground">Portfolio: <span className="font-medium text-foreground">{selectedFundName}</span></p>
          )}
        </div>
        <div className="flex items-center gap-1 bg-card border rounded-lg p-0.5">
          {peerTabs.map((tab) => (
            <Button key={tab.href} variant={pathname === tab.href ? "secondary" : "ghost"} size="sm" onClick={() => router.push(tab.href)} className="h-7 text-[10px]">{tab.label}</Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading peer analysis...</span>
        </div>
      ) : error ? (
        <Card><CardContent className="p-4 text-center text-amber-400">{error}</CardContent></Card>
      ) : (
        <>
          {/* Summary row */}
          {perfData && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {[
                ["Total Return", `${perfData.total_return}%`],
                ["Benchmark Return", perfData.benchmark_metrics ? `${(perfData.benchmark_metrics as Record<string, number>).total_return}%` : "—"],
                ["Excess", perfData.benchmark_metrics ? `${((perfData.total_return as number) - (perfData.benchmark_metrics as Record<string, number>).total_return).toFixed(2)}%` : "—"],
                ["Sharpe", `${perfData.sharpe_ratio}`],
                ["Max DD", `${perfData.max_drawdown}%`],
              ].map(([label, value]) => (
                <Card key={String(label)}>
                  <CardContent className="p-2 text-center">
                    <div className="text-[9px] text-muted-foreground">{String(label)}</div>
                    <div className={`text-sm font-bold tabular-nums ${String(value).startsWith("-") ? "text-red-400" : "text-emerald-400"}`}>{String(value)}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                <CardTitle className="text-[11px]">Cumulative Return (%)</CardTitle>
                <CardControls data={returnChartData as Record<string, unknown>[]} filename="peer_return" title="Cumulative Return (%)" expandContent={
                  returnChartData.length > 1 ? (
                    <TimeSeriesChart
                      data={returnChartData}
                      series={[
                        { key: "portfolio", name: selectedFundName || "Portfolio", color: "#f97316" },
                      ]}
                      height={600}
                      yFormatter={(v) => `${v.toFixed(1)}%`}
                    />
                  ) : undefined
                } />
              </CardHeader>
              <CardContent className="p-2">
                {returnChartData.length > 1 ? (
                  <TimeSeriesChart
                    data={returnChartData}
                    series={[
                      { key: "portfolio", name: selectedFundName || "Portfolio", color: "#f97316" },
                    ]}
                    height={220}
                    yFormatter={(v) => `${v.toFixed(1)}%`}
                  />
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-muted-foreground text-xs">No data</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                <CardTitle className="text-[11px]">Factor Return Contributions (%)</CardTitle>
                <CardControls data={factorBarData as Record<string, unknown>[]} filename="factor_contributions" title="Factor Return Contributions (%)" expandContent={
                  factorBarData.length > 0 ? (
                    <BarChartPanel data={factorBarData} height={600} />
                  ) : undefined
                } />
              </CardHeader>
              <CardContent className="p-2">
                {factorBarData.length > 0 ? (
                  <BarChartPanel data={factorBarData} height={220} />
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-muted-foreground text-xs">No factor data</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Contributors and Detractors */}
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-sm font-semibold">Contributors and Detractors</h2>
            <div className="flex gap-1 bg-card border rounded-lg p-0.5">
              {(["overall", "style", "industry"] as const).map((tab) => (
                <Button
                  key={tab}
                  variant={contributorTab === tab ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-[10px] px-3"
                  onClick={() => setContributorTab(tab)}
                >
                  {tab === "overall" ? "Overall" : tab === "style" ? "Style" : "Industry/Market"}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                <CardTitle className="text-[11px]">Top Contributors</CardTitle>
                <CardControls title="Top Contributors" expandContent={
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-border/50">
                        {["Factor Type", "Factor Name", "Exposure", "Return Contrib (%)"].map(h => (
                          <th key={h} className="px-2 py-1.5 text-left text-muted-foreground font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {topContributors.map((f, i) => (
                        <tr key={i} className="border-b border-border/30">
                          <td className="px-2 py-1 tabular-nums">{f.factor_type ?? "Style"}</td>
                          <td className="px-2 py-1 tabular-nums font-medium">{f.factor}</td>
                          <td className="px-2 py-1 tabular-nums">{f.exposure.toFixed(2)}</td>
                          <td className="px-2 py-1 tabular-nums text-emerald-400">{(f.return_contribution * 100).toFixed(2)}%</td>
                        </tr>
                      ))}
                      {topContributors.length === 0 && (
                        <tr><td colSpan={4} className="px-2 py-4 text-center text-muted-foreground">No contributors</td></tr>
                      )}
                    </tbody>
                  </table>
                } />
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-border/50">
                      {["Factor Type", "Factor Name", "Exposure", "Return Contrib (%)"].map(h => (
                        <th key={h} className="px-2 py-1.5 text-left text-muted-foreground font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topContributors.map((f, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="px-2 py-1 tabular-nums">{f.factor_type ?? "Style"}</td>
                        <td className="px-2 py-1 tabular-nums font-medium">{f.factor}</td>
                        <td className="px-2 py-1 tabular-nums">{f.exposure.toFixed(2)}</td>
                        <td className="px-2 py-1 tabular-nums text-emerald-400">{(f.return_contribution * 100).toFixed(2)}%</td>
                      </tr>
                    ))}
                    {topContributors.length === 0 && (
                      <tr><td colSpan={4} className="px-2 py-4 text-center text-muted-foreground">No contributors</td></tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                <CardTitle className="text-[11px]">Top Detractors</CardTitle>
                <CardControls title="Top Detractors" expandContent={
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-border/50">
                        {["Factor Type", "Factor Name", "Exposure", "Return Contrib (%)"].map(h => (
                          <th key={h} className="px-2 py-1.5 text-left text-muted-foreground font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {detractors.map((f, i) => (
                        <tr key={i} className="border-b border-border/30">
                          <td className="px-2 py-1 tabular-nums">{f.factor_type ?? "Style"}</td>
                          <td className="px-2 py-1 tabular-nums font-medium">{f.factor}</td>
                          <td className="px-2 py-1 tabular-nums">{f.exposure.toFixed(2)}</td>
                          <td className="px-2 py-1 tabular-nums text-red-400">{(f.return_contribution * 100).toFixed(2)}%</td>
                        </tr>
                      ))}
                      {detractors.length === 0 && (
                        <tr><td colSpan={4} className="px-2 py-4 text-center text-muted-foreground">No detractors</td></tr>
                      )}
                    </tbody>
                  </table>
                } />
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-border/50">
                      {["Factor Type", "Factor Name", "Exposure", "Return Contrib (%)"].map(h => (
                        <th key={h} className="px-2 py-1.5 text-left text-muted-foreground font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detractors.map((f, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="px-2 py-1 tabular-nums">{f.factor_type ?? "Style"}</td>
                        <td className="px-2 py-1 tabular-nums font-medium">{f.factor}</td>
                        <td className="px-2 py-1 tabular-nums">{f.exposure.toFixed(2)}</td>
                        <td className="px-2 py-1 tabular-nums text-red-400">{(f.return_contribution * 100).toFixed(2)}%</td>
                      </tr>
                    ))}
                    {detractors.length === 0 && (
                      <tr><td colSpan={4} className="px-2 py-4 text-center text-muted-foreground">No detractors</td></tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
