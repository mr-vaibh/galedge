"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Maximize2, CheckCircle2, Save, Loader2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

const FALLBACK_METRICS = [
  "200D SMA", "20D SMA", "50D SMA", "ADR", "ATR", "Beta", "Book Value",
  "CAGR 3Y", "CAGR 5Y", "Cash Flow", "Current Ratio", "Debt to Equity",
  "Dividend Yield", "EPS", "EPS Growth", "EBITDA", "EBITDA Margin",
  "Enterprise Value", "EV/EBITDA", "Free Cash Flow", "Gross Margin",
  "High 52W", "Interest Coverage", "Low 52W", "Market Cap", "Market Cap Weight",
  "Net Income", "Net Profit Margin", "Operating Margin", "P/B Ratio",
  "P/E Ratio", "PEG Ratio", "Price", "Price to Sales", "Quick Ratio",
  "ROA", "ROCE", "ROE", "Revenue", "Revenue Growth", "RSI",
  "Shares Outstanding", "Total Assets", "Total Debt", "Volume",
  "Volume 20D Avg", "Working Capital", "Yield",
];

interface ScreenResult {
  symbol?: string;
  Symbol?: string;
  name?: string;
  Name?: string;
  sector?: string;
  Sector?: string;
  industry?: string;
  marketCap?: number;
  market_cap?: number;
  pe?: number;
  pb?: number;
  roe?: number;
  dividendYield?: number;
  dividend_yield?: number;
  beta?: number;
  price?: number;
  weight?: number;
}

const EXAMPLES = [
  "MarketCap > 500 AND PE < 15 AND ROCE > 22",
  "ROE > 15 AND DebtToEquity < 1 AND DividendYield > 2",
  "MarketCap > 1000 AND PB < 3 AND EPS_Growth > 10",
];

export default function BuildScreenPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentUniverse, setParentUniverse] = useState("");
  const [sector, setSector] = useState("");
  const [industry, setIndustry] = useState("");
  const [portfolioWeight, setPortfolioWeight] = useState("");
  const [screenerQuery, setScreenerQuery] = useState("");
  const [scoreEquation, setScoreEquation] = useState("");
  const [scoreVariable, setScoreVariable] = useState("");
  const [metricSearch, setMetricSearch] = useState("");
  const [metricTab, setMetricTab] = useState("library");

  // API-driven state
  const [metrics, setMetrics] = useState<string[]>(FALLBACK_METRICS);
  const [results, setResults] = useState<ScreenResult[]>([]);
  const [resultsTotal, setResultsTotal] = useState(0);
  const [executing, setExecuting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [executeError, setExecuteError] = useState<string | null>(null);

  // Fetch metrics list from API on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/alpha/metrics`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch metrics");
        return res.json();
      })
      .then((data) => {
        // Support both { metrics: [...] } and plain array responses
        const list = Array.isArray(data) ? data : data.metrics ?? data.data;
        if (Array.isArray(list) && list.length > 0) {
          setMetrics(list.map((m: string | { name: string }) => (typeof m === "string" ? m : m.name)));
        }
      })
      .catch(() => {
        // keep fallback metrics on error
      });
  }, []);

  // Verify Query (dry-run with limit=1)
  const handleVerify = useCallback(async () => {
    if (!screenerQuery.trim()) return;
    setVerifying(true);
    setVerifyStatus(null);
    try {
      const res = await fetch(`${API_BASE}/api/alpha/screens/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: screenerQuery, weight: portfolioWeight || "mcap", limit: 1 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || err.message || "Query validation failed");
      }
      setVerifyStatus({ ok: true, message: "Query syntax is valid" });
    } catch (e: unknown) {
      setVerifyStatus({ ok: false, message: e instanceof Error ? e.message : "Verification failed" });
    } finally {
      setVerifying(false);
    }
  }, [screenerQuery, portfolioWeight]);

  // Compute & Save
  const handleExecute = useCallback(async () => {
    if (!screenerQuery.trim()) return;
    setExecuting(true);
    setExecuteError(null);
    setResults([]);
    setResultsTotal(0);
    try {
      const res = await fetch(`${API_BASE}/api/alpha/screens/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: screenerQuery, weight: portfolioWeight || "mcap", limit: 50 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || err.message || "Execution failed");
      }
      const data = await res.json();
      const rows: ScreenResult[] = Array.isArray(data) ? data : data.results ?? data.data ?? [];
      setResults(rows);
      setResultsTotal(data.total ?? rows.length);

      // Also save the screen if name is provided and user is logged in
      if (name.trim() && token) {
        try {
          await fetch(`${API_BASE}/api/alpha/screens`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: name.trim(),
              description: description.trim(),
              parent_universe: parentUniverse,
              sector,
              industry,
              portfolio_weight: portfolioWeight,
              screener_query: screenerQuery,
              score_equation: scoreEquation,
              score_variable: scoreVariable,
            }),
          });
        } catch {
          // Save failed silently — screen was still computed
        }
      }
    } catch (e: unknown) {
      setExecuteError(e instanceof Error ? e.message : "Execution failed");
    } finally {
      setExecuting(false);
    }
  }, [screenerQuery, portfolioWeight, name, description, parentUniverse, sector, industry, scoreEquation, scoreVariable, token]);

  const filteredMetrics = metrics.filter((m) =>
    m.toLowerCase().includes(metricSearch.toLowerCase())
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Build Your Alpha Machine</h1>
          <p className="text-xs text-muted-foreground">Build Your Screen Factor</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Date</span>
          <Input type="date" defaultValue="2026-04-24" className="h-8 w-[150px] text-xs" />
        </div>
      </div>

      {/* Header Fields */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Name *</Label>
              <Input placeholder="Screen Name" value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Description *</Label>
              <Input placeholder="Enter Description" value={description} onChange={(e) => setDescription(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Parent Universe</Label>
              <Select value={parentUniverse} onValueChange={(v) => v && setParentUniverse(v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Risk Model Estimation..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="risk_model">Risk Model Estimation</SelectItem>
                  <SelectItem value="nifty500">NIFTY 500</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Sector</Label>
              <Select value={sector} onValueChange={(v) => v && setSector(v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Sector" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sectors</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="financials">Financial Services</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Industry</Label>
              <Select value={industry} onValueChange={(v) => v && setIndustry(v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Industry" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Portfolio Weight</Label>
              <Select value={portfolioWeight} onValueChange={(v) => v && setPortfolioWeight(v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Market Cap Weight" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcap">Market Cap Weight</SelectItem>
                  <SelectItem value="equal">Equal Weight</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Query Builders + Metrics Library */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Screener Query */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-xs">Screener Query</CardTitle>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-muted-foreground">Example</span>
              <Select onValueChange={(v) => { if (typeof v === "string") setScreenerQuery(v); }}>
                <SelectTrigger className="h-6 w-[120px] text-[9px]"><SelectValue placeholder="Select example" /></SelectTrigger>
                <SelectContent>
                  {EXAMPLES.map((e, i) => <SelectItem key={i} value={e}>{e.slice(0, 30)}...</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-6 w-6"><Maximize2 className="h-3 w-3" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <textarea
              value={screenerQuery}
              onChange={(e) => setScreenerQuery(e.target.value)}
              placeholder="Example: MarketCap > 500 AND PE < 15 AND ROCE > 22"
              className="w-full h-32 bg-muted/30 border border-border/50 rounded-md p-2 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </CardContent>
        </Card>

        {/* Score Equation */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-xs">Score Equation</CardTitle>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-muted-foreground">Example</span>
              <Select>
                <SelectTrigger className="h-6 w-[120px] text-[9px]"><SelectValue placeholder="Select example" /></SelectTrigger>
                <SelectContent>
                  {EXAMPLES.map((e, i) => <SelectItem key={i} value={e}>{e.slice(0, 30)}...</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-6 w-6"><Maximize2 className="h-3 w-3" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <textarea
              value={scoreEquation}
              onChange={(e) => setScoreEquation(e.target.value)}
              placeholder="Example: MarketCap > 500 AND PE < 15 AND ROCE > 22"
              className="w-full h-24 bg-muted/30 border border-border/50 rounded-md p-2 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Score Variable:</span>
              <Input
                placeholder="Enter score variable name"
                value={scoreVariable}
                onChange={(e) => setScoreVariable(e.target.value)}
                className="h-7 text-xs flex-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Metrics Library */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-xs">Description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-muted-foreground italic">
              Select or type a metric to see its description here.
            </div>

            <Tabs value={metricTab} onValueChange={setMetricTab}>
              <TabsList className="h-7">
                <TabsTrigger value="library" className="text-[10px] h-6">Library</TabsTrigger>
                <TabsTrigger value="metric" className="text-[10px] h-6">Metric</TabsTrigger>
                <TabsTrigger value="operator" className="text-[10px] h-6">Operator</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search Metrics"
                value={metricSearch}
                onChange={(e) => setMetricSearch(e.target.value)}
                className="h-7 text-xs pl-7"
              />
            </div>

            <div className="text-[10px] text-muted-foreground">
              {filteredMetrics.length} Metrics Available
            </div>

            <div className="h-40 overflow-y-auto border border-border/30 rounded-md">
              {filteredMetrics.map((m) => (
                <button
                  key={m}
                  className="w-full text-left px-2 py-1 text-[11px] hover:bg-muted/50 border-b border-border/20"
                  onClick={() => {
                    setScreenerQuery((prev) => prev + (prev ? " AND " : "") + m);
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <Button variant="outline" className="gap-1.5" onClick={handleVerify} disabled={verifying || !screenerQuery.trim()}>
          {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Verify Query
        </Button>
        <Button className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={handleExecute} disabled={executing || !screenerQuery.trim()}>
          {executing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} {executing ? "Computing..." : "Compute & Save"}
        </Button>
        {verifyStatus && (
          <span className={`text-xs font-medium ${verifyStatus.ok ? "text-emerald-600" : "text-red-500"}`}>
            {verifyStatus.ok ? "\u2713 " : ""}{verifyStatus.message}
          </span>
        )}
      </div>

      {/* Results Area */}
      <Card>
        {executeError && (
          <div className="px-4 pt-4">
            <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md px-3 py-2">
              {executeError}
            </div>
          </div>
        )}
        {results.length === 0 && !executing && !executeError ? (
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">No records</p>
              <p className="text-[10px] mt-1">Build and run a screen to see results here</p>
            </div>
          </CardContent>
        ) : executing ? (
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="text-sm">Executing screen...</p>
            </div>
          </CardContent>
        ) : results.length > 0 ? (
          <CardContent className="pt-4 pb-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium">{resultsTotal} result{resultsTotal !== 1 ? "s" : ""} found</span>
              <Badge variant="outline" className="text-[10px]">Showing {results.length} of {resultsTotal}</Badge>
            </div>
            <div className="overflow-x-auto border border-border/40 rounded-md">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border/40">
                    <th className="text-left px-3 py-2 font-medium">#</th>
                    <th className="text-left px-3 py-2 font-medium">Symbol</th>
                    <th className="text-left px-3 py-2 font-medium">Name</th>
                    <th className="text-left px-3 py-2 font-medium">Sector</th>
                    <th className="text-right px-3 py-2 font-medium">Market Cap</th>
                    <th className="text-right px-3 py-2 font-medium">P/E</th>
                    <th className="text-right px-3 py-2 font-medium">ROE</th>
                    <th className="text-right px-3 py-2 font-medium">Div Yield</th>
                    <th className="text-right px-3 py-2 font-medium">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, i) => {
                    /* eslint-disable @typescript-eslint/no-explicit-any */
                    const r = row as any;
                    const pe = r.pe ?? r.PE ?? r.pe_ratio ?? null;
                    const roe = r.roe ?? r.ROE ?? null;
                    const dy = r.dividend_yield ?? r.DividendYield ?? r.div_yield ?? null;
                    const mcap = r.market_cap ?? r.MarketCap ?? r.marketCap ?? null;
                    const w = r.weight ?? r.Weight ?? null;
                    const numColor = (v: unknown, positiveIsGood = true) => {
                      if (v == null) return "";
                      const n = Number(v);
                      if (isNaN(n)) return "";
                      return (positiveIsGood ? n >= 0 : n <= 0) ? "text-emerald-600" : "text-red-500";
                    };
                    const fmt = (v: unknown, decimals = 2) => {
                      if (v == null) return "-";
                      const n = Number(v);
                      return isNaN(n) ? String(v) : n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
                    };
                    return (
                      <tr key={r.symbol ?? i} className="border-b border-border/20 hover:bg-muted/30">
                        <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-1.5 font-medium">{String(r.symbol ?? r.Symbol ?? "-")}</td>
                        <td className="px-3 py-1.5">{String(r.name ?? r.Name ?? "-")}</td>
                        <td className="px-3 py-1.5">{String(r.sector ?? r.Sector ?? "-")}</td>
                        <td className={`px-3 py-1.5 text-right ${numColor(mcap)}`}>{fmt(mcap, 0)}</td>
                        <td className={`px-3 py-1.5 text-right ${numColor(pe, false)}`}>{fmt(pe)}</td>
                        <td className={`px-3 py-1.5 text-right ${numColor(roe)}`}>{fmt(roe)}</td>
                        <td className={`px-3 py-1.5 text-right ${numColor(dy)}`}>{fmt(dy)}</td>
                        <td className="px-3 py-1.5 text-right">{fmt(w)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        ) : null}
      </Card>
    </div>
  );
}
