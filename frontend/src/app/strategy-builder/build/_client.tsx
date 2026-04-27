"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { Loader2, Plus, Upload, Download, Trash2, Pencil, ChevronDown, Search } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { usePortfolio } from "@/lib/portfolio-context";

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

export default function BuildStrategyPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const { token } = useAuth();
  const { selectPortfolio } = usePortfolio();
  const [fundName, setFundName] = useState("");
  const [backtestError, setBacktestError] = useState<string | null>(null);
  const [schemeName, setSchemeName] = useState("");
  const [iterationName, setIterationName] = useState("");
  const [universe, setUniverse] = useState("");
  const [benchmark, setBenchmark] = useState("");
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
  const [backtestRebalances, setBacktestRebalances] = useState<Record<string, unknown>[]>([]);

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
        universe: universe || "NIFTY 50",
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
      const res = await fetch(`${API_BASE}/api/backtest/run`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          strategy_id: strategyId,
          universe: universe || "NIFTY 50",
          start_date: btStartDate,
          end_date: btEndDate,
          rebalance_frequency: btFrequency,
          weight_method: "optimizer",
          optimizer_objective: optObjective,
          optimizer_constraints: mappedConstraints,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Backtest failed" }));
        throw new Error(typeof err.detail === "string" ? err.detail : "Backtest failed. Make sure data is ingested.");
      }
      const data = await res.json();
      setBacktestResults(data.metrics);
      setBacktestEquity(data.equity_curve || []);
      setBacktestRebalances(data.rebalances || []);
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
          <Select value={universe} onValueChange={(v) => { if (typeof v === "string") setUniverse(v); }}>
            <SelectTrigger className="h-7 w-[180px] border-0 text-xs"><SelectValue placeholder="Select A Universe" /></SelectTrigger>
            <SelectContent>
              <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground">Standard</div>
              {STANDARD_UNIVERSES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground mt-1">Screener</div>
              <SelectItem value="custom_screen">Custom Screener...</SelectItem>
            </SelectContent>
          </Select>
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
                ["Final Value", `\u20B9${(Number((backtestResults as Record<string,unknown>).final_value) / 1e7).toFixed(2)} Cr`],
              ].map(([label, val]) => (
                <div key={label as string} className="bg-muted/30 rounded-lg p-2">
                  <div className="text-[10px] text-muted-foreground">{label}</div>
                  <div className="text-sm font-bold tabular-nums">{val}</div>
                </div>
              ))}
            </div>
            {backtestEquity.length > 0 && (
              <TimeSeriesChart
                data={backtestEquity.map(e => ({ date: String(e.date), value: Number(e.value) / 1e7 }))}
                series={[{ key: "value", name: "Portfolio (\u20B9 Cr)", color: "#f97316" }]}
                height={200}
                yFormatter={(v) => `${v.toFixed(2)}Cr`}
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
                          <td className="px-2 py-1 tabular-nums">{`₹${(Number(r.value) / 1e7).toFixed(2)} Cr`}</td>
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
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Additional Analytics</DialogTitle></DialogHeader>
              <p className="text-xs text-muted-foreground mb-3">Select user created and screener factors for additional analytics.</p>

              {/* User Created Factors */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">User created factors</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search factors..."
                    className="h-8 pl-7 text-xs"
                    value={userFactorSearch}
                    onChange={(e) => setUserFactorSearch(e.target.value)}
                  />
                </div>
                <div className="border rounded-md p-2 max-h-36 overflow-y-auto space-y-1">
                  {filteredUserFactors.map((f) => (
                    <label key={f} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5">
                      <Checkbox
                        checked={selectedUserFactors.includes(f)}
                        onCheckedChange={() => toggleFactor(selectedUserFactors, setSelectedUserFactors, f)}
                      />
                      {f}
                    </label>
                  ))}
                  {filteredUserFactors.length === 0 && (
                    <p className="text-[10px] text-muted-foreground text-center py-2">No matching factors</p>
                  )}
                </div>
                {selectedUserFactors.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedUserFactors.map((f) => (
                      <Badge key={f} variant="secondary" className="text-[9px] gap-1 cursor-pointer" onClick={() => toggleFactor(selectedUserFactors, setSelectedUserFactors, f)}>
                        {f} x
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Screener Factors */}
              <div className="space-y-2 mt-4">
                <Label className="text-xs font-semibold">Screener factors</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search factors..."
                    className="h-8 pl-7 text-xs"
                    value={screenerFactorSearch}
                    onChange={(e) => setScreenerFactorSearch(e.target.value)}
                  />
                </div>
                <div className="border rounded-md p-2 max-h-36 overflow-y-auto space-y-1">
                  {filteredScreenerFactors.map((f) => (
                    <label key={f} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5">
                      <Checkbox
                        checked={selectedScreenerFactors.includes(f)}
                        onCheckedChange={() => toggleFactor(selectedScreenerFactors, setSelectedScreenerFactors, f)}
                      />
                      {f}
                    </label>
                  ))}
                  {filteredScreenerFactors.length === 0 && (
                    <p className="text-[10px] text-muted-foreground text-center py-2">No matching factors</p>
                  )}
                </div>
                {selectedScreenerFactors.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedScreenerFactors.map((f) => (
                      <Badge key={f} variant="secondary" className="text-[9px] gap-1 cursor-pointer" onClick={() => toggleFactor(selectedScreenerFactors, setSelectedScreenerFactors, f)}>
                        {f} x
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Button size="sm" className="mt-4 w-full" onClick={() => setShowBacktestDialog(false)}>
                Done ({selectedUserFactors.length + selectedScreenerFactors.length} selected)
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
