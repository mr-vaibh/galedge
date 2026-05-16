"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChartPanel } from "@/components/charts/BarChartPanel";
import { CardControls } from "@/components/CardControls";
import { usePortfolio } from "@/lib/portfolio-context";
import { AnalyticsEmptyState } from "@/components/analytics/AnalyticsEmptyState";

const peerTabs = [
  { label: "Peer Returns and Risks", href: "/analytics/peer-intelligence" },
  { label: "Peer Breakdown", href: "/analytics/peer-intelligence/peer-breakdown" },
];

const DIMENSIONS = ["Sector", "Market Cap", "Factor Exposure"] as const;
type Dimension = (typeof DIMENSIONS)[number];

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
  { label: "Rolling 1Y Realized Risk (%)", value: "vol" },
  { label: "Total Predicted Risk (%)", value: "total_predicted" },
  { label: "Idiosyncratic Predicted Risk (%)", value: "idio_predicted" },
  { label: "Factor Predicted Risk (%)", value: "factor_predicted" },
  { label: "Market Predicted Risk (%)", value: "market_predicted" },
  { label: "Style Predicted Risk (%)", value: "style_predicted" },
  { label: "Industry Predicted Risk (%)", value: "industry_predicted" },
  { label: "Total Risk Contribution (%)", value: "total_rc" },
  { label: "Idiosyncratic Risk Contribution (%)", value: "idio_rc" },
  { label: "Factor Risk Contribution (%)", value: "factor_rc" },
  { label: "Market Risk Contribution (%)", value: "market_rc" },
  { label: "Style Risk Contribution (%)", value: "style_rc" },
  { label: "Industry Risk Contribution (%)", value: "industry_rc" },
  { label: "Capital Deployed (%)", value: "weight" },
] as const;

const VALUATION_KPIS = [
  { label: "PE Ratio", value: "pe" },
  { label: "P/B Ratio", value: "pb" },
  { label: "Return on Equity (%)", value: "roe" },
] as const;

type ReturnKpiVal = (typeof RETURN_KPIS)[number]["value"];
type RiskKpiVal = (typeof RISK_KPIS)[number]["value"];
type ValuationKpiVal = (typeof VALUATION_KPIS)[number]["value"];

function KpiBreakdownBar({ rows, height = 180 }: { rows: Array<{ name: string; value: number | null }>; height?: number }) {
  const hasData = rows.some((r) => r.value != null);
  if (!hasData) return (
    <div className="flex items-center justify-center text-xs text-muted-foreground" style={{ height }}>
      No data for this metric
    </div>
  );
  const vals = rows.map((r) => r.value ?? 0);
  const maxAbs = Math.max(...vals.map(Math.abs), 0.01);
  const W = 320, H = height, PAD_L = 80, PAD_R = 40, PAD_T = 8, PAD_B = 8;
  const rowH = (H - PAD_T - PAD_B) / Math.max(rows.length, 1);
  const barH = Math.max(4, rowH - 4);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      {rows.map((r, i) => {
        const y = PAD_T + i * rowH + (rowH - barH) / 2;
        const val = r.value ?? 0;
        const barW = Math.abs(val) / maxAbs * (W - PAD_L - PAD_R);
        const isNeg = val < 0;
        return (
          <g key={i}>
            <text x={PAD_L - 4} y={y + barH / 2 + 3} textAnchor="end" fontSize={7} fill="#71717a">
              {r.name.slice(0, 14)}
            </text>
            <rect x={PAD_L} y={y} width={barW} height={barH} fill={isNeg ? "#ef4444" : "#f97316"} rx={1} />
            <text x={PAD_L + barW + 3} y={y + barH / 2 + 3} fontSize={7} fill="#a1a1aa">
              {val.toFixed(1)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function fmt(v: unknown, dec = 2): string {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  if (isNaN(n)) return "—";
  return n.toFixed(dec);
}

export default function PeerBreakdownPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { analyticsData, analyticsLoading, analyticsError, selectedFundName } = usePortfolio();
  const [dimension, setDimension] = useState<Dimension>("Sector");
  const [returnKpi, setReturnKpi] = useState<ReturnKpiVal>("total_return");
  const [riskKpi, setRiskKpi] = useState<RiskKpiVal>("vol");
  const [valuationKpi, setValuationKpi] = useState<ValuationKpiVal>("pe");

  const pnl = (analyticsData?.pnl_metrics ?? {}) as Record<string, unknown>;
  const holdingsDetail = (analyticsData?.holdings_detail ?? []) as Record<string, unknown>[];
  const factorDetail = (analyticsData?.factor_detail ?? []) as Record<string, unknown>[];
  const sectorSlicing = (analyticsData?.sector_slicing ?? []) as Record<string, unknown>[];
  const mcapSlicing = (analyticsData?.mcap_slicing ?? []) as Record<string, unknown>[];

  // Choose slicing data based on dimension
  const slicingData = dimension === "Sector" ? sectorSlicing : dimension === "Market Cap" ? mcapSlicing : [];

  // Holdings sorted by weight
  const sortedHoldings = [...holdingsDetail].sort((a, b) => Number(b.avg_weight ?? 0) - Number(a.avg_weight ?? 0));
  const topHoldings = sortedHoldings.slice(0, 5);
  const bottomHoldings = [...sortedHoldings].reverse().slice(0, 5);

  // Bar charts
  const breakdownBarData = slicingData.map(r => ({
    name: String(r.bucket ?? "").slice(0, 14),
    value: parseFloat(fmt(Number(r.weight_pct ?? 0))),
  }));

  const holdingsBarData = topHoldings.map(h => ({
    name: String(h.symbol ?? "").replace(".NS", "").slice(0, 10),
    value: parseFloat(fmt(Number(h.avg_weight ?? 0) * 100)),
  }));

  // Factor breakdown
  const topFactors = [...factorDetail].sort((a, b) => Number(b.return_contribution_pct ?? 0) - Number(a.return_contribution_pct ?? 0)).slice(0, 5);
  const bottomFactors = [...factorDetail].sort((a, b) => Number(a.return_contribution_pct ?? 0) - Number(b.return_contribution_pct ?? 0)).slice(0, 5);

  const label = selectedFundName ?? "Selected Portfolio";

  // KPI chart data helpers
  const NO_DATA_KPIS = new Set(["rolling_1y_return", "rolling_3y_return", "idio_return", "factor_return", "market_return", "style_return", "industry_return", "rolling_1y_sharpe", "rolling_3y_sharpe", "total_predicted", "idio_predicted", "factor_predicted", "market_predicted", "style_predicted", "industry_predicted", "total_rc", "idio_rc", "factor_rc", "market_rc", "style_rc", "industry_rc", "roe"]);

  function getSlicingRows(kpi: string): Array<{ name: string; value: number | null }> {
    if (NO_DATA_KPIS.has(kpi)) return [];
    if (dimension === "Factor Exposure") {
      return factorDetail.map((f) => ({
        name: String(f.factor_name ?? ""),
        value: kpi === "total_return" ? Number(f.return_contribution_pct ?? null) :
               kpi === "weight" ? null : null,
      }));
    }
    return slicingData.map((r) => ({
      name: String(r.bucket ?? ""),
      value: kpi === "total_return" ? Number(r.return_pct ?? null) :
             kpi === "vol" ? Number(r.vol_pct ?? null) :
             kpi === "weight" ? Number(r.weight_pct ?? null) :
             kpi === "pe" ? Number(r.pe ?? null) :
             kpi === "pb" ? Number(r.pb ?? null) : null,
    }));
  }

  const returnRows = getSlicingRows(returnKpi);
  const riskRows = getSlicingRows(riskKpi);
  const valuationRows = getSlicingRows(valuationKpi);

  if (analyticsLoading) {
    return <div className="p-8 text-center text-muted-foreground">Computing analytics...</div>;
  }

  if (!analyticsData) {
    return <AnalyticsEmptyState title="Peer Breakdown" analyticsError={analyticsError} />;
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Peer Breakdown</h1>
          <p className="text-xs text-muted-foreground">Portfolio: <span className="font-medium text-foreground">{label}</span></p>
        </div>
        <div className="flex items-center gap-1 bg-card border rounded-lg p-0.5">
          {peerTabs.map(t => <Button key={t.href} variant={pathname === t.href ? "secondary" : "ghost"} size="sm" onClick={() => router.push(t.href)} className="h-7 text-[10px]">{t.label}</Button>)}
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          ["Total Return (%)", pnl.total_return_pct],
          ["Volatility (%)", pnl.volatility_pct],
          ["Sharpe", pnl.sharpe],
          ["Max Drawdown (%)", pnl.max_drawdown_pct],
        ].map(([lbl, val]) => (
          <Card key={String(lbl)}>
            <CardContent className="p-2 text-center">
              <div className="text-[9px] text-muted-foreground">{String(lbl)}</div>
              <div className={`text-sm font-bold tabular-nums ${Number(val) < 0 ? "text-red-400" : "text-emerald-400"}`}>
                {fmt(val)}%
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* KPI Chart Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">{RETURN_KPIS.find(k => k.value === returnKpi)?.label ?? "Return"}</CardTitle>
            <div className="flex items-center gap-1">
              <select
                className="text-[9px] bg-transparent border border-border rounded px-1 py-0.5 text-muted-foreground focus:outline-none"
                value={returnKpi}
                onChange={e => setReturnKpi(e.target.value as ReturnKpiVal)}
              >
                {RETURN_KPIS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
              <CardControls title="Return KPI Breakdown" info="Selected return metric broken down by dimension." />
            </div>
          </CardHeader>
          <CardContent className="p-2">
            <KpiBreakdownBar rows={returnRows} height={180} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">{RISK_KPIS.find(k => k.value === riskKpi)?.label ?? "Risk"}</CardTitle>
            <div className="flex items-center gap-1">
              <select
                className="text-[9px] bg-transparent border border-border rounded px-1 py-0.5 text-muted-foreground focus:outline-none"
                value={riskKpi}
                onChange={e => setRiskKpi(e.target.value as RiskKpiVal)}
              >
                {RISK_KPIS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
              <CardControls title="Risk KPI Breakdown" info="Selected risk metric broken down by dimension." />
            </div>
          </CardHeader>
          <CardContent className="p-2">
            <KpiBreakdownBar rows={riskRows} height={180} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">{VALUATION_KPIS.find(k => k.value === valuationKpi)?.label ?? "Valuation"}</CardTitle>
            <div className="flex items-center gap-1">
              <select
                className="text-[9px] bg-transparent border border-border rounded px-1 py-0.5 text-muted-foreground focus:outline-none"
                value={valuationKpi}
                onChange={e => setValuationKpi(e.target.value as ValuationKpiVal)}
              >
                {VALUATION_KPIS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
              <CardControls title="Valuation KPI Breakdown" info="Selected valuation metric broken down by dimension." />
            </div>
          </CardHeader>
          <CardContent className="p-2">
            <KpiBreakdownBar rows={valuationRows} height={180} />
          </CardContent>
        </Card>
      </div>

      {/* Dimension tabs */}
      <div className="flex gap-0.5 overflow-x-auto pb-1">
        {DIMENSIONS.map(d => (
          <Button key={d} variant={dimension === d ? "secondary" : "ghost"} size="sm"
            onClick={() => setDimension(d)} className="h-7 text-[10px] whitespace-nowrap">
            {d}
          </Button>
        ))}
      </div>

      {/* Slicing breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Breakdown by {dimension}</CardTitle>
            <CardControls title={`Breakdown by ${dimension}`} info="Holdings grouped by dimension with weight, return, and risk." />
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-border/50">
                  {[dimension, "Weight (%)", "Return (%)", "Vol (%)", "PE"].map(h => (
                    <th key={h} className="px-2 py-1.5 text-left text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slicingData.length > 0 ? slicingData.map((r, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="px-2 py-1.5 font-medium">{String(r.bucket ?? "—")}</td>
                    <td className="px-2 py-1.5 tabular-nums">{fmt(r.weight_pct)}</td>
                    <td className={`px-2 py-1.5 tabular-nums ${Number(r.return_pct ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(r.return_pct)}</td>
                    <td className="px-2 py-1.5 tabular-nums">{fmt(r.vol_pct)}</td>
                    <td className="px-2 py-1.5 tabular-nums">{fmt(r.pe)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="px-2 py-4 text-center text-muted-foreground">No data</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Weight by {dimension} (%)</CardTitle>
            <CardControls title={`Weight by ${dimension}`} info="Portfolio weight allocation by grouping." fullscreen
              expandContent={breakdownBarData.length > 0 ? <BarChartPanel data={breakdownBarData} height={600} /> : undefined} />
          </CardHeader>
          <CardContent className="p-2">
            {breakdownBarData.length > 0 ? <BarChartPanel data={breakdownBarData} height={200} /> : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Holdings tables */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          ["Top Holdings by Weight", topHoldings],
          ["Bottom Holdings by Weight", bottomHoldings],
        ].map(([title, rows]) => (
          <Card key={String(title)}>
            <CardHeader className="pb-1 py-2 px-3"><CardTitle className="text-[11px]">{String(title)}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-border/50">
                    {["Symbol", "Weight (%)", "Return (%)", "Risk (%)"].map(h => (
                      <th key={h} className="px-2 py-1.5 text-left text-muted-foreground font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(rows as Record<string, unknown>[]).length > 0 ? (rows as Record<string, unknown>[]).map((h, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="px-2 py-1 font-medium">{String(h.symbol ?? "—").replace(".NS", "")}</td>
                      <td className="px-2 py-1 tabular-nums">{fmt(Number(h.avg_weight ?? 0) * 100)}</td>
                      <td className={`px-2 py-1 tabular-nums ${Number(h.total_return_contribution_pct ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(h.total_return_contribution_pct)}</td>
                      <td className="px-2 py-1 tabular-nums">{fmt(h.risk_contribution_pct)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="px-2 py-4 text-center text-muted-foreground">No data</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Top Holdings Weight (%)</CardTitle>
            <CardControls title="Top Holdings Weight" info="Largest positions by average weight." fullscreen
              expandContent={holdingsBarData.length > 0 ? <BarChartPanel data={holdingsBarData} height={500} /> : undefined} />
          </CardHeader>
          <CardContent className="p-2">
            {holdingsBarData.length > 0 ? <BarChartPanel data={holdingsBarData} height={200} /> : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Factor contributors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          ["Top Factor Contributors", topFactors, "emerald"],
          ["Top Factor Detractors", bottomFactors, "red"],
        ].map(([title, rows, color]) => (
          <Card key={String(title)}>
            <CardHeader className="pb-1 py-2 px-3"><CardTitle className="text-[11px]">{String(title)}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-border/50">
                    {["Type", "Factor", "Exposure (%)", "Return (%)"].map(h => (
                      <th key={h} className="px-2 py-1.5 text-left text-muted-foreground font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(rows as Record<string, unknown>[]).length > 0 ? (rows as Record<string, unknown>[]).map((f, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="px-2 py-1">{String(f.factor_type ?? "—")}</td>
                      <td className="px-2 py-1 font-medium">{String(f.factor_name ?? "—")}</td>
                      <td className="px-2 py-1 tabular-nums">{fmt(f.exposure_pct)}</td>
                      <td className={`px-2 py-1 tabular-nums text-${color}-400`}>{fmt(f.return_contribution_pct)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="px-2 py-4 text-center text-muted-foreground">No data</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
