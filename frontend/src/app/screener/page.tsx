"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, ScreenerResult } from "@/lib/api";
import { ExportButton } from "@/components/ExportButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumber, formatPrice, formatPercent, changeColor } from "@/lib/format";

const SECTORS = [
  "All",
  "Technology",
  "Healthcare",
  "Financial Services",
  "Consumer Cyclical",
  "Communication Services",
  "Industrials",
  "Consumer Defensive",
  "Energy",
  "Utilities",
  "Real Estate",
  "Basic Materials",
];

export default function ScreenerPage() {
  const router = useRouter();
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [sector, setSector] = useState("All");
  const [sortBy, setSortBy] = useState("marketCap");
  const [peMax, setPeMax] = useState("");
  const [divMin, setDivMin] = useState("");

  function fetchData() {
    setLoading(true);
    const filters: Record<string, string> = { sort_by: sortBy, sort_order: "desc", limit: "50" };
    if (sector !== "All") filters.sector = sector;
    if (peMax) filters.pe_max = peMax;
    if (divMin) filters.dividend_yield_min = divMin;

    api.screener(filters).then((r) => setResults(r.data)).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Stock Screener</h1>
        <p className="text-sm text-muted-foreground">Filter stocks by fundamentals</p>
      </div>

      <div className="flex flex-wrap gap-4 items-end rounded-lg border bg-card p-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Sector</Label>
          <Select value={sector} onValueChange={(v) => v && setSector(v)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SECTORS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Max P/E</Label>
          <Input type="number" placeholder="e.g. 30" value={peMax} onChange={(e) => setPeMax(e.target.value)} className="w-[120px]" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Min Div Yield</Label>
          <Input type="number" placeholder="e.g. 0.02" value={divMin} onChange={(e) => setDivMin(e.target.value)} className="w-[120px]" step="0.01" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Sort By</Label>
          <Select value={sortBy} onValueChange={(v) => v && setSortBy(v)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="marketCap">Market Cap</SelectItem>
              <SelectItem value="trailingPE">P/E Ratio</SelectItem>
              <SelectItem value="dividendYield">Dividend Yield</SelectItem>
              <SelectItem value="changePercent">Change %</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={fetchData} disabled={loading}>{loading ? "Loading..." : "Apply"}</Button>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between p-4 border-b">
          <span className="text-sm text-muted-foreground">{results.length} results</span>
          <ExportButton data={results as unknown as Record<string, unknown>[]} filename="screener_results" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {["Symbol", "Name", "Sector", "Price", "Change%", "Mkt Cap", "P/E", "Fwd P/E", "Div Yield", "Beta"].map((h) => (
                  <th key={h} className={`p-3 font-medium text-muted-foreground ${h === "Symbol" || h === "Name" || h === "Sector" ? "text-left" : "text-right"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && !results.length ? (
                <tr><td colSpan={10} className="p-12 text-center">
                  <div className="inline-flex flex-col items-center gap-2">
                    <div className="h-5 w-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-muted-foreground">Loading screener data...</span>
                    <span className="text-xs text-muted-foreground/60">First load may take 15-30s while data is fetched</span>
                  </div>
                </td></tr>
              ) : results.length === 0 ? (
                <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">No results. Try adjusting filters.</td></tr>
              ) : (
                results.map((r) => (
                  <tr key={r.symbol} className="border-b last:border-0 hover:bg-muted/50 cursor-pointer" onClick={() => router.push(`/stock/${r.symbol}`)}>
                    <td className="p-3 font-medium">{r.symbol}</td>
                    <td className="p-3 text-muted-foreground text-xs max-w-[150px] truncate">{r.name}</td>
                    <td className="p-3 text-xs">{r.sector}</td>
                    <td className="p-3 text-right tabular-nums">{formatPrice(r.price)}</td>
                    <td className={`p-3 text-right tabular-nums ${changeColor(r.changePercent)}`}>{formatPercent(r.changePercent)}</td>
                    <td className="p-3 text-right tabular-nums">{formatNumber(r.marketCap)}</td>
                    <td className="p-3 text-right tabular-nums">{r.trailingPE?.toFixed(1) ?? "—"}</td>
                    <td className="p-3 text-right tabular-nums">{r.forwardPE?.toFixed(1) ?? "—"}</td>
                    <td className="p-3 text-right tabular-nums">{r.dividendYield != null ? `${(r.dividendYield * 100).toFixed(2)}%` : "—"}</td>
                    <td className="p-3 text-right tabular-nums">{r.beta?.toFixed(2) ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
