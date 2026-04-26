"use client";

import { useState } from "react";
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
import { Download, Filter, Info, Maximize2, X, Search, BarChart3 } from "lucide-react";

const SAMPLE_STOCKS = [
  { symbol: "RELIANCE", name: "Reliance Industries Ltd", color: "#3b82f6" },
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd", color: "#10b981" },
  { symbol: "SBIN", name: "State Bank of India Ltd", color: "#f59e0b" },
  { symbol: "BAJFINANCE", name: "Bajaj Finserv Ltd", color: "#a855f7" },
  { symbol: "COALINDIA", name: "Coal India Ltd", color: "#ef4444" },
  { symbol: "ICICIBANK", name: "Indo Count Industries Ltd", color: "#06b6d4" },
];

const RISK_FACTORS = ["MARKET", "BETA", "SIZE", "EARNYILD", "LTMOM", "LIQUIDITY", "FINLVG", "PROFIT"];
const DECOMP_FACTORS = ["MARKET", "BETA", "CONNECTIVITY", "EARNYILD", "FINLVG", "LTMOM", "VALUE"];

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
  const [selected, setSelected] = useState(SAMPLE_STOCKS);
  const [search, setSearch] = useState("");

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
        {/* Stock Risk Summary */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm">Stock Risk Summary</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-2 py-2 text-left font-medium text-muted-foreground">Factor</th>
                    {selected.slice(0, 4).map((s) => (
                      <th key={s.symbol} className="px-2 py-2 text-right font-medium" style={{ color: s.color }}>{s.symbol}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RISK_FACTORS.map((f) => (
                    <tr key={f} className="border-b border-border/30 hover:bg-muted/30">
                      <td className="px-2 py-1.5 font-medium text-muted-foreground">{f}</td>
                      {selected.slice(0, 4).map((s) => {
                        const v = (Math.sin(f.length * s.symbol.length) * 2).toFixed(2);
                        return (
                          <td key={s.symbol} className={`px-2 py-1.5 text-right tabular-nums ${parseFloat(v) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {v}
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

        {/* Return Decomposition Table */}
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
                    <th className="px-2 py-2 text-right font-medium text-muted-foreground">BAJFINANCE</th>
                    <th className="px-2 py-2 text-right font-medium text-muted-foreground">RELIANCE</th>
                    <th className="px-2 py-2 text-right font-medium text-muted-foreground">HDFCBANK</th>
                  </tr>
                </thead>
                <tbody>
                  {DECOMP_FACTORS.map((f) => (
                    <tr key={f} className="border-b border-border/30 hover:bg-muted/30">
                      <td className="px-2 py-1.5 font-medium text-muted-foreground">{f}</td>
                      {["BAJFINANCE", "RELIANCE", "HDFCBANK"].map((s) => {
                        const v = (Math.sin(f.length + s.length) * 5).toFixed(2);
                        return (
                          <td key={s} className={`px-2 py-1.5 text-right tabular-nums ${parseFloat(v) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
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
            <CardTitle className="text-sm">Return Decomposition — BAJFINANCE</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center border border-dashed border-border/50 rounded-lg">
              <div className="text-center text-muted-foreground">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Return decomposition time series</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">Factor-level attribution over time</p>
                <div className="flex gap-2 justify-center mt-3">
                  {["MARKET", "BETA", "FINLVG", "LTMOM", "TOTAL"].map((f, i) => (
                    <span key={f} className="flex items-center gap-1 text-[9px]">
                      <span className="w-2 h-0.5 rounded" style={{ backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#a855f7", "#ef4444"][i] }} />
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
