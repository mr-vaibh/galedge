"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CardControls } from "@/components/CardControls";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

const overviewTabs = [
  { label: "Performance Summary", href: "/analytics/overview/performance" },
  { label: "Peer Comparison", href: "/analytics/overview/peer-comparison" },
  { label: "Holdings Summary", href: "/analytics/overview/holdings" },
  { label: "Period Analysis", href: "/analytics/overview/period-analysis" },
];

function STable({ title, rows }: { title: string; rows: [string, string][] }) {
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
              <th className="px-2 py-1.5 text-left text-muted-foreground" />
              <th className="px-2 py-1.5 text-right text-muted-foreground">Portfolio</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([l, a], i) => (
              <tr key={i} className="border-b border-border/30">
                <td className="px-2 py-1 text-muted-foreground">{l}</td>
                <td className="px-2 py-1 text-right tabular-nums">{a}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

interface PerformanceData {
  total_return?: number;
  annualised_return?: number;
  num_holdings?: number;
  aum?: number;
  sharpe_ratio?: number;
  volatility?: number;
  max_drawdown?: number;
  [key: string]: unknown;
}

export default function PeerComparisonPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { selectedPortfolioId, selectedFundName } = usePortfolio();
  const { token } = useAuth();

  const [perfData, setPerfData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPerformance = useCallback(async () => {
    if (!selectedPortfolioId || !token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/analytics/performance/${selectedPortfolioId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to fetch performance: ${res.status}`);
      const data = await res.json();
      setPerfData(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch performance data");
    } finally {
      setLoading(false);
    }
  }, [selectedPortfolioId, token]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  const fmt = (v: number | undefined | null, suffix = "%") =>
    v != null ? `${(v * (suffix === "%" ? 100 : 1)).toFixed(2)}${suffix}` : "—";
  const fmtRaw = (v: number | undefined | null) =>
    v != null ? v.toFixed(2) : "—";

  if (!selectedPortfolioId) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Peer Comparison</h1>
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

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Peer Comparison{selectedFundName ? ` — ${selectedFundName}` : ""}</h1>
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
        <>
          <Card>
            <CardContent className="p-4 text-center text-muted-foreground text-sm">
              Peer comparison requires at least 2 portfolios. Add more portfolios to compare.
              <br />
              <span className="text-xs mt-1 block">Showing single-portfolio metrics below.</span>
            </CardContent>
          </Card>

          {perfData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <STable title="Profit and Loss Summary" rows={[
                ["Total Return (%)", fmt(perfData.total_return)],
                ["Annualised Return (%)", fmt(perfData.annualised_return)],
                ["Sharpe Ratio", fmtRaw(perfData.sharpe_ratio)],
              ]} />
              <STable title="Risk Summary" rows={[
                ["Volatility (%)", fmt(perfData.volatility)],
                ["Max Drawdown (%)", fmt(perfData.max_drawdown)],
              ]} />
              <STable title="Portfolio Info" rows={[
                ["Number of Holdings", perfData.num_holdings != null ? String(perfData.num_holdings) : "—"],
                ["AUM", perfData.aum != null ? `${(perfData.aum / 10000000).toFixed(2)} Cr` : "—"],
              ]} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
