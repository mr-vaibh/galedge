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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

const OVERVIEW_TABS = [
  { label: "Performance Summary", href: "/analytics/overview/performance" },
  { label: "Peer Comparison", href: "/analytics/overview/peer-comparison" },
  { label: "Holdings Summary", href: "/analytics/overview/holdings" },
  { label: "Period Analysis", href: "/analytics/overview/period-analysis" },
];

interface EquityPoint {
  date: string;
  value: number;
  drawdown?: number;
}

interface PeriodRow {
  label: string;
  returnPct: number;
  volatility: number;
  maxDrawdown: number;
  sharpe: number;
}

function computePeriodStats(points: EquityPoint[]): { returnPct: number; volatility: number; maxDrawdown: number; sharpe: number } {
  if (points.length < 2) return { returnPct: 0, volatility: 0, maxDrawdown: 0, sharpe: 0 };
  const first = points[0].value;
  const last = points[points.length - 1].value;
  const returnPct = ((last - first) / first) * 100;

  // Daily returns within this period
  const dailyReturns: number[] = [];
  for (let i = 1; i < points.length; i++) {
    if (points[i - 1].value > 0) {
      dailyReturns.push((points[i].value - points[i - 1].value) / points[i - 1].value);
    }
  }

  const mean = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
  const variance = dailyReturns.length > 1
    ? dailyReturns.reduce((a, b) => a + (b - mean) ** 2, 0) / (dailyReturns.length - 1)
    : 0;
  const dailyVol = Math.sqrt(variance);
  const volatility = dailyVol * Math.sqrt(252) * 100;
  const sharpe = dailyVol > 0 ? (mean / dailyVol) * Math.sqrt(252) : 0;

  // Max drawdown
  let peak = points[0].value;
  let maxDD = 0;
  for (const p of points) {
    if (p.value > peak) peak = p.value;
    const dd = (p.value - peak) / peak;
    if (dd < maxDD) maxDD = dd;
  }

  return { returnPct, volatility, maxDrawdown: maxDD * 100, sharpe };
}

function groupByMonth(curve: EquityPoint[]): PeriodRow[] {
  const groups: Record<string, EquityPoint[]> = {};
  for (const p of curve) {
    const key = p.date.substring(0, 7); // YYYY-MM
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }
  const months = Object.keys(groups).sort();
  return months.map((m) => {
    const stats = computePeriodStats(groups[m]);
    const [y, mo] = m.split("-");
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return { label: `${monthNames[parseInt(mo) - 1]} ${y}`, ...stats };
  });
}

function groupByQuarter(curve: EquityPoint[]): PeriodRow[] {
  const groups: Record<string, EquityPoint[]> = {};
  for (const p of curve) {
    const [y, m] = p.date.split("-");
    const q = Math.ceil(parseInt(m) / 3);
    const key = `${y}-Q${q}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }
  return Object.keys(groups).sort().map((k) => {
    const stats = computePeriodStats(groups[k]);
    return { label: k, ...stats };
  });
}

function STable({ title, rows, columns }: { title: string; rows: string[][]; columns: string[] }) {
  const tableJsx = (
    <table className="w-full text-[10px]">
      <thead>
        <tr className="border-b border-border/50">
          {columns.map((c) => (
            <th key={c} className="px-2 py-1.5 text-left font-medium text-muted-foreground">{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
            {row.map((cell, j) => (
              <td key={j} className={`px-2 py-1 tabular-nums ${j > 0 && cell.startsWith("-") ? "text-red-400" : ""}`}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
        {rows.length === 0 && (
          <tr><td colSpan={columns.length} className="px-2 py-4 text-center text-muted-foreground">No data</td></tr>
        )}
      </tbody>
    </table>
  );

  return (
    <Card>
      <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
        <CardTitle className="text-[11px]">{title}</CardTitle>
        <CardControls
          title={title}
          data={rows.map((row) => Object.fromEntries(columns.map((c, i) => [c, row[i] ?? ""])))}
          filename={title.toLowerCase().replace(/\s+/g, "_")}
          expandContent={tableJsx}
        />
      </CardHeader>
      <CardContent className="p-0">
        {tableJsx}
      </CardContent>
    </Card>
  );
}

export default function PeriodAnalysisPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { selectedPortfolioId, selectedFundName } = usePortfolio();
  const { token } = useAuth();

  const [period, setPeriod] = useState<"monthly" | "quarterly">("monthly");
  const [periodRows, setPeriodRows] = useState<PeriodRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!selectedPortfolioId || !token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/analytics/performance/${selectedPortfolioId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch performance data");
      const data = await res.json();
      const curve: EquityPoint[] = data.equity_curve || [];
      if (curve.length < 2) {
        setError("Not enough data points for period analysis");
        setPeriodRows([]);
      } else {
        const rows = period === "monthly" ? groupByMonth(curve) : groupByQuarter(curve);
        setPeriodRows(rows);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [selectedPortfolioId, token, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const pnlRows = periodRows.map((r) => [r.label, `${r.returnPct.toFixed(2)}%`]);
  const riskRows = periodRows.map((r) => [r.label, `${r.volatility.toFixed(1)}%`, `${r.maxDrawdown.toFixed(1)}%`]);
  const statsRows = periodRows.map((r) => [r.label, r.sharpe.toFixed(2), `${r.maxDrawdown.toFixed(1)}%`]);
  const barData = periodRows.map((r) => ({ name: r.label, value: parseFloat(r.returnPct.toFixed(2)) }));

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Period Analysis</h1>
          {selectedFundName ? (
            <p className="text-xs text-muted-foreground">Portfolio: <span className="font-medium text-foreground">{selectedFundName}</span></p>
          ) : (
            <p className="text-xs text-amber-400">
              No portfolio selected.{" "}
              <button className="underline" onClick={() => router.push("/portfolio-construction/select")}>Select one</button>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-card border rounded-lg p-0.5">
            <Button variant={period === "monthly" ? "secondary" : "ghost"} size="sm" onClick={() => setPeriod("monthly")} className="h-7 text-[10px] px-3">Monthly</Button>
            <Button variant={period === "quarterly" ? "secondary" : "ghost"} size="sm" onClick={() => setPeriod("quarterly")} className="h-7 text-[10px] px-3">Quarterly</Button>
          </div>
          <div className="flex items-center gap-1 bg-card border rounded-lg p-0.5">
            {OVERVIEW_TABS.map((tab) => (
              <Button key={tab.href} variant={pathname === tab.href ? "secondary" : "ghost"} size="sm" className="h-7 text-[10px]" onClick={() => router.push(tab.href)}>{tab.label}</Button>
            ))}
          </div>
        </div>
      </div>

      {!selectedPortfolioId ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No portfolio selected. Go to Portfolio Construction to upload and select one.
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Computing period returns...</span>
        </div>
      ) : error ? (
        <Card><CardContent className="p-4 text-center text-amber-400">{error}</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <STable title="P&L by Period" columns={["Period", "Return"]} rows={pnlRows} />
            <STable title="Risk by Period" columns={["Period", "Volatility", "Max Drawdown"]} rows={riskRows} />
            <STable title="Statistics" columns={["Period", "Sharpe", "Max Drawdown"]} rows={statsRows} />
          </div>

          <Card>
            <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
              <CardTitle className="text-[11px]">Return by Period (%)</CardTitle>
              <CardControls title="Return by Period (%)" data={barData as unknown as Record<string, unknown>[]} filename="period_returns" expandContent={barData.length > 0 ? <BarChartPanel data={barData} height={600} /> : undefined} />
            </CardHeader>
            <CardContent className="p-2">
              {barData.length > 0 ? (
                <BarChartPanel data={barData} height={220} />
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground text-xs">No data</div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
