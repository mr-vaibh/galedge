"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChartPanel } from "@/components/charts/BarChartPanel";
import { CardControls } from "@/components/CardControls";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

const DIMENSIONS = [
  "Sector", "Market Cap", "Liquidity", "Total Risk", "Idiosyncratic Risk",
  "Industry", "Earnings Window", "IPO", "Financial Type", "Position Age",
];

interface Holding {
  symbol: string;
  weight: number;
  sector: string;
  market_cap?: number;
  factor_exposures?: Record<string, number>;
}

interface SliceGroup {
  name: string;
  count: number;
  totalWeight: number;
  holdings: Holding[];
}

function DataTable({ title, columns, rows }: { title: string; columns: string[]; rows: string[][] }) {
  return (
    <Card>
      <CardHeader className="pb-1 flex-row items-center justify-between py-2 px-3">
        <CardTitle className="text-[11px]">{title}</CardTitle>
        <CardControls />
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-border/50">
                {columns.map((c) => (
                  <th key={c} className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                  {row.map((cell, j) => (
                    <td key={j} className={`px-2 py-1 tabular-nums ${j > 0 && cell.startsWith("-") ? "text-red-400" : ""}`}>{cell}</td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={columns.length} className="px-2 py-4 text-center text-muted-foreground">No data available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function groupHoldings(holdings: Holding[], dimension: string): SliceGroup[] {
  const groups: Record<string, Holding[]> = {};

  holdings.forEach((h) => {
    let key: string;
    if (dimension === "Sector") {
      key = h.sector || "Unknown";
    } else if (dimension === "Market Cap") {
      const mc = h.market_cap ?? 0;
      if (mc > 50000) key = "Large Cap";
      else if (mc > 10000) key = "Mid Cap";
      else if (mc > 2000) key = "Small Cap";
      else key = "Micro Cap";
    } else {
      key = h.sector || "Unknown";
    }
    if (!groups[key]) groups[key] = [];
    groups[key].push(h);
  });

  return Object.entries(groups)
    .map(([name, hlds]) => ({
      name,
      count: hlds.length,
      totalWeight: hlds.reduce((s, h) => s + h.weight, 0),
      holdings: hlds,
    }))
    .sort((a, b) => b.totalWeight - a.totalWeight);
}

export default function SlicingAndDicingPage() {
  const [activeDimension, setActiveDimension] = useState("Sector");
  const { selectedPortfolioId, selectedFundName } = usePortfolio();
  const { token } = useAuth();

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <div className="p-4 space-y-3">
        <h1 className="text-xl font-bold">Slicing and Dicing</h1>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No portfolio selected. Go to Portfolio Construction to upload and select one.
          </CardContent>
        </Card>
      </div>
    );
  }

  const groups = groupHoldings(holdings, activeDimension);

  // Build table rows from groups
  const weightTableRows = groups.map((g) => [
    g.name,
    String(g.count),
    `${(g.totalWeight * 100).toFixed(2)}%`,
  ]);

  // Bar chart data: weight by group
  const weightBarData = groups.map((g) => ({
    name: g.name,
    value: parseFloat((g.totalWeight * 100).toFixed(2)),
  }));

  // Top holdings sorted by weight
  const topHoldings = [...holdings].sort((a, b) => b.weight - a.weight).slice(0, 10);
  const topHoldingsBarData = topHoldings.map((h) => ({
    name: h.symbol,
    value: parseFloat((h.weight * 100).toFixed(2)),
  }));

  // Bottom holdings (lowest weight, possibly negative/short)
  const bottomHoldings = [...holdings].sort((a, b) => a.weight - b.weight).slice(0, 10);

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-bold">Slicing and Dicing{selectedFundName ? ` — ${selectedFundName}` : ""}</h1>

      {/* Dimension Tabs */}
      <div className="flex gap-0.5 overflow-x-auto pb-1">
        {DIMENSIONS.map((d) => (
          <Button
            key={d}
            variant={activeDimension === d ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveDimension(d)}
            className={`h-7 text-[10px] whitespace-nowrap ${activeDimension === d ? "border-b-2 border-blue-500 rounded-b-none" : ""}`}
          >
            {d}
          </Button>
        ))}
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
        <>
          {/* Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            <DataTable
              title={`Weight by ${activeDimension}`}
              columns={[activeDimension, "# Holdings", "Weight (%)"]}
              rows={weightTableRows}
            />
            <DataTable
              title="Holdings Count by Group"
              columns={[activeDimension, "Count", "% of Total"]}
              rows={groups.map((g) => [
                g.name,
                String(g.count),
                `${((g.count / Math.max(holdings.length, 1)) * 100).toFixed(1)}%`,
              ])}
            />
            <Card>
              <CardHeader className="pb-1 flex-row items-center justify-between py-2 px-3">
                <CardTitle className="text-[11px]">Weight Distribution by {activeDimension}</CardTitle>
                <CardControls />
              </CardHeader>
              <CardContent>
                {weightBarData.length > 0 ? (
                  <BarChartPanel data={weightBarData} height={144} />
                ) : (
                  <div className="flex items-center justify-center h-[144px] text-muted-foreground text-xs">No data</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 flex-row items-center justify-between py-2 px-3">
                <CardTitle className="text-[11px]">Top Holdings (%)</CardTitle>
                <CardControls />
              </CardHeader>
              <CardContent>
                {topHoldingsBarData.length > 0 ? (
                  <BarChartPanel data={topHoldingsBarData} height={144} />
                ) : (
                  <div className="flex items-center justify-center h-[144px] text-muted-foreground text-xs">No data</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Contributors and Detractors */}
          <div className="mt-4">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-sm font-semibold">Contributors and Detractors</h2>
              <Tabs defaultValue="overall">
                <TabsList className="h-7">
                  <TabsTrigger value="overall" className="text-[10px] h-6">Overall</TabsTrigger>
                  <TabsTrigger value="factor" className="text-[10px] h-6">Factor</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <DataTable
                title="Top 10 - Holdings (%)"
                columns={["Symbol", "Weight (%)", "Sector"]}
                rows={topHoldings.map((h) => [
                  h.symbol,
                  `${(h.weight * 100).toFixed(2)}%`,
                  h.sector || "—",
                ])}
              />
              <DataTable
                title="Bottom 10 - Holdings (%)"
                columns={["Symbol", "Weight (%)", "Sector"]}
                rows={bottomHoldings.map((h) => [
                  h.symbol,
                  `${(h.weight * 100).toFixed(2)}%`,
                  h.sector || "—",
                ])}
              />
              <Card>
                <CardHeader className="pb-1 flex-row items-center justify-between py-2 px-3">
                  <CardTitle className="text-[11px]">Top Holdings (%)</CardTitle>
                  <CardControls />
                </CardHeader>
                <CardContent>
                  {topHoldingsBarData.length > 0 ? (
                    <BarChartPanel data={topHoldingsBarData} height={144} />
                  ) : (
                    <div className="flex items-center justify-center h-[144px] text-muted-foreground text-xs">No data</div>
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
