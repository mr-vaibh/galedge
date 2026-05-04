"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BarChart3 } from "lucide-react";
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
} from "recharts";

type ActiveDimension = "Market Cap" | "Sector" | "Industry";

const ACTIVE_DIMENSIONS: ActiveDimension[] = ["Market Cap", "Sector", "Industry"];
const DISABLED_DIMENSIONS = [
  "Total Risk", "Idiosyncratic Risk", "Liquidity", "Earnings Window",
  "IPO", "Financial Type", "Position Age",
];

const DIMENSION_KEYS: Record<ActiveDimension, string> = {
  "Market Cap": "mcap_slicing",
  "Sector": "sector_slicing",
  "Industry": "industry_slicing",
};

interface SliceRow {
  bucket?: string;
  name?: string;
  total_return_pct?: number;
  idio_return_pct?: number;
  factor_return_pct?: number;
  realized_risk_pct?: number;
  pe_ratio?: number;
  allocation_pct?: number;
  selection_pct?: number;
  interaction_pct?: number;
  [key: string]: unknown;
}

const COLORS = ["#f97316", "#10b981", "#3b82f6", "#a855f7", "#eab308", "#ef4444"];

function fmt(v: unknown, decimals = 2): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return n.toFixed(decimals);
}

function ColoredCell({ value }: { value: unknown }) {
  const n = Number(value);
  const s = fmt(value);
  if (s === "—") return <span className="tabular-nums">{s}</span>;
  return <span className={`tabular-nums ${n >= 0 ? "text-emerald-500" : "text-red-400"}`}>{s}</span>;
}

function SliceBarChart({ data, dataKey, label }: { data: SliceRow[]; dataKey: string; label: string }) {
  const chartData = data.map((r, i) => ({
    name: String(r.bucket ?? r.name ?? `Bucket ${i + 1}`),
    value: Number(r[dataKey] ?? 0),
  }));

  return (
    <Card>
      <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
        <CardTitle className="text-[11px]">{label}</CardTitle>
        <CardControls />
      </CardHeader>
      <CardContent className="p-2">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#71717a" }} tickLine={false} />
              <YAxis tick={{ fontSize: 8, fill: "#71717a" }} tickLine={false}
                tickFormatter={(v) => `${v.toFixed(1)}`} width={35} />
              <Tooltip
                contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 11 }}
                formatter={(v) => [`${Number(v).toFixed(2)}`]}
              />
              {chartData.map((entry, i) => (
                <Bar key={entry.name} dataKey="value" fill={COLORS[i % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center text-[10px] text-muted-foreground">No data</div>
        )}
      </CardContent>
    </Card>
  );
}

function SliceTable({
  title,
  columns,
  data,
  keys,
}: {
  title: string;
  columns: string[];
  data: SliceRow[];
  keys: string[];
}) {
  return (
    <Card>
      <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
        <CardTitle className="text-[11px]">{title}</CardTitle>
        <CardControls />
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-border/50">
              {columns.map((c) => (
                <th key={c} className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                <td className="px-2 py-1.5 font-medium">{String(row.bucket ?? row.name ?? "—")}</td>
                {keys.map((k) => (
                  <td key={k} className="px-2 py-1.5">
                    <ColoredCell value={fmt(row[k])} />
                  </td>
                ))}
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={columns.length} className="px-2 py-4 text-center text-muted-foreground">No data</td></tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export default function SlicingAndDicingPage() {
  const { analyticsData, analyticsLoading, selectedSourceId } = usePortfolio();
  const [activeDimension, setActiveDimension] = useState<ActiveDimension>("Market Cap");

  if (analyticsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Computing analytics...</span>
      </div>
    );
  }

  if (!analyticsData || !selectedSourceId) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-bold">Slicing &amp; Dicing</h1>
        <div className="rounded-lg border bg-card p-12 text-center space-y-3">
          <BarChart3 className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-muted-foreground">Select a portfolio or strategy from the sidebar to begin</p>
        </div>
      </div>
    );
  }

  const sliceData: SliceRow[] = (analyticsData[DIMENSION_KEYS[activeDimension]] as SliceRow[] | undefined) ?? [];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Slicing &amp; Dicing</h1>

      {/* Dimension selector */}
      <div className="flex gap-0.5 overflow-x-auto pb-1">
        {ACTIVE_DIMENSIONS.map((d) => (
          <button
            key={d}
            onClick={() => setActiveDimension(d)}
            className={`px-3 py-1.5 text-[10px] rounded whitespace-nowrap transition-colors ${
              activeDimension === d
                ? "bg-secondary text-secondary-foreground font-medium border-b-2 border-primary rounded-b-none"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
          >
            {d}
          </button>
        ))}
        {DISABLED_DIMENSIONS.map((d) => (
          <button
            key={d}
            disabled
            className="px-3 py-1.5 text-[10px] rounded whitespace-nowrap opacity-40 cursor-not-allowed text-muted-foreground"
            title="Coming soon"
          >
            {d}
          </button>
        ))}
      </div>

      {/* 4 tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SliceTable
          title={`Return Decomposition by ${activeDimension}`}
          columns={["Bucket", "Total Return (%)", "Idio Return (%)", "Factor Return (%)"]}
          keys={["total_return_pct", "idio_return_pct", "factor_return_pct"]}
          data={sliceData}
        />
        <SliceTable
          title={`Realized Volatility by ${activeDimension}`}
          columns={["Bucket", "Realized Risk (%)"]}
          keys={["realized_risk_pct"]}
          data={sliceData}
        />
        <SliceTable
          title={`Valuation by ${activeDimension}`}
          columns={["Bucket", "PE Ratio"]}
          keys={["pe_ratio"]}
          data={sliceData}
        />
        <SliceTable
          title={`Brinson Decomposition by ${activeDimension}`}
          columns={["Bucket", "Allocation (%)", "Selection (%)", "Interaction (%)"]}
          keys={["allocation_pct", "selection_pct", "interaction_pct"]}
          data={sliceData}
        />
      </div>

      {/* 4 bar charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SliceBarChart data={sliceData} dataKey="total_return_pct" label={`Total Return (%) by ${activeDimension}`} />
        <SliceBarChart data={sliceData} dataKey="realized_risk_pct" label={`Realized Risk (%) by ${activeDimension}`} />
        <SliceBarChart data={sliceData} dataKey="pe_ratio" label={`PE Ratio by ${activeDimension}`} />
        <SliceBarChart data={sliceData} dataKey="selection_pct" label={`Selection Effect (%) by ${activeDimension}`} />
      </div>
    </div>
  );
}
