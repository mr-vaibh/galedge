"use client";

import { useEffect, useState } from "react";
import { api, OptionsResponse } from "@/lib/api";
import { formatNumber, formatPrice } from "@/lib/format";

export function OptionsTab({ symbol }: { symbol: string }) {
  const [data, setData] = useState<OptionsResponse | null>(null);
  const [kind, setKind] = useState<"calls" | "puts">("calls");
  const [expiry, setExpiry] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .options(symbol, kind, expiry)
      .then((res) => {
        setData(res);
        if (!expiry) setExpiry(res.expiry);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [symbol, kind, expiry]);

  if (loading && !data) {
    return <div className="text-zinc-500 text-sm py-4">Loading options...</div>;
  }

  if (!data || data.data.length === 0) {
    return <div className="text-zinc-500 text-sm py-4">No options data available for {symbol}</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-1">
          {(["calls", "puts"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                kind === k
                  ? k === "calls"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-red-500/20 text-red-400"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {k.charAt(0).toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
        <select
          value={expiry || ""}
          onChange={(e) => setExpiry(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          {data.expirations.map((exp) => (
            <option key={exp} value={exp}>
              {exp}
            </option>
          ))}
        </select>
        <span className="text-xs text-zinc-600">{data.count} contracts</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              {["Strike", "Last", "Bid", "Ask", "Volume", "OI", "IV", "ITM"].map(
                (h) => (
                  <th
                    key={h}
                    className="text-right py-2 px-3 text-zinc-500 font-medium text-xs"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {data.data.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-zinc-900 hover:bg-zinc-900/50 ${
                  row.inTheMoney ? "bg-emerald-500/5" : ""
                }`}
              >
                <td className="text-right py-1.5 px-3 font-medium text-zinc-200 tabular-nums">
                  {formatPrice(row.strike)}
                </td>
                <td className="text-right py-1.5 px-3 text-zinc-200 tabular-nums">
                  {formatPrice(row.lastPrice)}
                </td>
                <td className="text-right py-1.5 px-3 text-zinc-400 tabular-nums">
                  {formatPrice(row.bid)}
                </td>
                <td className="text-right py-1.5 px-3 text-zinc-400 tabular-nums">
                  {formatPrice(row.ask)}
                </td>
                <td className="text-right py-1.5 px-3 text-zinc-400 tabular-nums">
                  {row.volume != null ? formatNumber(row.volume) : "—"}
                </td>
                <td className="text-right py-1.5 px-3 text-zinc-400 tabular-nums">
                  {row.openInterest != null ? formatNumber(row.openInterest) : "—"}
                </td>
                <td
                  className={`text-right py-1.5 px-3 tabular-nums ${
                    (row.impliedVolatility || 0) > 0.5
                      ? "text-amber-400"
                      : "text-zinc-400"
                  }`}
                >
                  {row.impliedVolatility != null
                    ? `${(row.impliedVolatility * 100).toFixed(1)}%`
                    : "—"}
                </td>
                <td className="text-right py-1.5 px-3">
                  {row.inTheMoney ? (
                    <span className="text-xs text-emerald-400">ITM</span>
                  ) : (
                    <span className="text-xs text-zinc-600">OTM</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
