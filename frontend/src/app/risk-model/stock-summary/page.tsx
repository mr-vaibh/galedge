"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Filter, Info, Maximize2, X, Search, Loader2 } from "lucide-react";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { api } from "@/lib/api";

const DEFAULT_STOCKS = [
  { symbol: "RELIANCE.NS", name: "Reliance Industries", color: "#3b82f6" },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank", color: "#10b981" },
  { symbol: "TCS.NS", name: "Tata Consultancy", color: "#f59e0b" },
  { symbol: "INFY.NS", name: "Infosys", color: "#a855f7" },
  { symbol: "SBIN.NS", name: "State Bank of India", color: "#ef4444" },
];

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#a855f7", "#ef4444", "#06b6d4"];

function CardControls() {
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-6 w-6"><Filter className="h-3 w-3" /></Button>
      <Button variant="ghost" size="icon" className="h-6 w-6"><Info className="h-3 w-3" /></Button>
      <Button variant="ghost" size="icon" className="h-6 w-6"><Maximize2 className="h-3 w-3" /></Button>
      <Button variant="ghost" size="icon" className="h-6 w-6"><Download className="h-3 w-3" /></Button>
    </div>
  );
}

export default function StockSummaryPage() {
  const [universe, setUniverse] = useState("INEC1");
  const [selected, setSelected] = useState(DEFAULT_STOCKS);
  const [search, setSearch] = useState("");
  const [exposures, setExposures] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(false);
  const [factorNames, setFactorNames] = useState<string[]>([]);

  useEffect(() => {
    if (selected.length === 0) return;
    setLoading(true);
    api.stockExposures(selected.map(s => s.symbol), universe)
      .then((data) => {
        setExposures(data.exposures);
        // Get all unique factor names
        const allFactors = new Set<string>();
        Object.values(data.exposures).forEach(exp => {
          Object.keys(exp).forEach(f => allFactors.add(f));
        });
        setFactorNames(Array.from(allFactors).sort());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selected, universe]);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={universe} onValueChange={(v) => v && setUniverse(v)}>
            <SelectTrigger className="w-[140px] h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="INEC1">INEC1</SelectItem>
              <SelectItem value="INEC2">INEC2</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">Stock Summary</span>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> Download Raw Data
        </Button>
      </div>

      {/* Selected Stocks */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Selected Stocks</CardTitle>
              <span className="text-[10px] text-muted-foreground">Updated Stocks: {selected.length}</span>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search stock by symbol or name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-xs pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {selected.map((s) => (
              <Badge
                key={s.symbol}
                variant="outline"
                className="gap-1 pr-1 text-[10px]"
                style={{ borderColor: s.color, color: s.color }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name}
                <button
                  onClick={() => setSelected(selected.filter((x) => x.symbol !== s.symbol))}
                  className="ml-0.5 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stock Risk Summary — from API */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm">Stock Factor Exposures</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-card z-10">
                  <tr className="border-b border-border/50">
                    <th className="px-2 py-2 text-left font-medium text-muted-foreground">Factor</th>
                    {selected.slice(0, 5).map((s) => (
                      <th key={s.symbol} className="px-2 py-2 text-right font-medium text-[10px]" style={{ color: s.color }}>
                        {s.symbol.replace(".NS", "")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {factorNames.length > 0 ? factorNames.map((f) => (
                    <tr key={f} className="border-b border-border/30 hover:bg-muted/30">
                      <td className="px-2 py-1.5 font-medium text-muted-foreground">{f}</td>
                      {selected.slice(0, 5).map((s) => {
                        const v = exposures[s.symbol]?.[f] ?? 0;
                        return (
                          <td key={s.symbol} className={`px-2 py-1.5 text-right tabular-nums ${v >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {v.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="px-2 py-8 text-center text-muted-foreground text-xs">
                      {loading ? "Loading exposures..." : "No exposure data. Build factor model first."}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Return Decomposition Table (sample) */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm">Return Decomposition</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-2 py-2 text-left font-medium text-muted-foreground">Factor</th>
                    {selected.slice(0, 3).map((s) => (
                      <th key={s.symbol} className="px-2 py-2 text-right font-medium text-[10px]" style={{ color: s.color }}>
                        {s.symbol.replace(".NS", "")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {["MARKET", "BETA", "SIZE", "LTMOM", "EARNYILD", "VALUE", "TOTAL"].map((f) => (
                    <tr key={f} className="border-b border-border/30 hover:bg-muted/30">
                      <td className="px-2 py-1.5 font-medium text-muted-foreground">{f}</td>
                      {selected.slice(0, 3).map((s) => {
                        const v = (Math.sin(f.length * s.symbol.length * 0.7) * 5).toFixed(2);
                        return (
                          <td key={s.symbol} className={`px-2 py-1.5 text-right tabular-nums ${parseFloat(v) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {v}%
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Return Decomposition Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm">Return Decomposition — {selected[0]?.symbol.replace(".NS", "") || "Select stock"}</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent className="p-2">
            <TimeSeriesChart
              data={Array.from({ length: 100 }, (_, i) => ({
                date: `2025-${String(Math.floor(i / 8) + 1).padStart(2, "0")}-${String((i % 8) * 3 + 1).padStart(2, "0")}`,
                MARKET: 5 + Math.sin(i * 0.1) * 8,
                BETA: -2 + Math.cos(i * 0.15) * 3,
                LTMOM: 3 + Math.cos(i * 0.08) * 5,
                TOTAL: 8 + Math.sin(i * 0.05) * 15,
              }))}
              series={[
                { key: "MARKET", name: "MARKET", color: "#3b82f6" },
                { key: "BETA", name: "BETA", color: "#10b981" },
                { key: "LTMOM", name: "LTMOM", color: "#a855f7" },
                { key: "TOTAL", name: "TOTAL", color: "#ef4444" },
              ]}
              height={250}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
