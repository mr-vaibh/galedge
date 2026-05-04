"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChartPanel } from "@/components/charts/BarChartPanel";
import { CardControls } from "@/components/CardControls";
import { usePortfolio } from "@/lib/portfolio-context";
import { useCurrency } from "@/lib/currency";

const peerTabs = [
  { label: "Peer Returns and Risks", href: "/analytics/peer-intelligence" },
  { label: "Peer Breakdown", href: "/analytics/peer-intelligence/peer-breakdown" },
];

const DIMENSIONS = ["Sector", "Market Cap", "Factor Exposure"] as const;
type Dimension = (typeof DIMENSIONS)[number];

function fmt(v: unknown, dec = 2): string {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  if (isNaN(n)) return "—";
  return n.toFixed(dec);
}

export default function PeerBreakdownPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { analyticsData, analyticsLoading, analyticsError, selectedFundName, selectedSource, selectedSourceId, selectedBacktestId, loadAnalytics } = usePortfolio();
  const { formatCurrencyCompact } = useCurrency();
  const [dimension, setDimension] = useState<Dimension>("Sector");

  const pnl = (analyticsData?.pnl_metrics ?? {}) as Record<string, unknown>;
  const holdingsDetail = (analyticsData?.holdings_detail ?? []) as Record<string, unknown>[];
  const factorDetail = (analyticsData?.factor_detail ?? []) as Record<string, unknown>[];
  const sectorSlicing = (analyticsData?.sector_slicing ?? []) as Record<string, unknown>[];
  const mcapSlicing = (analyticsData?.mcap_slicing ?? []) as Record<string, unknown>[];

  // Choose slicing data based on dimension
  const slicingData = dimension === "Sector" ? sectorSlicing : dimension === "Market Cap" ? mcapSlicing : [];

  // Holdings sorted by weight
  const sortedHoldings = [...holdingsDetail].sort((a, b) => Number(b.avg_weight ?? 0) - Number(a.avg_weight ?? 0));
  const topHoldings = sortedHoldings.slice(0, 5);
  const bottomHoldings = [...sortedHoldings].reverse().slice(0, 5);

  // Bar charts
  const breakdownBarData = slicingData.map(r => ({
    name: String(r.bucket ?? "").slice(0, 14),
    value: parseFloat(fmt(Number(r.weight_pct ?? 0))),
  }));

  const holdingsBarData = topHoldings.map(h => ({
    name: String(h.symbol ?? "").replace(".NS", "").slice(0, 10),
    value: parseFloat(fmt(Number(h.avg_weight ?? 0) * 100)),
  }));

  // Factor breakdown
  const topFactors = [...factorDetail].sort((a, b) => Number(b.return_contribution_pct ?? 0) - Number(a.return_contribution_pct ?? 0)).slice(0, 5);
  const bottomFactors = [...factorDetail].sort((a, b) => Number(a.return_contribution_pct ?? 0) - Number(b.return_contribution_pct ?? 0)).slice(0, 5);

  const label = selectedFundName ?? "Selected Portfolio";

  if (analyticsLoading) {
    return <div className="p-8 text-center text-muted-foreground">Computing analytics...</div>;
  }

  if (!analyticsData) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Peer Breakdown</h1>
          <div className="flex items-center gap-1 bg-card border rounded-lg p-0.5">
            {peerTabs.map(t => <Button key={t.href} variant={pathname === t.href ? "secondary" : "ghost"} size="sm" onClick={() => router.push(t.href)} className="h-7 text-[10px]">{t.label}</Button>)}
          </div>
        </div>
        {analyticsError && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">Error: {analyticsError}</div>}
        <Card><CardContent className="p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">{selectedSourceId ? "Portfolio selected — click to load" : "Select a portfolio from the sidebar"}</p>
          {selectedSourceId && (
            <button onClick={() => selectedSource && loadAnalytics(selectedSource, selectedSourceId, selectedBacktestId ?? undefined)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors">
              Load Analytics
            </button>
          )}
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Peer Breakdown</h1>
          <p className="text-xs text-muted-foreground">Portfolio: <span className="font-medium text-foreground">{label}</span></p>
        </div>
        <div className="flex items-center gap-1 bg-card border rounded-lg p-0.5">
          {peerTabs.map(t => <Button key={t.href} variant={pathname === t.href ? "secondary" : "ghost"} size="sm" onClick={() => router.push(t.href)} className="h-7 text-[10px]">{t.label}</Button>)}
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          ["Total Return (%)", pnl.total_return_pct],
          ["Volatility (%)", pnl.volatility_pct],
          ["Sharpe", pnl.sharpe],
          ["Max Drawdown (%)", pnl.max_drawdown_pct],
        ].map(([lbl, val]) => (
          <Card key={String(lbl)}>
            <CardContent className="p-2 text-center">
              <div className="text-[9px] text-muted-foreground">{String(lbl)}</div>
              <div className={`text-sm font-bold tabular-nums ${Number(val) < 0 ? "text-red-400" : "text-emerald-400"}`}>
                {fmt(val)}%
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dimension tabs */}
      <div className="flex gap-0.5 overflow-x-auto pb-1">
        {DIMENSIONS.map(d => (
          <Button key={d} variant={dimension === d ? "secondary" : "ghost"} size="sm"
            onClick={() => setDimension(d)} className="h-7 text-[10px] whitespace-nowrap">
            {d}
          </Button>
        ))}
      </div>

      {/* Slicing breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Breakdown by {dimension}</CardTitle>
            <CardControls title={`Breakdown by ${dimension}`} info="Holdings grouped by dimension with weight, return, and risk." />
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-border/50">
                  {[dimension, "Weight (%)", "Return (%)", "Vol (%)", "PE"].map(h => (
                    <th key={h} className="px-2 py-1.5 text-left text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slicingData.length > 0 ? slicingData.map((r, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="px-2 py-1.5 font-medium">{String(r.bucket ?? "—")}</td>
                    <td className="px-2 py-1.5 tabular-nums">{fmt(r.weight_pct)}</td>
                    <td className={`px-2 py-1.5 tabular-nums ${Number(r.return_pct ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(r.return_pct)}</td>
                    <td className="px-2 py-1.5 tabular-nums">{fmt(r.vol_pct)}</td>
                    <td className="px-2 py-1.5 tabular-nums">{fmt(r.pe)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="px-2 py-4 text-center text-muted-foreground">No data</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Weight by {dimension} (%)</CardTitle>
            <CardControls title={`Weight by ${dimension}`} info="Portfolio weight allocation by grouping." fullscreen
              expandContent={breakdownBarData.length > 0 ? <BarChartPanel data={breakdownBarData} height={600} /> : undefined} />
          </CardHeader>
          <CardContent className="p-2">
            {breakdownBarData.length > 0 ? <BarChartPanel data={breakdownBarData} height={200} /> : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Holdings tables */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          ["Top Holdings by Weight", topHoldings],
          ["Bottom Holdings by Weight", bottomHoldings],
        ].map(([title, rows]) => (
          <Card key={String(title)}>
            <CardHeader className="pb-1 py-2 px-3"><CardTitle className="text-[11px]">{String(title)}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-border/50">
                    {["Symbol", "Weight (%)", "Return (%)", "Risk (%)"].map(h => (
                      <th key={h} className="px-2 py-1.5 text-left text-muted-foreground font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(rows as Record<string, unknown>[]).length > 0 ? (rows as Record<string, unknown>[]).map((h, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="px-2 py-1 font-medium">{String(h.symbol ?? "—").replace(".NS", "")}</td>
                      <td className="px-2 py-1 tabular-nums">{fmt(Number(h.avg_weight ?? 0) * 100)}</td>
                      <td className={`px-2 py-1 tabular-nums ${Number(h.total_return_contribution_pct ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(h.total_return_contribution_pct)}</td>
                      <td className="px-2 py-1 tabular-nums">{fmt(h.risk_contribution_pct)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="px-2 py-4 text-center text-muted-foreground">No data</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Top Holdings Weight (%)</CardTitle>
            <CardControls title="Top Holdings Weight" info="Largest positions by average weight." fullscreen
              expandContent={holdingsBarData.length > 0 ? <BarChartPanel data={holdingsBarData} height={500} /> : undefined} />
          </CardHeader>
          <CardContent className="p-2">
            {holdingsBarData.length > 0 ? <BarChartPanel data={holdingsBarData} height={200} /> : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Factor contributors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          ["Top Factor Contributors", topFactors, "emerald"],
          ["Top Factor Detractors", bottomFactors, "red"],
        ].map(([title, rows, color]) => (
          <Card key={String(title)}>
            <CardHeader className="pb-1 py-2 px-3"><CardTitle className="text-[11px]">{String(title)}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-border/50">
                    {["Type", "Factor", "Exposure (%)", "Return (%)"].map(h => (
                      <th key={h} className="px-2 py-1.5 text-left text-muted-foreground font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(rows as Record<string, unknown>[]).length > 0 ? (rows as Record<string, unknown>[]).map((f, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="px-2 py-1">{String(f.factor_type ?? "—")}</td>
                      <td className="px-2 py-1 font-medium">{String(f.factor_name ?? "—")}</td>
                      <td className="px-2 py-1 tabular-nums">{fmt(f.exposure_pct)}</td>
                      <td className={`px-2 py-1 tabular-nums text-${color}-400`}>{fmt(f.return_contribution_pct)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="px-2 py-4 text-center text-muted-foreground">No data</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
