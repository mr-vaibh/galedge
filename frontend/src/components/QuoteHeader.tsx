"use client";

import { useEffect, useState } from "react";
import { api, Quote } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import {
  formatPercent,
  formatVolume,
  changeColor,
} from "@/lib/format";

export function QuoteHeader({ symbol }: { symbol: string }) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState(false);
  const { formatCurrency, formatCurrencyCompact } = useCurrency();

  useEffect(() => {
    api
      .quote(symbol)
      .then(setQuote)
      .catch(() => setError(true));
  }, [symbol]);

  if (error) {
    return (
      <div className="py-8 text-center text-zinc-500">
        Could not load quote for {symbol}
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="py-8 animate-pulse">
        <div className="h-8 w-48 bg-zinc-800 rounded mb-2" />
        <div className="h-6 w-32 bg-zinc-800 rounded" />
      </div>
    );
  }

  const cur = quote.currency;

  return (
    <div className="py-6">
      <div className="flex items-baseline gap-3 mb-1">
        <h1 className="text-2xl font-bold text-white">{quote.symbol}</h1>
        <span className="text-sm text-zinc-500">
          {quote.name} &middot; {quote.exchange}
        </span>
      </div>
      <div className="flex items-baseline gap-4">
        <span className="text-3xl font-bold text-white tabular-nums">
          {formatCurrency(quote.price, cur)}
        </span>
        <span className={`text-lg font-medium tabular-nums ${changeColor(quote.change)}`}>
          {quote.change >= 0 ? "+" : ""}{formatCurrency(quote.change, cur)}
        </span>
        <span className={`text-lg tabular-nums ${changeColor(quote.changePercent)}`}>
          ({formatPercent(quote.changePercent)})
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-500">
        <span>
          Open <span className="text-zinc-300">{formatCurrency(quote.open, cur)}</span>
        </span>
        <span>
          High <span className="text-zinc-300">{formatCurrency(quote.high, cur)}</span>
        </span>
        <span>
          Low <span className="text-zinc-300">{formatCurrency(quote.low, cur)}</span>
        </span>
        <span>
          Prev Close{" "}
          <span className="text-zinc-300">{formatCurrency(quote.previousClose, cur)}</span>
        </span>
        <span>
          Volume{" "}
          <span className="text-zinc-300">{formatVolume(quote.volume)}</span>
        </span>
        <span>
          Mkt Cap{" "}
          <span className="text-zinc-300">{formatCurrencyCompact(quote.marketCap, cur)}</span>
        </span>
      </div>
    </div>
  );
}
