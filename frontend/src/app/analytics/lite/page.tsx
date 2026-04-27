"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { CardControls } from "@/components/CardControls";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/currency";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

interface EquityPoint { date: string; value: number; drawdown?: number }
interface Holding { symbol: string; weight: number; sector: string; market_cap?: number; factor_exposures?: Record<string, number> }

export default function LiteAnalyticsPage() {
  const router = useRouter();
  const { selectedPortfolioId, selectedFundName } = usePortfolio();
  const { token } = useAuth();
  const { formatCurrencyCompact } = useCurrency();

  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [equityCurve, setEquityCurve] = useState<EquityPoint[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFactors, setSelectedFactors] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    if (!selectedPortfolioId || !token) return;
    setLoading(true);
    setError(null);
    try {
      const [perfRes, holdRes] = await Promise.all([
        fetch(`${API_BASE}/api/analytics/performance/${selectedPortfolioId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/analytics/holdings/${selectedPortfolioId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (perfRes.ok) {
        const data = await perfRes.json();
        if (data.error) {
          setError(data.error);
        } else {
          setMetrics(data);
          setEquityCurve(data.equity_curve || []);
        }
      }

      if (holdRes.ok) {
        const data = await holdRes.json();
        const h: Holding[] = data.holdings ?? [];
        setHoldings(h);
        // Collect all factor names
        const allFactors = new Set<string>();
        h.forEach((x) => {
          if (x.factor_exposures) Object.keys(x.factor_exposures).forEach((f) => allFactors.add(f));
        });
        setSelectedFactors(allFactors);
      }
    } catch {
      setError("Could not connect to API");
    } finally {
      setLoading(false);
    }
  }, [selectedPortfolioId, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Compute weighted factor contributions
  const factorContributions: Record<string, number> = {};
  holdings.forEach((h) => {
    if (h.factor_exposures) {
      Object.entries(h.factor_exposures).forEach(([f, exp]) => {
        factorContributions[f] = (factorContributions[f] || 0) + h.weight * exp;
      });
    }
  });
  const factorNames = Object.keys(factorContributions).sort();

  // Equity curve as cumulative return %
  const returnCurve = equityCurve.length > 0
    ? equityCurve.map((p) => ({
        date: p.date,
        portfolio: ((p.value - equityCurve[0].value) / equityCurve[0].value) * 100,
      }))
    : [];

  // Drawdown curve
  const drawdownCurve = equityCurve
    .filter((p) => p.drawdown !== undefined)
    .map((p) => ({ date: p.date, drawdown: p.drawdown! }));

  if (!selectedPortfolioId) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold">Lite Analytics</h1>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No portfolio selected.{" "}
            <button className="underline text-blue-400" onClick={() => router.push("/portfolio-construction/select")}>Select a portfolio</button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Lite Analytics</h1>
          {selectedFundName && (
            <p className="text-xs text-muted-foreground">Portfolio: <span className="font-medium text-foreground">{selectedFundName}</span></p>
          )}
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => {
          if (!holdings.length) return;
          const csv = ["Symbol,Weight,Sector,MarketCap(Cr)", ...holdings.map((h) => `${h.symbol},${(h.weight * 100).toFixed(2)}%,${h.sector},${h.market_cap ?? 0}`)].join("\n");
          const blob = new Blob([csv], { type: "text/csv" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "holdings.csv";
          a.click();
        }}>
          <Download className="h-3 w-3" /> Download Holdings
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading analytics...</span>
        </div>
      ) : error ? (
        <Card><CardContent className="p-4 text-center text-amber-400">{error}</CardContent></Card>
      ) : metrics ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* P&L Summary */}
            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                <CardTitle className="text-[11px]">Profit and Loss Summary</CardTitle>
                <CardControls data={metrics ? [metrics as Record<string, unknown>] : []} filename="pnl" />
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-[10px]">
                  <tbody>
                    {[
                      ["Total Return", `${metrics.total_return ?? "—"}%`],
                      ["CAGR", `${metrics.annualised_return ?? "—"}%`],
                      ["Sharpe Ratio", metrics.sharpe_ratio ?? "—"],
                      ["Holdings", metrics.num_holdings ?? "—"],
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

            {/* Risk Summary */}
            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                <CardTitle className="text-[11px]">Risk Summary</CardTitle>
                <CardControls data={metrics ? [metrics as Record<string, unknown>] : []} filename="risk" />
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-[10px]">
                  <tbody>
                    {[
                      ["Volatility", `${metrics.volatility ?? "—"}%`],
                      ["Max Drawdown", `${metrics.max_drawdown ?? "—"}%`],
                      ["Trading Days", metrics.trading_days ?? "—"],
                      ["AUM", metrics.total_aum_cr ? formatCurrencyCompact(Number(metrics.total_aum_cr) * 1e7, "INR") : "—"],
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

            {/* Factor Contributions */}
            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                <CardTitle className="text-[11px]">Weighted Factor Exposure</CardTitle>
                <CardControls data={factorNames.map(f => ({factor: f, contribution: factorContributions[f]}))} filename="factor_exposures" />
              </CardHeader>
              <CardContent className="p-2">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {factorNames.map((f) => (
                    <label key={f} className="flex items-center gap-1 text-[9px] cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-3 w-3"
                        checked={selectedFactors.has(f)}
                        onChange={() => {
                          const next = new Set(selectedFactors);
                          if (next.has(f)) next.delete(f); else next.add(f);
                          setSelectedFactors(next);
                        }}
                      />
                      {f}
                    </label>
                  ))}
                </div>
                {factorNames.length > 0 ? (
                  <table className="w-full text-[10px] mt-1">
                    <tbody>
                      {factorNames.filter((f) => selectedFactors.has(f)).map((f) => (
                        <tr key={f} className="border-b border-border/30">
                          <td className="px-1 py-0.5">{f}</td>
                          <td className={`px-1 py-0.5 text-right tabular-nums ${factorContributions[f] < 0 ? "text-red-400" : "text-green-400"}`}>
                            {factorContributions[f].toFixed(4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-[9px] text-muted-foreground">No factor data available</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                <CardTitle className="text-[11px]">Cumulative Return (%)</CardTitle>
                <CardControls>
                  {returnCurve.length > 1 && (
                    <div style={{ width: "100%", height: "calc(88vh - 100px)" }}>
                      <TimeSeriesChart
                        data={returnCurve}
                        series={[{ key: "portfolio", name: "Portfolio", color: "#f97316" }]}
                        height={500}
                        yFormatter={(v) => `${v.toFixed(1)}%`}
                      />
                    </div>
                  )}
                </CardControls>
              </CardHeader>
              <CardContent className="p-2">
                {returnCurve.length > 1 ? (
                  <TimeSeriesChart
                    data={returnCurve}
                    series={[{ key: "portfolio", name: "Portfolio", color: "#f97316" }]}
                    height={200}
                    yFormatter={(v) => `${v.toFixed(1)}%`}
                  />
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs">No data</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                <CardTitle className="text-[11px]">Drawdown (%)</CardTitle>
                <CardControls>
                  {drawdownCurve.length > 1 && (
                    <div style={{ width: "100%", height: "calc(88vh - 100px)" }}>
                      <TimeSeriesChart
                        data={drawdownCurve}
                        series={[{ key: "drawdown", name: "Drawdown", color: "#ef4444" }]}
                        height={500}
                      />
                    </div>
                  )}
                </CardControls>
              </CardHeader>
              <CardContent className="p-2">
                {drawdownCurve.length > 1 ? (
                  <TimeSeriesChart
                    data={drawdownCurve}
                    series={[{ key: "drawdown", name: "Drawdown", color: "#ef4444" }]}
                    height={200}
                  />
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs">No data</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                <CardTitle className="text-[11px]">Portfolio Value</CardTitle>
                <CardControls>
                  {equityCurve.length > 1 && (
                    <div style={{ width: "100%", height: "calc(88vh - 100px)" }}>
                      <TimeSeriesChart
                        data={equityCurve.map((p) => ({ date: p.date, value: p.value }))}
                        series={[{ key: "value", name: "Value", color: "#10b981" }]}
                        height={500}
                        yFormatter={(v) => formatCurrencyCompact(v, "INR")}
                      />
                    </div>
                  )}
                </CardControls>
              </CardHeader>
              <CardContent className="p-2">
                {equityCurve.length > 1 ? (
                  <TimeSeriesChart
                    data={equityCurve.map((p) => ({ date: p.date, value: p.value }))}
                    series={[{ key: "value", name: "Value", color: "#10b981" }]}
                    height={200}
                    yFormatter={(v) => formatCurrencyCompact(v, "INR")}
                  />
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs">No data</div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
