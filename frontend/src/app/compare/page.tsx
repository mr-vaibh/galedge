"use client";

import { useState, useEffect, useRef } from "react";
import { api, CompareResponse } from "@/lib/api";
import { SymbolMultiSelect } from "@/components/SymbolMultiSelect";
import { ExportButton } from "@/components/ExportButton";
import { Button } from "@/components/ui/button";
import { formatNumber, formatPrice, formatPercent } from "@/lib/format";
import {
  createChart,
  LineSeries,
  IChartApi,
  Time,
} from "lightweight-charts";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#a855f7", "#ef4444"];
const PERIODS = [
  { label: "1M", period: "1mo", interval: "1d" },
  { label: "3M", period: "3mo", interval: "1d" },
  { label: "6M", period: "6mo", interval: "1d" },
  { label: "1Y", period: "1y", interval: "1d" },
  { label: "5Y", period: "5y", interval: "1wk" },
];

const FUND_METRICS = [
  { key: "marketCap", label: "Market Cap", fmt: formatNumber },
  { key: "trailingPE", label: "P/E (Trailing)", fmt: (v: number) => v?.toFixed(2) ?? "—" },
  { key: "forwardPE", label: "P/E (Forward)", fmt: (v: number) => v?.toFixed(2) ?? "—" },
  { key: "profitMargins", label: "Profit Margin", fmt: (v: number) => v != null ? `${(v * 100).toFixed(1)}%` : "—" },
  { key: "operatingMargins", label: "Operating Margin", fmt: (v: number) => v != null ? `${(v * 100).toFixed(1)}%` : "—" },
  { key: "dividendYield", label: "Dividend Yield", fmt: (v: number) => v != null ? `${(v * 100).toFixed(2)}%` : "—" },
  { key: "beta", label: "Beta", fmt: (v: number) => v?.toFixed(3) ?? "—" },
  { key: "sector", label: "Sector", fmt: (v: string) => v || "—" },
  { key: "industry", label: "Industry", fmt: (v: string) => v || "—" },
  { key: "fiftyTwoWeekHigh", label: "52W High", fmt: formatPrice },
  { key: "fiftyTwoWeekLow", label: "52W Low", fmt: formatPrice },
];

export default function ComparePage() {
  const [symbols, setSymbols] = useState<string[]>(["AAPL", "MSFT"]);
  const [activePeriod, setActivePeriod] = useState(2);
  const [data, setData] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartApi = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (symbols.length < 2) return;
    setLoading(true);
    const p = PERIODS[activePeriod];
    api
      .compare(symbols, p.period, p.interval)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [symbols, activePeriod]);

  useEffect(() => {
    if (!chartRef.current || !data) return;

    if (chartApi.current) chartApi.current.remove();

    const chart = createChart(chartRef.current, {
      layout: { background: { color: "transparent" }, textColor: "#71717a", fontSize: 12 },
      grid: { vertLines: { color: "#27272a" }, horzLines: { color: "#27272a" } },
      rightPriceScale: { borderColor: "#27272a" },
      timeScale: { borderColor: "#27272a" },
      width: chartRef.current.clientWidth,
      height: 400,
    });

    data.symbols.forEach((sym, i) => {
      const prices = data.price_data[sym];
      if (!prices) return;
      const series = chart.addSeries(LineSeries, {
        color: COLORS[i % COLORS.length],
        lineWidth: 2,
        title: sym,
      });
      series.setData(
        prices.map((p) => ({
          time: p.datetime.slice(0, 10) as Time,
          value: p.normalized,
        }))
      );
    });

    chart.timeScale().fitContent();
    chartApi.current = chart;

    const handleResize = () => {
      if (chartRef.current) chart.applyOptions({ width: chartRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartApi.current = null;
    };
  }, [data]);

  const exportData = data
    ? FUND_METRICS.map((m) => {
        const row: Record<string, unknown> = { Metric: m.label };
        data.symbols.forEach((s) => {
          row[s] = data.fundamentals[s]?.[m.key] ?? "—";
        });
        return row;
      })
    : [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Stock Comparison</h1>
        <p className="text-sm text-muted-foreground">Compare up to 5 stocks side by side</p>
      </div>

      <SymbolMultiSelect value={symbols} onChange={setSymbols} max={5} />

      {symbols.length >= 2 && (
        <>
          <div className="flex gap-1">
            {PERIODS.map((p, i) => (
              <Button
                key={p.label}
                variant={i === activePeriod ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActivePeriod(i)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          <div className="relative rounded-lg border p-4 bg-card">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10 rounded-lg">
                <span className="text-sm text-muted-foreground">Loading...</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mb-2">Normalized performance (base = 100)</p>
            <div className="flex gap-3 mb-3">
              {symbols.map((s, i) => (
                <div key={s} className="flex items-center gap-1.5 text-xs">
                  <span className="w-3 h-0.5 rounded" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  {s}
                </div>
              ))}
            </div>
            <div ref={chartRef} />
          </div>

          {data?.fundamentals && (
            <div className="rounded-lg border bg-card">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="font-semibold text-sm">Fundamentals Comparison</h2>
                <ExportButton data={exportData} filename={`compare_${symbols.join("_")}`} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-muted-foreground font-medium">Metric</th>
                      {data.symbols.map((s, i) => (
                        <th key={s} className="text-right p-3 font-medium" style={{ color: COLORS[i % COLORS.length] }}>
                          {s}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {FUND_METRICS.map((m) => (
                      <tr key={m.key} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="p-3 text-muted-foreground">{m.label}</td>
                        {data.symbols.map((s) => (
                          <td key={s} className="text-right p-3 tabular-nums">
                            {(m.fmt as (v: any) => string)(data.fundamentals[s]?.[m.key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
