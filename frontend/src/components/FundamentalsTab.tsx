"use client";

import { useEffect, useState } from "react";
import { api, FundamentalsInfoResponse, FundamentalsSheetResponse } from "@/lib/api";
import { formatNumber, formatPercent, formatPrice } from "@/lib/format";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-900 rounded-lg px-4 py-3">
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <div className="text-sm font-medium text-zinc-100">{value}</div>
    </div>
  );
}

function InfoSection({ symbol }: { symbol: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    api
      .fundamentals(symbol, "info")
      .then((res) => setData((res as FundamentalsInfoResponse).data))
      .catch(() => {});
  }, [symbol]);

  if (!data) return <div className="text-zinc-500 text-sm py-4">Loading fundamentals...</div>;

  // Fields stored as decimals that must be shown as % (multiply by 100)
  const PCT_FIELDS = new Set([
    "profitMargins", "operatingMargins", "grossMargins",
    "revenueGrowth", "earningsGrowth",
    "returnOnEquity", "returnOnAssets",
    "dividendYield", "payoutRatio",
  ]);
  // Fields that are plain ratios — show as-is
  const RATIO_FIELDS = new Set(["trailingPE", "forwardPE", "pegRatio", "priceToBook",
    "debtToEquity", "currentRatio", "beta", "enterpriseToEbitda"]);

  const fmt = (v: unknown, field?: string) => {
    if (v == null) return "—";
    if (typeof v === "number") {
      if (Math.abs(v) >= 1e6) return formatNumber(v);
      if (field && PCT_FIELDS.has(field)) return `${(v * 100).toFixed(1)}%`;
      if (field && RATIO_FIELDS.has(field)) return v.toFixed(2);
      // Fallback heuristic: values between -10 and 10 that look like decimals → %
      if (Math.abs(v) < 10 && Math.abs(v) > 0 && !Number.isInteger(v) && Math.abs(v) < 1) {
        return `${(v * 100).toFixed(1)}%`;
      }
      return v.toFixed(2);
    }
    return String(v);
  };

  const sections = [
    {
      title: "Valuation",
      items: [
        ["Market Cap", formatNumber(data.marketCap as number)],
        ["Enterprise Value", formatNumber(data.enterpriseValue as number)],
        ["Trailing P/E", fmt(data.trailingPE, "trailingPE")],
        ["Forward P/E", fmt(data.forwardPE, "forwardPE")],
        ["PEG Ratio", fmt(data.pegRatio, "pegRatio")],
        ["Price/Book", fmt(data.priceToBook, "priceToBook")],
      ],
    },
    {
      title: "Earnings",
      items: [
        ["Trailing EPS", fmt(data.trailingEps)],
        ["Forward EPS", fmt(data.forwardEps)],
        ["Revenue", formatNumber(data.totalRevenue as number)],
        ["Profit Margin", fmt(data.profitMargins, "profitMargins")],
        ["Operating Margin", fmt(data.operatingMargins, "operatingMargins")],
        ["Gross Margin", fmt(data.grossMargins, "grossMargins")],
      ],
    },
    {
      title: "Growth & Returns",
      items: [
        ["Revenue Growth", fmt(data.revenueGrowth, "revenueGrowth")],
        ["Earnings Growth", fmt(data.earningsGrowth, "earningsGrowth")],
        ["Return on Equity", fmt(data.returnOnEquity, "returnOnEquity")],
        ["Debt/Equity", fmt(data.debtToEquity, "debtToEquity")],
      ],
    },
    {
      title: "Dividends & Risk",
      items: [
        ["Dividend Yield", fmt(data.dividendYield, "dividendYield")],
        ["Payout Ratio", fmt(data.payoutRatio, "payoutRatio")],
        ["Beta", fmt(data.beta, "beta")],
        ["52W High", formatPrice(data.fiftyTwoWeekHigh as number)],
        ["52W Low", formatPrice(data.fiftyTwoWeekLow as number)],
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.title}>
          <h3 className="text-sm font-medium text-zinc-400 mb-2">{section.title}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {section.items.map(([label, value]) => (
              <StatCard key={label as string} label={label as string} value={value as string} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FinancialTable({ symbol, sheet, title }: { symbol: string; sheet: string; title: string }) {
  const [data, setData] = useState<Record<string, unknown>[] | null>(null);

  useEffect(() => {
    api
      .fundamentals(symbol, sheet)
      .then((res) => setData((res as FundamentalsSheetResponse).data))
      .catch(() => {});
  }, [symbol, sheet]);

  if (!data) return <div className="text-zinc-500 text-sm py-4">Loading {title}...</div>;
  if (data.length === 0) return <div className="text-zinc-500 text-sm py-4">No data available</div>;

  // Filter out empty period columns (only have 'period' key, no metric values)
  const validData = data.filter((r) => Object.keys(r).length > 1);
  if (validData.length === 0) return <div className="text-zinc-500 text-sm py-4">No data available</div>;

  const dates = validData.map((r) => String(r.period ?? r.date ?? "").slice(0, 10));
  const skip = new Set(["period", "date", "ticker", "fetched_at"]);
  const metrics = Object.keys(validData[0]).filter((k) => !skip.has(k));

  const important = [
    "Total Revenue", "Net Income", "Operating Income", "Gross Profit", "EBITDA",
    "Total Assets", "Total Debt", "Total Equity Gross Minority Interest",
    "Free Cash Flow", "Operating Cash Flow", "Capital Expenditure",
  ];

  const sortedMetrics = [
    ...important.filter((m) => metrics.includes(m)),
    ...metrics.filter((m) => !important.includes(m)),
  ];

  return (
    <div>
      <h3 className="text-sm font-medium text-zinc-400 mb-3">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left py-2 pr-4 text-zinc-500 font-medium">Metric</th>
              {dates.map((d) => (
                <th key={d} className="text-right py-2 px-3 text-zinc-500 font-medium min-w-[120px]">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedMetrics.map((metric) => (
              <tr key={metric} className="border-b border-zinc-900 hover:bg-zinc-900/50">
                <td className="py-2 pr-4 text-zinc-400 text-xs">{metric}</td>
                {validData.map((row, i) => (
                  <td key={i} className="text-right py-2 px-3 text-zinc-200 tabular-nums">
                    {row[metric] != null ? formatNumber(row[metric] as number) : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const SHEETS = [
  { id: "info", label: "Overview" },
  { id: "financials", label: "Income Statement" },
  { id: "balance_sheet", label: "Balance Sheet" },
  { id: "cashflow", label: "Cash Flow" },
  { id: "quarterly_financials", label: "Quarterly" },
];

export function FundamentalsTab({ symbol }: { symbol: string }) {
  const [activeSheet, setActiveSheet] = useState("info");

  return (
    <div>
      <div className="flex gap-1 mb-4 flex-wrap">
        {SHEETS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSheet(s.id)}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              activeSheet === s.id
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {activeSheet === "info" ? (
        <InfoSection symbol={symbol} />
      ) : (
        <FinancialTable
          symbol={symbol}
          sheet={activeSheet}
          title={SHEETS.find((s) => s.id === activeSheet)?.label || ""}
        />
      )}
    </div>
  );
}
