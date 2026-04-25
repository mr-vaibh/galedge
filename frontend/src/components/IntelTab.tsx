"use client";

import { useEffect, useState } from "react";
import { api, IntelResponse } from "@/lib/api";
import { formatNumber, changeColor, formatPercent } from "@/lib/format";

function RecommendationsSection({ data }: { data: Record<string, unknown>[] }) {
  if (!data.length) return null;

  return (
    <div>
      <h3 className="text-sm font-medium text-zinc-400 mb-3">Analyst Recommendations</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              {["Period", "Strong Buy", "Buy", "Hold", "Sell", "Strong Sell"].map((h) => (
                <th key={h} className="text-right py-2 px-3 text-zinc-500 font-medium text-xs">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-zinc-900">
                <td className="text-right py-1.5 px-3 text-zinc-400">{String(row.period)}</td>
                <td className="text-right py-1.5 px-3 text-emerald-400 font-medium">{String(row.strongBuy)}</td>
                <td className="text-right py-1.5 px-3 text-emerald-400">{String(row.buy)}</td>
                <td className="text-right py-1.5 px-3 text-amber-400">{String(row.hold)}</td>
                <td className="text-right py-1.5 px-3 text-red-400">{String(row.sell)}</td>
                <td className="text-right py-1.5 px-3 text-red-400 font-medium">{String(row.strongSell)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InsidersSection({ data }: { data: Record<string, unknown>[] }) {
  if (!data.length) return null;

  return (
    <div>
      <h3 className="text-sm font-medium text-zinc-400 mb-3">Insider Transactions</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              {["Date", "Insider", "Transaction", "Shares", "Value"].map((h) => (
                <th key={h} className={`py-2 px-3 text-zinc-500 font-medium text-xs ${h === "Insider" ? "text-left" : "text-right"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 15).map((row, i) => {
              const txn = String(row.Transaction || "");
              const isBuy = /buy|purchase/i.test(txn);
              return (
                <tr key={i} className="border-b border-zinc-900">
                  <td className="text-right py-1.5 px-3 text-zinc-500 text-xs">
                    {String(row["Start Date"] || "").slice(0, 10)}
                  </td>
                  <td className="text-left py-1.5 px-3 text-zinc-300 text-xs">
                    {String(row.Insider || "")}
                  </td>
                  <td className={`text-right py-1.5 px-3 text-xs ${isBuy ? "text-emerald-400" : "text-red-400"}`}>
                    {txn}
                  </td>
                  <td className="text-right py-1.5 px-3 text-zinc-300 tabular-nums">
                    {formatNumber(row.Shares as number)}
                  </td>
                  <td className="text-right py-1.5 px-3 text-zinc-300 tabular-nums">
                    {row.Value ? formatNumber(row.Value as number) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HoldersSection({
  data,
  title,
}: {
  data: Record<string, unknown>[];
  title: string;
}) {
  if (!data.length) return null;

  return (
    <div>
      <h3 className="text-sm font-medium text-zinc-400 mb-3">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              {["Holder", "Shares", "Value", "% Held", "% Change"].map((h) => (
                <th key={h} className={`py-2 px-3 text-zinc-500 font-medium text-xs ${h === "Holder" ? "text-left" : "text-right"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => {
              const pctChg = (row.pctChange as number) || 0;
              return (
                <tr key={i} className="border-b border-zinc-900">
                  <td className="text-left py-1.5 px-3 text-zinc-300 text-xs">
                    {String(row.Holder || "")}
                  </td>
                  <td className="text-right py-1.5 px-3 text-zinc-300 tabular-nums">
                    {formatNumber(row.Shares as number)}
                  </td>
                  <td className="text-right py-1.5 px-3 text-zinc-300 tabular-nums">
                    {formatNumber(row.Value as number)}
                  </td>
                  <td className="text-right py-1.5 px-3 text-zinc-300 tabular-nums">
                    {((row.pctHeld as number) * 100).toFixed(2)}%
                  </td>
                  <td className={`text-right py-1.5 px-3 tabular-nums ${changeColor(pctChg)}`}>
                    {formatPercent(pctChg * 100)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewsSection({ data }: { data: IntelResponse["news"] }) {
  if (!data || !data.length) return null;

  return (
    <div>
      <h3 className="text-sm font-medium text-zinc-400 mb-3">Recent News</h3>
      <div className="space-y-3">
        {data.map((item, i) => (
          <a
            key={i}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-zinc-900 rounded-lg p-4 hover:bg-zinc-800/80 transition-colors"
          >
            <div className="font-medium text-sm text-zinc-100 mb-1">
              {item.title}
            </div>
            <div className="text-xs text-zinc-500">
              {item.publisher}
              {item.publishedAt && ` · ${item.publishedAt.slice(0, 16)}`}
            </div>
            {item.summary && (
              <div className="text-xs text-zinc-500 mt-1 line-clamp-2">
                {item.summary}
              </div>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}

const INTEL_SECTIONS = [
  { id: "all", label: "All" },
  { id: "recommendations", label: "Analysts" },
  { id: "insider_transactions", label: "Insiders" },
  { id: "institutional_holders", label: "Institutions" },
  { id: "news", label: "News" },
];

export function IntelTab({ symbol }: { symbol: string }) {
  const [data, setData] = useState<IntelResponse | null>(null);
  const [section, setSection] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .intel(symbol, section)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [symbol, section]);

  if (loading && !data) {
    return <div className="text-zinc-500 text-sm py-4">Loading intel...</div>;
  }

  if (!data) return null;

  const show = (key: string) => section === "all" || section === key;

  return (
    <div>
      <div className="flex gap-1 mb-4 flex-wrap">
        {INTEL_SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              section === s.id
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        {show("recommendations") && data.recommendations && (
          <RecommendationsSection data={data.recommendations} />
        )}
        {show("insider_transactions") && data.insider_transactions && (
          <InsidersSection data={data.insider_transactions} />
        )}
        {show("institutional_holders") && data.institutional_holders && (
          <HoldersSection data={data.institutional_holders} title="Top Institutional Holders" />
        )}
        {show("mutual_fund_holders") && data.mutual_fund_holders && (
          <HoldersSection data={data.mutual_fund_holders} title="Top Mutual Fund Holders" />
        )}
        {show("news") && <NewsSection data={data.news} />}
      </div>
    </div>
  );
}
