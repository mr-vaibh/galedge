"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
const TOKEN_KEY = "galedge_auth_token";
const STORAGE_KEY = "galedge_selected_portfolio";

interface PortfolioContextType {
  // Legacy fields — kept for backward compatibility
  selectedPortfolioId: number | null;
  selectedFundName: string | null;
  selectedSchemeName: string | null;
  selectPortfolio: (id: number, fund: string, scheme: string) => void;
  clearPortfolio: () => void;

  // Analytics v2 fields
  selectedSource: "portfolio" | "strategy" | null;
  selectedSourceId: number | null;
  selectedBacktestId: number | null;
  selectedBenchmark: string;
  analyticsData: Record<string, unknown> | null;
  analyticsLoading: boolean;
  analyticsError: string | null;
  loadAnalytics: (
    source: "portfolio" | "strategy",
    sourceId: number,
    backtestId?: number,
    benchmark?: string
  ) => Promise<void>;
  setSelectedBenchmark: (benchmark: string) => void;
}

const PortfolioContext = createContext<PortfolioContextType>({
  selectedPortfolioId: null,
  selectedFundName: null,
  selectedSchemeName: null,
  selectPortfolio: () => {},
  clearPortfolio: () => {},

  selectedSource: null,
  selectedSourceId: null,
  selectedBacktestId: null,
  selectedBenchmark: "NIFTY 500",
  analyticsData: null,
  analyticsLoading: false,
  analyticsError: null,
  loadAnalytics: async () => {},
  setSelectedBenchmark: () => {},
});

export function PortfolioProvider({ children }: { children: ReactNode }) {
  // Legacy state
  const [selectedPortfolioId, setId] = useState<number | null>(null);
  const [selectedFundName, setFund] = useState<string | null>(null);
  const [selectedSchemeName, setScheme] = useState<string | null>(null);

  // Analytics v2 state
  const [selectedSource, setSelectedSource] = useState<"portfolio" | "strategy" | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);
  const [selectedBacktestId, setSelectedBacktestId] = useState<number | null>(null);
  const [selectedBenchmark, setSelectedBenchmark] = useState<string>("NIFTY 500");
  const [analyticsData, setAnalyticsData] = useState<Record<string, unknown> | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // Load legacy selection from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { id, fund, scheme } = JSON.parse(saved);
        setId(id);
        setFund(fund);
        setScheme(scheme);
      }
    } catch {}
  }, []);

  function selectPortfolio(id: number, fund: string, scheme: string) {
    setId(id);
    setFund(fund);
    setScheme(scheme);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ id, fund, scheme }));
    } catch {}
  }

  function clearPortfolio() {
    setId(null);
    setFund(null);
    setScheme(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  const loadAnalytics = useCallback(async (
    source: "portfolio" | "strategy",
    sourceId: number,
    backtestId?: number,
    benchmark: string = selectedBenchmark,
  ) => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    setSelectedSource(source);
    setSelectedSourceId(sourceId);
    setSelectedBacktestId(backtestId ?? null);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
      if (!token) {
        setAnalyticsError("Not authenticated. Please log in.");
        setAnalyticsLoading(false);
        return;
      }

      const params = new URLSearchParams({
        source,
        source_id: String(sourceId),
        benchmark,
      });
      if (backtestId != null) {
        params.set("backtest_id", String(backtestId));
      }

      const res = await fetch(`${API_BASE}/api/analytics/v2/compute?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Analytics computation failed" }));
        throw new Error(typeof err?.detail === "string" ? err.detail : "Analytics computation failed");
      }

      const data = await res.json();
      setAnalyticsData(data);
    } catch (e: unknown) {
      setAnalyticsError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setAnalyticsLoading(false);
    }
  }, [selectedBenchmark]);

  return (
    <PortfolioContext.Provider value={{
      selectedPortfolioId,
      selectedFundName,
      selectedSchemeName,
      selectPortfolio,
      clearPortfolio,

      selectedSource,
      selectedSourceId,
      selectedBacktestId,
      selectedBenchmark,
      analyticsData,
      analyticsLoading,
      analyticsError,
      loadAnalytics,
      setSelectedBenchmark,
    }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  return useContext(PortfolioContext);
}
