"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { SymbolMultiSelect } from "@/components/SymbolMultiSelect";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { BarChartPanel } from "@/components/charts/BarChartPanel";
import { ExportButton } from "@/components/ExportButton";
import { Loader2, Plus, Trash2, PieChart, TrendingUp, Shield, Target } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

const OBJECTIVES = [
  { value: "minimize_risk", label: "Minimize Risk", icon: Shield, desc: "Minimize portfolio variance (w'Σw)" },
  { value: "maximize_return", label: "Maximize Return", icon: TrendingUp, desc: "Maximize expected return (w'μ)" },
  { value: "maximize_sharpe", label: "Maximize Sharpe", icon: Target, desc: "Maximize risk-adjusted return" },
  { value: "minimize_tracking_error", label: "Min Tracking Error", icon: PieChart, desc: "Minimize tracking error vs benchmark" },
];

const CONSTRAINT_TYPES = [
  { value: "position_size_bound", label: "Position Size Bound", fields: ["min_weight", "max_weight"] },
  { value: "max_positions", label: "Max Positions", fields: ["max_positions"] },
  { value: "beta_exposure", label: "Beta Exposure", fields: ["min_beta", "max_beta"] },
  { value: "turnover", label: "Max Turnover", fields: ["max_turnover"] },
  { value: "sector_constraint", label: "Sector Weight", fields: ["sector", "min_weight", "max_weight"] },
];

interface Constraint {
  id: number;
  type: string;
  params: Record<string, string>;
}

interface OptResult {
  weights: Record<string, number>;
  expected_return: number;
  expected_risk: number;
  sharpe_ratio: number;
  n_positions: number;
  turnover: number;
  status: string;
}

interface FrontierPoint {
  expected_return: number;
  expected_risk: number;
  sharpe_ratio: number;
  n_positions: number;
}

// Default Indian stocks
const DEFAULT_SYMBOLS = [
  "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
  "HINDUNILVR.NS", "BHARTIARTL.NS", "ITC.NS", "SBIN.NS", "LT.NS",
  "BAJFINANCE.NS", "MARUTI.NS", "HCLTECH.NS", "AXISBANK.NS", "TATAMOTORS.NS",
];

const UNIVERSES = ["NIFTY 50", "NIFTY 100", "NIFTY NEXT 50", "NIFTY 500", "Custom"];

export default function OptimizerPage() {
  const [universe, setUniverse] = useState("NIFTY 50");
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMBOLS.slice(0, 8));
  const [objective, setObjective] = useState("minimize_risk");
  const [constraints, setConstraints] = useState<Constraint[]>([
    { id: 1, type: "position_size_bound", params: { min_weight: "0.02", max_weight: "0.25" } },
  ]);
  const [showAddConstraint, setShowAddConstraint] = useState(false);
  const [newConstraintType, setNewConstraintType] = useState("");
  const [result, setResult] = useState<OptResult | null>(null);
  const [frontier, setFrontier] = useState<FrontierPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [frontierLoading, setFrontierLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runOptimization() {
    if (symbols.length < 2) {
      setError("Select at least 2 symbols");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Validate all constraint values are numeric
      for (const c of constraints) {
        for (const [key, val] of Object.entries(c.params)) {
          if (key === "sector") continue;
          if (val && isNaN(Number(val))) {
            setError(`Invalid value "${val}" in ${c.type} → ${key}. Must be a number.`);
            setLoading(false);
            return;
          }
        }
      }

      // Map constraints to backend format
      const mappedConstraints = constraints.map(c => {
        const flat: Record<string, unknown> = { type: c.type };
        const p = c.params;
        if (c.type === "position_size_bound") {
          flat.min = Number(p.min_weight) || 0;
          flat.max = Number(p.max_weight) || 1;
        } else if (c.type === "max_positions") {
          flat.value = Number(p.max_positions) || 10;
        } else if (c.type === "beta_exposure") {
          flat.lower = Number(p.min_beta) || 0;
          flat.upper = Number(p.max_beta) || 2;
        } else if (c.type === "turnover") {
          flat.value = Number(p.max_turnover) || 0.5;
        } else if (c.type === "sector_constraint") {
          flat.sector = p.sector || "";
          flat.min = Number(p.min_weight) || 0;
          flat.max = Number(p.max_weight) || 1;
        }
        return flat;
      });

      // Use smart endpoint — computes real returns/covariance from DB prices
      const payload: Record<string, unknown> = {
        objective,
        constraints: mappedConstraints,
      };
      if (universe === "Custom") {
        payload.symbols = symbols;
      } else {
        payload.universe = universe;
      }

      const res = await fetch(`${API_BASE}/api/optimize/smart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Optimization failed");
      }

      const data = await res.json();
      if (data.status === "infeasible" || data.n_positions === 0) {
        throw new Error("Infeasible — constraints are too tight. Try lowering min_weight, reducing positions, or relaxing other constraints.");
      }
      setResult(data);
      setFrontier([]);

    } catch (e) {
      setError(e instanceof Error ? e.message : "Optimization failed");
    }
    setLoading(false);
  }

  function addConstraint() {
    if (!newConstraintType) return;
    const ct = CONSTRAINT_TYPES.find(c => c.value === newConstraintType);
    if (!ct) return;
    const params: Record<string, string> = {};
    ct.fields.forEach(f => { params[f] = ""; });
    setConstraints([...constraints, { id: Date.now(), type: newConstraintType, params }]);
    setShowAddConstraint(false);
    setNewConstraintType("");
  }

  const weightData = result
    ? Object.entries(result.weights)
        .filter(([, w]) => w > 0.001)
        .sort((a, b) => b[1] - a[1])
        .map(([sym, w]) => ({ name: sym.replace(".NS", ""), value: w * 100 }))
    : [];

  const exportData = result
    ? Object.entries(result.weights).map(([sym, w]) => ({
        Symbol: sym,
        Weight: `${(w * 100).toFixed(2)}%`,
      }))
    : [];

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Portfolio Optimizer</h1>
        <p className="text-xs text-muted-foreground">Mean-variance optimization with CVXPY — 4 objectives, 8 constraint types</p>
      </div>

      {/* Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Universe */}
        <Card className="lg:col-span-2 overflow-visible">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Stock Universe</CardTitle>
          </CardHeader>
          <CardContent className="overflow-visible space-y-3">
            <div className="flex gap-1.5 flex-wrap">
              {UNIVERSES.map((u) => (
                <Button
                  key={u}
                  variant="outline"
                  size="sm"
                  className={`h-7 text-[10px] transition-all ${universe === u ? "border-2 border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]" : ""}`}
                  onClick={() => setUniverse(u)}
                >
                  {u}
                </Button>
              ))}
            </div>
            {universe === "Custom" ? (
              <SymbolMultiSelect value={symbols} onChange={setSymbols} max={30} placeholder="Add stocks to optimize..." />
            ) : (
              <p className="text-[10px] text-muted-foreground">
                Optimizing across all {universe} stocks using real historical price data.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Objective */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Objective</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {OBJECTIVES.map((obj) => {
              const Icon = obj.icon;
              return (
                <button
                  key={obj.value}
                  onClick={() => setObjective(obj.value)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                    objective === obj.value
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-border hover:border-border/80 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">{obj.label}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-0.5 ml-5">{obj.desc}</p>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Constraints */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm">Constraints</CardTitle>
          <Dialog open={showAddConstraint} onOpenChange={setShowAddConstraint}>
            <DialogTrigger>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Plus className="h-3 w-3" /> Add Constraint
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Constraint</DialogTitle></DialogHeader>
              <Select value={newConstraintType} onValueChange={(v) => { if (typeof v === "string") setNewConstraintType(v); }}>
                <SelectTrigger><SelectValue placeholder="Select constraint type" /></SelectTrigger>
                <SelectContent>
                  {CONSTRAINT_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={addConstraint} disabled={!newConstraintType}>Add</Button>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {constraints.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No constraints. Add one above.</p>
          ) : (
            <div className="space-y-2">
              {constraints.map((c) => {
                const ct = CONSTRAINT_TYPES.find(x => x.value === c.type);
                return (
                  <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg border bg-muted/20">
                    <Badge variant="outline" className="text-[9px] shrink-0">{ct?.label || c.type}</Badge>
                    <div className="flex gap-2 flex-1 flex-wrap">
                      {Object.entries(c.params).map(([key, val]) => (
                        <div key={key} className="flex items-center gap-1">
                          <span className="text-[9px] text-muted-foreground">{key}:</span>
                          <Input
                            value={val}
                            onChange={(e) => {
                              setConstraints(constraints.map(x =>
                                x.id === c.id ? { ...x, params: { ...x.params, [key]: e.target.value } } : x
                              ));
                            }}
                            className="h-6 w-20 text-[10px]"
                            placeholder="value"
                          />
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive shrink-0"
                      onClick={() => setConstraints(constraints.filter(x => x.id !== c.id))}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Run Button */}
      <div className="flex justify-center">
        <Button
          onClick={runOptimization}
          disabled={loading || symbols.length < 2}
          size="lg"
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 px-8"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
          {loading ? "Optimizing..." : "Run Optimization"}
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-3 text-destructive text-sm">{error}</CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Status */}
          <div className="flex items-center gap-3">
            <Badge className={result.status === "optimal" ? "bg-emerald-600" : "bg-red-600"}>
              {result.status.toUpperCase()}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {result.n_positions} positions • Expected Return: {(result.expected_return * 100).toFixed(2)}% •
              Risk: {(result.expected_risk * 100).toFixed(2)}% • Sharpe: {result.sharpe_ratio}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Metrics */}
            <Card>
              <CardHeader className="pb-2 flex-row items-center justify-between">
                <CardTitle className="text-sm">Optimization Result</CardTitle>
                <ExportButton data={exportData} filename="portfolio_weights" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[
                    ["Expected Return", `${(result.expected_return * 100).toFixed(2)}%`],
                    ["Expected Risk", `${(result.expected_risk * 100).toFixed(2)}%`],
                    ["Sharpe Ratio", result.sharpe_ratio.toFixed(3)],
                    ["Positions", result.n_positions],
                  ].map(([label, val]) => (
                    <div key={String(label)} className="bg-muted/30 rounded-lg p-2">
                      <div className="text-[9px] text-muted-foreground">{String(label)}</div>
                      <div className="text-sm font-bold tabular-nums">{String(val)}</div>
                    </div>
                  ))}
                </div>

                {/* Weights Table */}
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="px-2 py-1.5 text-left text-muted-foreground font-medium">Symbol</th>
                      <th className="px-2 py-1.5 text-right text-muted-foreground font-medium">Weight</th>
                      <th className="px-2 py-1.5 text-left text-muted-foreground font-medium">Allocation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(result.weights)
                      .filter(([, w]) => w > 0.001)
                      .sort((a, b) => b[1] - a[1])
                      .map(([sym, w]) => (
                        <tr key={sym} className="border-b border-border/30 hover:bg-muted/20">
                          <td className="px-2 py-1.5 font-medium">{sym.replace(".NS", "")}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{(w * 100).toFixed(2)}%</td>
                          <td className="px-2 py-1.5">
                            <div className="h-2 bg-muted rounded-full overflow-hidden w-24">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${w * 100 * 4}%` }} />
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Weight Distribution Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Weight Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChartPanel
                  data={weightData}
                  height={300}
                  color="#10b981"
                  showNegativeColors={false}
                />
              </CardContent>
            </Card>
          </div>

          {/* Efficient Frontier */}
          {frontier.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Efficient Frontier</CardTitle>
              </CardHeader>
              <CardContent>
                <TimeSeriesChart
                  data={frontier.map((p, i) => ({
                    date: `${(p.expected_risk * 100).toFixed(1)}%`,
                    return: p.expected_return * 100,
                  }))}
                  xKey="date"
                  series={[{ key: "return", name: "Expected Return (%)", color: "#f97316" }]}
                  height={250}
                  yFormatter={(v) => `${v.toFixed(1)}%`}
                />
                <div className="text-center text-[9px] text-muted-foreground mt-1">
                  Risk (%) →
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
