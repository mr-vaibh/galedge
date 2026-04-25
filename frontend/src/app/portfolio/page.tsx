"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, Quote } from "@/lib/api";
import { Holding, getHoldings, addHolding, removeHolding } from "@/lib/portfolio";
import { ExportButton } from "@/components/ExportButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus } from "lucide-react";
import { SymbolInput } from "@/components/SymbolInput";
import { useCurrency } from "@/lib/currency";
import {
  formatPrice,
  formatChange,
  formatPercent,
  formatNumber,
  changeColor,
} from "@/lib/format";

interface HoldingWithQuote extends Holding {
  quote?: Quote;
  currentValue?: number;
  pnl?: number;
  pnlPercent?: number;
}

export default function PortfolioPage() {
  const router = useRouter();
  const { symbol: curSymbol, formatCurrency, formatCurrencyCompact } = useCurrency();
  const hCur = (h: HoldingWithQuote) => h.symbol.endsWith(".NS") || h.symbol.endsWith(".BO") ? "INR" : "USD";
  const [holdings, setHoldings] = useState<HoldingWithQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ symbol: "", shares: "", buyPrice: "", buyDate: "" });

  const loadHoldings = useCallback(async () => {
    const stored = getHoldings();
    if (!stored.length) { setHoldings([]); return; }

    setLoading(true);
    const enriched: HoldingWithQuote[] = await Promise.all(
      stored.map(async (h) => {
        try {
          const quote = await api.quote(h.symbol);
          const currentValue = quote.price * h.shares;
          const investedValue = h.buyPrice * h.shares;
          const pnl = currentValue - investedValue;
          const pnlPercent = investedValue > 0 ? (pnl / investedValue) * 100 : 0;
          return { ...h, quote, currentValue, pnl, pnlPercent };
        } catch {
          return h;
        }
      })
    );
    setHoldings(enriched);
    setLoading(false);
  }, []);

  useEffect(() => { loadHoldings(); }, [loadHoldings]);

  function handleAdd() {
    if (!form.symbol || !form.shares || !form.buyPrice) return;
    addHolding({
      symbol: form.symbol.toUpperCase(),
      shares: parseFloat(form.shares),
      buyPrice: parseFloat(form.buyPrice),
      buyDate: form.buyDate || new Date().toISOString().slice(0, 10),
    });
    setForm({ symbol: "", shares: "", buyPrice: "", buyDate: "" });
    setShowForm(false);
    loadHoldings();
  }

  function handleRemove(id: string) {
    removeHolding(id);
    loadHoldings();
  }

  const totalInvested = holdings.reduce((s, h) => s + h.buyPrice * h.shares, 0);
  const totalCurrent = holdings.reduce((s, h) => s + (h.currentValue || 0), 0);
  const totalPnl = totalCurrent - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  const exportData = holdings.map((h) => ({
    Symbol: h.symbol,
    Shares: h.shares,
    "Buy Price": h.buyPrice,
    "Current Price": h.quote?.price ?? "",
    "Invested": (h.buyPrice * h.shares).toFixed(2),
    "Current Value": h.currentValue?.toFixed(2) ?? "",
    "P&L": h.pnl?.toFixed(2) ?? "",
    "P&L %": h.pnlPercent?.toFixed(2) ?? "",
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Portfolio Tracker</h1>
          <p className="text-sm text-muted-foreground">Track your holdings with live P&L. Data stored locally.</p>
        </div>
        <div className="flex gap-2">
          {holdings.length > 0 && <ExportButton data={exportData} filename="portfolio" />}
          <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Holding
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Symbol</Label>
              <SymbolInput value={form.symbol} onChange={(v) => setForm({ ...form, symbol: v })} className="w-[160px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Shares</Label>
              <Input type="number" placeholder="10" value={form.shares} onChange={(e) => setForm({ ...form, shares: e.target.value })} className="w-[100px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Buy Price ({curSymbol})</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{curSymbol}</span>
                <Input type="number" placeholder="150.00" value={form.buyPrice} onChange={(e) => setForm({ ...form, buyPrice: e.target.value })} className="w-[140px] pl-7" step="0.01" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Buy Date</Label>
              <Input type="date" value={form.buyDate} onChange={(e) => setForm({ ...form, buyDate: e.target.value })} className="w-[150px]" />
            </div>
            <Button onClick={handleAdd}>Add</Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {holdings.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-xs text-muted-foreground">Total Invested</div>
            <div className="text-lg font-bold tabular-nums">{formatCurrencyCompact(totalInvested)}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-xs text-muted-foreground">Current Value</div>
            <div className="text-lg font-bold tabular-nums">{formatCurrencyCompact(totalCurrent)}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-xs text-muted-foreground">Total P&L</div>
            <div className={`text-lg font-bold tabular-nums ${changeColor(totalPnl)}`}>{totalPnl >= 0 ? "+" : ""}{formatCurrency(totalPnl)}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-xs text-muted-foreground">Return</div>
            <div className={`text-lg font-bold tabular-nums ${changeColor(totalPnlPct)}`}>{formatPercent(totalPnlPct)}</div>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {["Symbol", "Shares", "Buy Price", "Current", "Invested", "Value", "P&L", "P&L %", ""].map((h) => (
                  <th key={h} className={`p-3 font-medium text-muted-foreground ${h === "Symbol" ? "text-left" : "text-right"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && !holdings.length ? (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Loading portfolio...</td></tr>
              ) : holdings.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No holdings yet. Add your first stock above.</td></tr>
              ) : (
                holdings.map((h) => (
                  <tr key={h.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-3 font-medium cursor-pointer hover:underline" onClick={() => router.push(`/stock/${h.symbol}`)}>{h.symbol}</td>
                    <td className="p-3 text-right tabular-nums">{h.shares}</td>
                    <td className="p-3 text-right tabular-nums">{formatCurrency(h.buyPrice, hCur(h))}</td>
                    <td className="p-3 text-right tabular-nums">{h.quote ? formatCurrency(h.quote.price, hCur(h)) : "—"}</td>
                    <td className="p-3 text-right tabular-nums">{formatCurrencyCompact(h.buyPrice * h.shares, hCur(h))}</td>
                    <td className="p-3 text-right tabular-nums">{h.currentValue ? formatCurrencyCompact(h.currentValue, hCur(h)) : "—"}</td>
                    <td className={`p-3 text-right tabular-nums ${changeColor(h.pnl)}`}>{h.pnl != null ? `${h.pnl >= 0 ? "+" : ""}${formatCurrency(h.pnl, hCur(h))}` : "—"}</td>
                    <td className={`p-3 text-right tabular-nums ${changeColor(h.pnlPercent)}`}>{h.pnlPercent != null ? formatPercent(h.pnlPercent) : "—"}</td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleRemove(h.id)} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
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
