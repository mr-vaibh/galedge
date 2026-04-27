"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChartPanel } from "@/components/charts/BarChartPanel";
import { CardControls } from "@/components/CardControls";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/currency";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

const overviewTabs = [
  { label: "Performance Summary", href: "/analytics/overview/performance" },
  { label: "Peer Comparison", href: "/analytics/overview/peer-comparison" },
  { label: "Holdings Summary", href: "/analytics/overview/holdings" },
  { label: "Period Analysis", href: "/analytics/overview/period-analysis" },
];


interface Holding {
  symbol: string;
  weight: number;
  sector: string;
  market_cap?: number;
  factor_exposures?: Record<string, number>;
}

export default function HoldingsSummaryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { selectedPortfolioId, selectedFundName } = usePortfolio();
  const { token } = useAuth();
  const { formatCurrencyCompact } = useCurrency();

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSymbols, setSelectedSymbols] = useState<Set<string>>(new Set());

  const fetchHoldings = useCallback(async () => {
    if (!selectedPortfolioId || !token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/analytics/holdings/${selectedPortfolioId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to fetch holdings: ${res.status}`);
      const data = await res.json();
      const holdingsArr: Holding[] = Array.isArray(data) ? data : data.holdings ?? [];
      setHoldings(holdingsArr);
      setSelectedSymbols(new Set(holdingsArr.slice(0, 10).map((h: Holding) => h.symbol)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch holdings");
    } finally {
      setLoading(false);
    }
  }, [selectedPortfolioId, token]);

  useEffect(() => {
    fetchHoldings();
  }, [fetchHoldings]);

  if (!selectedPortfolioId) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Holdings Summary</h1>
            <p className="text-xs text-amber-400">No portfolio selected.</p>
          </div>
          <div className="flex items-center gap-1 bg-card border rounded-lg p-0.5">
            {overviewTabs.map((tab) => (
              <Button key={tab.href} variant={pathname === tab.href ? "secondary" : "ghost"} size="sm" onClick={() => router.push(tab.href)} className="h-7 text-[10px]">{tab.label}</Button>
            ))}
          </div>
        </div>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No portfolio selected. Go to Portfolio Construction to upload and select one.
          </CardContent>
        </Card>
      </div>
    );
  }

  // Build factor data from holdings
  const factorMap: Record<string, { totalExposure: number; count: number }> = {};
  holdings.forEach((h) => {
    if (h.factor_exposures) {
      Object.entries(h.factor_exposures).forEach(([factor, exposure]) => {
        if (!factorMap[factor]) factorMap[factor] = { totalExposure: 0, count: 0 };
        factorMap[factor].totalExposure += exposure;
        factorMap[factor].count += 1;
      });
    }
  });
  const factorSummary = Object.entries(factorMap).map(([factor, v]) => ({
    factor,
    exposure: (v.totalExposure / v.count).toFixed(2),
  }));

  // Build bar chart data from selected holdings
  const chartSymbols = Array.from(selectedSymbols).slice(0, 8);
  const holdingsBarData = chartSymbols.map((sym) => {
    const h = holdings.find((x) => x.symbol === sym);
    return { name: sym, value: h ? parseFloat((h.weight * 100).toFixed(2)) : 0 };
  });

  // Factor exposure bar chart data
  const factorBarData = factorSummary.map((f) => ({
    name: f.factor,
    value: parseFloat(f.exposure),
  }));

  function toggleSymbol(sym: string) {
    setSelectedSymbols((prev) => {
      const next = new Set(prev);
      if (next.has(sym)) next.delete(sym);
      else next.add(sym);
      return next;
    });
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Holdings Summary</h1>
          <p className="text-xs text-muted-foreground">Portfolio: <span className="font-medium text-foreground">{selectedFundName}</span></p>
        </div>
        <div className="flex items-center gap-1 bg-card border rounded-lg p-0.5">
          {overviewTabs.map((tab) => (
            <Button key={tab.href} variant={pathname === tab.href ? "secondary" : "ghost"} size="sm" onClick={() => router.push(tab.href)} className="h-7 text-[10px]">{tab.label}</Button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      )}

      {error && (
        <Card><CardContent className="p-4 text-center text-red-400">{error}</CardContent></Card>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Holdings Table */}
          <Card>
            <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
              <div>
                <CardTitle className="text-[11px]">Holdings Summary</CardTitle>
                <span className="text-[9px] text-muted-foreground">{selectedSymbols.size}/{holdings.length} Selected</span>
              </div>
              <CardControls />
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-border/50">
                    {["", "Symbol", "Weight", "Sector", "Market Cap"].map(h => (
                      <th key={h} className="px-2 py-1.5 text-left text-muted-foreground font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h) => (
                    <tr key={h.symbol} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="px-2 py-1">
                        <input
                          type="checkbox"
                          checked={selectedSymbols.has(h.symbol)}
                          onChange={() => toggleSymbol(h.symbol)}
                          className="h-3 w-3"
                        />
                      </td>
                      <td className="px-2 py-1 font-medium">{h.symbol}</td>
                      <td className="px-2 py-1 tabular-nums">{(h.weight * 100).toFixed(2)}%</td>
                      <td className="px-2 py-1">{h.sector || "—"}</td>
                      <td className="px-2 py-1 tabular-nums">{h.market_cap ? formatCurrencyCompact(h.market_cap * 1e7, "INR") : "—"}</td>
                    </tr>
                  ))}
                  {holdings.length === 0 && (
                    <tr><td colSpan={5} className="px-2 py-4 text-center text-muted-foreground">No holdings data available</td></tr>
                  )}
                </tbody>
              </table>
              <div className="p-2">
                <Button size="sm" variant="outline" className="text-[9px] h-6" onClick={() => {
                  // "Update Graph" refreshes the chart with current checkbox selection
                  setSelectedSymbols(new Set(selectedSymbols));
                }}>Update Graph</Button>
              </div>
            </CardContent>
          </Card>

          {/* Factor Summary Table */}
          <Card>
            <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
              <CardTitle className="text-[11px]">Factor Summary</CardTitle>
              <CardControls />
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-border/50">
                    {["Factor", "Avg Exposure"].map(h => (
                      <th key={h} className="px-2 py-1.5 text-left text-muted-foreground font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {factorSummary.map((f) => (
                    <tr key={f.factor} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="px-2 py-1 font-medium">{f.factor}</td>
                      <td className="px-2 py-1 tabular-nums">{f.exposure}</td>
                    </tr>
                  ))}
                  {factorSummary.length === 0 && (
                    <tr><td colSpan={2} className="px-2 py-4 text-center text-muted-foreground">No factor data available</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Holdings Chart */}
          <Card>
            <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
              <CardTitle className="text-[11px]">Holdings (%)</CardTitle>
              <CardControls />
            </CardHeader>
            <CardContent className="p-2">
              {holdingsBarData.length > 0 ? (
                <BarChartPanel data={holdingsBarData} height={200} />
              ) : (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground text-xs">
                  Select holdings to display chart
                </div>
              )}
            </CardContent>
          </Card>

          {/* Factor Exposure Chart */}
          <Card>
            <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
              <CardTitle className="text-[11px]">Factor Exposure</CardTitle>
              <CardControls />
            </CardHeader>
            <CardContent className="p-2">
              {factorBarData.length > 0 ? (
                <BarChartPanel data={factorBarData} height={200} />
              ) : (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground text-xs">
                  No factor exposure data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
