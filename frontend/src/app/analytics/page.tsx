"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Share2, Download, Loader2, PlusCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

interface Portfolio {
  id: string;
  fund: string;
  scheme: string;
  benchmark: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [tab, setTab] = useState("backtested");
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPortfolios = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/portfolios/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setPortfolios(Array.isArray(data) ? data : data.portfolios || data.results || []);
    } catch (err) {
      setError("Failed to load portfolios");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Portfolios</h1>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={fetchPortfolios}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => { if (typeof v === "string") setTab(v); }}>
        <TabsList className="h-8">
          <TabsTrigger value="backtested" className="text-[10px]">Backtested Portfolios</TabsTrigger>
          <TabsTrigger value="uploaded" className="text-[10px]">User Uploaded Portfolios</TabsTrigger>
          <TabsTrigger value="standard" className="text-[10px]">Standard Portfolios</TabsTrigger>
          <TabsTrigger value="production" className="text-[10px]">Production Portfolios</TabsTrigger>
          <TabsTrigger value="shared" className="text-[10px]">Shared Portfolios</TabsTrigger>
          <TabsTrigger value="received" className="text-[10px]">Received Portfolios</TabsTrigger>
        </TabsList>

        <TabsContent value="backtested" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading portfolios...</span>
            </div>
          ) : error ? (
            <div className="rounded-lg border bg-card p-8 text-center text-sm text-red-400">
              {error}
              <Button variant="outline" size="sm" className="ml-3" onClick={fetchPortfolios}>
                Retry
              </Button>
            </div>
          ) : portfolios.length === 0 ? (
            <div className="rounded-lg border bg-card p-12 text-center space-y-3">
              <p className="text-sm text-muted-foreground">No portfolios found.</p>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => router.push("/portfolio-construction/upload")}
              >
                <PlusCircle className="h-3.5 w-3.5" /> Upload Portfolio
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border bg-card overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    {["Fund", "Scheme", "Benchmark", "Start Date", "End Date", "Status", "Share", "Upload"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {portfolios.map((p, i) => (
                    <tr
                      key={p.id || i}
                      className="border-b border-border/30 hover:bg-muted/30 cursor-pointer"
                      onClick={() => router.push("/analytics/overview/performance")}
                    >
                      <td className="px-3 py-2 font-medium">{p.fund || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.scheme || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.benchmark || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.start_date || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.end_date || "—"}</td>
                      <td className="px-3 py-2">
                        <Badge className={`text-[8px] ${p.status === "AVAILABLE" || p.status === "active" ? "bg-emerald-600" : "bg-red-600"}`}>
                          {(p.status || "UNKNOWN").toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Button variant="ghost" size="icon" className="h-6 w-6"><Share2 className="h-3 w-3" /></Button>
                      </td>
                      <td className="px-3 py-2">
                        <Button variant="ghost" size="icon" className="h-6 w-6 bg-blue-600/20"><Download className="h-3 w-3" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="uploaded" className="mt-4">
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground text-xs">
            No uploaded portfolios yet.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
