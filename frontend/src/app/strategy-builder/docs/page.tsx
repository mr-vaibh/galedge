"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Copy, Check } from "lucide-react";

const CONSTRAINTS = [
  {
    name: "Position Size Bound",
    type: "position_size_bound",
    description: "Sets a floor and ceiling on how much of the portfolio any single stock can hold. Prevents over-concentration and ensures minimum diversification.",
    why: "Without this, the optimizer may put 80%+ in one stock if it has the best risk-adjusted return. Typical range: 2%–10% per position.",
    params: [
      { key: "min_weight", label: "Min Weight", example: "0.02", note: "Minimum allocation per stock (2%)" },
      { key: "max_weight", label: "Max Weight", example: "0.10", note: "Maximum allocation per stock (10%)" },
    ],
    example: { name: "Position Size Bound", type: "Position Size Bound", params: { min_weight: "0.02", max_weight: "0.10" }, status: "active" },
  },
  {
    name: "Maximum Number of Positions",
    type: "max_positions",
    description: "Caps the total number of stocks held at any one time. Forces the optimizer to concentrate in the highest-conviction names.",
    why: "Portfolios with 100+ positions often resemble the index. 15–30 positions gives meaningful active exposure while keeping transaction costs manageable.",
    params: [
      { key: "max_positions", label: "Max Positions", example: "20", note: "Maximum number of distinct holdings" },
    ],
    example: { name: "Maximum Number of Positions", type: "Maximum Number of Positions", params: { max_positions: "20" }, status: "active" },
  },
  {
    name: "Maximum Capital",
    type: "max_total_weight",
    description: "Limits the total allocated weight across all positions. Setting this below 1.0 keeps some cash in reserve.",
    why: "Useful if you want to hold 10% cash at all times (set max_capital: 0.9) or to simulate strategies that don't fully deploy capital.",
    params: [
      { key: "max_capital", label: "Max Capital", example: "0.95", note: "Fraction of portfolio to deploy (0–1)" },
    ],
    example: { name: "Maximum Capital", type: "Maximum Capital", params: { max_capital: "0.95" }, status: "active" },
  },
  {
    name: "Beta Exposure Constraint",
    type: "beta_exposure",
    description: "Keeps the portfolio's overall market sensitivity (beta) within a target band. Beta 1.0 = moves with market; <1.0 = defensive; >1.0 = aggressive.",
    why: "If you want a market-neutral strategy, target beta near 0. If you want a low-vol defensive portfolio, set max_beta: 0.8.",
    params: [
      { key: "min_beta", label: "Min Beta", example: "0.7", note: "Lower bound on portfolio beta" },
      { key: "max_beta", label: "Max Beta", example: "1.2", note: "Upper bound on portfolio beta" },
    ],
    example: { name: "Beta Exposure Constraint", type: "Beta Exposure Constraint", params: { min_beta: "0.7", max_beta: "1.2" }, status: "active" },
  },
  {
    name: "Portfolio Turnover Constraint",
    type: "turnover",
    description: "Limits how much of the portfolio is traded at each rebalance. High turnover = high transaction costs that eat into returns.",
    why: "At 30bps per trade (our default), turning over 100% monthly costs ~3.6% per year just in costs. Limiting turnover to 30–50% per rebalance can significantly improve net returns.",
    params: [
      { key: "max_turnover", label: "Max Turnover", example: "0.30", note: "Maximum portfolio traded per rebalance (30%)" },
    ],
    example: { name: "Portfolio Turnover Constraint", type: "Portfolio Turnover Constraint", params: { max_turnover: "0.30" }, status: "active" },
  },
  {
    name: "Minimum Position Size Constraint",
    type: "min_position_size",
    description: "Ensures every included stock has a minimum meaningful allocation. Prevents the optimizer from holding a stock at 0.1% — too small to matter.",
    why: "If a stock is worth holding, it should be held at a size that actually impacts returns. 1–3% minimum ensures every position counts.",
    params: [
      { key: "min_position_size", label: "Min Position Size", example: "0.01", note: "Minimum weight if a stock is included (1%)" },
    ],
    example: { name: "Minimum Position Size Constraint", type: "Minimum Position Size Constraint", params: { min_position_size: "0.01" }, status: "active" },
  },
  {
    name: "Portfolio Risk Budget Constraint",
    type: "risk_budget",
    description: "Sets a target for the portfolio's total annualised volatility. Forces the optimizer to stay within a risk envelope.",
    why: "If your mandate is 'low-risk income', cap volatility at 10%. If you're running an aggressive growth fund, you might allow up to 25%.",
    params: [
      { key: "risk_budget", label: "Risk Budget", example: "0.15", note: "Target annualised volatility (15%)" },
    ],
    example: { name: "Portfolio Risk Budget Constraint", type: "Portfolio Risk Budget Constraint", params: { risk_budget: "0.15" }, status: "active" },
  },
];

const OBJECTIVES = [
  {
    name: "Risk-Adjusted Return Objective",
    type: "maximize_sharpe",
    description: "Maximises the Sharpe ratio — return per unit of risk. The most common objective for long-only equity portfolios.",
    why: "A portfolio returning 20% with 30% volatility (Sharpe 0.67) is worse than one returning 15% with 12% volatility (Sharpe 1.25). Sharpe maximisation finds the best risk-return trade-off.",
    when: "Use for general-purpose portfolios where you want the best risk-adjusted outcome.",
    params: [
      { key: "weight", label: "Weight", example: "1", note: "Relative importance when combining multiple objectives" },
    ],
    example: { name: "Risk-Adjusted Return Objective", type: "Risk-Adjusted Return Objective", params: { weight: "1" }, status: "active" },
  },
  {
    name: "Risk Minimization Objective",
    type: "minimize_risk",
    description: "Finds the minimum variance portfolio — the allocation with the lowest possible volatility, regardless of return.",
    why: "Useful for capital preservation mandates, retiree portfolios, or when the universe is volatile and you want stability first.",
    when: "Use when drawdown protection matters more than maximising return. Often combined with a Position Size Bound constraint.",
    params: [
      { key: "risk_type", label: "Risk Type", example: "variance", note: "variance or std_dev" },
      { key: "weight", label: "Weight", example: "1", note: "Relative importance" },
    ],
    example: { name: "Risk Minimization Objective", type: "Risk Minimization Objective", params: { risk_type: "variance", weight: "1" }, status: "active" },
  },
  {
    name: "Return Maximization Objective",
    type: "maximize_return",
    description: "Maximises expected portfolio return without regard for risk. Produces concentrated, aggressive portfolios.",
    why: "In practice, pure return maximisation puts everything in the single highest-expected-return asset. Always combine with Position Size Bound and Beta constraints.",
    when: "Use for high-conviction, high-risk-tolerance strategies. Requires strong constraints to stay diversified.",
    params: [
      { key: "weight", label: "Weight", example: "1", note: "Relative importance" },
    ],
    example: { name: "Return Maximization Objective", type: "Return Maximization Objective", params: { weight: "1" }, status: "active" },
  },
  {
    name: "Tracking Error Minimization",
    type: "minimize_tracking_error",
    description: "Minimises deviation from a benchmark index. Produces a portfolio that closely tracks the benchmark while maintaining some active positions.",
    why: "For fund managers measured against an index (NIFTY 50, NIFTY 500), large tracking error means large active bets — which can be good or bad. Minimising TE reduces career risk.",
    when: "Use for enhanced index funds, benchmark-aware strategies, or when mandate requires staying close to an index.",
    params: [
      { key: "benchmark", label: "Benchmark", example: "NIFTY 50", note: "The index to track" },
      { key: "weight", label: "Weight", example: "1", note: "Relative importance" },
    ],
    example: { name: "Tracking Error Minimization", type: "Tracking Error Minimization", params: { benchmark: "NIFTY 50", weight: "1" }, status: "active" },
  },
];

const EXAMPLE_CONSTRAINTS_JSON = JSON.stringify([
  { name: "Position Size Bound", type: "Position Size Bound", params: { min_weight: "0.02", max_weight: "0.10" }, status: "active" },
  { name: "Maximum Number of Positions", type: "Maximum Number of Positions", params: { max_positions: "20" }, status: "active" },
  { name: "Beta Exposure Constraint", type: "Beta Exposure Constraint", params: { min_beta: "0.7", max_beta: "1.2" }, status: "active" },
  { name: "Portfolio Turnover Constraint", type: "Portfolio Turnover Constraint", params: { max_turnover: "0.30" }, status: "active" },
], null, 2);

const EXAMPLE_OBJECTIVES_JSON = JSON.stringify([
  { name: "Risk-Adjusted Return Objective", type: "Risk-Adjusted Return Objective", params: { weight: "1" }, status: "active" },
], null, 2);

function CodeBlock({ code, filename }: { code: string; filename: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  function download() {
    const blob = new Blob([code], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = filename; a.click();
  }
  return (
    <div className="relative rounded-lg border border-border/60 bg-neutral-950 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40 bg-neutral-900">
        <span className="text-[10px] text-muted-foreground font-mono">{filename}</span>
        <div className="flex gap-1">
          <button onClick={copy} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-neutral-800">
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />} {copied ? "Copied" : "Copy"}
          </button>
          <button onClick={download} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-neutral-800">
            <Download className="h-3 w-3" /> Download
          </button>
        </div>
      </div>
      <pre className="p-4 text-[11px] font-mono text-neutral-300 overflow-x-auto leading-relaxed">{code}</pre>
    </div>
  );
}

export default function StrategyBuilderDocsPage() {
  const router = useRouter();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-10">

      {/* Header */}
      <div className="space-y-2">
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground -ml-2 mb-2"
          onClick={() => router.back()}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Strategy Builder
        </Button>
        <h1 className="text-2xl font-bold">Constraints & Objectives Guide</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The optimizer solves a mathematical problem: given your universe, what weights maximise your objective subject to your constraints?
          This guide explains every option, when to use it, and the exact JSON format for bulk upload.
        </p>
      </div>

      {/* How they interact */}
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-5 space-y-2">
        <h2 className="text-sm font-semibold text-blue-400">How Constraints and Objectives Work Together</h2>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Objective</strong> = what you&apos;re optimising for (e.g. maximise Sharpe ratio).
          The optimizer will find weights that score highest on this metric.
        </p>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Constraints</strong> = boundaries the optimizer must stay within (e.g. no single stock &gt; 10%).
          Think of them as the rules of the game — the optimizer can do anything, as long as it doesn&apos;t break these rules.
        </p>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          Without constraints, a Sharpe-maximising optimizer will often put everything in one or two stocks.
          Good constraints make the portfolio realistic and tradeable.
        </p>
      </div>

      {/* Constraints */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold">Constraints</h2>
        {CONSTRAINTS.map((c) => (
          <div key={c.name} className="rounded-lg border border-border/60 bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border/40 bg-muted/20">
              <div className="flex items-start justify-between">
                <h3 className="text-[15px] font-semibold">{c.name}</h3>
                <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{c.type}</span>
              </div>
              <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{c.description}</p>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="text-[12px] text-muted-foreground leading-relaxed">
                <span className="text-amber-400 font-medium">Why use it: </span>{c.why}
              </div>

              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Parameters</p>
                <div className="overflow-hidden rounded border border-border/40">
                  <table className="w-full text-[12px]">
                    <thead className="bg-muted/30 border-b border-border/40">
                      <tr>
                        {["Field", "Example Value", "Description"].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {c.params.map(p => (
                        <tr key={p.key} className="border-b border-border/30">
                          <td className="px-3 py-2 font-mono text-blue-400">{p.key}</td>
                          <td className="px-3 py-2 font-mono text-emerald-400">&quot;{p.example}&quot;</td>
                          <td className="px-3 py-2 text-muted-foreground">{p.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">JSON Format</p>
                <pre className="bg-neutral-950 border border-border/40 rounded p-3 text-[11px] font-mono text-neutral-300 leading-relaxed overflow-x-auto">
                  {JSON.stringify(c.example, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Objectives */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold">Objectives</h2>
        <p className="text-[13px] text-muted-foreground">You can only have one active objective at a time. The optimizer solves for this single goal while respecting all active constraints.</p>
        {OBJECTIVES.map((o) => (
          <div key={o.name} className="rounded-lg border border-border/60 bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border/40 bg-muted/20">
              <div className="flex items-start justify-between">
                <h3 className="text-[15px] font-semibold">{o.name}</h3>
                <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{o.type}</span>
              </div>
              <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{o.description}</p>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-[12px] text-muted-foreground leading-relaxed">
                  <span className="text-amber-400 font-medium">Why: </span>{o.why}
                </div>
                <div className="text-[12px] text-muted-foreground leading-relaxed">
                  <span className="text-blue-400 font-medium">When to use: </span>{o.when}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Parameters</p>
                <div className="overflow-hidden rounded border border-border/40">
                  <table className="w-full text-[12px]">
                    <thead className="bg-muted/30 border-b border-border/40">
                      <tr>
                        {["Field", "Example Value", "Description"].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {o.params.map(p => (
                        <tr key={p.key} className="border-b border-border/30">
                          <td className="px-3 py-2 font-mono text-blue-400">{p.key}</td>
                          <td className="px-3 py-2 font-mono text-emerald-400">&quot;{p.example}&quot;</td>
                          <td className="px-3 py-2 text-muted-foreground">{p.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">JSON Format</p>
                <pre className="bg-neutral-950 border border-border/40 rounded p-3 text-[11px] font-mono text-neutral-300 leading-relaxed overflow-x-auto">
                  {JSON.stringify(o.example, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Format */}
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold">Bulk Upload Format</h2>
          <p className="text-[13px] text-muted-foreground mt-1">
            Use the <strong>↑ upload button</strong> on the Constraints or Objectives card to load a JSON file directly.
            All existing entries are replaced. Download your current setup with the <strong>↓ download button</strong> to use as a template.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">constraints.json — example with 4 constraints</h3>
          <CodeBlock code={EXAMPLE_CONSTRAINTS_JSON} filename="constraints.json" />
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">objectives.json — example</h3>
          <CodeBlock code={EXAMPLE_OBJECTIVES_JSON} filename="objectives.json" />
        </div>

        <div className="rounded-lg border border-border/40 bg-muted/20 p-4 space-y-2">
          <p className="text-[12px] font-semibold">JSON Schema Rules</p>
          <ul className="text-[12px] text-muted-foreground space-y-1 list-disc list-inside">
            <li>Top-level must be a JSON <strong>array</strong> <code className="bg-muted px-1 rounded">[ ... ]</code></li>
            <li>Each entry must have: <code className="bg-muted px-1 rounded">name</code>, <code className="bg-muted px-1 rounded">type</code>, <code className="bg-muted px-1 rounded">params</code>, <code className="bg-muted px-1 rounded">status</code></li>
            <li><code className="bg-muted px-1 rounded">status</code> must be <code className="bg-muted px-1 rounded">&quot;active&quot;</code> or <code className="bg-muted px-1 rounded">&quot;inactive&quot;</code></li>
            <li>All <code className="bg-muted px-1 rounded">params</code> values must be <strong>strings</strong> even if they represent numbers</li>
            <li><code className="bg-muted px-1 rounded">id</code> field is optional — ignored on upload, auto-assigned</li>
            <li>Uploading replaces all existing entries — download first if you want to preserve current setup</li>
          </ul>
        </div>
      </div>

      {/* Recommended Combos */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Recommended Setups</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              name: "Balanced Growth",
              objective: "Risk-Adjusted Return (Sharpe)",
              constraints: ["Position Size Bound 2–10%", "Max 25 positions", "Beta 0.8–1.2", "Max turnover 40%"],
              color: "border-blue-500/30 bg-blue-500/5",
            },
            {
              name: "Low Volatility",
              objective: "Risk Minimization",
              constraints: ["Position Size Bound 3–8%", "Max 30 positions", "Beta 0.5–0.9", "Risk Budget 12%"],
              color: "border-emerald-500/30 bg-emerald-500/5",
            },
            {
              name: "Index Hugger",
              objective: "Tracking Error Minimization",
              constraints: ["Position Size Bound 1–6%", "Max 50 positions", "Beta 0.9–1.1", "Max turnover 20%"],
              color: "border-amber-500/30 bg-amber-500/5",
            },
          ].map(s => (
            <div key={s.name} className={`rounded-lg border p-4 space-y-3 ${s.color}`}>
              <h3 className="text-[13px] font-semibold">{s.name}</h3>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Objective</p>
                <p className="text-[12px] text-emerald-400">{s.objective}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Constraints</p>
                <ul className="space-y-0.5">
                  {s.constraints.map(c => (
                    <li key={c} className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground shrink-0" />{c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-border/40">
        <Button onClick={() => router.back()} className="gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Strategy Builder
        </Button>
      </div>
    </div>
  );
}
