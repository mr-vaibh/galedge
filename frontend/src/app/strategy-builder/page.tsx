"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Plus, Loader2, Rocket, ArrowDown, Trash2, Zap, X, Download } from "lucide-react";
import { useAuth } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

interface StrategyItem {
  id: number;
  fund_name: string;
  scheme_name?: string;
  universe?: string;
  status: string;
  rebalance_status: string;
  analytics_status: string;
  is_production?: boolean;
  created_at?: string;
}

interface Trade {
  symbol: string;
  action: string;
  target_weight: number;
  current_weight: number;
  delta_weight: number;
  latest_price: number;
  trade_qty: number;
  trade_value: number;
}

interface RebalanceResult {
  strategy_id: number;
  strategy_name: string;
  rebalance_date: string;
  positions: number;
  expected_return: number;
  expected_risk: number;
  sharpe_ratio: number;
  portfolio_value: number;
  total_buy_value: number;
  total_sell_value: number;
  net_investment: number;
  trades: Trade[];
}

export default function StrategyBuilderPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [tab, setTab] = useState("backtest");
  const [strategies, setStrategies] = useState<StrategyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [rebalanceResult, setRebalanceResult] = useState<RebalanceResult | null>(null);
  const [rebalanceLoading, setRebalanceLoading] = useState(false);

  const authToken = token || (typeof window !== "undefined" ? localStorage.getItem("galedge_auth_token") : null);

  async function fetchStrategies() {
    if (!authToken) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/strategies/`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStrategies(Array.isArray(data) ? data : []);
      }
    } catch {}
    setLoading(false);
  }

  useEffect(() => { fetchStrategies(); }, [authToken]);

  async function promoteStrategy(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    if (!authToken) return;
    setActionLoading(id);
    try {
      const res = await fetch(`${API_BASE}/api/strategies/${id}/promote`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        await fetchStrategies();
        setTab("production");
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to promote");
      }
    } catch {}
    setActionLoading(null);
  }

  async function demoteStrategy(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    if (!authToken) return;
    setActionLoading(id);
    try {
      const res = await fetch(`${API_BASE}/api/strategies/${id}/demote`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        await fetchStrategies();
        setTab("backtest");
      }
    } catch {}
    setActionLoading(null);
  }

  async function deleteStrategy(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    if (!authToken || !confirm("Delete this strategy? This cannot be undone.")) return;
    setActionLoading(id);
    try {
      await fetch(`${API_BASE}/api/strategies/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      await fetchStrategies();
    } catch {}
    setActionLoading(null);
  }

  async function runRebalance(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    if (!authToken) return;
    setRebalanceLoading(true);
    setRebalanceResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/strategies/${id}/rebalance`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRebalanceResult(data);
      } else {
        const err = await res.json();
        alert(err.detail || "Rebalance failed");
      }
    } catch {
      alert("Failed to connect to API");
    }
    setRebalanceLoading(false);
  }

  function downloadTradeList() {
    if (!rebalanceResult) return;
    const header = "Symbol,Action,Current Weight (%),Target Weight (%),Delta (%),Quantity,Trade Value (INR),Latest Price (INR)";
    const rows = rebalanceResult.trades.map((t) =>
      `${t.symbol},${t.action},${t.current_weight},${t.target_weight},${t.delta_weight},${t.trade_qty},${t.trade_value},${t.latest_price}`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `rebalance_${rebalanceResult.strategy_name}_${rebalanceResult.rebalance_date}.csv`;
    a.click();
  }

  const backtestStrategies = strategies.filter((s) => s.status !== "production");
  const productionStrategies = strategies.filter((s) => s.status === "production");

  function StrategyTable({ items, isProduction }: { items: StrategyItem[]; isProduction: boolean }) {
    return (
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-border/50 bg-muted/20">
              {["Fund Name", "Scheme Name", "Universe", "Status", "Rebalance", "Analytics", "Actions"].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                {isProduction
                  ? "No production strategies. Promote a backtested strategy to go live."
                  : <>No strategies yet.{" "}<button className="text-blue-400 hover:underline" onClick={() => router.push("/strategy-builder/build")}>Build your first strategy</button></>
                }
              </td></tr>
            ) : (
              items.map((s) => (
                <tr key={s.id} className="border-b border-border/30 hover:bg-muted/30 cursor-pointer"
                  onClick={() => router.push(`/strategy-builder/build?id=${s.id}`)}>
                  <td className="px-3 py-2 font-medium">{s.fund_name}</td>
                  <td className="px-3 py-2">{s.scheme_name || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{s.universe || "—"}</td>
                  <td className="px-3 py-2">
                    <Badge className={`text-[8px] ${s.status === "production" ? "bg-emerald-600" : ""}`}>{s.status}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Badge className={`text-[8px] ${s.rebalance_status === "AVAILABLE" ? "bg-emerald-600" : "bg-amber-600"}`}>{s.rebalance_status}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Badge className={`text-[8px] ${s.analytics_status === "AVAILABLE" ? "bg-emerald-600" : "bg-red-600"}`}>{s.analytics_status}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {actionLoading === s.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : isProduction ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[9px] gap-1 text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                            onClick={(e) => runRebalance(e, s.id)}
                            disabled={rebalanceLoading}
                          >
                            {rebalanceLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                            Rebalance
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[9px] gap-1 text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                            onClick={(e) => demoteStrategy(e, s.id)}
                          >
                            <ArrowDown className="h-3 w-3" />
                            Demote
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[9px] gap-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                            onClick={(e) => promoteStrategy(e, s.id)}
                            disabled={s.analytics_status !== "AVAILABLE"}
                          >
                            <Rocket className="h-3 w-3" />
                            Promote
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={(e) => deleteStrategy(e, s.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Strategy Builder</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={fetchStrategies}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </Button>
          <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700" onClick={() => router.push("/strategy-builder/build")}>
            <Plus className="h-3.5 w-3.5" /> Build New Strategy
          </Button>
        </div>
      </div>

      {!token && (
        <div className="rounded-lg border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">Login to create and manage strategies</p>
          <Button onClick={() => router.push("/login")} size="sm">Login</Button>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="backtest" className="gap-1.5">
            Backtest
            {backtestStrategies.length > 0 && <Badge variant="secondary" className="text-[8px] px-1 py-0">{backtestStrategies.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="production" className="gap-1.5">
            Production
            {productionStrategies.length > 0 && <Badge className="text-[8px] px-1 py-0 bg-emerald-600">{productionStrategies.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="backtest" className="mt-4">
          <StrategyTable items={backtestStrategies} isProduction={false} />
        </TabsContent>

        <TabsContent value="production" className="mt-4">
          <StrategyTable items={productionStrategies} isProduction={true} />
        </TabsContent>
      </Tabs>

      {/* Rebalance Results Modal */}
      {rebalanceResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setRebalanceResult(null)}>
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl w-[90vw] max-w-[800px] max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-700">
              <div>
                <h2 className="text-sm font-bold">Live Rebalance — {rebalanceResult.strategy_name}</h2>
                <p className="text-[10px] text-muted-foreground">As of {rebalanceResult.rebalance_date}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={downloadTradeList}>
                  <Download className="h-3 w-3" /> Download CSV
                </Button>
                <button onClick={() => setRebalanceResult(null)} className="p-1 rounded hover:bg-neutral-800">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Summary metrics */}
            <div className="grid grid-cols-4 gap-3 px-5 py-3 border-b border-neutral-800">
              {[
                ["Positions", String(rebalanceResult.positions)],
                ["Exp. Return", `${rebalanceResult.expected_return}%`],
                ["Exp. Risk", `${rebalanceResult.expected_risk}%`],
                ["Sharpe", String(rebalanceResult.sharpe_ratio)],
              ].map(([label, val]) => (
                <div key={label} className="text-center">
                  <div className="text-[9px] text-muted-foreground">{label}</div>
                  <div className={`text-sm font-bold tabular-nums ${String(val).startsWith("-") ? "text-red-400" : "text-emerald-400"}`}>{val}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-3 px-5 py-2 border-b border-neutral-800 bg-neutral-800/30">
              {[
                ["Portfolio", `₹${(rebalanceResult.portfolio_value / 1e7).toFixed(2)} Cr`],
                ["Total Buy", `₹${(rebalanceResult.total_buy_value / 1e5).toFixed(1)} L`],
                ["Total Sell", `₹${(rebalanceResult.total_sell_value / 1e5).toFixed(1)} L`],
                ["Net Flow", `₹${(rebalanceResult.net_investment / 1e5).toFixed(1)} L`],
              ].map(([label, val]) => (
                <div key={label} className="text-center">
                  <div className="text-[9px] text-muted-foreground">{label}</div>
                  <div className={`text-xs font-medium tabular-nums ${String(val).includes("-") ? "text-red-400" : ""}`}>{val}</div>
                </div>
              ))}
            </div>

            {/* Trade list */}
            <div className="overflow-y-auto max-h-[55vh]">
              <table className="w-full text-[10px]">
                <thead className="sticky top-0 bg-neutral-900">
                  <tr className="border-b border-neutral-700">
                    {["#", "Symbol", "Action", "Current %", "Target %", "Delta %", "Qty", "Value (₹)", "Price (₹)"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-muted-foreground font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rebalanceResult.trades.map((t, i) => (
                    <tr key={t.symbol} className="border-b border-neutral-800 hover:bg-neutral-800/50">
                      <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-1.5 font-medium">{t.symbol}</td>
                      <td className="px-3 py-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                          t.action === "NEW BUY" ? "bg-emerald-500/20 text-emerald-400" :
                          t.action === "INCREASE" ? "bg-green-500/20 text-green-400" :
                          t.action === "REDUCE" ? "bg-amber-500/20 text-amber-400" :
                          t.action === "EXIT" ? "bg-red-500/20 text-red-400" :
                          "bg-neutral-700 text-neutral-400"
                        }`}>
                          {t.action}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 tabular-nums text-muted-foreground">{t.current_weight}%</td>
                      <td className="px-3 py-1.5 tabular-nums font-medium">{t.target_weight}%</td>
                      <td className={`px-3 py-1.5 tabular-nums ${t.delta_weight > 0 ? "text-emerald-400" : t.delta_weight < 0 ? "text-red-400" : ""}`}>
                        {t.delta_weight > 0 ? "+" : ""}{t.delta_weight}%
                      </td>
                      <td className={`px-3 py-1.5 tabular-nums font-medium ${t.action === "HOLD" ? "text-muted-foreground" : ""}`}>
                        {t.trade_qty > 0 ? t.trade_qty.toLocaleString() : "—"}
                      </td>
                      <td className={`px-3 py-1.5 tabular-nums ${t.delta_weight > 0 ? "text-emerald-400" : t.delta_weight < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                        {t.trade_value > 0 ? `₹${(t.trade_value / 1e5).toFixed(2)}L` : "—"}
                      </td>
                      <td className="px-3 py-1.5 tabular-nums">₹{t.latest_price.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
