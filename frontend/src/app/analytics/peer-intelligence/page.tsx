"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BarChart3, X, Plus } from "lucide-react";
import { CardControls } from "@/components/CardControls";
import { usePortfolio } from "@/lib/portfolio-context";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
const TOKEN_KEY = "galedge_auth_token";

interface PeerEntry {
  label: string;
  source: "portfolio" | "strategy";
  sourceId: number;
  backtestId?: number;
  benchmark: string;
  data: Record<string, unknown> | null;
  loading: boolean;
  error: string | null;
}

interface SelectorOption {
  label: string;
  source: "portfolio" | "strategy";
  sourceId: number;
  backtestId?: number;
}

interface SelectorData {
  portfolios: Array<{ id: number; fund_name: string; scheme_name: string; benchmark: string }>;
  strategies: Array<{
    id: number;
    fund_name: string;
    scheme_name: string;
    iteration_name: string;
    backtests: Array<{ id: number; start_date: string; end_date: string; status: string }>;
  }>;
}

const COLORS = ["#f97316", "#10b981", "#3b82f6", "#a855f7", "#eab308"];

function fmt(v: unknown, decimals = 2): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return n.toFixed(decimals);
}

const METRICS = [
  { label: "Total Return (%)", path: ["pnl_metrics", "total_return_pct"] },
  { label: "CAGR (%)", path: ["pnl_metrics", "cagr_pct"] },
  { label: "Sharpe Ratio", path: ["pnl_metrics", "sharpe"] },
  { label: "Sortino Ratio", path: ["pnl_metrics", "sortino"] },
  { label: "Beta", path: ["pnl_metrics", "beta"] },
  { label: "Max Drawdown (%)", path: ["pnl_metrics", "max_drawdown_pct"] },
  { label: "Volatility (%)", path: ["pnl_metrics", "volatility_pct"] },
];

function getNestedValue(data: Record<string, unknown>, path: string[]): unknown {
  let cur: unknown = data;
  for (const key of path) {
    if (cur == null || typeof cur !== "object") return null;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

async function fetchAnalytics(
  source: "portfolio" | "strategy",
  sourceId: number,
  backtestId: number | undefined,
  benchmark: string
): Promise<Record<string, unknown>> {
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  if (!token) throw new Error("Not authenticated");

  const params = new URLSearchParams({ source, source_id: String(sourceId), benchmark });
  if (backtestId != null) params.set("backtest_id", String(backtestId));

  const res = await fetch(`${API_BASE}/api/analytics/v2/compute?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed" }));
    throw new Error(typeof err?.detail === "string" ? err.detail : "Analytics failed");
  }
  return res.json();
}

async function fetchSelector(): Promise<SelectorData> {
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${API_BASE}/api/analytics/v2/selector`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Selector fetch failed");
  return res.json();
}

export default function PeerIntelligencePage() {
  const { selectedBenchmark, selectedSource, selectedSourceId, selectedBacktestId, analyticsData } = usePortfolio();
  const [peers, setPeers] = useState<PeerEntry[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [selectorData, setSelectorData] = useState<SelectorData | null>(null);
  const [selectorLoading, setSelectorLoading] = useState(false);
  const [autoAdded, setAutoAdded] = useState(false);

  const openPicker = async () => {
    setShowPicker(true);
    if (!selectorData) {
      setSelectorLoading(true);
      try {
        const data = await fetchSelector();
        setSelectorData(data);
      } catch {
        // ignore
      } finally {
        setSelectorLoading(false);
      }
    }
  };

  const addPeer = useCallback(async (opt: SelectorOption) => {
    setShowPicker(false);
    if (peers.length >= 5) return;
    if (peers.some((p) => p.source === opt.source && p.sourceId === opt.sourceId && p.backtestId === opt.backtestId)) return;

    const newPeer: PeerEntry = {
      label: opt.label,
      source: opt.source,
      sourceId: opt.sourceId,
      backtestId: opt.backtestId,
      benchmark: selectedBenchmark,
      data: null,
      loading: true,
      error: null,
    };

    setPeers((prev) => [...prev, newPeer]);

    try {
      const data = await fetchAnalytics(opt.source, opt.sourceId, opt.backtestId, selectedBenchmark);
      setPeers((prev) =>
        prev.map((p) =>
          p.source === opt.source && p.sourceId === opt.sourceId && p.backtestId === opt.backtestId
            ? { ...p, data, loading: false }
            : p
        )
      );
    } catch (e: unknown) {
      setPeers((prev) =>
        prev.map((p) =>
          p.source === opt.source && p.sourceId === opt.sourceId && p.backtestId === opt.backtestId
            ? { ...p, loading: false, error: e instanceof Error ? e.message : "Failed" }
            : p
        )
      );
    }
  }, [peers, selectedBenchmark]);

  const removePeer = (idx: number) => {
    setPeers((prev) => prev.filter((_, i) => i !== idx));
  };

  // Auto-add the currently selected portfolio/strategy on mount
  useEffect(() => {
    if (autoAdded || !selectedSource || !selectedSourceId) return;
    setAutoAdded(true);

    // Get the real name from analyticsData or fall back to generic
    const ad = analyticsData as Record<string, unknown> | null;
    const fundName = ad?.fund_name as string | undefined;
    const label = fundName ?? (selectedSource === "portfolio" ? `Portfolio #${selectedSourceId}` : `Strategy #${selectedSourceId}`);

    if (analyticsData) {
      setPeers([{
        label,
        source: selectedSource,
        sourceId: selectedSourceId,
        backtestId: selectedBacktestId ?? undefined,
        benchmark: selectedBenchmark,
        data: analyticsData as Record<string, unknown>,
        loading: false,
        error: null,
      }]);
    } else {
      addPeer({ label, source: selectedSource, sourceId: selectedSourceId, backtestId: selectedBacktestId ?? undefined });
    }
  }, [selectedSource, selectedSourceId]); // eslint-disable-line

  // Build options from selector data
  const options: SelectorOption[] = [];
  if (selectorData) {
    selectorData.portfolios.forEach((p) => {
      options.push({ label: `${p.fund_name} (Portfolio)`, source: "portfolio", sourceId: p.id });
    });
    selectorData.strategies.forEach((s) => {
      s.backtests.filter((bt) => bt.status === "completed").forEach((bt) => {
        options.push({
          label: `${s.fund_name} — ${bt.start_date.slice(0, 7)}→${bt.end_date.slice(0, 7)}`,
          source: "strategy",
          sourceId: s.id,
          backtestId: bt.id,
        });
      });
    });
  }

  // Build performance comparison table rows
  const perfTableRows = METRICS.map(({ label, path }) => {
    const cells = peers.map((p) =>
      p.data ? fmt(getNestedValue(p.data, path)) : p.loading ? "..." : "—"
    );
    return { label, cells };
  });

  // Build factor exposure grouped bar chart
  const peerFactors = peers.map((p) => {
    if (!p.data) return { label: p.label, factors: [] as { name: string; value: number }[] };
    const fd = (p.data.factor_detail as Array<Record<string, unknown>> | undefined) ?? [];
    const top5 = [...fd]
      .sort((a, b) => Math.abs(Number(b.exposure_pct ?? 0)) - Math.abs(Number(a.exposure_pct ?? 0)))
      .slice(0, 5)
      .map((f) => ({ name: String(f.factor_name ?? f.factor ?? ""), value: Number(f.exposure_pct ?? 0) }));
    return { label: p.label, factors: top5 };
  });

  // Build market cap comparison
  const mcapKeys = ["large_cap_pct", "mid_cap_pct", "small_cap_pct"];
  const mcapLabels = ["Large Cap", "Mid Cap", "Small Cap"];
  const mcapBarData = peers.map((p) => {
    const ms = (p.data?.mcap_slicing as Array<Record<string, unknown>> | undefined) ?? [];
    const row: Record<string, unknown> = { name: p.label };
    mcapLabels.forEach((l, i) => {
      const found = ms.find((x) => String(x.bucket ?? x.name ?? "").toLowerCase().includes(l.split(" ")[0].toLowerCase()));
      row[l] = found ? Number(found.weight_pct ?? found.total_return_pct ?? 0) : 0;
    });
    return row;
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Peer Intelligence</h1>
          <p className="text-xs text-muted-foreground">Compare up to 5 portfolios or strategies</p>
        </div>
      </div>

      {/* Peer chips */}
      <div className="flex flex-wrap items-center gap-2">
        {peers.map((p, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-medium"
            style={{ borderColor: COLORS[i % COLORS.length] + "60", backgroundColor: COLORS[i % COLORS.length] + "15" }}
          >
            {p.loading && <Loader2 className="h-3 w-3 animate-spin" />}
            <span style={{ color: COLORS[i % COLORS.length] }}>{p.label}</span>
            {p.error && <span className="text-red-400 ml-1">!</span>}
            <button onClick={() => removePeer(i)} className="ml-1 text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {peers.length < 5 && (
          <button
            onClick={openPicker}
            className="flex items-center gap-1 px-2 py-1 rounded-full border border-dashed border-border text-[10px] text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
          >
            <Plus className="h-3 w-3" /> Add Portfolio
          </button>
        )}
      </div>

      {/* Picker modal */}
      {showPicker && (
        <Card className="border-primary/30">
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Select Portfolio / Strategy</CardTitle>
            <button onClick={() => setShowPicker(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </CardHeader>
          <CardContent className="p-2 max-h-48 overflow-y-auto">
            {selectorLoading ? (
              <div className="flex items-center justify-center py-4 gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs text-muted-foreground">Loading...</span>
              </div>
            ) : options.length === 0 ? (
              <p className="text-xs text-muted-foreground p-2">No portfolios or completed strategies found</p>
            ) : (
              options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => addPeer(opt)}
                  className="w-full text-left px-2 py-1.5 text-[10px] rounded hover:bg-muted/30 transition-colors"
                >
                  {opt.label}
                </button>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {peers.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center space-y-3">
          <BarChart3 className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-muted-foreground">Add portfolios above to compare their analytics</p>
        </div>
      ) : (
        <>
          {/* Performance Summary Table */}
          <Card>
            <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
              <CardTitle className="text-[11px]">Performance Comparison</CardTitle>
              <CardControls />
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Metric</th>
                    {peers.map((p, i) => (
                      <th key={i} className="px-2 py-1.5 text-right font-medium whitespace-nowrap"
                        style={{ color: COLORS[i % COLORS.length] }}>
                        {p.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {perfTableRows.map(({ label, cells }) => (
                    <tr key={label} className="border-b border-border/30">
                      <td className="px-2 py-1.5 text-muted-foreground">{label}</td>
                      {cells.map((cell, i) => {
                        const n = parseFloat(cell);
                        return (
                          <td key={i} className={`px-2 py-1.5 text-right tabular-nums ${
                            !isNaN(n) ? n >= 0 ? "text-emerald-500" : "text-red-400" : ""
                          }`}>{cell}</td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Factor Exposure Comparison */}
          {peerFactors.some((p) => p.factors.length > 0) && (
            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                <CardTitle className="text-[11px]">Top 5 Factor Exposures</CardTitle>
                <CardControls />
              </CardHeader>
              <CardContent className="p-2">
                <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${peers.length}, 1fr)` }}>
                  {peerFactors.map((pf, i) => (
                    <div key={i}>
                      <div className="text-[9px] font-medium mb-1 truncate" style={{ color: COLORS[i % COLORS.length] }}>
                        {pf.label}
                      </div>
                      {pf.factors.length > 0 ? (
                        <ResponsiveContainer width="100%" height={120}>
                          <BarChart data={pf.factors} margin={{ top: 2, right: 4, bottom: 2, left: 0 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 7, fill: "#71717a" }} tickLine={false} />
                            <YAxis tick={{ fontSize: 7, fill: "#71717a" }} tickLine={false} width={25} />
                            <Tooltip
                              contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 10 }}
                              formatter={(v) => [Number(v).toFixed(2)]}
                            />
                            <Bar dataKey="value" fill={COLORS[i % COLORS.length]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[120px] flex items-center justify-center text-[9px] text-muted-foreground">
                          {peers[i].loading ? "Loading..." : "No data"}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Market Cap Comparison */}
          {mcapBarData.length > 0 && mcapBarData.some((r) => mcapLabels.some((l) => Number(r[l]) !== 0)) && (
            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                <CardTitle className="text-[11px]">Market Cap Breakdown Comparison</CardTitle>
                <CardControls />
              </CardHeader>
              <CardContent className="p-2">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={mcapBarData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#71717a" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 8, fill: "#71717a" }} tickLine={false} width={35}
                      tickFormatter={(v) => `${Number(v).toFixed(0)}%`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 11 }}
                      formatter={(v) => [`${Number(v).toFixed(1)}%`]}
                    />
                    <Legend wrapperStyle={{ fontSize: 9 }} />
                    {mcapLabels.map((l, i) => (
                      <Bar key={l} dataKey={l} stackId="a" fill={COLORS[i % COLORS.length]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
