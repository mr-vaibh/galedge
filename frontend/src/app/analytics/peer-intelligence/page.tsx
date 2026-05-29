"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BarChart3, X, Plus } from "lucide-react";
import { CardControls } from "@/components/CardControls";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { usePortfolio } from "@/lib/portfolio-context";

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

// ─── KPI definitions ────────────────────────────────────────────────────────

const RETURN_KPIS = [
  { label: "Total Return (%)", value: "total_return" },
  { label: "Rolling 1Y Return (%)", value: "rolling_1y_return" },
  { label: "Rolling 3Y Return (%)", value: "rolling_3y_return" },
  { label: "Idiosyncratic Return (%)", value: "idio_return" },
  { label: "Factor Return (%)", value: "factor_return" },
  { label: "Market Return (%)", value: "market_return" },
  { label: "Style Return (%)", value: "style_return" },
  { label: "Industry Return (%)", value: "industry_return" },
  { label: "Rolling 1Y Sharpe Ratio", value: "rolling_1y_sharpe" },
  { label: "Rolling 3Y Sharpe Ratio", value: "rolling_3y_sharpe" },
] as const;

const RISK_KPIS = [
  { label: "Rolling 1Y Realized Risk (%)", value: "volatility" },
  { label: "Total Predicted Risk (%)", value: "total_predicted_risk" },
  { label: "Idiosyncratic Predicted Risk (%)", value: "idio_predicted_risk" },
  { label: "Factor Predicted Risk (%)", value: "factor_predicted_risk" },
  { label: "Market Predicted Risk (%)", value: "market_predicted_risk" },
  { label: "Style Predicted Risk (%)", value: "style_predicted_risk" },
  { label: "Industry Predicted Risk (%)", value: "industry_predicted_risk" },
  { label: "Idiosyncratic Risk Contribution (%)", value: "idio_risk_contrib" },
  { label: "Factor Risk Contribution (%)", value: "factor_risk_contrib" },
  { label: "Market Risk Contribution (%)", value: "market_risk_contrib" },
  { label: "Style Risk Contribution (%)", value: "style_risk_contrib" },
  { label: "Industry Risk Contribution (%)", value: "industry_risk_contrib" },
] as const;

const VALUATION_KPIS = [
  { label: "PE Ratio", value: "pe" },
  { label: "P/B Ratio", value: "pb" },
  { label: "Return on Equity (%)", value: "roe" },
] as const;

// ─── Performance table rows ──────────────────────────────────────────────────

const TABLE_ROWS = [
  { label: "Profit and Loss Summary", isSection: true },
  { label: "Total Return (%)",              path: ["pnl_metrics", "total_return_pct"],    indent: 0 },
  { label: "Idiosyncratic Return (%)",      path: ["pnl_metrics", "idio_return_pct"],     indent: 1 },
  { label: "Factor Return (%)",             path: ["pnl_metrics", "factor_return_pct"],   indent: 1 },
  { label: "Market Return (%)",             path: ["pnl_metrics", "market_return_pct"],   indent: 2 },
  { label: "Style Return (%)",              path: ["pnl_metrics", "style_return_pct"],    indent: 2 },
  { label: "Industry Return (%)",           path: ["pnl_metrics", "industry_return_pct"], indent: 2 },
  { label: "Dividend Return (%)",           path: ["pnl_metrics", "_div_return_pct"],     indent: 1 },
  { label: "Other Return (%)",              path: ["pnl_metrics", "_other_return_pct"],   indent: 1 },
  { label: "Transaction Cost (%)",          path: ["pnl_metrics", "_tc_pct"],             indent: 1 },
  { label: "CAGR (%)",                      path: ["pnl_metrics", "cagr_pct"],            indent: 0 },
  { label: "Idiosyncratic CAGR (%)",        path: ["pnl_metrics", "_idio_cagr"],          indent: 1 },
  { label: "Factor CAGR (%)",               path: ["pnl_metrics", "_factor_cagr"],        indent: 1 },
  { label: "Dividend CAGR (%)",             path: ["pnl_metrics", "_div_cagr"],           indent: 1 },
  { label: "Other CAGR (%)",               path: ["pnl_metrics", "_other_cagr"],          indent: 1 },
  { label: "Transaction Cost CAGR (%)",     path: ["pnl_metrics", "_tc_cagr"],            indent: 1 },
  { label: "Sharpe Ratio",                  path: ["pnl_metrics", "sharpe"],              indent: 0 },
  { label: "Idiosyncratic Sharpe Ratio",    path: ["pnl_metrics", "_idio_sharpe"],        indent: 1 },
  { label: "Factor Sharpe Ratio",           path: ["pnl_metrics", "_factor_sharpe"],      indent: 1 },
  { label: "Sortino Ratio",                 path: ["pnl_metrics", "sortino"],             indent: 0 },
  { label: "Idiosyncratic Sortino Ratio",   path: ["pnl_metrics", "_idio_sortino"],       indent: 1 },
  { label: "Factor Sortino Ratio",          path: ["pnl_metrics", "_factor_sortino"],     indent: 1 },
  { label: "Treynor Ratio",                 path: ["pnl_metrics", "treynor"],             indent: 0 },
  { label: "Execution Summary",             path: ["pnl_metrics", "_exec"],               indent: 0 },
  { label: "Annualized Turnover",           path: ["pnl_metrics", "_ann_turnover"],       indent: 1 },
  { label: "Total Transaction Cost (bps)",  path: ["pnl_metrics", "_tc_bps"],             indent: 1 },
  { label: "Risk Summary", isSection: true },
  { label: "Beta",                          path: ["pnl_metrics", "beta"],                indent: 0 },
  { label: "Realized Risk (%)",             path: ["pnl_metrics", "volatility_pct"],      indent: 0 },
  { label: "Idiosyncratic Realized Risk (%)", path: ["pnl_metrics", "_idio_rr"],          indent: 1 },
  { label: "Factor Realized Risk (%)",      path: ["pnl_metrics", "_factor_rr"],          indent: 1 },
  { label: "Market Realized Risk (%)",      path: ["pnl_metrics", "_market_rr"],          indent: 2 },
  { label: "Style Realized Risk (%)",       path: ["pnl_metrics", "_style_rr"],           indent: 2 },
  { label: "Industry Realized Risk (%)",    path: ["pnl_metrics", "_industry_rr"],        indent: 2 },
  { label: "Total Predicted Risk (%)",      path: ["pnl_metrics", "_pred_risk"],          indent: 0 },
  { label: "Idiosyncratic Predicted Risk (%)", path: ["pnl_metrics", "_idio_pr"],         indent: 1 },
  { label: "Factor Predicted Risk (%)",     path: ["pnl_metrics", "_factor_pr"],          indent: 1 },
  { label: "Market Predicted Risk (%)",     path: ["pnl_metrics", "_market_pr"],          indent: 2 },
  { label: "Style Predicted Risk (%)",      path: ["pnl_metrics", "_style_pr"],           indent: 2 },
  { label: "Industry Predicted Risk (%)",   path: ["pnl_metrics", "_industry_pr"],        indent: 2 },
  { label: "Risk Contribution (%)",         path: ["pnl_metrics", "_rc"],                 indent: 0 },
  { label: "Idiosyncratic Risk Contribution (%)", path: ["pnl_metrics", "_idio_rc"],      indent: 1 },
  { label: "Factor Risk Contribution (%)", path: ["pnl_metrics", "_factor_rc"],           indent: 1 },
  { label: "Market Risk Contribution (%)", path: ["pnl_metrics", "_market_rc"],           indent: 2 },
  { label: "Style Risk Contribution (%)",  path: ["pnl_metrics", "_style_rc"],            indent: 2 },
  { label: "Industry Risk Contribution (%)", path: ["pnl_metrics", "_industry_rc"],       indent: 2 },
  { label: "Portfolio Concentration",       path: ["pnl_metrics", "_conc"],               indent: 0 },
  { label: "Top Holdings (%)",              path: ["pnl_metrics", "_top_h"],              indent: 1 },
  { label: "Top Total Risk Contribution (%)", path: ["pnl_metrics", "_top_trc"],          indent: 1 },
  { label: "Top Idiosyncratic Risk Contribution (%)", path: ["pnl_metrics", "_top_irc"],  indent: 1 },
  { label: "Top Factor Risk Contribution (%)", path: ["pnl_metrics", "_top_frc"],         indent: 1 },
  { label: "Gross AUM (INR cr)",            path: ["pnl_metrics", "_aum_gross"],          indent: 0 },
  { label: "Unlevered AUM (INR cr)",        path: ["pnl_metrics", "_aum_unlevered"],      indent: 0 },
  { label: "Valuation Summary", isSection: true },
  { label: "PE Ratio",             path: ["valuation_ts", "__last__", "pe"],  indent: 0 },
  { label: "P/B Ratio",            path: ["valuation_ts", "__last__", "pb"],  indent: 0 },
  { label: "Return on Equity (%)", path: ["pnl_metrics", "roe_pct"],          indent: 0 },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(v: unknown, decimals = 2): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return n.toFixed(decimals);
}

function getNestedValue(data: Record<string, unknown>, path: readonly string[]): unknown {
  let cur: unknown = data;
  for (const key of path) {
    if (key === "__last__") {
      if (!Array.isArray(cur) || cur.length === 0) return null;
      cur = cur[cur.length - 1];
      continue;
    }
    if (cur == null || typeof cur !== "object") return null;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

function getPeerKpiValue(data: Record<string, unknown>, kpi: string): number | null {
  const pnl = (data.pnl_metrics ?? {}) as Record<string, unknown>;
  const fd = (data.factor_detail ?? []) as Array<Record<string, unknown>>;
  const rm = (data.rolling_metrics ?? []) as Array<Record<string, unknown>>;
  const vts = (data.valuation_ts ?? []) as Array<Record<string, unknown>>;

  function lastVal(arr: Array<Record<string, unknown>>, key: string): number | null {
    for (let i = arr.length - 1; i >= 0; i--) {
      const v = arr[i][key];
      if (v != null && !isNaN(Number(v))) return Number(v);
    }
    return null;
  }

  function factorSum(type: string): number | null {
    const rows = fd.filter((f) => String(f.factor_type ?? "").toLowerCase() === type);
    if (!rows.length) return null;
    return rows.reduce((s, f) => s + Number(f.return_contribution_pct ?? 0), 0);
  }

  switch (kpi) {
    case "total_return": return Number(pnl.total_return_pct ?? null);
    case "rolling_1y_return": return lastVal(rm, "rolling_return_1y");
    case "rolling_3y_return": return lastVal(rm, "rolling_return_3y");
    case "idio_return": return Number(pnl.idio_return_pct ?? null);
    case "factor_return": return Number(pnl.factor_return_pct ?? null);
    case "market_return": return factorSum("market");
    case "style_return": return factorSum("style");
    case "industry_return": return factorSum("industry");
    case "rolling_1y_sharpe": return lastVal(rm, "rolling_sharpe");
    case "rolling_3y_sharpe": return lastVal(rm, "rolling_sharpe_3y");
    case "volatility": return Number(pnl.volatility_pct ?? null);
    case "total_predicted_risk": return Number(pnl.volatility_pct ?? null);
    case "idio_predicted_risk": return null;
    case "factor_predicted_risk": return null;
    case "market_predicted_risk": return null;
    case "style_predicted_risk": return null;
    case "industry_predicted_risk": return null;
    case "idio_risk_contrib": return null;
    case "factor_risk_contrib": return null;
    case "market_risk_contrib": return null;
    case "style_risk_contrib": return null;
    case "industry_risk_contrib": return null;
    case "pe": return lastVal(vts, "pe");
    case "pb": return lastVal(vts, "pb");
    case "roe": return Number(pnl.roe_pct ?? null);
    default: return null;
  }
}

// ─── Time series builders ─────────────────────────────────────────────────────

type PtRec = Record<string, unknown>;

function buildPeerTS(
  peers: PeerEntry[],
  kpi: string,
  colors: string[]
): { data: PtRec[]; series: { key: string; name: string; color: string }[] } {
  const active = peers.filter(p => p.data != null);
  const series = active.map((p, i) => ({
    key: `p${i}`,
    name: p.label.length > 22 ? p.label.slice(0, 22) + "…" : p.label,
    color: colors[i % colors.length],
  }));
  if (!active.length) return { data: [], series };

  const dateMap = new Map<string, PtRec>();
  const merge = (date: string, key: string, val: number) => {
    if (!dateMap.has(date)) dateMap.set(date, { date });
    dateMap.get(date)![key] = val;
  };

  active.forEach((peer, i) => {
    const d = peer.data!;
    const k = `p${i}`;
    const rm  = (d.rolling_metrics  as PtRec[] | undefined) ?? [];
    const fdt = (d.factor_decomp_ts as PtRec[] | undefined) ?? [];
    const vts = (d.valuation_ts     as PtRec[] | undefined) ?? [];
    const pnl = (d.pnl_metrics      as PtRec  | undefined) ?? {};

    if (kpi === "total_return") {
      const ec = (d.equity_curve as PtRec[] | undefined) ?? [];
      if (ec.length < 2) return;
      const base = Number(ec[0].value ?? 1);
      ec.forEach(pt => merge(String(pt.date ?? ""), k, base > 0 ? ((Number(pt.value) - base) / base) * 100 : 0));
    } else if (kpi === "rolling_1y_return" || kpi === "rolling_3y_return" || kpi === "rolling_1y_sharpe" || kpi === "rolling_3y_sharpe") {
      const rmKey = kpi === "rolling_1y_return" ? "rolling_return_1y" : kpi === "rolling_3y_return" ? "rolling_return_3y" : kpi === "rolling_1y_sharpe" ? "rolling_sharpe" : "rolling_sharpe_3y";
      rm.filter(r => r[rmKey] != null).forEach(r => merge(String(r.date ?? ""), k, Number(r[rmKey])));
    } else if (["idio_return","factor_return","market_return","style_return","industry_return"].includes(kpi)) {
      const fdtKey: Record<string, string> = { idio_return: "idio", factor_return: "factor_total", market_return: "market", style_return: "style", industry_return: "industry" };
      const fk = fdtKey[kpi];
      let prod = 1.0;
      fdt.filter(p => p[fk] != null).forEach(p => { prod *= 1 + Number(p[fk]); merge(String(p.date ?? ""), k, Math.round((prod - 1) * 10000) / 100); });
    } else if (kpi === "volatility" || kpi === "total_predicted_risk") {
      rm.filter(r => r.rolling_vol != null).forEach(r => merge(String(r.date ?? ""), k, Number(r.rolling_vol)));
    } else if (kpi === "pe") {
      vts.forEach(r => merge(String(r.date ?? ""), k, Number(r.portfolio_pe ?? r.pe_ratio ?? 0)));
    } else if (kpi === "pb") {
      vts.forEach(r => merge(String(r.date ?? ""), k, Number(r.portfolio_pb ?? r.pb_ratio ?? 0)));
    } else if (kpi === "roe") {
      const v = Number(pnl.roe_pct ?? null);
      if (!isNaN(v) && vts.length > 0) { merge(String(vts[0].date ?? ""), k, v); merge(String(vts[vts.length - 1].date ?? ""), k, v); }
    } else {
      // factor risk KPIs — rolling vol of factor_decomp_ts
      const fdtKeyMap: Record<string, string> = {
        idio_predicted_risk: "idio", factor_predicted_risk: "factor_total",
        market_predicted_risk: "market", style_predicted_risk: "style", industry_predicted_risk: "industry",
        idio_risk_contrib: "idio", factor_risk_contrib: "factor_total",
        market_risk_contrib: "market", style_risk_contrib: "style", industry_risk_contrib: "industry",
      };
      const fk = fdtKeyMap[kpi];
      if (fk && fdt.length >= 60) {
        const vals = fdt.map(p => Number(p[fk] ?? 0));
        const W = 60;
        for (let j = W - 1; j < fdt.length; j++) {
          const sl = vals.slice(j - W + 1, j + 1);
          const mean = sl.reduce((a, b) => a + b, 0) / W;
          const vol = Math.sqrt(sl.reduce((a, b) => a + (b - mean) ** 2, 0) / (W - 1) * 252) * 100;
          merge(String(fdt[j].date ?? ""), k, Math.round(vol * 10000) / 10000);
        }
      }
    }
  });

  const data = Array.from(dateMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, r]) => r);
  return { data, series };
}

// ─── Pure SVG charts ──────────────────────────────────────────────────────────

function PeerBarSvg({ peers, kpi, colors }: { peers: PeerEntry[]; kpi: string; colors: string[] }) {
  const values = peers.map((p) => ({
    label: p.label.slice(0, 12),
    val: p.data ? getPeerKpiValue(p.data, kpi) : null,
  }));
  const hasData = values.some((v) => v.val != null);
  if (!hasData)
    return (
      <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">
        No data for this metric
      </div>
    );

  const nums = values.map((v) => v.val ?? 0);
  const max = Math.max(...nums.map(Math.abs), 0.01);
  const W = 300,
    H = 150,
    PAD = 28;
  const barW = Math.min(36, (W - PAD * 2) / Math.max(values.length, 1) - 4);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 180 }}>
      {/* zero line */}
      <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} stroke="#27272a" strokeWidth={0.5} />
      {values.map((v, i) => {
        const cx = PAD + i * ((W - PAD * 2) / values.length) + (W - PAD * 2) / values.length / 2;
        const val = v.val ?? 0;
        const barH = (Math.abs(val) / max) * (H / 2 - 18);
        const y = val >= 0 ? H / 2 - barH : H / 2;
        return (
          <g key={i}>
            <rect x={cx - barW / 2} y={y} width={barW} height={barH} fill={colors[i % colors.length]} rx={2} />
            <text
              x={cx}
              y={val >= 0 ? y - 2 : y + barH + 8}
              textAnchor="middle"
              fontSize={7}
              fill="#a1a1aa"
            >
              {val.toFixed(1)}
            </text>
            <text x={cx} y={H - 2} textAnchor="middle" fontSize={7} fill="#71717a">
              {v.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function FactorBarSvg({ factors, color }: { factors: { name: string; value: number }[]; color: string }) {
  const max = Math.max(...factors.map((f) => Math.abs(f.value)), 0.01);
  return (
    <svg viewBox="0 0 200 120" className="w-full" style={{ height: 120 }}>
      {factors.map((f, i) => {
        const y = 8 + i * 22;
        const barW = (Math.abs(f.value) / max) * 100;
        const isNeg = f.value < 0;
        return (
          <g key={i}>
            <text x={0} y={y + 9} fontSize={7} fill="#71717a">
              {f.name.slice(0, 12)}
            </text>
            <rect x={90} y={y + 2} width={barW} height={10} fill={isNeg ? "#ef4444" : color} rx={1} />
            <text x={92 + barW} y={y + 10} fontSize={7} fill="#a1a1aa">
              {f.value.toFixed(1)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function McapSvg({
  data,
  labels,
  colors,
}: {
  data: Record<string, unknown>[];
  labels: string[];
  colors: string[];
}) {
  if (!data.length) return null;
  const W = 400,
    H = 160,
    PAD = 32;
  const groupW = (W - PAD * 2) / data.length;
  const barW = groupW / (labels.length + 1);
  const maxVal = Math.max(...data.flatMap((r) => labels.map((l) => Number(r[l] ?? 0))), 0.01);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 180 }}>
      {data.map((row, gi) => {
        const gx = PAD + gi * groupW;
        return (
          <g key={gi}>
            {labels.map((l, li) => {
              const val = Number(row[l] ?? 0);
              const barH = (val / maxVal) * (H - 40);
              const bx = gx + li * barW + barW * 0.5;
              return (
                <g key={l}>
                  <rect
                    x={bx}
                    y={H - 20 - barH}
                    width={barW * 0.8}
                    height={barH}
                    fill={colors[li % colors.length]}
                    rx={1}
                  />
                </g>
              );
            })}
            <text x={gx + groupW / 2} y={H - 4} textAnchor="middle" fontSize={7} fill="#71717a">
              {String(row.name ?? "").slice(0, 10)}
            </text>
          </g>
        );
      })}
      {/* Legend */}
      {labels.map((l, i) => (
        <g key={l}>
          <rect x={PAD + i * 70} y={4} width={8} height={6} fill={colors[i % colors.length]} rx={1} />
          <text x={PAD + i * 70 + 11} y={10} fontSize={7} fill="#a1a1aa">
            {l}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ─── API helpers ──────────────────────────────────────────────────────────────

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

// ─── Page component ───────────────────────────────────────────────────────────

export default function PeerIntelligencePage() {
  const { selectedBenchmark, selectedSource, selectedSourceId, selectedBacktestId, analyticsData } =
    usePortfolio();
  const [peers, setPeers] = useState<PeerEntry[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [selectorData, setSelectorData] = useState<SelectorData | null>(null);
  const [selectorLoading, setSelectorLoading] = useState(false);
  const [autoAdded, setAutoAdded] = useState(false);

  // KPI selectors
  const [returnKpi, setReturnKpi] = useState<(typeof RETURN_KPIS)[number]["value"]>("total_return");
  const [riskKpi, setRiskKpi] = useState<(typeof RISK_KPIS)[number]["value"]>("volatility");
  const [valuationKpi, setValuationKpi] = useState<(typeof VALUATION_KPIS)[number]["value"]>("pe");

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

  const addPeer = useCallback(
    async (opt: SelectorOption) => {
      setShowPicker(false);
      if (peers.length >= 5) return;
      if (
        peers.some(
          (p) =>
            p.source === opt.source &&
            p.sourceId === opt.sourceId &&
            p.backtestId === opt.backtestId
        )
      )
        return;

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
    },
    [peers, selectedBenchmark]
  );

  const removePeer = (idx: number) => {
    setPeers((prev) => prev.filter((_, i) => i !== idx));
  };

  // Auto-add the currently selected portfolio/strategy on mount
  useEffect(() => {
    if (autoAdded || !selectedSource || !selectedSourceId) return;
    setAutoAdded(true);

    const ad = analyticsData as Record<string, unknown> | null;
    const fundName = ad?.fund_name as string | undefined;
    const label =
      fundName ??
      (selectedSource === "portfolio"
        ? `Portfolio #${selectedSourceId}`
        : `Strategy #${selectedSourceId}`);

    if (analyticsData) {
      setPeers([
        {
          label,
          source: selectedSource,
          sourceId: selectedSourceId,
          backtestId: selectedBacktestId ?? undefined,
          benchmark: selectedBenchmark,
          data: analyticsData as Record<string, unknown>,
          loading: false,
          error: null,
        },
      ]);
    } else {
      addPeer({
        label,
        source: selectedSource,
        sourceId: selectedSourceId,
        backtestId: selectedBacktestId ?? undefined,
      });
    }
  }, [selectedSource, selectedSourceId]); // eslint-disable-line

  // Build options from selector data
  const options: SelectorOption[] = [];
  if (selectorData) {
    selectorData.portfolios.forEach((p) => {
      options.push({ label: `${p.fund_name} (Portfolio)`, source: "portfolio", sourceId: p.id });
    });
    selectorData.strategies.forEach((s) => {
      s.backtests
        .filter((bt) => bt.status === "completed")
        .forEach((bt) => {
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
  const perfTableRows = TABLE_ROWS.map((row) => {
    if ("isSection" in row) return row;
    const cells = peers.map((p) => {
      if (!p.data) return p.loading ? "..." : "—";
      return fmt(getNestedValue(p.data, row.path));
    });
    return { ...row, cells };
  });

  // Build factor exposure per peer
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
  const mcapLabels = ["Large Cap", "Mid Cap", "Small Cap"];
  const mcapBarData = peers.map((p) => {
    const ms = (p.data?.mcap_slicing as Array<Record<string, unknown>> | undefined) ?? [];
    const row: Record<string, unknown> = { name: p.label };
    mcapLabels.forEach((l) => {
      const found = ms.find((x) =>
        String(x.bucket ?? x.name ?? "")
          .toLowerCase()
          .includes(l.split(" ")[0].toLowerCase())
      );
      row[l] = found ? Number(found.weight_pct ?? found.total_return_pct ?? 0) : 0;
    });
    return row;
  });

  // KPI label lookups
  const returnKpiLabel = RETURN_KPIS.find((k) => k.value === returnKpi)?.label ?? returnKpi;
  const riskKpiLabel = RISK_KPIS.find((k) => k.value === riskKpi)?.label ?? riskKpi;
  const valuationKpiLabel = VALUATION_KPIS.find((k) => k.value === valuationKpi)?.label ?? valuationKpi;

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
            style={{
              borderColor: COLORS[i % COLORS.length] + "60",
              backgroundColor: COLORS[i % COLORS.length] + "15",
            }}
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
              <p className="text-xs text-muted-foreground p-2">
                No portfolios or completed strategies found
              </p>
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
          {/* ── KPI chart cards ─────────────────────────────────────────────── */}

          {/* chrtOne — Return KPIs */}
          {(() => { const { data, series } = buildPeerTS(peers, returnKpi, COLORS); return (
          <Card>
            <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
              <CardTitle className="text-[11px] truncate max-w-[160px]">{returnKpiLabel}</CardTitle>
              <div className="flex items-center gap-1.5 shrink-0">
                <select value={returnKpi} onChange={(e) => setReturnKpi(e.target.value as (typeof RETURN_KPIS)[number]["value"])}
                  className="text-[9px] bg-background border border-border rounded px-1.5 py-0.5 text-foreground focus:outline-none max-w-[130px]">
                  {RETURN_KPIS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
                </select>
                <CardControls fullscreen expandContent={data.length > 0 ? <TimeSeriesChart data={data} series={series} height={600} /> : undefined} />
              </div>
            </CardHeader>
            <CardContent className="p-2">
              {data.length > 0 ? <TimeSeriesChart data={data} series={series} height={180} /> : <div className="h-44 flex items-center justify-center text-[10px] text-muted-foreground">No data</div>}
            </CardContent>
          </Card>
          ); })()}

          {/* chrtTwo — Risk KPIs */}
          {(() => { const { data, series } = buildPeerTS(peers, riskKpi, COLORS); return (
          <Card>
            <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
              <CardTitle className="text-[11px] truncate max-w-[160px]">{riskKpiLabel}</CardTitle>
              <div className="flex items-center gap-1.5 shrink-0">
                <select value={riskKpi} onChange={(e) => setRiskKpi(e.target.value as (typeof RISK_KPIS)[number]["value"])}
                  className="text-[9px] bg-background border border-border rounded px-1.5 py-0.5 text-foreground focus:outline-none max-w-[130px]">
                  {RISK_KPIS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
                </select>
                <CardControls fullscreen expandContent={data.length > 0 ? <TimeSeriesChart data={data} series={series} height={600} /> : undefined} />
              </div>
            </CardHeader>
            <CardContent className="p-2">
              {data.length > 0 ? <TimeSeriesChart data={data} series={series} height={180} /> : <div className="h-44 flex items-center justify-center text-[10px] text-muted-foreground">No data</div>}
            </CardContent>
          </Card>
          ); })()}

          {/* chrtThree — Valuation KPIs */}
          {(() => { const { data, series } = buildPeerTS(peers, valuationKpi, COLORS); return (
          <Card>
            <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
              <CardTitle className="text-[11px] truncate max-w-[160px]">{valuationKpiLabel}</CardTitle>
              <div className="flex items-center gap-1.5 shrink-0">
                <select value={valuationKpi} onChange={(e) => setValuationKpi(e.target.value as (typeof VALUATION_KPIS)[number]["value"])}
                  className="text-[9px] bg-background border border-border rounded px-1.5 py-0.5 text-foreground focus:outline-none max-w-[130px]">
                  {VALUATION_KPIS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
                </select>
                <CardControls fullscreen expandContent={data.length > 0 ? <TimeSeriesChart data={data} series={series} height={600} /> : undefined} />
              </div>
            </CardHeader>
            <CardContent className="p-2">
              {data.length > 0 ? <TimeSeriesChart data={data} series={series} height={180} /> : <div className="h-44 flex items-center justify-center text-[10px] text-muted-foreground">No data</div>}
            </CardContent>
          </Card>
          ); })()}

          {/* ── Performance Summary Table ────────────────────────────────────── */}
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
                      <th
                        key={i}
                        className="px-2 py-1.5 text-right font-medium whitespace-nowrap"
                        style={{ color: COLORS[i % COLORS.length] }}
                      >
                        {p.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {perfTableRows.map((row, ri) => {
                    if ("isSection" in row) {
                      return (
                        <tr key={ri} className="bg-muted/20">
                          <td
                            colSpan={peers.length + 1}
                            className="px-2 py-1.5 font-bold text-[10px] text-foreground"
                          >
                            {row.label}
                          </td>
                        </tr>
                      );
                    }
                    const { label, cells, indent } = row as {
                      label: string;
                      cells: string[];
                      indent: number;
                      path: readonly string[];
                    };
                    return (
                      <tr key={ri} className="border-b border-border/30">
                        <td
                          className={`px-2 py-1.5 ${
                            indent === 2 ? "pl-8 text-muted-foreground/60 text-[9px]" :
                            indent === 1 ? "pl-4 text-muted-foreground" :
                            "text-muted-foreground"
                          }`}
                        >
                          {label}
                        </td>
                        {cells.map((cell, i) => {
                          const n = parseFloat(cell);
                          return (
                            <td
                              key={i}
                              className={`px-2 py-1.5 text-right tabular-nums ${
                                !isNaN(n) ? (n >= 0 ? "text-emerald-500" : "text-red-400") : ""
                              }`}
                            >
                              {cell}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* ── Brinson Decomposition Summary ────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
              <CardTitle className="text-[11px]">Brinson Decomposition Summary</CardTitle>
              <CardControls />
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Category</th>
                    {peers.map((p, i) => (
                      <th key={i} colSpan={3} className="px-2 py-1.5 text-center font-medium whitespace-nowrap border-l border-border/30" style={{ color: COLORS[i % COLORS.length] }}>
                        {p.label}
                      </th>
                    ))}
                  </tr>
                  <tr className="border-b border-border/30 text-muted-foreground/60">
                    <th className="px-2 py-1 text-left text-[9px]" />
                    {peers.map((_, i) => (
                      <>
                        <th key={`${i}-a`} className="px-2 py-1 text-right text-[9px] border-l border-border/20">Alloc (%)</th>
                        <th key={`${i}-s`} className="px-2 py-1 text-right text-[9px]">Select (%)</th>
                        <th key={`${i}-i`} className="px-2 py-1 text-right text-[9px]">Interact (%)</th>
                      </>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {["Market Cap", "Liquidity", "Total Risk", "Idiosyncratic Risk", "Sector", "Industry", "Earnings Window", "IPO", "Financial Type", "Position Age"].map((cat) => (
                    <tr key={cat} className="border-b border-border/30">
                      <td className="px-2 py-1.5 font-medium">{cat}</td>
                      {peers.map((p, i) => {
                        const brinson = (p.data?.brinson as Record<string, unknown> | undefined) ?? {};
                        const arr = (cat === "Market Cap" ? brinson.by_mcap : cat === "Sector" ? brinson.by_sector : []) as Array<Record<string, unknown>>;
                        const sum = Array.isArray(arr) ? {
                          alloc:    arr.reduce((s, r) => s + Number(r.allocation_effect  ?? 0), 0),
                          select:   arr.reduce((s, r) => s + Number(r.selection_effect   ?? 0), 0),
                          interact: arr.reduce((s, r) => s + Number(r.interaction_effect ?? 0), 0),
                        } : null;
                        const fmtVal = (v: number) => <span className={v >= 0 ? "text-emerald-500" : "text-red-400"}>{v.toFixed(2)}</span>;
                        return (
                          <>
                            <td key={`${i}-a`} className="px-2 py-1.5 text-right tabular-nums border-l border-border/20">{sum ? fmtVal(sum.alloc)    : <span className="text-muted-foreground">—</span>}</td>
                            <td key={`${i}-s`} className="px-2 py-1.5 text-right tabular-nums">{sum ? fmtVal(sum.select)   : <span className="text-muted-foreground">—</span>}</td>
                            <td key={`${i}-i`} className="px-2 py-1.5 text-right tabular-nums">{sum ? fmtVal(sum.interact) : <span className="text-muted-foreground">—</span>}</td>
                          </>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* ── Factor Exposure Comparison ──────────────────────────────────── */}
          {peerFactors.some((p) => p.factors.length > 0) && (
            <Card>
              <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                <CardTitle className="text-[11px]">Top 5 Factor Exposures</CardTitle>
                <CardControls />
              </CardHeader>
              <CardContent className="p-2">
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: `repeat(${peers.length}, 1fr)` }}
                >
                  {peerFactors.map((pf, i) => (
                    <div key={i}>
                      <div
                        className="text-[9px] font-medium mb-1 truncate"
                        style={{ color: COLORS[i % COLORS.length] }}
                      >
                        {pf.label}
                      </div>
                      {pf.factors.length > 0 ? (
                        <FactorBarSvg factors={pf.factors} color={COLORS[i % COLORS.length]} />
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

          {/* ── Market Cap Breakdown ────────────────────────────────────────── */}
          {mcapBarData.length > 0 &&
            mcapBarData.some((r) => mcapLabels.some((l) => Number(r[l]) !== 0)) && (
              <Card>
                <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
                  <CardTitle className="text-[11px]">Market Cap Breakdown Comparison</CardTitle>
                  <CardControls />
                </CardHeader>
                <CardContent className="p-2">
                  <McapSvg data={mcapBarData} labels={mcapLabels} colors={COLORS} />
                </CardContent>
              </Card>
            )}
        </>
      )}
    </div>
  );
}
