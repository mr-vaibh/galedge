"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { BarChartPanel } from "@/components/charts/BarChartPanel";
import { CardControls } from "@/components/CardControls";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/currency";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

const peerTabs = [
  { label: "Peer Returns and Risks", href: "/analytics/peer-intelligence" },
  { label: "Peer Breakdown", href: "/analytics/peer-intelligence/peer-breakdown" },
];

const DIMENSIONS = ["Sector", "Market Cap", "Factor Exposure"] as const;
type Dimension = (typeof DIMENSIONS)[number];

interface Holding {
  symbol: string;
  weight: number;
  sector: string;
  market_cap?: number;
  factor_exposures?: Record<string, number>;
}

interface PerfData {
  total_return?: number;
  sharpe_ratio?: number;
  volatility?: number;
  max_drawdown?: number;
  benchmark_metrics?: Record<string, number>;
  [key: string]: unknown;
}

interface FactorBreakdown {
  factor: string;
  factor_type?: string;
  return_contribution: number;
  risk_contribution: number;
  exposure: number;
}

function mcapBucket(mcap: number): string {
  if (mcap >= 100000) return "Large Cap (>1L Cr)";
  if (mcap >= 20000) return "Mid Cap (20K-1L Cr)";
  if (mcap >= 5000) return "Small Cap (5K-20K Cr)";
  return "Micro Cap (<5K Cr)";
}

export default function PeerBreakdownPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { selectedPortfolioId, selectedFundName } = usePortfolio();
  const { token } = useAuth();
  const { formatCurrencyCompact } = useCurrency();

  const [dimension, setDimension] = useState<Dimension>("Sector");
  const [contributorTab, setContributorTab] = useState<"overall" | "style" | "industry">("overall");
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [perfData, setPerfData] = useState<PerfData | null>(null);
  const [factors, setFactors] = useState<FactorBreakdown[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!selectedPortfolioId || !token) return;
    setLoading(true);
    setError(null);
    try {
      const [perfRes, holdRes, decompRes] = await Promise.all([
        fetch(`${API_BASE}/api/analytics/performance/${selectedPortfolioId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/analytics/holdings/${selectedPortfolioId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/analytics/return-decomposition/${selectedPortfolioId}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (perfRes.ok) setPerfData(await perfRes.json());
      if (holdRes.ok) {
        const data = await holdRes.json();
        setHoldings(data.holdings ?? []);
      }
      if (decompRes.ok) {
        const data = await decompRes.json();
        setFactors(data.factors ?? []);
      }
    } catch {
      setError("Could not connect to API");
    } finally {
      setLoading(false);
    }
  }, [selectedPortfolioId, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Group holdings by selected dimension
  const grouped: Record<string, { weight: number; count: number; symbols: string[] }> = {};
  holdings.forEach((h) => {
    let key: string;
    if (dimension === "Sector") {
      key = h.sector || "Unknown";
    } else if (dimension === "Market Cap") {
      key = h.market_cap ? mcapBucket(h.market_cap) : "Unknown";
    } else {
      // Factor Exposure: group by top factor
      const topFactor = h.factor_exposures
        ? Object.entries(h.factor_exposures).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0]
        : null;
      key = topFactor ? `${topFactor[0]} dominant` : "Unknown";
    }
    if (!grouped[key]) grouped[key] = { weight: 0, count: 0, symbols: [] };
    grouped[key].weight += h.weight;
    grouped[key].count += 1;
    grouped[key].symbols.push(h.symbol);
  });

  const groupedRows = Object.entries(grouped)
    .sort((a, b) => b[1].weight - a[1].weight)
    .map(([name, g]) => [name, `${(g.weight * 100).toFixed(2)}%`, String(g.count), g.symbols.slice(0, 3).join(", ")]);

  // Breakdown bar chart
  const breakdownBarData = Object.entries(grouped)
    .sort((a, b) => b[1].weight - a[1].weight)
    .map(([name, g]) => ({ name: name.length > 12 ? name.slice(0, 12) : name, value: parseFloat((g.weight * 100).toFixed(2)) }));

  // Top/bottom holdings by weight
  const sortedHoldings = [...holdings].sort((a, b) => b.weight - a.weight);
  const topHoldings = sortedHoldings.slice(0, 5);
  const bottomHoldings = sortedHoldings.slice(-5).reverse();

  // Holdings bar chart
  const holdingsBarData = topHoldings.map((h) => ({
    name: h.symbol.length > 10 ? h.symbol.slice(0, 10) : h.symbol,
    value: parseFloat((h.weight * 100).toFixed(2)),
  }));

  // Factor contributors filtered by tab
  const filteredFactors = contributorTab === "overall"
    ? factors
    : contributorTab === "style"
      ? factors.filter((f) => f.factor_type === "Style")
      : factors.filter((f) => f.factor_type === "Industry" || f.factor_type === "Market");

  const topFactors = [...filteredFactors].sort((a, b) => b.return_contribution - a.return_contribution).slice(0, 5);
  const bottomFactors = [...filteredFactors].sort((a, b) => a.return_contribution - b.return_contribution).slice(0, 5);

  if (!selectedPortfolioId) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Peer Breakdown</h1>
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
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Peer Breakdown</h1>
          {selectedFundName && <p className="text-xs text-muted-foreground">Portfolio: <span className="font-medium text-foreground">{selectedFundName}</span></p>}
        </div>
        <div className="flex items-center gap-1 bg-card border rounded-lg p-0.5">
          {peerTabs.map((tab) => (
            <Button key={tab.href} variant={pathname === tab.href ? "secondary" : "ghost"} size="sm" onClick={() => router.push(tab.href)} className="h-7 text-[10px]">{tab.label}</Button>
          ))}
        </div>
      </div>

      {/* Dimension Tabs */}
      <div className="flex gap-0.5 overflow-x-auto pb-1">
        {DIMENSIONS.map((d) => (
          <Button
            key={d}
            variant={dimension === d ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setDimension(d)}
            className={`h-7 text-[10px] whitespace-nowrap ${dimension === d ? "border-b-2 border-blue-500 rounded-b-none" : ""}`}
          >
            {d}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading breakdown...</span>
        </div>
      ) : error ? (
        <Card><CardContent className="p-4 text-center text-amber-400">{error}</CardContent></Card>
      ) : (
        <>
          {/* Summary metrics */}
          {perfData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                ["Total Return", `${perfData.total_return}%`],
                ["Volatility", `${perfData.volatility}%`],
                ["Sharpe", `${perfData.sharpe_ratio}`],
                ["Max Drawdown", `${perfData.max_drawdown}%`],
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

          {/* Breakdown by dimension */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                <CardTitle className="text-[11px]">Breakdown by {dimension}</CardTitle>
                <CardControls data={groupedRows.map(r => ({[dimension]: r[0], weight: r[1], count: r[2], symbols: r[3]}))} filename="breakdown" />
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-border/50">
                      {[dimension, "Weight", "Count", "Top Symbols"].map((h) => (
                        <th key={h} className="px-2 py-1.5 text-left text-muted-foreground font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {groupedRows.map((row, i) => (
                      <tr key={i} className="border-b border-border/30">
                        {row.map((cell, j) => (
                          <td key={j} className="px-2 py-1 tabular-nums">{cell}</td>
                        ))}
                      </tr>
                    ))}
                    {groupedRows.length === 0 && (
                      <tr><td colSpan={4} className="px-2 py-4 text-center text-muted-foreground">No data</td></tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                <CardTitle className="text-[11px]">Weight by {dimension} (%)</CardTitle>
                <CardControls data={breakdownBarData as Record<string, unknown>[]} filename="breakdown" />
              </CardHeader>
              <CardContent className="p-2">
                {breakdownBarData.length > 0 ? (
                  <BarChartPanel data={breakdownBarData} height={200} />
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs">No data</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top/Bottom Holdings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                <CardTitle className="text-[11px]">Top Holdings by Weight</CardTitle>
                <CardControls />
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-border/50">
                      {["Symbol", "Weight", "Sector", "Market Cap"].map((h) => (
                        <th key={h} className="px-2 py-1.5 text-left text-muted-foreground font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topHoldings.map((h) => (
                      <tr key={h.symbol} className="border-b border-border/30">
                        <td className="px-2 py-1 font-medium">{h.symbol}</td>
                        <td className="px-2 py-1 tabular-nums">{(h.weight * 100).toFixed(2)}%</td>
                        <td className="px-2 py-1">{h.sector}</td>
                        <td className="px-2 py-1 tabular-nums">{h.market_cap ? formatCurrencyCompact(h.market_cap * 1e7, "INR") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                <CardTitle className="text-[11px]">Bottom Holdings by Weight</CardTitle>
                <CardControls />
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-border/50">
                      {["Symbol", "Weight", "Sector", "Market Cap"].map((h) => (
                        <th key={h} className="px-2 py-1.5 text-left text-muted-foreground font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bottomHoldings.map((h) => (
                      <tr key={h.symbol} className="border-b border-border/30">
                        <td className="px-2 py-1 font-medium">{h.symbol}</td>
                        <td className="px-2 py-1 tabular-nums">{(h.weight * 100).toFixed(2)}%</td>
                        <td className="px-2 py-1">{h.sector}</td>
                        <td className="px-2 py-1 tabular-nums">{h.market_cap ? formatCurrencyCompact(h.market_cap * 1e7, "INR") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                <CardTitle className="text-[11px]">Top Holdings Weight (%)</CardTitle>
                <CardControls data={holdingsBarData as Record<string, unknown>[]} filename="top_holdings" />
              </CardHeader>
              <CardContent className="p-2">
                {holdingsBarData.length > 0 ? (
                  <BarChartPanel data={holdingsBarData} height={200} />
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs">No data</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Factor Contributors */}
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-sm font-semibold">Factor Contributors</h2>
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
              <CardHeader className="pb-1 py-2 px-3"><CardTitle className="text-[11px]">Top Contributors</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-border/50">
                      {["Type", "Factor", "Exposure", "Return (%)"].map((h) => (
                        <th key={h} className="px-2 py-1.5 text-left text-muted-foreground font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topFactors.filter((f) => f.return_contribution > 0).length > 0
                      ? topFactors.filter((f) => f.return_contribution > 0).map((f, i) => (
                          <tr key={i} className="border-b border-border/30">
                            <td className="px-2 py-1">{f.factor_type}</td>
                            <td className="px-2 py-1 font-medium">{f.factor}</td>
                            <td className="px-2 py-1 tabular-nums">{f.exposure.toFixed(2)}</td>
                            <td className="px-2 py-1 tabular-nums text-emerald-400">{(f.return_contribution * 100).toFixed(2)}%</td>
                          </tr>
                        ))
                      : <tr><td colSpan={4} className="px-2 py-4 text-center text-muted-foreground">No positive contributors</td></tr>
                    }
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 py-2 px-3"><CardTitle className="text-[11px]">Top Detractors</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-border/50">
                      {["Type", "Factor", "Exposure", "Return (%)"].map((h) => (
                        <th key={h} className="px-2 py-1.5 text-left text-muted-foreground font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bottomFactors.filter((f) => f.return_contribution < 0).length > 0
                      ? bottomFactors.filter((f) => f.return_contribution < 0).map((f, i) => (
                          <tr key={i} className="border-b border-border/30">
                            <td className="px-2 py-1">{f.factor_type}</td>
                            <td className="px-2 py-1 font-medium">{f.factor}</td>
                            <td className="px-2 py-1 tabular-nums">{f.exposure.toFixed(2)}</td>
                            <td className="px-2 py-1 tabular-nums text-red-400">{(f.return_contribution * 100).toFixed(2)}%</td>
                          </tr>
                        ))
                      : <tr><td colSpan={4} className="px-2 py-4 text-center text-muted-foreground">No negative detractors</td></tr>
                    }
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
