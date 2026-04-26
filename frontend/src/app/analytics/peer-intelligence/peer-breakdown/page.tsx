"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Filter, Info, Maximize2 } from "lucide-react";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { BarChartPanel } from "@/components/charts/BarChartPanel";

const DIMENSIONS = [
  "Market Cap", "Liquidity", "Total Risk", "Idiosyncratic Risk",
  "Sector", "Industry", "Earnings Window", "IPO", "Financial Type", "Position Age",
];

function CardControls({ kpi = false }: { kpi?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {kpi && (
        <Select>
          <SelectTrigger className="h-5 w-[60px] text-[9px] border-0"><SelectValue placeholder="KPI" /></SelectTrigger>
          <SelectContent><SelectItem value="default">KPI</SelectItem></SelectContent>
        </Select>
      )}
      <Button variant="ghost" size="icon" className="h-5 w-5"><Filter className="h-2.5 w-2.5" /></Button>
      <Button variant="ghost" size="icon" className="h-5 w-5"><Info className="h-2.5 w-2.5" /></Button>
      <Button variant="ghost" size="icon" className="h-5 w-5"><Maximize2 className="h-2.5 w-2.5" /></Button>
      <Button variant="ghost" size="icon" className="h-5 w-5"><Download className="h-2.5 w-2.5" /></Button>
    </div>
  );
}

function DataTable({ title, columns, rows, kpi = false }: { title: string; columns: string[]; rows: string[][]; kpi?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-1 flex-row items-center justify-between py-2 px-3">
        <CardTitle className="text-[11px]">{title}</CardTitle>
        <CardControls kpi={kpi} />
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-border/50">
                {columns.map((c) => (
                  <th key={c} className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                    {c} <span className="text-[8px]">v</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                  {row.map((cell, j) => (
                    <td key={j} className={`px-2 py-1 tabular-nums ${j > 0 && cell.startsWith("-") ? "text-red-400" : ""}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

const peerReturnData = [
  { date: "2024-01", active: 1.2, peer: 0.9 },
  { date: "2024-02", active: 2.5, peer: 1.8 },
  { date: "2024-03", active: 3.1, peer: 2.4 },
  { date: "2024-04", active: 4.8, peer: 3.2 },
  { date: "2024-05", active: 5.2, peer: 3.9 },
  { date: "2024-06", active: 6.8, peer: 5.1 },
  { date: "2024-07", active: 7.5, peer: 5.8 },
  { date: "2024-08", active: 8.9, peer: 7.2 },
  { date: "2024-09", active: 9.4, peer: 7.6 },
  { date: "2024-10", active: 10.8, peer: 8.9 },
  { date: "2024-11", active: 12.1, peer: 9.5 },
  { date: "2024-12", active: 12.92, peer: 10.1 },
];

const peerRiskData = [
  { date: "2024-01", active: 14.2, peer: 15.8 },
  { date: "2024-02", active: 13.8, peer: 15.2 },
  { date: "2024-03", active: 14.5, peer: 16.1 },
  { date: "2024-04", active: 13.1, peer: 14.8 },
  { date: "2024-05", active: 12.9, peer: 14.5 },
  { date: "2024-06", active: 13.5, peer: 15.0 },
  { date: "2024-07", active: 14.0, peer: 15.5 },
  { date: "2024-08", active: 13.3, peer: 14.6 },
  { date: "2024-09", active: 13.8, peer: 15.1 },
  { date: "2024-10", active: 14.1, peer: 15.7 },
  { date: "2024-11", active: 13.6, peer: 14.9 },
  { date: "2024-12", active: 13.9, peer: 15.3 },
];

const peerPEData = [
  { date: "2024-01", active: 24.5, peer: 26.2 },
  { date: "2024-02", active: 25.1, peer: 26.8 },
  { date: "2024-03", active: 24.8, peer: 26.5 },
  { date: "2024-04", active: 25.5, peer: 27.2 },
  { date: "2024-05", active: 25.2, peer: 26.9 },
  { date: "2024-06", active: 24.9, peer: 26.6 },
  { date: "2024-07", active: 25.8, peer: 27.5 },
  { date: "2024-08", active: 25.4, peer: 27.1 },
  { date: "2024-09", active: 25.0, peer: 26.7 },
  { date: "2024-10", active: 25.6, peer: 27.3 },
  { date: "2024-11", active: 25.3, peer: 27.0 },
  { date: "2024-12", active: 25.1, peer: 26.8 },
];

const peerAllocationData = [
  { date: "2024-01", active: 0.05, peer: 0.03 },
  { date: "2024-02", active: 0.08, peer: 0.05 },
  { date: "2024-03", active: 0.12, peer: 0.07 },
  { date: "2024-04", active: 0.15, peer: 0.10 },
  { date: "2024-05", active: 0.18, peer: 0.12 },
  { date: "2024-06", active: 0.22, peer: 0.15 },
  { date: "2024-07", active: 0.25, peer: 0.18 },
  { date: "2024-08", active: 0.28, peer: 0.20 },
  { date: "2024-09", active: 0.32, peer: 0.23 },
  { date: "2024-10", active: 0.35, peer: 0.26 },
  { date: "2024-11", active: 0.38, peer: 0.29 },
  { date: "2024-12", active: 0.42, peer: 0.32 },
];

const peerSeriesConfig = [
  { key: "active", name: "Active", color: "#f97316" },
  { key: "peer", name: "Peer", color: "#3b82f6" },
];

const CHART_CONFIGS: Record<string, { data: Record<string, unknown>[]; yFormatter?: (v: number) => string }> = {
  "Total Return (%)": { data: peerReturnData },
  "Rolling 1Y Realized (%)": { data: peerRiskData },
  "PE Ratio": { data: peerPEData, yFormatter: (v: number) => `${v.toFixed(1)}x` },
  "Allocation Effect (%)": { data: peerAllocationData },
};

const peerTopHoldingsBar = [
  { name: "CANHLIFE", value: 3.39 },
  { name: "SENCO", value: 3.14 },
  { name: "FUSION", value: 2.78 },
  { name: "SUBEXLTD", value: 2.73 },
  { name: "TRENT", value: -1.28 },
  { name: "PAYTM", value: -1.41 },
  { name: "532960", value: -1.71 },
  { name: "IDFCFIRSTB", value: -3.25 },
];

function ChartPanel({ title }: { title: string }) {
  const config = CHART_CONFIGS[title];
  if (config) {
    return (
      <Card>
        <CardHeader className="pb-1 flex-row items-center justify-between py-2 px-3">
          <CardTitle className="text-[11px]">{title}</CardTitle>
          <CardControls />
        </CardHeader>
        <CardContent>
          <TimeSeriesChart
            data={config.data}
            series={peerSeriesConfig}
            height={144}
            yFormatter={config.yFormatter}
          />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader className="pb-1 flex-row items-center justify-between py-2 px-3">
        <CardTitle className="text-[11px]">{title}</CardTitle>
        <CardControls />
      </CardHeader>
      <CardContent>
        <BarChartPanel data={peerTopHoldingsBar} height={144} />
      </CardContent>
    </Card>
  );
}

export default function PeerBreakdownPage() {
  const [activeDimension, setActiveDimension] = useState("Market Cap");
  const [contributorTab, setContributorTab] = useState("overall");

  const decompositionCols = ["Dividend Return (%)", "Other Return (%)", "Transaction Cost (%)", "Brokerage Fees (%)"];
  const decompositionRows = [
    ["-0.14%", "0.19%", "-1.69%", "-0.54%"],
    ["12.92%", "-1.14%", "-60.43%", "-22.2%"],
    ["0.67%", "0.68%", "-13.66%", "-4.28%"],
    ["0%", "0%", "0%", "0%"],
  ];

  const volCols = ["Market Realized Risk (%)", "Style Realized Risk (%)", "Industry Realized Risk (%)"];
  const volRows = [
    ["0%", "0%", "0%"],
    ["3.78%", "2.82%", "1.49%"],
    ["5.05%", "5.95%", "4.29%"],
    ["0%", "0%", "0%"],
  ];

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-bold">Peer Breakdown</h1>

      {/* Dimension Tabs */}
      <div className="flex gap-0.5 overflow-x-auto pb-1">
        {DIMENSIONS.map((d) => (
          <Button
            key={d}
            variant={activeDimension === d ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveDimension(d)}
            className={`h-7 text-[10px] whitespace-nowrap ${activeDimension === d ? "border-b-2 border-blue-500 rounded-b-none" : ""}`}
          >
            {d}
          </Button>
        ))}
      </div>

      {/* 8-Panel Grid: 2 rows x 4 cols */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        {/* Row 1: Tables */}
        <DataTable
          title="Return Decomposition (vs Peers)"
          columns={decompositionCols}
          rows={decompositionRows}
          kpi
        />
        <DataTable
          title="Realized Volatility (vs Peers) (%)"
          columns={volCols}
          rows={volRows}
          kpi
        />
        <DataTable
          title="Valuation Ratios (vs Peers)"
          columns={["P/E Ratio", "ROE (%)"]}
          rows={[["22.5", "18.2%"], ["24.1", "16.1%"], ["19.8", "15.7%"], ["—", "—"]]}
          kpi
        />
        <DataTable
          title="Brinson Decomposition (vs Peers)"
          columns={["Allocation (%)", "Selection (%)"]}
          rows={[["0.12%", "0.45%"], ["-0.08%", "1.23%"], ["0.34%", "-0.15%"], ["0%", "0%"]]}
          kpi
        />

        {/* Row 2: Charts */}
        <ChartPanel title="Total Return (%)" />
        <ChartPanel title="Rolling 1Y Realized (%)" />
        <ChartPanel title="PE Ratio" />
        <ChartPanel title="Allocation Effect (%)" />
      </div>

      {/* Contributors and Detractors */}
      <div className="mt-4">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-semibold">Contributors and Detractors (vs Peers)</h2>
          <Tabs value={contributorTab} onValueChange={(v) => { if (typeof v === "string") setContributorTab(v); }}>
            <TabsList className="h-7">
              <TabsTrigger value="overall" className="text-[10px] h-6">Overall</TabsTrigger>
              <TabsTrigger value="idio" className="text-[10px] h-6">Idio</TabsTrigger>
              <TabsTrigger value="factor" className="text-[10px] h-6">Factor</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <DataTable
            title="Top 10 - Holdings (%)"
            columns={["Symbol", "Holdings (%)", "Raw Return (%)", "Total Return (%)", "Total Risk Contribution (%)"]}
            rows={[
              ["CANHLIFE", "3.39%", "17.26%", "0.48%", "1.78%"],
              ["SENCO", "3.14%", "80.55%", "2%", "10.44%"],
              ["FUSION", "2.78%", "15.49%", "0.4%", "1.14%"],
              ["SUBEXLTD", "2.73%", "24.29%", "0.35%", "11.58%"],
            ]}
            kpi
          />
          <DataTable
            title="Bottom 10 - Holdings (%)"
            columns={["Symbol", "Holdings (%)", "Raw Return (%)", "Total Return (%)", "Total Risk Contribution (%)"]}
            rows={[
              ["IDFCFIRSTB", "-3.25%", "-24.16%", "0.88%", "9.52%"],
              ["532960", "-1.71%", "29.26%", "-0.91%", "6.04%"],
              ["PAYTM", "-1.41%", "9.54%", "-0.15%", "11.77%"],
              ["TRENT", "-1.28%", "-8.07%", "0.1%", "3.08%"],
            ]}
            kpi
          />
          <ChartPanel title="Top Holdings (%)" />
        </div>
      </div>
    </div>
  );
}
