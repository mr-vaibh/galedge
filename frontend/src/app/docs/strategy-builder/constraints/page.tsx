"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Copy, Check, ArrowLeft } from "lucide-react";

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
    why: "For fund managers measured against an index (NIFTY 50, NIFTY 500), large tracking error means large active bets. Minimising TE reduces career risk.",
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
    <div className="rounded-lg border border-neutral-800 bg-neutral-950 overflow-hidden my-4">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-800 bg-neutral-900">
        <span className="text-[10px] text-neutral-500 font-mono">{filename}</span>
        <div className="flex gap-1">
          <button onClick={copy} className="flex items-center gap-1 text-[10px] text-neutral-500 hover:text-white transition-colors px-2 py-0.5 rounded hover:bg-neutral-800">
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />} {copied ? "Copied" : "Copy"}
          </button>
          <button onClick={download} className="flex items-center gap-1 text-[10px] text-neutral-500 hover:text-white transition-colors px-2 py-0.5 rounded hover:bg-neutral-800">
            <Download className="h-3 w-3" /> Download
          </button>
        </div>
      </div>
      <pre className="p-4 text-[12px] font-mono text-neutral-300 overflow-x-auto leading-relaxed">{code}</pre>
    </div>
  );
}

function ParamTable({ params }: { params: { key: string; label: string; example: string; note: string }[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-800 my-3">
      <table className="w-full text-sm">
        <thead className="bg-neutral-900 border-b border-neutral-800">
          <tr>
            {["Field", "Example Value", "Description"].map(h => (
              <th key={h} className="px-4 py-2 text-left font-medium text-neutral-500">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {params.map((p, i) => (
            <tr key={p.key} className={i < params.length - 1 ? "border-b border-neutral-800" : ""}>
              <td className="px-4 py-2.5 font-mono text-blue-400">{p.key}</td>
              <td className="px-4 py-2.5 font-mono text-emerald-400">&quot;{p.example}&quot;</td>
              <td className="px-4 py-2.5 text-neutral-400">{p.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ConstraintsDocsPage() {
  return (
    <div>
      <Link href="/docs/strategy-builder" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Strategy Builder
      </Link>

      <h1 className="text-3xl font-bold mb-2">Constraints & Objectives</h1>
      <p className="text-neutral-400 mb-8 leading-relaxed">
        The optimizer solves a mathematical problem: given your universe, what weights maximise your
        objective subject to your constraints? This page explains every option, when to use it, and
        the exact JSON format for bulk upload.
      </p>

      {/* How they interact */}
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-5 mb-10 space-y-3">
        <h2 className="text-base font-semibold text-blue-400">How Constraints and Objectives Work Together</h2>
        <p className="text-sm text-neutral-400 leading-relaxed">
          <strong className="text-white">Objective</strong> — what you&apos;re optimising for (e.g. maximise Sharpe ratio).
          The optimizer finds weights that score highest on this metric.
        </p>
        <p className="text-sm text-neutral-400 leading-relaxed">
          <strong className="text-white">Constraints</strong> — boundaries the optimizer must stay within (e.g. no single stock &gt; 10%).
          Think of them as the rules of the game. The optimizer can do anything as long as it doesn&apos;t break these rules.
        </p>
        <p className="text-sm text-neutral-400 leading-relaxed">
          Without constraints, a Sharpe-maximising optimizer will often put everything in one or two stocks.
          Good constraints make the portfolio realistic and tradeable.
        </p>
      </div>

      {/* Constraints */}
      <section id="constraints" className="mb-14">
        <h2 className="text-2xl font-bold mb-6">Constraints</h2>
        <div className="space-y-8">
          {CONSTRAINTS.map((c) => (
            <div key={c.name} className="rounded-xl border border-neutral-800 bg-neutral-900/40 overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-900/60 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{c.name}</h3>
                  <p className="text-sm text-neutral-400 mt-1 leading-relaxed">{c.description}</p>
                </div>
                <span className="text-[11px] font-mono text-neutral-500 bg-neutral-800 px-2 py-1 rounded shrink-0 mt-0.5">{c.type}</span>
              </div>
              <div className="px-6 py-5 space-y-5">
                <p className="text-sm text-neutral-400 leading-relaxed">
                  <span className="text-amber-400 font-medium">When to use: </span>{c.why}
                </p>
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Parameters</p>
                  <ParamTable params={c.params} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">JSON</p>
                  <pre className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 text-[12px] font-mono text-neutral-300 overflow-x-auto leading-relaxed">
                    {JSON.stringify(c.example, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Objectives */}
      <section id="objectives" className="mb-14">
        <h2 className="text-2xl font-bold mb-2">Objectives</h2>
        <p className="text-neutral-400 text-sm mb-6">Only one objective is active at a time. The optimizer solves for this single goal while respecting all active constraints.</p>
        <div className="space-y-8">
          {OBJECTIVES.map((o) => (
            <div key={o.name} className="rounded-xl border border-neutral-800 bg-neutral-900/40 overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-900/60 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{o.name}</h3>
                  <p className="text-sm text-neutral-400 mt-1 leading-relaxed">{o.description}</p>
                </div>
                <span className="text-[11px] font-mono text-neutral-500 bg-neutral-800 px-2 py-1 rounded shrink-0 mt-0.5">{o.type}</span>
              </div>
              <div className="px-6 py-5 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <p className="text-sm text-neutral-400 leading-relaxed">
                    <span className="text-amber-400 font-medium">Why: </span>{o.why}
                  </p>
                  <p className="text-sm text-neutral-400 leading-relaxed">
                    <span className="text-blue-400 font-medium">When to use: </span>{o.when}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Parameters</p>
                  <ParamTable params={o.params} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">JSON</p>
                  <pre className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 text-[12px] font-mono text-neutral-300 overflow-x-auto leading-relaxed">
                    {JSON.stringify(o.example, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bulk Upload */}
      <section id="upload-format" className="mb-14">
        <h2 className="text-2xl font-bold mb-2">Bulk Upload Format</h2>
        <p className="text-neutral-400 text-sm mb-6">
          Use the <strong className="text-white">↑ upload button</strong> on the Constraints or Objectives card in the Strategy Builder
          to load a JSON file directly. All existing entries are replaced.
          Download your current setup with the <strong className="text-white">↓ download button</strong> to use as a starting template.
        </p>

        <h3 className="text-lg font-semibold mb-2">constraints.json</h3>
        <CodeBlock code={EXAMPLE_CONSTRAINTS_JSON} filename="constraints.json" />

        <h3 className="text-lg font-semibold mb-2 mt-6">objectives.json</h3>
        <CodeBlock code={EXAMPLE_OBJECTIVES_JSON} filename="objectives.json" />

        <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-5 mt-6 space-y-2">
          <p className="text-sm font-semibold text-white">JSON Schema Rules</p>
          <ul className="text-sm text-neutral-400 space-y-1.5 list-disc list-inside">
            <li>Top-level must be a JSON <strong className="text-white">array</strong> <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-[11px]">[ ... ]</code></li>
            <li>Each entry requires: <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-[11px]">name</code>, <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-[11px]">type</code>, <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-[11px]">params</code>, <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-[11px]">status</code></li>
            <li><code className="bg-neutral-800 px-1.5 py-0.5 rounded text-[11px]">status</code> must be <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-[11px]">&quot;active&quot;</code> or <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-[11px]">&quot;inactive&quot;</code></li>
            <li>All <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-[11px]">params</code> values must be <strong className="text-white">strings</strong> even if numeric — e.g. <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-[11px]">&quot;0.10&quot;</code> not <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-[11px]">0.10</code></li>
            <li>Duplicate types are automatically removed on upload (first occurrence kept)</li>
            <li><code className="bg-neutral-800 px-1.5 py-0.5 rounded text-[11px]">id</code> is optional — ignored on upload, auto-assigned</li>
          </ul>
        </div>
      </section>

      {/* Recommended Combos */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-6">Recommended Setups</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              name: "Balanced Growth",
              objective: "Risk-Adjusted Return (Sharpe)",
              constraints: ["Position Size Bound 2–10%", "Max 25 positions", "Beta 0.8–1.2", "Max turnover 40%"],
              color: "border-blue-500/30 bg-blue-500/5",
              badge: "text-blue-400",
            },
            {
              name: "Low Volatility",
              objective: "Risk Minimization",
              constraints: ["Position Size Bound 3–8%", "Max 30 positions", "Beta 0.5–0.9", "Risk Budget 12%"],
              color: "border-emerald-500/30 bg-emerald-500/5",
              badge: "text-emerald-400",
            },
            {
              name: "Index Hugger",
              objective: "Tracking Error Minimization",
              constraints: ["Position Size Bound 1–6%", "Max 50 positions", "Beta 0.9–1.1", "Max turnover 20%"],
              color: "border-amber-500/30 bg-amber-500/5",
              badge: "text-amber-400",
            },
          ].map(s => (
            <div key={s.name} className={`rounded-xl border p-5 space-y-4 ${s.color}`}>
              <h3 className="text-base font-semibold">{s.name}</h3>
              <div>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Objective</p>
                <p className={`text-sm font-medium ${s.badge}`}>{s.objective}</p>
              </div>
              <div>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-2">Constraints</p>
                <ul className="space-y-1">
                  {s.constraints.map(c => (
                    <li key={c} className="text-sm text-neutral-400 flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-neutral-600 shrink-0" />{c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
