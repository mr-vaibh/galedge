"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, QuoteSummary } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import {
  formatPercent,
  formatChange,
  changeColor,
  changeBg,
} from "@/lib/format";

const POPULAR_SYMBOLS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META", "NVDA", "NFLX",
];

const INDIAN_SYMBOLS = [
  "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
  "HINDUNILVR.NS", "BHARTIARTL.NS", "ITC.NS",
];

function QuoteCard({ q }: { q: QuoteSummary }) {
  const router = useRouter();
  const { formatCurrency, formatCurrencyCompact } = useCurrency();
  // Detect currency from symbol suffix
  const cur = q.symbol.endsWith(".NS") || q.symbol.endsWith(".BO") ? "INR" : "USD";

  return (
    <button
      onClick={() => router.push(`/stock/${q.symbol}`)}
      className={`w-full text-left rounded-xl border border-zinc-800 p-4 hover:border-zinc-700 transition-all ${changeBg(
        q.change
      )}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-sm text-white">{q.symbol}</span>
        <span className="text-xs text-zinc-500 truncate ml-2 max-w-[120px]">
          {q.name}
        </span>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-lg font-bold text-white tabular-nums">
          {formatCurrency(q.price, cur)}
        </span>
        <div className="text-right">
          <div className={`text-sm font-medium tabular-nums ${changeColor(q.change)}`}>
            {formatChange(q.change)}
          </div>
          <div className={`text-xs tabular-nums ${changeColor(q.changePercent)}`}>
            {formatPercent(q.changePercent)}
          </div>
        </div>
      </div>
      <div className="mt-2 flex justify-between text-xs text-zinc-600">
        <span>Vol {formatCurrencyCompact(q.volume, cur)}</span>
        {q.asOf && <span className="text-zinc-700">EOD {q.asOf}</span>}
      </div>
    </button>
  );
}

function QuoteGrid({
  title,
  symbols,
}: {
  title: string;
  symbols: string[];
}) {
  const [quotes, setQuotes] = useState<QuoteSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .quotes(symbols)
      .then(setQuotes)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="text-lg font-semibold text-zinc-200 mb-4">{title}</h2>
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {symbols.map((s) => (
            <div key={s} className="h-32 bg-zinc-900 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quotes.map((q) => (
            <QuoteCard key={q.symbol} q={q} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-3">
          Free Stock Market Data
        </h1>
        <p className="text-zinc-500 max-w-xl mx-auto">
          End-of-day prices for 400+ NSE and US stocks. Updated daily.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
          EOD data — prices reflect previous trading session close
        </div>
      </div>

      <div className="space-y-10">
        <QuoteGrid title="US Markets" symbols={POPULAR_SYMBOLS} />
        <QuoteGrid title="Indian Markets (NSE)" symbols={INDIAN_SYMBOLS} />
      </div>
    </div>
  );
}
