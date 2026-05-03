"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BarChart3 } from "lucide-react";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { CardControls } from "@/components/CardControls";
import { usePortfolio } from "@/lib/portfolio-context";

interface EventReturn {
  name?: string;
  event_name?: string;
  start?: string;
  start_date?: string;
  end?: string;
  end_date?: string;
  portfolio_return_pct?: number;
  portfolio_return?: number;
  benchmark_return_pct?: number;
  benchmark_return?: number;
  excess_return_pct?: number;
  excess?: number;
  [key: string]: unknown;
}

interface FactorDecompPoint {
  date?: string;
  [key: string]: unknown;
}

interface EquityCurvePoint {
  date?: string;
  value?: number;
}

function fmt(v: unknown, decimals = 2): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return n.toFixed(decimals);
}

function heatColor(pct: number): string {
  if (pct > 10) return "#14532d";
  if (pct > 5) return "#15803d";
  if (pct > 2) return "#16a34a";
  if (pct > 0) return "#22c55e";
  if (pct > -2) return "#ef4444";
  if (pct > -5) return "#dc2626";
  if (pct > -10) return "#b91c1c";
  return "#7f1d1d";
}

function getEventName(e: EventReturn): string {
  return String(e.name ?? e.event_name ?? "Unknown Event");
}
function getPortRet(e: EventReturn): number {
  return Number(e.portfolio_return_pct ?? e.portfolio_return ?? 0);
}
function getBmRet(e: EventReturn): number {
  return Number(e.benchmark_return_pct ?? e.benchmark_return ?? 0);
}
function getExcess(e: EventReturn): number {
  return Number(e.excess_return_pct ?? e.excess ?? (getPortRet(e) - getBmRet(e)));
}
function getStart(e: EventReturn): string {
  return String(e.start ?? e.start_date ?? "—");
}
function getEnd(e: EventReturn): string {
  return String(e.end ?? e.end_date ?? "—");
}

export default function EventSensitivityPage() {
  const { analyticsData, analyticsLoading, selectedSourceId } = usePortfolio();
  const [selectedEventIdx, setSelectedEventIdx] = useState<number | null>(null);

  if (analyticsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Computing analytics...</span>
      </div>
    );
  }

  if (!analyticsData || !selectedSourceId) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-bold">Event Sensitivity</h1>
        <div className="rounded-lg border bg-card p-12 text-center space-y-3">
          <BarChart3 className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-muted-foreground">Select a portfolio or strategy from the sidebar to begin</p>
        </div>
      </div>
    );
  }

  const rawEvents: EventReturn[] = (analyticsData.event_returns as EventReturn[] | undefined) ?? [];
  // Filter to events where we have data
  const events = rawEvents.filter(
    (e) => e.portfolio_return_pct != null || e.portfolio_return != null
  );

  const factorDecompTs: FactorDecompPoint[] = (analyticsData.factor_decomp_ts as FactorDecompPoint[] | undefined) ?? [];
  const equityCurve: EquityCurvePoint[] = (analyticsData.equity_curve as EquityCurvePoint[] | undefined) ?? [];

  const selectedEvent = selectedEventIdx != null ? events[selectedEventIdx] : null;

  // Build equity curve slice for selected event
  let eventCurveData: Record<string, unknown>[] = [];
  if (selectedEvent) {
    const start = getStart(selectedEvent);
    const end = getEnd(selectedEvent);
    const slice = equityCurve.filter((p) => {
      const d = String(p.date ?? "");
      return d >= start && d <= (end === "—" ? "9999" : end);
    });
    if (slice.length > 1) {
      const base = Number(slice[0].value ?? 1);
      eventCurveData = slice.map((p) => ({
        date: p.date,
        portfolio: base > 0 ? ((Number(p.value) - base) / base) * 100 : 0,
      }));
    }
  }

  // Factor contributors during event: filter factor_decomp_ts and sum
  interface FactorSum {
    factor: string;
    cumReturn: number;
  }
  const factorSums: Record<string, number> = {};
  if (selectedEvent) {
    const start = getStart(selectedEvent);
    const end = getEnd(selectedEvent);
    factorDecompTs
      .filter((p) => {
        const d = String(p.date ?? "");
        return d >= start && d <= (end === "—" ? "9999" : end);
      })
      .forEach((p) => {
        Object.entries(p).forEach(([k, v]) => {
          if (k === "date") return;
          factorSums[k] = (factorSums[k] ?? 0) + Number(v ?? 0);
        });
      });
  }

  const factorContribs: FactorSum[] = Object.entries(factorSums)
    .map(([factor, cumReturn]) => ({ factor, cumReturn }))
    .sort((a, b) => Math.abs(b.cumReturn) - Math.abs(a.cumReturn))
    .slice(0, 10);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Event Sensitivity</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Event Summary Table */}
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Event Sensitivity Summary</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-[10px]">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border/50">
                    <th className="px-2 py-1.5 w-6" />
                    {["Event", "Start", "End", "Portfolio %", "Benchmark %", "Excess %"].map((h) => (
                      <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.length === 0 ? (
                    <tr><td colSpan={7} className="px-2 py-4 text-center text-muted-foreground">No event data available</td></tr>
                  ) : (
                    events.map((e, i) => {
                      const portRet = getPortRet(e);
                      const bmRet = getBmRet(e);
                      const excess = getExcess(e);
                      return (
                        <tr
                          key={i}
                          className={`border-b border-border/30 cursor-pointer hover:bg-muted/20 ${
                            selectedEventIdx === i ? "bg-muted/40" : ""
                          }`}
                          onClick={() => setSelectedEventIdx(selectedEventIdx === i ? null : i)}
                        >
                          <td className="px-2 py-1.5">
                            <input type="radio" checked={selectedEventIdx === i} readOnly className="h-3 w-3" />
                          </td>
                          <td className="px-2 py-1.5 font-medium max-w-[120px] truncate">{getEventName(e)}</td>
                          <td className="px-2 py-1.5 text-muted-foreground">{getStart(e).slice(0, 10)}</td>
                          <td className="px-2 py-1.5 text-muted-foreground">{getEnd(e).slice(0, 10)}</td>
                          <td className={`px-2 py-1.5 tabular-nums ${portRet >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                            {portRet.toFixed(1)}%
                          </td>
                          <td className={`px-2 py-1.5 tabular-nums ${bmRet >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                            {bmRet.toFixed(1)}%
                          </td>
                          <td className={`px-2 py-1.5 tabular-nums ${excess >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                            {excess >= 0 ? "+" : ""}{excess.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Event Returns Treemap */}
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Event Returns</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent className="p-2">
            {events.length > 0 ? (
              <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", minHeight: "160px" }}>
                {events.map((e, i) => {
                  const portRet = getPortRet(e);
                  const excess = getExcess(e);
                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedEventIdx(i)}
                      className={`rounded p-1.5 flex flex-col justify-between cursor-pointer hover:brightness-110 transition-all ${
                        selectedEventIdx === i ? "ring-2 ring-white/40" : ""
                      }`}
                      style={{
                        backgroundColor: heatColor(excess),
                        minHeight: Math.max(50, Math.min(100, Math.abs(portRet) * 2)),
                      }}
                    >
                      <span className="text-[8px] text-white/80 leading-tight line-clamp-2">{getEventName(e)}</span>
                      <span className="text-[10px] font-bold text-white">
                        {portRet >= 0 ? "+" : ""}{portRet.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-[10px] text-muted-foreground">No event returns data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Selected event detail */}
      {selectedEvent && (
        <>
          <div className="flex items-center gap-4 p-3 rounded-lg border bg-card">
            <div className="text-xs font-medium">{getEventName(selectedEvent)}</div>
            <div className={`text-xs ${getPortRet(selectedEvent) >= 0 ? "text-emerald-500" : "text-red-400"}`}>
              Portfolio: {getPortRet(selectedEvent).toFixed(2)}%
            </div>
            <div className={`text-xs ${getBmRet(selectedEvent) >= 0 ? "text-emerald-500" : "text-red-400"}`}>
              Benchmark: {getBmRet(selectedEvent).toFixed(2)}%
            </div>
            <div className={`text-xs font-medium ${getExcess(selectedEvent) >= 0 ? "text-emerald-500" : "text-red-400"}`}>
              Excess: {getExcess(selectedEvent) >= 0 ? "+" : ""}{getExcess(selectedEvent).toFixed(2)}%
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Event equity curve */}
            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                <CardTitle className="text-[11px]">Portfolio Return During Event</CardTitle>
                <CardControls fullscreen expandContent={
                  eventCurveData.length > 0 ? (
                    <TimeSeriesChart
                      data={eventCurveData}
                      series={[{ key: "portfolio", name: "Portfolio", color: "#f97316" }]}
                      height={600}
                      yFormatter={(v) => `${v.toFixed(2)}%`}
                    />
                  ) : undefined
                } />
              </CardHeader>
              <CardContent className="p-2">
                {eventCurveData.length > 0 ? (
                  <TimeSeriesChart
                    data={eventCurveData}
                    series={[{ key: "portfolio", name: "Portfolio", color: "#f97316" }]}
                    height={200}
                    yFormatter={(v) => `${v.toFixed(2)}%`}
                  />
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-[10px] text-muted-foreground">
                    No equity curve data for this event window
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Factor contributors during event */}
            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                <CardTitle className="text-[11px]">Factor Contributors During Event</CardTitle>
                <CardControls />
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Factor</th>
                      <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Cumulative Return (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {factorContribs.length > 0 ? (
                      factorContribs.map((f) => (
                        <tr key={f.factor} className="border-b border-border/30">
                          <td className="px-2 py-1.5 font-medium">{f.factor}</td>
                          <td className={`px-2 py-1.5 text-right tabular-nums ${f.cumReturn >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                            {f.cumReturn >= 0 ? "+" : ""}{f.cumReturn.toFixed(3)}%
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={2} className="px-2 py-4 text-center text-muted-foreground">
                        No factor decomposition data for this event window
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
