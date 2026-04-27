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
import { X, Search, Loader2, Download } from "lucide-react";
import { BarChartPanel } from "@/components/charts/BarChartPanel";
import { api } from "@/lib/api";
import { CardControls } from "@/components/CardControls";

const DEFAULT_STOCKS = [
  { symbol: "RELIANCE.NS", name: "Reliance Industries", color: "#3b82f6" },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank", color: "#10b981" },
  { symbol: "TCS.NS", name: "Tata Consultancy", color: "#f59e0b" },
  { symbol: "INFY.NS", name: "Infosys", color: "#a855f7" },
  { symbol: "SBIN.NS", name: "State Bank of India", color: "#ef4444" },
];

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#a855f7", "#ef4444", "#06b6d4"];


export default function StockSummaryPage() {
  const [universe, setUniverse] = useState("INEC1");
  const [selected, setSelected] = useState(DEFAULT_STOCKS);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<{ symbol: string; name: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [exposures, setExposures] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(false);
  const [factorNames, setFactorNames] = useState<string[]>([]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await api.search(query);
      setSearchResults(results.slice(0, 8));
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchResults.length > 0) {
      addStock(searchResults[0]);
    }
  };

  const addStock = (stock: { symbol: string; name: string }) => {
    const alreadyExists = selected.some((s) => s.symbol === stock.symbol);
    if (!alreadyExists) {
      const color = CHART_COLORS[selected.length % CHART_COLORS.length];
      setSelected([...selected, { symbol: stock.symbol, name: stock.name, color }]);
    }
    setSearch("");
    setSearchResults([]);
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      handleSearch(search);
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    if (selected.length === 0) {
      setExposures({});
      setFactorNames([]);
      return;
    }
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
          <Select value={universe} onValueChange={(v) => { if (typeof v === "string") setUniverse(v); }}>
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
                onKeyDown={handleSearchKeyDown}
                className="h-8 text-xs pl-8"
              />
              {searching && (
                <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
              {searchResults.length > 0 && search.trim() && (
                <div className="absolute top-9 left-0 right-0 bg-card border rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                  {searchResults.map((r) => (
                    <button
                      key={r.symbol}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 flex items-center justify-between"
                      onClick={() => addStock(r)}
                    >
                      <span className="font-medium">{r.symbol}</span>
                      <span className="text-muted-foreground text-[10px] truncate ml-2">{r.name}</span>
                    </button>
                  ))}
                </div>
              )}
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
            <CardControls data={factorNames.map(f => { const row: Record<string, unknown> = { Factor: f }; selected.forEach(s => { row[s.symbol.replace(".NS", "")] = exposures[s.symbol]?.[f] ?? 0; }); return row; })} filename="stock_factor_exposures" title="Stock Factor Exposures" expandContent={
              selected.length > 0 ? (
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr className="border-b border-border/50">
                      <th className="px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">Factor</th>
                      {selected.map((s) => (
                        <th key={s.symbol} className="px-2 py-2 text-right font-medium text-[10px] whitespace-nowrap" style={{ color: s.color }}>
                          {s.symbol.replace(".NS", "")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {factorNames.length > 0 ? factorNames.map((f) => (
                      <tr key={f} className="border-b border-border/30 hover:bg-muted/30">
                        <td className="px-2 py-1.5 font-medium text-muted-foreground whitespace-nowrap">{f}</td>
                        {selected.map((s) => {
                          const v = exposures[s.symbol]?.[f] ?? 0;
                          return (
                            <td key={s.symbol} className={`px-2 py-1.5 text-right tabular-nums whitespace-nowrap ${v >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {v.toFixed(2)}
                            </td>
                          );
                        })}
                      </tr>
                    )) : (
                      <tr><td colSpan={selected.length + 1} className="px-2 py-8 text-center text-muted-foreground text-xs">
                        {loading ? "Loading exposures..." : "No exposure data. Build factor model first."}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              ) : undefined
            } />
          </CardHeader>
          <CardContent className="p-0">
            {selected.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground text-xs">
                No stocks selected. Use the search above to add stocks.
              </div>
            ) : (
              <>
                <p className="px-2 pt-2 text-[10px] text-muted-foreground">Note: Only Indian (NSE) stocks have factor exposure data.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead className="sticky top-0 bg-card z-10">
                      <tr className="border-b border-border/50">
                        <th className="px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">Factor</th>
                        {selected.map((s) => (
                          <th key={s.symbol} className="px-2 py-2 text-right font-medium text-[10px] whitespace-nowrap" style={{ color: s.color }}>
                            {s.symbol.replace(".NS", "")}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {factorNames.length > 0 ? factorNames.map((f) => (
                        <tr key={f} className="border-b border-border/30 hover:bg-muted/30">
                          <td className="px-2 py-1.5 font-medium text-muted-foreground whitespace-nowrap">{f}</td>
                          {selected.map((s) => {
                            const v = exposures[s.symbol]?.[f] ?? 0;
                            return (
                              <td key={s.symbol} className={`px-2 py-1.5 text-right tabular-nums whitespace-nowrap ${v >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {v.toFixed(2)}
                              </td>
                            );
                          })}
                        </tr>
                      )) : (
                        <tr><td colSpan={selected.length + 1} className="px-2 py-8 text-center text-muted-foreground text-xs">
                          {loading ? "Loading exposures..." : "No exposure data. Build factor model first."}
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Return Decomposition Table (sample) */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm">Return Decomposition</CardTitle>
            <CardControls data={factorNames.slice(0, 7).map(f => { const row: Record<string, unknown> = { Factor: f }; selected.slice(0, 3).forEach(s => { row[s.symbol.replace(".NS", "")] = exposures[s.symbol]?.[f] ?? 0; }); return row; })} filename="return_decomposition" title="Return Decomposition" expandContent={
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
                  {factorNames.slice(0, 7).map((f) => (
                    <tr key={f} className="border-b border-border/30 hover:bg-muted/30">
                      <td className="px-2 py-1.5 font-medium text-muted-foreground">{f}</td>
                      {selected.slice(0, 3).map((s) => {
                        const v = exposures[s.symbol]?.[f] ?? 0;
                        return (
                          <td key={s.symbol} className={`px-2 py-1.5 text-right tabular-nums ${v >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {v.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            } />
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
                  {factorNames.slice(0, 7).map((f) => (
                    <tr key={f} className="border-b border-border/30 hover:bg-muted/30">
                      <td className="px-2 py-1.5 font-medium text-muted-foreground">{f}</td>
                      {selected.slice(0, 3).map((s) => {
                        const v = exposures[s.symbol]?.[f] ?? 0;
                        return (
                          <td key={s.symbol} className={`px-2 py-1.5 text-right tabular-nums ${v >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {v.toFixed(2)}
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

        {/* Factor Exposure Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm">Factor Exposures — {selected[0]?.symbol.replace(".NS", "") || "Select stock"}</CardTitle>
            <CardControls title={`Factor Exposures — ${selected[0]?.symbol.replace(".NS", "") || "Select stock"}`} fullscreen expandContent={
              selected.length > 0 && exposures[selected[0].symbol] ? (
                <BarChartPanel
                  data={Object.entries(exposures[selected[0].symbol] || {}).map(([f, v]) => ({
                    name: f,
                    value: parseFloat(v.toFixed(2)),
                  }))}
                  height={600}
                />
              ) : undefined
            } />
          </CardHeader>
          <CardContent className="p-2">
            {selected.length > 0 && exposures[selected[0].symbol] ? (
              <BarChartPanel
                data={Object.entries(exposures[selected[0].symbol] || {}).map(([f, v]) => ({
                  name: f,
                  value: parseFloat(v.toFixed(2)),
                }))}
                height={250}
              />
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-xs">
                Select stocks and load exposures to view chart
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
