"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardControls } from "@/components/CardControls";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

interface PerformanceData {
  total_return?: number;
  max_drawdown?: number;
  volatility?: number;
  equity_curve?: { date: string; value: number }[];
  [key: string]: unknown;
}

interface DrawdownEntry {
  id: number;
  start: string;
  end: string;
  maxDD: string;
  recovery: string;
  duration: string;
}

function computeDrawdowns(equityCurve: { date: string; value: number }[]): DrawdownEntry[] {
  if (!equityCurve || equityCurve.length < 2) return [];

  const drawdowns: DrawdownEntry[] = [];
  let peak = equityCurve[0].value;
  let inDrawdown = false;
  let ddStart = "";
  let ddMaxVal = 0;
  let ddMaxDate = "";
  let ddId = 0;

  for (let i = 1; i < equityCurve.length; i++) {
    const pt = equityCurve[i];
    if (pt.value > peak) {
      if (inDrawdown) {
        ddId++;
        drawdowns.push({
          id: ddId,
          start: ddStart,
          end: ddMaxDate,
          maxDD: `${(ddMaxVal * 100).toFixed(2)}%`,
          recovery: pt.date,
          duration: `${i} periods`,
        });
        inDrawdown = false;
      }
      peak = pt.value;
    } else {
      const dd = (pt.value - peak) / peak;
      if (!inDrawdown) {
        inDrawdown = true;
        ddStart = equityCurve[i - 1].date;
        ddMaxVal = dd;
        ddMaxDate = pt.date;
      }
      if (dd < ddMaxVal) {
        ddMaxVal = dd;
        ddMaxDate = pt.date;
      }
    }
  }

  // Close open drawdown
  if (inDrawdown) {
    ddId++;
    drawdowns.push({
      id: ddId,
      start: ddStart,
      end: ddMaxDate,
      maxDD: `${(ddMaxVal * 100).toFixed(2)}%`,
      recovery: "—",
      duration: "ongoing",
    });
  }

  // Sort by severity
  drawdowns.sort((a, b) => parseFloat(a.maxDD) - parseFloat(b.maxDD));
  return drawdowns.slice(0, 10);
}

export default function DrawdownPage() {
  const { selectedPortfolioId, selectedFundName } = usePortfolio();
  const { token } = useAuth();

  const [perfData, setPerfData] = useState<PerformanceData | null>(null);
  const [drawdowns, setDrawdowns] = useState<DrawdownEntry[]>([]);
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
      if (!res.ok) throw new Error(`Failed to fetch performance: ${res.status}`);
      const data = await res.json();
      setPerfData(data);

      // Compute drawdowns from equity curve if available
      if (data.equity_curve && Array.isArray(data.equity_curve) && data.equity_curve.length > 1) {
        setDrawdowns(computeDrawdowns(data.equity_curve));
      } else {
        setDrawdowns([]);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [selectedPortfolioId, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Backend returns values already in percentage form (e.g. -19.63 for -19.63%)
  const pct = (v: number | undefined | null) =>
    v != null ? `${v.toFixed(2)}%` : "—";

  if (!selectedPortfolioId) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold">Drawdown Summary</h1>
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
      <h1 className="text-xl font-bold">Drawdown Summary{selectedFundName ? ` — ${selectedFundName}` : ""}</h1>

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
          {/* Summary metrics */}
          {perfData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card>
                <CardHeader className="pb-1 py-2 px-3">
                  <CardTitle className="text-[11px]">Max Drawdown</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <span className="text-lg font-bold text-red-400 tabular-nums">{pct(perfData.max_drawdown)}</span>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1 py-2 px-3">
                  <CardTitle className="text-[11px]">Total Return</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <span className="text-lg font-bold tabular-nums">{pct(perfData.total_return)}</span>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1 py-2 px-3">
                  <CardTitle className="text-[11px]">Volatility</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <span className="text-lg font-bold tabular-nums">{pct(perfData.volatility)}</span>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Drawdown table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-1 flex-row items-center justify-between py-2 px-3">
                <CardTitle className="text-[11px]">Drawdown Summary</CardTitle>
                <CardControls />
              </CardHeader>
              <CardContent className="p-0">
                {drawdowns.length > 0 ? (
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-border/50">
                        {["#", "Start Date", "End Date", "Max Drawdown", "Recovery Date", "Duration"].map((h) => (
                          <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {drawdowns.map((d) => (
                        <tr key={d.id} className="border-b border-border/30 hover:bg-muted/20">
                          <td className="px-2 py-1.5">{d.id}</td>
                          <td className="px-2 py-1.5">{d.start}</td>
                          <td className="px-2 py-1.5">{d.end}</td>
                          <td className="px-2 py-1.5 text-red-400 font-medium tabular-nums">{d.maxDD}</td>
                          <td className="px-2 py-1.5">{d.recovery}</td>
                          <td className="px-2 py-1.5">{d.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 text-center text-muted-foreground text-xs">
                    {perfData?.max_drawdown != null
                      ? `Max drawdown: ${pct(perfData.max_drawdown)}. Detailed drawdown periods require equity curve data from a backtest.`
                      : "Run a backtest on your portfolio to see detailed drawdown analysis."}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 flex-row items-center justify-between py-2 px-3">
                <CardTitle className="text-[11px]">Drawdown Info</CardTitle>
                <CardControls />
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>Drawdowns are computed from the portfolio equity curve. Each drawdown period starts when the portfolio value drops below its running peak and ends when it recovers.</p>
                  {perfData?.max_drawdown != null && (
                    <p>Your portfolio maximum drawdown is <span className="text-red-400 font-medium">{pct(perfData.max_drawdown)}</span>.</p>
                  )}
                  {drawdowns.length === 0 && (
                    <p>Upload a backtest with equity curve data to see detailed drawdown periods, contributors, and recovery analysis.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
