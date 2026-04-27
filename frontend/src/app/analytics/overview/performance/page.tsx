"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
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

export default function PerformanceSummaryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { token } = useAuth();
  const { selectedPortfolioId, selectedFundName } = usePortfolio();

  const portfolioId = selectedPortfolioId;

  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [equityCurve, setEquityCurve] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataIngesting, setDataIngesting] = useState(false);

  async function fetchPerformance() {
    setLoading(true);
    setError(null);
    setDataIngesting(false);
    try {
      if (portfolioId && token) {
        // Check if data is still being ingested
        const statusRes = await fetch(`${API_BASE}/api/portfolios/${portfolioId}/data-status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (statusRes.ok) {
          const status = await statusRes.json();
          if (status.status === "ingesting") {
            setDataIngesting(true);
            setLoading(false);
            // Retry in 5 seconds
            setTimeout(fetchPerformance, 5000);
            return;
          }
        }

        const res = await fetch(`${API_BASE}/api/analytics/performance/${portfolioId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.error) {
            setError(data.error);
          } else {
            setMetrics(data);
            setEquityCurve(data.equity_curve || []);
          }
        }
      } else {
        // Demo backtest
        const res = await fetch(
          `${API_BASE}/api/backtest/quick?universe=NIFTY%2050&start=2025-06-01&end=${new Date().toISOString().split("T")[0]}&frequency=Monthly&method=equal`,
          { method: "POST" }
        );
        if (res.ok) {
          const data = await res.json();
          setMetrics(data.metrics);
          setEquityCurve(data.equity_curve || []);
        } else {
          setError("Backend unavailable. Start the backend with: cd backend && uvicorn app.main:app --port 8001");
        }
      }
    } catch {
      setError("Could not connect to API");
    }
    setLoading(false);
  }

  useEffect(() => { fetchPerformance(); }, [portfolioId, token]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Performance Summary</h1>
          {selectedFundName ? (
            <p className="text-xs text-muted-foreground">Portfolio: <span className="font-medium text-foreground">{selectedFundName}</span></p>
          ) : (
            <p className="text-xs text-amber-400">
              Showing demo data (NIFTY 50 equal weight).{" "}
              <button className="underline" onClick={() => router.push("/portfolio-construction/select")}>Select a portfolio</button>
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 bg-card border rounded-lg p-0.5">
          {OVERVIEW_TABS.map((tab) => (
            <Button key={tab.href} variant={pathname === tab.href ? "secondary" : "ghost"} size="sm" className="h-7 text-[10px]" onClick={() => router.push(tab.href)}>{tab.label}</Button>
          ))}
        </div>
      </div>

      {error && (
        <Card className="border-amber-500/30">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
            <p className="text-sm text-amber-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {dataIngesting ? (
        <Card className="border-blue-500/30">
          <CardContent className="py-8 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            <p className="text-sm font-medium text-blue-400">Fetching market data for your portfolio...</p>
            <p className="text-xs text-muted-foreground">Downloading historical prices from Yahoo Finance. This takes 30-60 seconds on first upload.</p>
            <p className="text-[10px] text-muted-foreground">Analytics will load automatically when ready.</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading analytics...</span>
        </div>
      ) : metrics ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card>
            <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
              <CardTitle className="text-[11px]">Profit and Loss Summary</CardTitle>
              <CardControls data={[metrics as Record<string, unknown>]} filename="pnl" />
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-[10px]">
                <tbody>
                  {[
                    ["Total Return", `${metrics.total_return ?? metrics.total_portfolio_return ?? "—"}%`],
                    ["CAGR", `${metrics.cagr ?? metrics.annualised_return ?? "—"}%`],
                    ["Sharpe Ratio", metrics.sharpe_ratio ?? metrics.sharpe ?? "—"],
                    ["Positions", metrics.avg_positions ?? metrics.num_holdings ?? "—"],
                  ].map(([l, v]) => (
                    <tr key={String(l)} className="border-b border-border/30">
                      <td className="px-2 py-1.5 text-muted-foreground">{String(l)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums font-medium">{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
              <CardTitle className="text-[11px]">Risk Summary</CardTitle>
              <CardControls />
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-[10px]">
                <tbody>
                  {[
                    ["Max Drawdown", `${metrics.max_drawdown ?? "—"}%`],
                    ["Volatility", `${metrics.volatility ?? "—"}%`],
                    ["Avg Turnover", metrics.avg_turnover != null ? `${metrics.avg_turnover}%` : "—"],
                    ["Trading Days", metrics.trading_days ?? metrics.total_trades ?? "—"],
                  ].map(([l, v]) => (
                    <tr key={String(l)} className="border-b border-border/30">
                      <td className="px-2 py-1.5 text-muted-foreground">{String(l)}</td>
                      <td className={`px-2 py-1.5 text-right tabular-nums font-medium ${String(v).startsWith("-") ? "text-red-400" : ""}`}>{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
              <CardTitle className="text-[11px]">Portfolio Summary</CardTitle>
              <CardControls />
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-[10px]">
                <tbody>
                  {[
                    ["Initial Capital", metrics.initial_capital ? `₹${(Number(metrics.initial_capital) / 1e7).toFixed(2)} Cr` : metrics.aum ? `₹${metrics.aum} Cr` : "—"],
                    ["Final Value", metrics.final_value ? `₹${(Number(metrics.final_value) / 1e7).toFixed(2)} Cr` : "—"],
                    ["Rebalances", metrics.total_rebalances ?? "—"],
                    ["Fund", metrics.fund_name ?? selectedFundName ?? "Demo"],
                  ].map(([l, v]) => (
                    <tr key={String(l)} className="border-b border-border/30">
                      <td className="px-2 py-1.5 text-muted-foreground">{String(l)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums font-medium">{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Charts */}
          <Card>
            <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
              <CardTitle className="text-[11px]">Portfolio Value</CardTitle>
              <CardControls data={equityCurve as Record<string, unknown>[]} filename="equity_curve" />
            </CardHeader>
            <CardContent className="p-2">
              {equityCurve.length > 0 ? (
                <TimeSeriesChart
                  data={equityCurve.map(e => ({ date: String(e.date), value: Number(e.value) / 1e5 }))}
                  series={[{ key: "value", name: "Value (₹L)", color: "#f97316" }]}
                  height={180}
                  yFormatter={(v) => `${v.toFixed(0)}L`}
                />
              ) : <div className="h-44 flex items-center justify-center text-[10px] text-muted-foreground">No equity curve — select a portfolio and run backtest</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
              <CardTitle className="text-[11px]">Drawdown (%)</CardTitle>
              <CardControls />
            </CardHeader>
            <CardContent className="p-2">
              {equityCurve.length > 0 ? (
                <TimeSeriesChart
                  data={equityCurve.filter(e => e.drawdown !== undefined).map(e => ({ date: String(e.date), dd: Number(e.drawdown) }))}
                  series={[{ key: "dd", name: "Drawdown", color: "#ef4444" }]}
                  height={180}
                />
              ) : <div className="h-44 flex items-center justify-center text-[10px] text-muted-foreground">No data</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
              <CardTitle className="text-[11px]">Value Trend</CardTitle>
              <CardControls />
            </CardHeader>
            <CardContent className="p-2">
              {equityCurve.length > 0 ? (
                <TimeSeriesChart
                  data={equityCurve.map(e => ({ date: String(e.date), v: Number(e.value) }))}
                  series={[{ key: "v", name: "₹", color: "#10b981" }]}
                  height={180}
                  yFormatter={(v) => `${(v / 1e7).toFixed(2)}Cr`}
                />
              ) : <div className="h-44 flex items-center justify-center text-[10px] text-muted-foreground">No data</div>}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
