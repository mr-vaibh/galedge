"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Plus, Loader2, Rocket, ArrowDown, Trash2 } from "lucide-react";
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

export default function StrategyBuilderPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [tab, setTab] = useState("backtest");
  const [strategies, setStrategies] = useState<StrategyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  async function fetchStrategies() {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/strategies/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStrategies(Array.isArray(data) ? data : []);
      }
    } catch {}
    setLoading(false);
  }

  useEffect(() => { fetchStrategies(); }, [token]);

  const authToken = token || (typeof window !== "undefined" ? localStorage.getItem("galedge_auth_token") : null);

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
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-[9px] gap-1 text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                          onClick={(e) => demoteStrategy(e, s.id)}
                        >
                          <ArrowDown className="h-3 w-3" />
                          Demote
                        </Button>
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
    </div>
  );
}
