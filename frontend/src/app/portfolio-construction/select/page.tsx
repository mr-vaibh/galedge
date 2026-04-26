"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { RefreshCw, Trash2, Pencil, Plus, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export default function SelectPortfolioPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [portfolios, setPortfolios] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchPortfolios() {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/portfolios/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setPortfolios(await res.json());
    } catch {}
    setLoading(false);
  }

  useEffect(() => { fetchPortfolios(); }, [token]);

  async function deletePortfolio(id: number) {
    if (!token || !confirm("Delete this portfolio?")) return;
    await fetch(`${API_BASE}/api/portfolios/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchPortfolios();
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Portfolio Construction</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={fetchPortfolios}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </Button>
          <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700" onClick={() => router.push("/portfolio-construction/upload")}>
            <Plus className="h-3.5 w-3.5" /> Upload Portfolio
          </Button>
        </div>
      </div>

      {!token && (
        <div className="rounded-lg border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">Login to manage portfolios</p>
          <Button onClick={() => router.push("/login")} size="sm">Login</Button>
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Your Portfolios</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border/50 bg-muted/20">
                {["Fund Name", "Scheme Name", "Benchmark", "Type", "AUM (Cr)", "Analytics", "Delete"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></td></tr>
              ) : portfolios.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  No portfolios yet.{" "}
                  <button className="text-blue-400 hover:underline" onClick={() => router.push("/portfolio-construction/upload")}>
                    Upload your first portfolio
                  </button>
                </td></tr>
              ) : (
                portfolios.map((p) => (
                  <tr key={Number(p.id)} className="border-b border-border/30 hover:bg-muted/30 cursor-pointer"
                    onClick={() => router.push(`/analytics/overview/performance?portfolio=${p.id}`)}>
                    <td className="px-3 py-2 font-medium">{String(p.fund_name)}</td>
                    <td className="px-3 py-2">{String(p.scheme_name || "—")}</td>
                    <td className="px-3 py-2 text-muted-foreground">{String(p.benchmark || "—")}</td>
                    <td className="px-3 py-2"><Badge>{String(p.portfolio_type)}</Badge></td>
                    <td className="px-3 py-2 tabular-nums">{String(p.initial_aum || "—")}</td>
                    <td className="px-3 py-2">
                      <Badge className={`text-[8px] ${p.analytics_status === "AVAILABLE" ? "bg-emerald-600" : "bg-red-600"}`}>
                        {String(p.analytics_status)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deletePortfolio(Number(p.id))}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-muted ${className}`}>{children}</span>;
}
