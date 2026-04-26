"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Plus, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export default function StrategyBuilderPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [tab, setTab] = useState("backtest");
  const [strategies, setStrategies] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

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
          <TabsTrigger value="backtest">Backtest</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
        </TabsList>

        <TabsContent value="backtest" className="mt-4">
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20">
                  {["Fund Name", "Scheme Name", "Universe", "Status", "Rebalance", "Analytics"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-3 py-8 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></td></tr>
                ) : strategies.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    No strategies yet.{" "}
                    <button className="text-blue-400 hover:underline" onClick={() => router.push("/strategy-builder/build")}>
                      Build your first strategy
                    </button>
                  </td></tr>
                ) : (
                  strategies.map((s, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-muted/30 cursor-pointer"
                      onClick={() => router.push(`/strategy-builder/build?id=${s.id}`)}>
                      <td className="px-3 py-2 font-medium">{String(s.fund_name)}</td>
                      <td className="px-3 py-2">{String(s.scheme_name || "—")}</td>
                      <td className="px-3 py-2 text-muted-foreground">{String(s.universe || "—")}</td>
                      <td className="px-3 py-2"><Badge className="text-[8px]">{String(s.status)}</Badge></td>
                      <td className="px-3 py-2"><Badge className={`text-[8px] ${s.rebalance_status === "AVAILABLE" ? "bg-emerald-600" : "bg-amber-600"}`}>{String(s.rebalance_status)}</Badge></td>
                      <td className="px-3 py-2"><Badge className={`text-[8px] ${s.analytics_status === "AVAILABLE" ? "bg-emerald-600" : "bg-red-600"}`}>{String(s.analytics_status)}</Badge></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="production" className="mt-4">
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground text-xs">
            No active production strategies. Promote a backtest to production from the backtest tab.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
