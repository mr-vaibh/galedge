"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { Loader2, Plus, Upload, Download, Trash2, Pencil, ChevronDown, Search, Filter, Play, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { usePortfolio } from "@/lib/portfolio-context";
import { useCurrency } from "@/lib/currency";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

const STANDARD_UNIVERSES = [
  "NIFTY", "SENSEX", "BSE 500", "NIFTY 500", "NIFTY 100", "NIFTY 200",
  "NIFTY MIDCAP 150", "NIFTY SMALLCAP 250", "NIFTY LARGEMIDCAP 250",
  "NIFTY MICROCAP 250", "NIFTY NEXT 50", "FNO",
];

const BENCHMARKS = [
  "BSE 500", "Current Portfolio", "Nifty", "Nifty 100", "NIFTY 200",
  "Nifty 500", "Nifty 50 Value 20", "Nifty Auto", "Nifty IT",
  "Nifty Large and Mid Cap 250", "Nifty Microcap 250", "Nifty Midcap 150",
  "Nifty Midcap Select", "Nifty Next 50",
];

const CONSTRAINT_TYPES = [
  "Maximum Capital",
  "Maximum Number of Positions",
  "Position Size Bound",
  "Minimum Position Size Constraint",
  "Portfolio Risk Budget Constraint",
  "Beta Exposure Constraint",
  "Factor Exposure Constraint",
  "Sub Portfolio Capital Constraint",
  "Single Name Idiosyncratic Contribution",
  "Portfolio Turnover Constraint",
  "Category Selection Constraint",
];

const OBJECTIVE_TYPES = [
  "Risk Minimization Objective",
  "Return Maximization Objective",
  "Risk-Adjusted Return Objective",
  "Tracking Error Minimization",
];

const PLACEHOLDER_USER_FACTORS = [
  "Momentum Score", "Value Composite", "Quality Rank", "Growth Score",
  "Volatility Factor", "Liquidity Score", "Size Factor", "Dividend Yield Factor",
];

const PLACEHOLDER_SCREENER_FACTORS = [
  "P/E Ratio", "P/B Ratio", "ROE", "ROCE", "Debt to Equity",
  "Free Cash Flow Yield", "EPS Growth", "Revenue Growth",
  "Operating Margin", "Net Profit Margin", "Beta", "RSI",
];

interface Constraint {
  id: number;
  name: string;
  type: string;
  params: Record<string, string>;
  status: "active" | "inactive";
}

interface Objective {
  id: number;
  name: string;
  type: string;
  params: Record<string, string>;
  status: "active" | "inactive";
}

const CONSTRAINT_FIELDS: Record<string, string[]> = {
  "Maximum Capital": ["max_capital"],
  "Maximum Number of Positions": ["max_positions"],
  "Position Size Bound": ["min_weight", "max_weight"],
  "Minimum Position Size Constraint": ["min_position_size"],
  "Portfolio Risk Budget Constraint": ["risk_budget"],
  "Beta Exposure Constraint": ["min_beta", "max_beta"],
  "Factor Exposure Constraint": ["factor_name", "lower_bound", "upper_bound"],
  "Sub Portfolio Capital Constraint": ["sub_capital"],
  "Single Name Idiosyncratic Contribution": ["max_contribution"],
  "Portfolio Turnover Constraint": ["max_turnover"],
  "Category Selection Constraint": ["category", "min_count", "max_count"],
};

const OBJECTIVE_FIELDS: Record<string, string[]> = {
  "Risk Minimization Objective": ["risk_type", "weight"],
  "Return Maximization Objective": ["weight"],
  "Risk-Adjusted Return Objective": ["weight"],
  "Tracking Error Minimization": ["benchmark", "weight"],
};

const STANDARD_SCREEN_QUERIES = [
  { name: "Quality Compounder", query: "ROE > 15 AND PE < 30 AND DebtToEquity < 0.5 AND MarketCap > 1000" },
  { name: "Deep Value", query: "PE < 12 AND PB < 1.5 AND DividendYield > 1.5 AND MarketCap > 500" },
  { name: "GARP", query: "ROE > 18 AND PE < 25 AND EarningsGrowth > 10 AND MarketCap > 2000" },
  { name: "Dividend Aristocrat", query: "DividendYield > 3 AND ROE > 12 AND DebtToEquity < 1 AND PE < 20" },
  { name: "Small Cap Value", query: "MarketCap < 5000 AND MarketCap > 200 AND PE < 15 AND ROE > 12" },
  { name: "Capital Efficiency", query: "ROCE > 25 AND PE < 35 AND MarketCap > 500" },
];

// ── Screen Picker Dialog ─────────────────────────────────────────────────────
function ScreenPickerDialog({
  open, onClose, onSelect, token,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (symbols: string[], label: string) => void;
  token: string | null;
}) {
  const [tab, setTab] = useState<"saved" | "standard" | "query" | "alpha">("standard");
  const [savedScreens, setSavedScreens] = useState<{ id: number; name: string; screener_query: string }[]>([]);
  const [alphaModels, setAlphaModels] = useState<{ id: number; name: string; status: string; has_results: boolean; n_stocks: number | null; input_factors: string[] }[]>([]);
  const [customQuery, setCustomQuery] = useState("");
  const [running, setRunning] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ symbols: string[]; label: string } | null>(null);

  useEffect(() => {
    if (!open || !token) return;
    const h = { Authorization: `Bearer ${token}` };
    fetch(`${API_BASE}/api/alpha/screens`, { headers: h })
      .then(r => r.ok ? r.json() : [])
      .then(d => setSavedScreens(Array.isArray(d) ? d : []))
      .catch(() => {});
    fetch(`${API_BASE}/api/alpha/models`, { headers: h })
      .then(r => r.ok ? r.json() : { user_models: [] })
      .then(d => setAlphaModels((d.user_models || []).filter((m: { has_results: boolean }) => m.has_results)))
      .catch(() => {});
  }, [open, token]);

  async function runQuery(query: string, label: string) {
    setRunning(label);
    setPreview(null);
    try {
      const res = await fetch(`${API_BASE}/api/alpha/screens/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ query, weight: "equal", limit: 100 }),
      });
      if (res.ok) {
        const data = await res.json();
        const symbols: string[] = (data.stocks ?? []).map((s: { symbol: string }) => s.symbol);
        setPreview({ symbols, label });
      }
    } catch { /* silent */ }
    setRunning(null);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl w-[600px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
          <span className="text-sm font-semibold flex items-center gap-2"><Filter className="h-4 w-4 text-blue-400" /> Choose Screen as Universe</span>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground hover:text-foreground" /></button>
        </div>

        <div className="flex gap-1 px-4 pt-3 flex-wrap">
          {(["standard", "saved", "alpha", "query"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1 text-[11px] rounded-md font-medium transition-colors ${tab === t ? "bg-blue-600 text-white" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "standard" ? "Standard Alphas" : t === "saved" ? "My Screens" : t === "alpha" ? `Alpha Models${alphaModels.length > 0 ? ` (${alphaModels.length})` : ""}` : "Quick Query"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {tab === "standard" && STANDARD_SCREEN_QUERIES.map(s => (
            <div key={s.name} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-neutral-700 hover:border-neutral-600">
              <div className="min-w-0">
                <p className="text-[12px] font-medium">{s.name}</p>
                <p className="text-[10px] text-muted-foreground font-mono truncate">{s.query}</p>
              </div>
              <Button size="sm" className="h-7 text-[10px] gap-1 shrink-0"
                disabled={running === s.name}
                onClick={() => runQuery(s.query, s.name)}>
                {running === s.name ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                Run
              </Button>
            </div>
          ))}

          {tab === "saved" && (savedScreens.length === 0
            ? <p className="text-[11px] text-muted-foreground text-center py-6">No saved screens yet. <a href="/alpha-machine/build-screen" className="text-blue-400 hover:underline">Create one</a></p>
            : savedScreens.map(s => (
              <div key={s.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-neutral-700 hover:border-neutral-600">
                <div className="min-w-0">
                  <p className="text-[12px] font-medium">{s.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">{s.screener_query}</p>
                </div>
                <Button size="sm" className="h-7 text-[10px] gap-1 shrink-0"
                  disabled={running === s.name}
                  onClick={() => runQuery(s.screener_query, s.name)}>
                  {running === s.name ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                  Run
                </Button>
              </div>
            ))
          )}

          {tab === "alpha" && (alphaModels.length === 0
            ? (
              <div className="text-center py-6 space-y-2">
                <p className="text-[11px] text-muted-foreground">No computed alpha models yet.</p>
                <a href="/alpha-machine" className="text-[11px] text-blue-400 hover:underline">Go to Alpha Machine → Build Model → Compute</a>
              </div>
            ) : alphaModels.map(m => (
              <div key={m.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-neutral-700 hover:border-neutral-600">
                <div className="min-w-0">
                  <p className="text-[12px] font-medium">{m.name}</p>
                  <p className="text-[10px] text-muted-foreground">{m.n_stocks} stocks · factors: {(m.input_factors || []).join(", ")}</p>
                </div>
                <Button size="sm" className="h-7 text-[10px] gap-1 shrink-0"
                  disabled={running === m.name}
                  onClick={async () => {
                    setRunning(m.name);
                    setPreview(null);
                    try {
                      const res = await fetch(`${API_BASE}/api/alpha/models/${m.id}/results?top_n=50`, {
                        headers: token ? { Authorization: `Bearer ${token}` } : {},
                      });
                      if (res.ok) {
                        const data = await res.json();
                        const symbols = (data.stocks ?? []).map((s: { symbol: string }) => s.symbol);
                        setPreview({ symbols, label: `${m.name} (Top 50)` });
                      }
                    } catch { /* silent */ }
                    setRunning(null);
                  }}>
                  {running === m.name ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                  Use Top 50
                </Button>
              </div>
            ))
          )}

          {tab === "query" && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Screener Query</label>
                <textarea
                  value={customQuery}
                  onChange={e => setCustomQuery(e.target.value)}
                  placeholder="e.g. ROE > 15 AND PE < 25 AND MarketCap > 1000"
                  className="w-full h-24 bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-[11px] font-mono text-foreground resize-none focus:outline-none focus:border-blue-500"
                />
              </div>
              <Button size="sm" className="gap-1.5" disabled={!customQuery.trim() || running === "custom"}
                onClick={() => runQuery(customQuery.trim(), "Custom Query")}>
                {running === "custom" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                Run Query
              </Button>
            </div>
          )}
        </div>

        {/* Preview + Use */}
        {preview && (
          <div className="border-t border-neutral-700 px-4 py-3 flex items-center justify-between gap-3 bg-neutral-800/50">
            <div>
              <p className="text-[11px] font-medium text-emerald-400">{preview.label} — {preview.symbols.length} stocks</p>
              <p className="text-[10px] text-muted-foreground truncate">{preview.symbols.slice(0, 8).join(", ")}{preview.symbols.length > 8 ? ` +${preview.symbols.length - 8} more` : ""}</p>
            </div>
            <Button size="sm" className="h-7 text-[10px] shrink-0 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => { onSelect(preview.symbols, preview.label); onClose(); }}>
              Use as Universe
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BuildStrategyPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const { token } = useAuth();
  const { selectPortfolio } = usePortfolio();
  const { formatCurrencyCompact } = useCurrency();
  const [fundName, setFundName] = useState("");
  const [backtestError, setBacktestError] = useState<string | null>(null);
  const [schemeName, setSchemeName] = useState("");
  const [iterationName, setIterationName] = useState("");
  const [universe, setUniverse] = useState("");
  const [benchmark, setBenchmark] = useState("");
  const [customSymbols, setCustomSymbols] = useState<string[]>([]);
  const [customUniverseLabel, setCustomUniverseLabel] = useState("");
  const [showScreenPicker, setShowScreenPicker] = useState(false);
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [showConstraintDialog, setShowConstraintDialog] = useState(false);
  const [showObjectiveDialog, setShowObjectiveDialog] = useState(false);
  const [showBacktestDialog, setShowBacktestDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedConstraintType, setSelectedConstraintType] = useState("");
  const [selectedObjectiveType, setSelectedObjectiveType] = useState("");
  const [btStartDate, setBtStartDate] = useState("2025-06-01");
  const [btEndDate, setBtEndDate] = useState(new Date().toISOString().split("T")[0]);

  // Fetch latest trading date for backtest end date
  useEffect(() => {
    fetch(`${API_BASE}/api/data/latest-trading-date`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.date) setBtEndDate(d.date); })
      .catch(() => {});
  }, []);
  const [btFrequency, setBtFrequency] = useState("Monthly");
  const [btMethod, setBtMethod] = useState("equal");
  const [backtestResults, setBacktestResults] = useState<Record<string, unknown> | null>(null);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [backtestEquity, setBacktestEquity] = useState<Record<string, unknown>[]>([]);
  const [benchmarkCurve, setBenchmarkCurve] = useState<Record<string, unknown>[]>([]);
  const [backtestRebalances, setBacktestRebalances] = useState<Record<string, unknown>[]>([]);
  const [lastBacktestBenchmark, setLastBacktestBenchmark] = useState<string>("NIFTY 50");

  // Configure Backtest dialog state
  const [configTab, setConfigTab] = useState<string | number>("regular");
  const [specifiedDates, setSpecifiedDates] = useState("");
  // Stop Loss state
  const [totalStopLossOpen, setTotalStopLossOpen] = useState(false);
  const [totalStopLossPct, setTotalStopLossPct] = useState("");
  const [totalStopLossPortfolioPct, setTotalStopLossPortfolioPct] = useState("");
  const [totalStopLossDays, setTotalStopLossDays] = useState("");
  const [residualStopLossOpen, setResidualStopLossOpen] = useState(false);
  const [residualStopLossPct, setResidualStopLossPct] = useState("");
  const [residualStopLossPortfolioPct, setResidualStopLossPortfolioPct] = useState("");
  const [residualStopLossDays, setResidualStopLossDays] = useState("");
  // Burn-in and Chunking state
  const [burnInOpen, setBurnInOpen] = useState(false);
  const [maxChunks, setMaxChunks] = useState("5");
  const [minRebalancePerChunk, setMinRebalancePerChunk] = useState("5");
  const [burnInRebalances, setBurnInRebalances] = useState("2");
  // Stop Loss section open
  const [stopLossOpen, setStopLossOpen] = useState(false);

  // Additional Analytics state
  const [selectedUserFactors, setSelectedUserFactors] = useState<string[]>([]);
  const [selectedScreenerFactors, setSelectedScreenerFactors] = useState<string[]>([]);
  const [userFactorSearch, setUserFactorSearch] = useState("");
  const [screenerFactorSearch, setScreenerFactorSearch] = useState("");

  // 1-day results state
  const [oneDayResults, setOneDayResults] = useState<Record<string, unknown> | null>(null);
  const [oneDayLoading, setOneDayLoading] = useState(false);
  const [editStrategyId, setEditStrategyId] = useState<number | null>(null);

  // Pre-fill symbols from Build Screen "Send to Strategy" button
  useEffect(() => {
    const symParam = searchParams.get("symbols");
    const labelParam = searchParams.get("universe_label");
    if (symParam) {
      const syms = symParam.split(",").filter(Boolean);
      setCustomSymbols(syms);
      setCustomUniverseLabel(labelParam ? decodeURIComponent(labelParam) : "Custom Screen");
      setUniverse("custom_screen");
    }
  }, []);  // eslint-disable-line

  // Load existing strategy when ?id= is present
  useEffect(() => {
    if (!editId) return;
    const authToken = token || (typeof window !== "undefined" ? localStorage.getItem("galedge_auth_token") : null);
    if (!authToken) return;

    fetch(`${API_BASE}/api/strategies/${editId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!data) return;
        setEditStrategyId(data.id);
        setFundName(data.fund_name || "");
        setSchemeName(data.scheme_name || "");
        setIterationName(data.iteration_name || "");
        setUniverse(data.universe || "");
        setBenchmark(data.benchmark || "");

        // Load backtest config from most recent backtest if available
        if (data.backtests?.length > 0) {
          const latest = data.backtests[data.backtests.length - 1];
          if (latest.start) setBtStartDate(latest.start);
          if (latest.end) setBtEndDate(latest.end);
          if (latest.frequency) setBtFrequency(latest.frequency);
        }

        // Load constraints
        if (data.constraints?.length > 0) {
          setConstraints(data.constraints.map((c: Record<string, unknown>, i: number) => ({
            id: i + 1,
            name: c.name as string,
            type: c.type as string,
            params: (c.params || {}) as Record<string, string>,
            status: (c.active !== false ? "active" : "inactive") as "active" | "inactive",
          })));
        }

        // Load objectives
        if (data.objectives?.length > 0) {
          setObjectives(data.objectives.map((o: Record<string, unknown>, i: number) => ({
            id: i + 1,
            name: o.name as string,
            type: o.type as string,
            params: (o.params || {}) as Record<string, string>,
            status: (o.active !== false ? "active" : "inactive") as "active" | "inactive",
          })));
        }
      })
      .catch(() => {});
  }, [editId, token]);

  const runBacktest = useCallback(async () => {
    setBacktestLoading(true);
    setBacktestError(null);
    // Clear previous results so user knows a new run is happening
    setBacktestResults(null);
    setBacktestEquity([]);
    setBenchmarkCurve([]);
    setBacktestRebalances([]);
    try {
      // Step 1: Save strategy (reuse existing if editing)
      const authToken = token || (typeof window !== "undefined" ? localStorage.getItem("galedge_auth_token") : null);
      if (!authToken) throw new Error("Please log in first");
      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` };

      let strategyId = editStrategyId;
      const strategyPayload = {
        fund_name: fundName || "Untitled Strategy",
        scheme_name: schemeName,
        iteration_name: iterationName,
        universe: universe === "custom_screen" && customUniverseLabel
          ? `Screen: ${customUniverseLabel}`
          : (universe || "NIFTY 50"),
        benchmark: benchmark || "NIFTY 50",
      };

      if (strategyId) {
        // Update existing strategy
        const updateRes = await fetch(`${API_BASE}/api/strategies/${strategyId}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(strategyPayload),
        });
        if (!updateRes.ok) throw new Error("Failed to update strategy");
      } else {
        // Create new strategy
        const stratRes = await fetch(`${API_BASE}/api/strategies/`, {
          method: "POST",
          headers,
          body: JSON.stringify(strategyPayload),
        });
        if (!stratRes.ok) throw new Error("Failed to save strategy");
        const result = await stratRes.json();
        strategyId = result.id;
        setEditStrategyId(strategyId);
      }

      // Step 2: Replace constraints
      const constraintData = constraints
        .filter((x) => x.status === "active")
        .map((c) => ({
          constraint_type: c.type || c.name,
          name: c.name,
          parameters: c.params,
        }));
      await fetch(`${API_BASE}/api/strategies/${strategyId}/constraints`, {
        method: "PUT",
        headers,
        body: JSON.stringify(constraintData),
      });

      // Step 3: Replace objectives
      const objectiveData = objectives
        .filter((x) => x.status === "active")
        .map((o) => ({
          objective_type: o.type || o.name,
          name: o.name,
          parameters: o.params,
        }));
      await fetch(`${API_BASE}/api/strategies/${strategyId}/objectives`, {
        method: "PUT",
        headers,
        body: JSON.stringify(objectiveData),
      });

      // Step 4: Map constraints for optimizer
      const mappedConstraints = constraints
        .filter((c) => c.status === "active")
        .map((c) => {
          switch (c.name) {
            case "Position Size Bound":
              return { type: "position_size_bound", min: parseFloat(c.params.min_weight || "0"), max: parseFloat(c.params.max_weight || "1") };
            case "Maximum Number of Positions":
              return { type: "max_positions", value: parseFloat(c.params.max_positions || "50") };
            case "Maximum Capital":
              return { type: "max_total_weight", value: parseFloat(c.params.max_capital || "1") };
            case "Beta Exposure Constraint":
              return { type: "beta_exposure", lower: parseFloat(c.params.min_beta || "0"), upper: parseFloat(c.params.max_beta || "2") };
            case "Portfolio Turnover Constraint":
              return { type: "turnover", value: parseFloat(c.params.max_turnover || "1") };
            default:
              return null;
          }
        })
        .filter(Boolean);

      // Map objective
      const activeObj = objectives.find((o) => o.status === "active");
      let optObjective = "maximize_sharpe";
      if (activeObj) {
        switch (activeObj.name) {
          case "Risk Minimization Objective": optObjective = "minimize_risk"; break;
          case "Return Maximization Objective": optObjective = "maximize_return"; break;
          case "Risk-Adjusted Return Objective": optObjective = "maximize_sharpe"; break;
          case "Tracking Error Minimization": optObjective = "minimize_tracking_error"; break;
        }
      }

      // Step 5: Run backtest with optimizer
      const backtestPayload: Record<string, unknown> = {
        strategy_id: strategyId,
        start_date: btStartDate,
        end_date: btEndDate,
        rebalance_frequency: btFrequency,
        weight_method: "optimizer",
        optimizer_objective: optObjective,
        optimizer_constraints: mappedConstraints,
      };
      if (universe === "custom_screen" && customSymbols.length > 0) {
        backtestPayload.symbols = customSymbols;
        backtestPayload.universe = "CUSTOM";
      } else {
        backtestPayload.universe = universe || "NIFTY 50";
      }
      const res = await fetch(`${API_BASE}/api/backtest/run`, {
        method: "POST",
        headers,
        body: JSON.stringify(backtestPayload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Backtest failed" }));
        throw new Error(typeof err.detail === "string" ? err.detail : "Backtest failed. Make sure data is ingested.");
      }
      const data = await res.json();
      setBacktestResults(data.metrics);
      setBacktestEquity(data.equity_curve || []);
      setBenchmarkCurve(data.benchmark_curve || []);
      setBacktestRebalances(data.rebalances || []);
      setLastBacktestBenchmark(benchmark || "NIFTY 50");
      setShowConfigDialog(false);
    } catch (e) {
      setBacktestError(e instanceof Error ? e.message : "Backtest failed");
    }
    setBacktestLoading(false);
  }, [universe, benchmark, btStartDate, btEndDate, btFrequency, btMethod, token, fundName, schemeName, iterationName, constraints, objectives]);

  const runOneDayResults = useCallback(async () => {
    setOneDayLoading(true);
    try {
      // Map frontend constraint names to optimizer ConstraintSpec format
      const mappedConstraints = constraints
        .filter((c) => c.status === "active")
        .map((c) => {
          switch (c.name) {
            case "Position Size Bound":
              return { type: "position_size_bound", min: parseFloat(c.params.min_weight || "0"), max: parseFloat(c.params.max_weight || "1") };
            case "Maximum Number of Positions":
              return { type: "max_positions", value: parseFloat(c.params.max_positions || "50") };
            case "Maximum Capital":
              return { type: "max_total_weight", value: parseFloat(c.params.max_capital || "1") };
            case "Minimum Position Size Constraint":
              return { type: "position_size_bound", min: parseFloat(c.params.min_position_size || "0"), max: 1 };
            case "Beta Exposure Constraint":
              return { type: "beta_exposure", lower: parseFloat(c.params.min_beta || "0"), upper: parseFloat(c.params.max_beta || "2") };
            case "Portfolio Turnover Constraint":
              return { type: "turnover", value: parseFloat(c.params.max_turnover || "1") };
            default:
              return null;
          }
        })
        .filter(Boolean);

      // Map objective
      const activeObj = objectives.find((o) => o.status === "active");
      let objective = "maximize_sharpe";
      if (activeObj) {
        switch (activeObj.name) {
          case "Risk Minimization Objective": objective = "minimize_risk"; break;
          case "Return Maximization Objective": objective = "maximize_return"; break;
          case "Risk-Adjusted Return Objective": objective = "maximize_sharpe"; break;
          case "Tracking Error Minimization": objective = "minimize_tracking_error"; break;
        }
      }

      const res = await fetch(`${API_BASE}/api/optimize/smart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          universe: universe || "NIFTY 50",
          objective,
          constraints: mappedConstraints,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setOneDayResults({ total_return: "Error", sharpe_ratio: err.detail || "Failed", total_trades: 0 });
      } else {
        const data = await res.json();
        setOneDayResults({
          total_return: (data.expected_return * 100).toFixed(2),
          sharpe_ratio: data.sharpe_ratio.toFixed(2),
          total_trades: data.n_positions,
          weights: data.weights,
          expected_risk: (data.expected_risk * 100).toFixed(2),
          sector_weights: data.sector_weights,
        });
      }
    } catch (e) {
      console.error("1-day results failed:", e);
      setOneDayResults({ total_return: "N/A", sharpe_ratio: "N/A", total_trades: "N/A" });
    }
    setOneDayLoading(false);
  }, [universe, constraints, objectives]);

  function toggleFactor(list: string[], setList: (v: string[]) => void, factor: string) {
    if (list.includes(factor)) {
      setList(list.filter((f) => f !== factor));
    } else {
      setList([...list, factor]);
    }
  }

  function addConstraint() {
    if (!selectedConstraintType) return;
    const fields = CONSTRAINT_FIELDS[selectedConstraintType] || [];
    const params: Record<string, string> = {};
    fields.forEach(f => { params[f] = ""; });
    setConstraints([...constraints, {
      id: Date.now(),
      name: selectedConstraintType,
      type: selectedConstraintType,
      params,
      status: "active",
    }]);
    setShowConstraintDialog(false);
    setSelectedConstraintType("");
  }

  function addObjective() {
    if (!selectedObjectiveType) return;
    const fields = OBJECTIVE_FIELDS[selectedObjectiveType] || [];
    const params: Record<string, string> = {};
    fields.forEach(f => { params[f] = ""; });
    setObjectives([...objectives, {
      id: Date.now(),
      name: selectedObjectiveType,
      type: selectedObjectiveType,
      params,
      status: "active",
    }]);
    setShowObjectiveDialog(false);
    setSelectedObjectiveType("");
  }

  const filteredUserFactors = PLACEHOLDER_USER_FACTORS.filter((f) =>
    f.toLowerCase().includes(userFactorSearch.toLowerCase())
  );
  const filteredScreenerFactors = PLACEHOLDER_SCREENER_FACTORS.filter((f) =>
    f.toLowerCase().includes(screenerFactorSearch.toLowerCase())
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Build New Strategy</h1>
      </div>

      {/* Strategy Metadata */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Fund Name</Label>
              <Input placeholder="Enter fund name" value={fundName} onChange={(e) => setFundName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Scheme Name</Label>
              <Input placeholder="Enter scheme name" value={schemeName} onChange={(e) => setSchemeName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Iteration Name</Label>
              <Input placeholder="Enter iteration name" value={iterationName} onChange={(e) => setIterationName(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Row */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-1.5">
          <span className="text-xs text-muted-foreground">Universe</span>
          {universe === "custom_screen" && customSymbols.length > 0 ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-emerald-400 font-medium">
                {customUniverseLabel} ({customSymbols.length})
              </span>
              <button
                onClick={() => { setUniverse(""); setCustomSymbols([]); setCustomUniverseLabel(""); }}
                className="text-muted-foreground hover:text-foreground"
              ><X className="h-3 w-3" /></button>
              <button
                onClick={() => setShowScreenPicker(true)}
                className="text-[10px] text-blue-400 hover:underline"
              >change</button>
            </div>
          ) : (
            <Select value={universe} onValueChange={(v) => {
              if (typeof v !== "string") return;
              if (v === "custom_screen") { setShowScreenPicker(true); }
              else { setUniverse(v); setCustomSymbols([]); setCustomUniverseLabel(""); }
            }}>
              <SelectTrigger className="h-7 w-[180px] border-0 text-xs"><SelectValue placeholder="Select A Universe" /></SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground">Standard</div>
                {STANDARD_UNIVERSES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground mt-1">Screener</div>
                <SelectItem value="custom_screen">
                  <span className="flex items-center gap-1.5"><Filter className="h-3 w-3 text-blue-400" />Custom Screener...</span>
                </SelectItem>
              </SelectContent>
            </Select>
          )}
          <ScreenPickerDialog
            open={showScreenPicker}
            onClose={() => { setShowScreenPicker(false); if (!customSymbols.length) setUniverse(""); }}
            token={token}
            onSelect={(syms, label) => {
              setCustomSymbols(syms);
              setCustomUniverseLabel(label);
              setUniverse("custom_screen");
            }}
          />
        </div>

        <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-1.5">
          <span className="text-xs text-muted-foreground">Benchmark</span>
          <Select value={benchmark} onValueChange={(v) => { if (typeof v === "string") setBenchmark(v); }}>
            <SelectTrigger className="h-7 w-[180px] border-0 text-xs"><SelectValue placeholder="Select benchmark" /></SelectTrigger>
            <SelectContent>
              {BENCHMARKS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-1.5">
          <span className="text-xs text-muted-foreground">Date</span>
          <Input type="date" className="h-7 w-[150px] border-0 text-xs" />
        </div>

        <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-1.5">
          <span className="text-xs text-muted-foreground">Include futures</span>
          <input type="checkbox" className="h-4 w-4 rounded" />
        </div>
      </div>

      {/* Main Content: Constraints + Objectives side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Constraints */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm">Constraints</CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6"><Upload className="h-3 w-3" /></Button>
              <Button variant="ghost" size="icon" className="h-6 w-6"><Download className="h-3 w-3" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border/50">
                  {["S.No.", "Constraint Name", "Maximum Capital", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {constraints.length === 0 ? (
                  <tr><td colSpan={5} className="px-2 py-6 text-center text-muted-foreground text-[10px]">No constraints added</td></tr>
                ) : (
                  constraints.map((c, i) => (
                    <tr key={c.id} className="border-b border-border/30">
                      <td className="px-2 py-1.5 text-[10px]">{i + 1}</td>
                      <td className="px-2 py-1.5 text-[10px] font-medium">{c.name}</td>
                      <td className="px-2 py-1.5">
                        <div className="flex gap-1 flex-wrap">
                          {Object.entries(c.params || {}).map(([key, val]) => (
                            <div key={key} className="flex items-center gap-0.5">
                              <span className="text-[8px] text-muted-foreground">{key.replace(/_/g, " ")}:</span>
                              <Input
                                value={val}
                                onChange={(e) => {
                                  setConstraints(constraints.map(x =>
                                    x.id === c.id ? { ...x, params: { ...x.params, [key]: e.target.value } } : x
                                  ));
                                }}
                                className="h-5 w-16 text-[9px] px-1"
                                placeholder="value"
                              />
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-1.5"><Badge variant={c.status === "active" ? "default" : "secondary"} className="text-[9px]">{c.status}</Badge></td>
                      <td className="px-2 py-1.5 flex gap-1">
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => setConstraints(constraints.filter((x) => x.id !== c.id))}><Trash2 className="h-2.5 w-2.5" /></Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <Dialog open={showConstraintDialog} onOpenChange={setShowConstraintDialog}>
              <DialogTrigger>
                <Button variant="outline" size="sm" className="mt-3 gap-1.5">
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Choose Constraint Option</DialogTitle>
                </DialogHeader>
                <Select value={selectedConstraintType} onValueChange={(v) => { if (typeof v === "string") setSelectedConstraintType(v); }}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {CONSTRAINT_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={addConstraint} disabled={!selectedConstraintType}>Add Constraint</Button>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Objectives */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm">Objectives</CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6"><Upload className="h-3 w-3" /></Button>
              <Button variant="ghost" size="icon" className="h-6 w-6"><Download className="h-3 w-3" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border/50">
                  {["S.No.", "Objective Name", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {objectives.length === 0 ? (
                  <tr><td colSpan={4} className="px-2 py-6 text-center text-muted-foreground text-[10px]">No records</td></tr>
                ) : (
                  objectives.map((o, i) => (
                    <tr key={o.id} className="border-b border-border/30">
                      <td className="px-2 py-1.5 text-[10px]">{i + 1}</td>
                      <td className="px-2 py-1.5 text-[10px] font-medium">
                        {o.name}
                        <div className="flex gap-1 flex-wrap mt-1">
                          {Object.entries(o.params || {}).map(([key, val]) => (
                            <div key={key} className="flex items-center gap-0.5">
                              <span className="text-[8px] text-muted-foreground">{key.replace(/_/g, " ")}:</span>
                              <Input
                                value={val}
                                onChange={(e) => {
                                  setObjectives(objectives.map(x =>
                                    x.id === o.id ? { ...x, params: { ...x.params, [key]: e.target.value } } : x
                                  ));
                                }}
                                className="h-5 w-16 text-[9px] px-1"
                                placeholder="value"
                              />
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-1.5"><Badge variant="default" className="text-[9px]">{o.status}</Badge></td>
                      <td className="px-2 py-1.5">
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => setObjectives(objectives.filter((x) => x.id !== o.id))}><Trash2 className="h-2.5 w-2.5" /></Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <Dialog open={showObjectiveDialog} onOpenChange={setShowObjectiveDialog}>
              <DialogTrigger>
                <Button variant="outline" size="sm" className="mt-3 gap-1.5">
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Choose Objective Option</DialogTitle>
                </DialogHeader>
                <Select value={selectedObjectiveType} onValueChange={(v) => { if (typeof v === "string") setSelectedObjectiveType(v); }}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {OBJECTIVE_TYPES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={addObjective} disabled={!selectedObjectiveType}>Add Objective</Button>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* Backtest Results */}
      {backtestResults && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Backtest Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-sm mb-4">
              {[
                ["Total Return", `${(backtestResults as Record<string,unknown>).total_return}%`],
                ["CAGR", `${(backtestResults as Record<string,unknown>).cagr}%`],
                ["Sharpe", `${(backtestResults as Record<string,unknown>).sharpe_ratio}`],
                ["Max DD", `${(backtestResults as Record<string,unknown>).max_drawdown}%`],
                ["Trades", `${(backtestResults as Record<string,unknown>).total_trades}`],
                ["Final Value", formatCurrencyCompact(Number((backtestResults as Record<string,unknown>).final_value), "INR")],
              ].map(([label, val]) => (
                <div key={label as string} className="bg-muted/30 rounded-lg p-2">
                  <div className="text-[10px] text-muted-foreground">{label}</div>
                  <div className="text-sm font-bold tabular-nums">{val}</div>
                </div>
              ))}
            </div>
            {/* Benchmark comparison metrics */}
            {backtestResults && (backtestResults.benchmark_return !== null && backtestResults.benchmark_return !== undefined) && (
              <div className="grid grid-cols-3 gap-2 p-3 bg-muted/20 rounded-lg border border-border/30">
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground">Your Strategy</div>
                  <div className={`text-sm font-bold ${Number(backtestResults.total_return) >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {Number(backtestResults.total_return) >= 0 ? "+" : ""}{String(backtestResults.total_return)}%
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground">Alpha (vs Benchmark)</div>
                  <div className={`text-sm font-bold ${Number(backtestResults.alpha) >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {Number(backtestResults.alpha) >= 0 ? "+" : ""}{String(backtestResults.alpha)}%
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground">{lastBacktestBenchmark}</div>
                  <div className={`text-sm font-bold ${Number(backtestResults.benchmark_return) >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {Number(backtestResults.benchmark_return) >= 0 ? "+" : ""}{String(backtestResults.benchmark_return)}%
                  </div>
                </div>
              </div>
            )}

            {backtestEquity.length > 0 && (
              <TimeSeriesChart
                data={backtestEquity.map((e, i) => ({
                  date: String(e.date),
                  value: Number(e.value),
                  benchmark: benchmarkCurve[i] ? Number(benchmarkCurve[i].value) : undefined,
                }))}
                series={[
                  { key: "value", name: "Your Strategy", color: "#f97316" },
                  ...(benchmarkCurve.length > 0 ? [{ key: "benchmark", name: lastBacktestBenchmark, color: "#6366f1" }] : []),
                ]}
                height={200}
                yFormatter={(v) => formatCurrencyCompact(v, "INR")}
              />
            )}

            {/* Rebalance History with Weights */}
            {backtestRebalances.length > 0 && (
              <div className="mt-4 space-y-3">
                <div className="text-sm font-semibold">Rebalance History</div>

                {/* Rebalance summary */}
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-border/50">
                        {["Date", "Value", "Positions", "Turnover", "Trades"].map((h) => (
                          <th key={h} className="px-2 py-1.5 text-left text-muted-foreground font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {backtestRebalances.map((r, i) => (
                        <tr key={i} className="border-b border-border/30 hover:bg-muted/10">
                          <td className="px-2 py-1 font-medium">{String(r.date)}</td>
                          <td className="px-2 py-1 tabular-nums">{formatCurrencyCompact(Number(r.value), "INR")}</td>
                          <td className="px-2 py-1 tabular-nums">{String(r.positions)}</td>
                          <td className="px-2 py-1 tabular-nums">{String(r.turnover)}%</td>
                          <td className="px-2 py-1 tabular-nums">{String(r.trades)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Latest rebalance weights */}
                {(() => {
                  const latest = backtestRebalances[backtestRebalances.length - 1];
                  const weights = latest?.weights as Record<string, number> | undefined;
                  if (!weights || Object.keys(weights).length === 0) return null;
                  return (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="px-3 py-1.5 bg-muted/30 text-[11px] font-semibold">
                        Latest Portfolio Weights ({String(latest.date)})
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                        <table className="w-full text-[10px]">
                          <thead>
                            <tr className="border-b border-border/50">
                              <th className="px-3 py-1.5 text-left text-muted-foreground">#</th>
                              <th className="px-3 py-1.5 text-left text-muted-foreground">Symbol</th>
                              <th className="px-3 py-1.5 text-right text-muted-foreground">Weight</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(weights)
                              .sort(([, a], [, b]) => b - a)
                              .map(([sym, w], i) => (
                                <tr key={sym} className="border-b border-border/30 hover:bg-muted/10">
                                  <td className="px-3 py-1 text-muted-foreground">{i + 1}</td>
                                  <td className="px-3 py-1 font-medium">{sym}</td>
                                  <td className="px-3 py-1 text-right tabular-nums">{(w * 100).toFixed(2)}%</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Selected Analytics Factors */}
      {(selectedUserFactors.length > 0 || selectedScreenerFactors.length > 0) && (
        <div className="flex flex-wrap gap-1 items-center">
          <span className="text-[9px] text-muted-foreground mr-1">Analytics Factors:</span>
          {selectedUserFactors.map(f => (
            <Badge key={f} variant="outline" className="text-[8px] gap-0.5 px-1 py-0">
              {f}
            </Badge>
          ))}
          {selectedScreenerFactors.map(f => (
            <Badge key={f} variant="outline" className="text-[8px] gap-0.5 px-1 py-0 border-blue-500/30">
              {f}
            </Badge>
          ))}
        </div>
      )}

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-between border-t pt-3">
        <div className="text-xs text-muted-foreground">
          Backtest Credits: <span className="font-medium text-foreground">22 / 71</span>
        </div>
        <div className="flex gap-2">
          {/* Additional Analytics Dialog */}
          <Dialog open={showBacktestDialog} onOpenChange={setShowBacktestDialog}>
            <DialogTrigger>
              <Button variant="outline" size="sm">Additional Analytics</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Additional Analytics</DialogTitle></DialogHeader>

              {/* Selected chips */}
              {(selectedUserFactors.length > 0 || selectedScreenerFactors.length > 0) && (
                <div className="flex flex-wrap gap-1 pb-1 border-b border-border/50">
                  {[...selectedUserFactors, ...selectedScreenerFactors].map((f) => (
                    <button key={f}
                      onClick={() => {
                        toggleFactor(selectedUserFactors, setSelectedUserFactors, f);
                        toggleFactor(selectedScreenerFactors, setSelectedScreenerFactors, f);
                      }}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400 text-[10px] hover:bg-red-600/20 hover:text-red-400 transition-colors">
                      {f} <X className="h-2.5 w-2.5" />
                    </button>
                  ))}
                </div>
              )}

              {/* Single search */}
              <div className="flex items-center gap-2 border border-input rounded-md px-2.5 h-8 bg-background focus-within:ring-1 focus-within:ring-ring">
                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input
                  placeholder="Search factors..."
                  className="flex-1 h-full text-xs bg-transparent outline-none border-0 p-0 placeholder:text-muted-foreground"
                  value={userFactorSearch}
                  onChange={(e) => { setUserFactorSearch(e.target.value); setScreenerFactorSearch(e.target.value); }}
                />
              </div>

              {/* Two columns */}
              <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[48vh]">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Alpha Factors</p>
                  <div className="space-y-0.5">
                    {filteredUserFactors.map((f) => (
                      <label key={f} className={`flex items-center gap-2 text-[11px] cursor-pointer rounded px-1.5 py-1 transition-colors ${selectedUserFactors.includes(f) ? "bg-blue-600/15 text-blue-300" : "hover:bg-muted/50"}`}>
                        <Checkbox checked={selectedUserFactors.includes(f)}
                          onCheckedChange={() => toggleFactor(selectedUserFactors, setSelectedUserFactors, f)} />
                        {f}
                      </label>
                    ))}
                    {filteredUserFactors.length === 0 && <p className="text-[10px] text-muted-foreground py-2 px-1">No matches</p>}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Screener Factors</p>
                  <div className="space-y-0.5">
                    {filteredScreenerFactors.map((f) => (
                      <label key={f} className={`flex items-center gap-2 text-[11px] cursor-pointer rounded px-1.5 py-1 transition-colors ${selectedScreenerFactors.includes(f) ? "bg-blue-600/15 text-blue-300" : "hover:bg-muted/50"}`}>
                        <Checkbox checked={selectedScreenerFactors.includes(f)}
                          onCheckedChange={() => toggleFactor(selectedScreenerFactors, setSelectedScreenerFactors, f)} />
                        {f}
                      </label>
                    ))}
                    {filteredScreenerFactors.length === 0 && <p className="text-[10px] text-muted-foreground py-2 px-1">No matches</p>}
                  </div>
                </div>
              </div>

              <Button size="sm" className="w-full" onClick={() => setShowBacktestDialog(false)}>
                Done {(selectedUserFactors.length + selectedScreenerFactors.length) > 0 && `(${selectedUserFactors.length + selectedScreenerFactors.length} selected)`}
              </Button>
            </DialogContent>
          </Dialog>

          {/* Configure Backtest Dialog */}
          <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
            <DialogTrigger>
              <Button variant="outline" size="sm">Configure Backtest</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Backtest Configuration</DialogTitle></DialogHeader>
              <div className="space-y-4">
                {/* Date range */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Start Date *</Label>
                    <Input type="date" value={btStartDate} onChange={(e) => setBtStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">End Date *</Label>
                    <Input type="date" value={btEndDate} onChange={(e) => setBtEndDate(e.target.value)} />
                  </div>
                </div>

                {/* Rebalance Schedule Tabs */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Rebalance Schedule</Label>
                  <Tabs defaultValue="regular" value={configTab} onValueChange={(v) => { if (v != null) setConfigTab(v); }}>
                    <TabsList>
                      <TabsTrigger value="regular">Regular Interval</TabsTrigger>
                      <TabsTrigger value="specified">Specified Dates</TabsTrigger>
                    </TabsList>
                    <TabsContent value="regular">
                      <div className="space-y-1.5 pt-2">
                        <Label className="text-xs">Rebalance Frequency</Label>
                        <Select value={btFrequency} onValueChange={(v) => { if (typeof v === "string") setBtFrequency(v); }}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Weekly">Weekly</SelectItem>
                            <SelectItem value="Monthly">Monthly</SelectItem>
                            <SelectItem value="Quarterly">Quarterly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TabsContent>
                    <TabsContent value="specified">
                      <div className="space-y-1.5 pt-2">
                        <Label className="text-xs">Enter comma-separated dates (YYYY-MM-DD)</Label>
                        <textarea
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          placeholder="2025-07-01, 2025-08-01, 2025-09-01"
                          value={specifiedDates}
                          onChange={(e) => setSpecifiedDates(e.target.value)}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Weight Method */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Weight Method</Label>
                  <Select value={btMethod} onValueChange={(v) => { if (typeof v === "string") setBtMethod(v); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equal">Equal Weight</SelectItem>
                      <SelectItem value="momentum">Momentum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Stop Loss Section */}
                <Collapsible open={stopLossOpen} onOpenChange={setStopLossOpen}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-xs font-semibold hover:bg-muted/50 transition-colors">
                    Stop Loss
                    <ChevronDown className={`h-4 w-4 transition-transform ${stopLossOpen ? "rotate-180" : ""}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-3 pt-2 pl-2">
                      {/* Total Stop Loss */}
                      <Collapsible open={totalStopLossOpen} onOpenChange={setTotalStopLossOpen}>
                        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted/50 transition-colors">
                          Total Stop Loss
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${totalStopLossOpen ? "rotate-180" : ""}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="grid grid-cols-3 gap-2 pt-2 px-1">
                            <div className="space-y-1">
                              <Label className="text-[10px]">Stop Loss (%)</Label>
                              <Input type="number" className="h-7 text-xs" placeholder="e.g. 10" value={totalStopLossPct} onChange={(e) => setTotalStopLossPct(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px]">% of Portfolio</Label>
                              <Input type="number" className="h-7 text-xs" placeholder="e.g. 100" value={totalStopLossPortfolioPct} onChange={(e) => setTotalStopLossPortfolioPct(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px]">Days to Exclude</Label>
                              <Input type="number" className="h-7 text-xs" placeholder="e.g. 5" value={totalStopLossDays} onChange={(e) => setTotalStopLossDays(e.target.value)} />
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      {/* Residual Stop Loss */}
                      <Collapsible open={residualStopLossOpen} onOpenChange={setResidualStopLossOpen}>
                        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted/50 transition-colors">
                          Residual Stop Loss
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${residualStopLossOpen ? "rotate-180" : ""}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="grid grid-cols-3 gap-2 pt-2 px-1">
                            <div className="space-y-1">
                              <Label className="text-[10px]">Stop Loss (%)</Label>
                              <Input type="number" className="h-7 text-xs" placeholder="e.g. 10" value={residualStopLossPct} onChange={(e) => setResidualStopLossPct(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px]">% of Portfolio</Label>
                              <Input type="number" className="h-7 text-xs" placeholder="e.g. 100" value={residualStopLossPortfolioPct} onChange={(e) => setResidualStopLossPortfolioPct(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px]">Days to Exclude</Label>
                              <Input type="number" className="h-7 text-xs" placeholder="e.g. 5" value={residualStopLossDays} onChange={(e) => setResidualStopLossDays(e.target.value)} />
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Burn-in and Chunking Section */}
                <Collapsible open={burnInOpen} onOpenChange={setBurnInOpen}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-xs font-semibold hover:bg-muted/50 transition-colors">
                    Burn-in and Chunking
                    <ChevronDown className={`h-4 w-4 transition-transform ${burnInOpen ? "rotate-180" : ""}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="grid grid-cols-3 gap-2 pt-2 px-1">
                      <div className="space-y-1">
                        <Label className="text-[10px]">Max Chunks</Label>
                        <Input type="number" className="h-7 text-xs" value={maxChunks} onChange={(e) => setMaxChunks(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Min Rebalance/Chunk</Label>
                        <Input type="number" className="h-7 text-xs" value={minRebalancePerChunk} onChange={(e) => setMinRebalancePerChunk(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Burn-in Rebalances</Label>
                        <Input type="number" className="h-7 text-xs" value={burnInRebalances} onChange={(e) => setBurnInRebalances(e.target.value)} />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {backtestError && (
                  <div className="text-red-400 text-xs p-2 border border-red-500/30 rounded bg-red-500/10">{backtestError}</div>
                )}
                <Button onClick={runBacktest} disabled={backtestLoading} className="w-full bg-blue-600 hover:bg-blue-700 gap-1.5">
                  {backtestLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Run Full Backtest
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 gap-1.5"
            onClick={runOneDayResults}
            disabled={oneDayLoading}
          >
            {oneDayLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Compute 1-Day Results
          </Button>
        </div>
      </div>

      {/* Optimization Results */}
      {oneDayResults && (
        <div className="space-y-3">
          <div className="flex items-center gap-4 border rounded-lg px-4 py-2 bg-muted/20 text-sm">
            <span className="text-xs font-semibold text-muted-foreground">Optimizer Output:</span>
            <div className="flex gap-4">
              <span className="text-xs">Exp. Return: <span className="font-bold tabular-nums text-emerald-400">{String(oneDayResults.total_return)}%</span></span>
              <span className="text-xs">Exp. Risk: <span className="font-bold tabular-nums">{String(oneDayResults.expected_risk ?? "—")}%</span></span>
              <span className="text-xs">Sharpe: <span className="font-bold tabular-nums">{String(oneDayResults.sharpe_ratio)}</span></span>
              <span className="text-xs">Positions: <span className="font-bold tabular-nums">{String(oneDayResults.total_trades)}</span></span>
            </div>
          </div>

          {oneDayResults.weights != null && typeof oneDayResults.weights === "object" ? (
            <div className="border rounded-lg overflow-hidden">
              <div className="px-3 py-1.5 bg-muted/30 text-[11px] font-semibold">Optimal Portfolio Weights</div>
              <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="px-3 py-1.5 text-left text-muted-foreground">#</th>
                      <th className="px-3 py-1.5 text-left text-muted-foreground">Symbol</th>
                      <th className="px-3 py-1.5 text-right text-muted-foreground">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(oneDayResults.weights as Record<string, number>)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .map(([sym, w], i) => (
                        <tr key={sym} className="border-b border-border/30 hover:bg-muted/10">
                          <td className="px-3 py-1 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-1 font-medium">{sym}</td>
                          <td className="px-3 py-1 text-right tabular-nums">{((w as number) * 100).toFixed(2)}%</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
