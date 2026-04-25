"use client";

import { useEffect, useRef, useState } from "react";
import { api, HistoryPoint, TechnicalsResponse } from "@/lib/api";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  LineData,
  Time,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
} from "lightweight-charts";
import { Button } from "@/components/ui/button";

const PERIODS = [
  { label: "1D", period: "1d", interval: "5m" },
  { label: "1W", period: "5d", interval: "15m" },
  { label: "1M", period: "1mo", interval: "1h" },
  { label: "3M", period: "3mo", interval: "1d" },
  { label: "6M", period: "6mo", interval: "1d" },
  { label: "1Y", period: "1y", interval: "1d" },
  { label: "5Y", period: "5y", interval: "1wk" },
];

const INDICATORS = [
  { key: "sma_20", label: "SMA 20", color: "#3b82f6" },
  { key: "sma_50", label: "SMA 50", color: "#f59e0b" },
  { key: "ema_12", label: "EMA 12", color: "#06b6d4" },
  { key: "ema_26", label: "EMA 26", color: "#a855f7" },
  { key: "bb", label: "Bollinger", color: "#6b7280" },
];

function parseTime(datetime: string): Time {
  return datetime.slice(0, 10) as Time;
}

export function PriceChart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const [activePeriod, setActivePeriod] = useState(4);
  const [loading, setLoading] = useState(true);
  const [activeIndicators, setActiveIndicators] = useState<Set<string>>(new Set());
  const [techData, setTechData] = useState<TechnicalsResponse | null>(null);

  // Create chart once
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { color: "transparent" }, textColor: "#71717a", fontSize: 12 },
      grid: { vertLines: { color: "#27272a" }, horzLines: { color: "#27272a" } },
      crosshair: {
        vertLine: { color: "#525252", width: 1, style: 3 },
        horzLine: { color: "#525252", width: 1, style: 3 },
      },
      rightPriceScale: { borderColor: "#27272a" },
      timeScale: { borderColor: "#27272a", timeVisible: true },
      width: containerRef.current.clientWidth,
      height: 420,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981", downColor: "#ef4444",
      borderDownColor: "#ef4444", borderUpColor: "#10b981",
      wickDownColor: "#ef4444", wickUpColor: "#10b981",
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" }, priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    chartRef.current = chart;
    candleRef.current = candleSeries;
    volumeRef.current = volumeSeries;

    const handleResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); chart.remove(); };
  }, []);

  // Load price data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const p = PERIODS[activePeriod];
        const [historyData, technicalsData] = await Promise.all([
          api.history(symbol, p.interval, p.period),
          api.technicals(symbol, p.period, p.interval).catch(() => null),
        ]);

        const candles: CandlestickData[] = historyData.data.map((d) => ({
          time: parseTime(d.datetime), open: d.open, high: d.high, low: d.low, close: d.close,
        }));
        const volumes: HistogramData[] = historyData.data.map((d) => ({
          time: parseTime(d.datetime), value: d.volume,
          color: d.close >= d.open ? "#10b98133" : "#ef444433",
        }));

        if (candleRef.current) candleRef.current.setData(candles);
        if (volumeRef.current) volumeRef.current.setData(volumes);
        if (chartRef.current) chartRef.current.timeScale().fitContent();

        setTechData(technicalsData);
      } catch (err) {
        console.error("Failed to load chart data:", err);
      }
      setLoading(false);
    }
    loadData();
  }, [symbol, activePeriod]);

  // Update indicator overlays
  useEffect(() => {
    if (!chartRef.current || !techData) return;
    const chart = chartRef.current;

    // Remove old indicator series
    indicatorSeriesRef.current.forEach((series, key) => {
      if (!activeIndicators.has(key) && !(key === "bb_upper" || key === "bb_lower")) {
        chart.removeSeries(series);
        indicatorSeriesRef.current.delete(key);
      }
    });
    // Also remove BB sub-series if BB not active
    if (!activeIndicators.has("bb")) {
      ["bb_upper", "bb_lower", "bb_middle"].forEach((k) => {
        const s = indicatorSeriesRef.current.get(k);
        if (s) { chart.removeSeries(s); indicatorSeriesRef.current.delete(k); }
      });
    }

    // Add active indicator series
    activeIndicators.forEach((key) => {
      if (key === "bb") {
        // Bollinger Bands: 3 lines
        ["bb_upper", "bb_middle", "bb_lower"].forEach((bk) => {
          if (indicatorSeriesRef.current.has(bk)) return;
          const series = chart.addSeries(LineSeries, {
            color: bk === "bb_middle" ? "#6b7280" : "#6b728066",
            lineWidth: 1,
            lineStyle: bk === "bb_middle" ? 0 : 2,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
          });
          const lineData: LineData[] = techData.data
            .filter((d) => d[bk as keyof typeof d] != null)
            .map((d) => ({
              time: parseTime(d.datetime),
              value: d[bk as keyof typeof d] as number,
            }));
          series.setData(lineData);
          indicatorSeriesRef.current.set(bk, series);
        });
      } else {
        if (indicatorSeriesRef.current.has(key)) return;
        const ind = INDICATORS.find((i) => i.key === key);
        if (!ind) return;

        const series = chart.addSeries(LineSeries, {
          color: ind.color,
          lineWidth: 1,
          crosshairMarkerVisible: false,
          priceLineVisible: false,
          lastValueVisible: false,
        });

        const lineData: LineData[] = techData.data
          .filter((d) => d[key as keyof typeof d] != null)
          .map((d) => ({
            time: parseTime(d.datetime),
            value: d[key as keyof typeof d] as number,
          }));
        series.setData(lineData);
        indicatorSeriesRef.current.set(key, series);
      }
    });
  }, [activeIndicators, techData]);

  function toggleIndicator(key: string) {
    setActiveIndicators((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 mb-3">
        {PERIODS.map((p, i) => (
          <Button key={p.label} variant={i === activePeriod ? "secondary" : "ghost"} size="sm"
            onClick={() => { setActivePeriod(i); setActiveIndicators(new Set()); indicatorSeriesRef.current.clear(); }}
            className="h-7 text-xs"
          >
            {p.label}
          </Button>
        ))}
        <div className="w-px h-5 bg-border mx-1" />
        {INDICATORS.map((ind) => (
          <Button key={ind.key} variant={activeIndicators.has(ind.key) ? "secondary" : "ghost"} size="sm"
            onClick={() => toggleIndicator(ind.key)}
            className="h-7 text-xs gap-1.5"
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ind.color }} />
            {ind.label}
          </Button>
        ))}
      </div>
      <div className="relative rounded-lg border bg-card p-2">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10 rounded-lg">
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        )}
        <div ref={containerRef} />
      </div>
    </div>
  );
}
