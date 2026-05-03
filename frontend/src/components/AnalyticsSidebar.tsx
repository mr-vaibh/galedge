"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Loader2, FolderOpen, BarChart3 } from "lucide-react";
import { usePortfolio } from "@/lib/portfolio-context";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
const TOKEN_KEY = "galedge_auth_token";

const BENCHMARKS = ["NIFTY 50", "NIFTY NEXT 50", "NIFTY 100", "NIFTY 500"];

interface PortfolioItem {
  id: number;
  fund_name: string;
  scheme_name: string;
  type: string;
  benchmark: string;
}

interface BacktestItem {
  id: number;
  start_date: string;
  end_date: string;
  status: string;
}

interface StrategyItem {
  id: number;
  fund_name: string;
  scheme_name: string;
  iteration_name: string;
  backtests: BacktestItem[];
}

interface SelectorData {
  portfolios: PortfolioItem[];
  strategies: StrategyItem[];
}

function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 w-full px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 hover:text-muted-foreground transition-colors"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Icon className="h-3 w-3" />
        {title}
      </button>
      {open && <div className="ml-2">{children}</div>}
    </div>
  );
}

export function AnalyticsSidebar() {
  const {
    loadAnalytics,
    analyticsLoading,
    selectedSource,
    selectedSourceId,
    selectedBacktestId,
    selectedBenchmark,
    setSelectedBenchmark,
  } = usePortfolio();

  const [selectorData, setSelectorData] = useState<SelectorData | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [expandedStrategies, setExpandedStrategies] = useState<Set<number>>(new Set());

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    if (!token) return;

    fetch(`${API_BASE}/api/analytics/v2/selector`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: SelectorData) => setSelectorData(data))
      .catch((e) => setFetchError(e.message));
  }, []);

  function toggleStrategy(id: number) {
    setExpandedStrategies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function isPortfolioSelected(id: number) {
    return selectedSource === "portfolio" && selectedSourceId === id;
  }

  function isBacktestSelected(strategyId: number, backtestId: number) {
    return (
      selectedSource === "strategy" &&
      selectedSourceId === strategyId &&
      selectedBacktestId === backtestId
    );
  }

  return (
    <div className="flex flex-col bg-sidebar border-r border-sidebar-border" style={{ height: "calc(100vh - 48px)" }}>
      {/* Header */}
      <div className="px-3 py-3 border-b border-sidebar-border">
        <h2 className="text-xs font-semibold text-foreground">Analytics Source</h2>
        <p className="text-[10px] text-muted-foreground mt-0.5">Select portfolio or strategy</p>
      </div>

      {/* Benchmark Selector */}
      <div className="px-3 py-2 border-b border-sidebar-border">
        <label className="text-[10px] font-medium text-muted-foreground block mb-1">Benchmark</label>
        <select
          value={selectedBenchmark}
          onChange={(e) => setSelectedBenchmark(e.target.value)}
          className="w-full text-[10px] bg-background border border-border rounded px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {BENCHMARKS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      {/* Loading indicator */}
      {analyticsLoading && (
        <div className="px-3 py-2 border-b border-sidebar-border flex items-center gap-2 bg-primary/10">
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          <span className="text-[10px] text-primary">Computing analytics...</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-2 space-y-1">
        {fetchError && (
          <div className="px-3 py-2 text-[10px] text-red-400">{fetchError}</div>
        )}

        {!selectorData && !fetchError && (
          <div className="px-3 py-4 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Loading...</span>
          </div>
        )}

        {selectorData && (
          <>
            {/* Portfolios */}
            <CollapsibleSection title="User Portfolios" icon={FolderOpen}>
              {selectorData.portfolios.length === 0 ? (
                <p className="px-3 py-2 text-[10px] text-muted-foreground italic">No portfolios uploaded</p>
              ) : (
                selectorData.portfolios.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => loadAnalytics("portfolio", p.id, undefined, selectedBenchmark)}
                    className={`w-full text-left px-3 py-1.5 rounded text-[10px] transition-colors ${
                      isPortfolioSelected(p.id)
                        ? "bg-primary/20 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <div className="font-medium truncate">{p.fund_name}</div>
                    {p.scheme_name && (
                      <div className="text-[9px] opacity-70 truncate">{p.scheme_name}</div>
                    )}
                  </button>
                ))
              )}
            </CollapsibleSection>

            {/* Strategies */}
            <CollapsibleSection title="Strategy Backtests" icon={BarChart3} defaultOpen={selectorData.portfolios.length === 0}>
              {selectorData.strategies.length === 0 ? (
                <p className="px-3 py-2 text-[10px] text-muted-foreground italic">No strategies built</p>
              ) : (
                selectorData.strategies.map((s) => (
                  <div key={s.id}>
                    <button
                      onClick={() => toggleStrategy(s.id)}
                      className="w-full text-left px-3 py-1.5 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {expandedStrategies.has(s.id)
                        ? <ChevronDown className="h-3 w-3 shrink-0" />
                        : <ChevronRight className="h-3 w-3 shrink-0" />}
                      <div className="min-w-0">
                        <div className="font-medium truncate">{s.fund_name}</div>
                        <div className="text-[9px] opacity-70 truncate">
                          {s.scheme_name}{s.iteration_name ? ` — ${s.iteration_name}` : ""}
                        </div>
                      </div>
                    </button>

                    {expandedStrategies.has(s.id) && (
                      <div className="ml-4 space-y-0.5">
                        {s.backtests.length === 0 ? (
                          <p className="px-3 py-1 text-[9px] text-muted-foreground italic">No backtests run</p>
                        ) : (
                          s.backtests.map((bt) => (
                            <button
                              key={bt.id}
                              onClick={() => {
                                if (bt.status === "completed") {
                                  loadAnalytics("strategy", s.id, bt.id, selectedBenchmark);
                                }
                              }}
                              disabled={bt.status !== "completed"}
                              className={`w-full text-left px-3 py-1.5 rounded text-[9px] transition-colors ${
                                bt.status !== "completed"
                                  ? "opacity-40 cursor-not-allowed text-muted-foreground"
                                  : isBacktestSelected(s.id, bt.id)
                                    ? "bg-primary/20 text-primary font-medium"
                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                              }`}
                            >
                              <div>
                                {bt.start_date?.slice(0, 7)} → {bt.end_date?.slice(0, 7)}
                              </div>
                              <div className={`text-[8px] ${bt.status === "completed" ? "text-emerald-500" : "text-amber-500"}`}>
                                {bt.status}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </CollapsibleSection>
          </>
        )}
      </div>
    </div>
  );
}
