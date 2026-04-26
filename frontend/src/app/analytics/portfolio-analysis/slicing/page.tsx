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
                    <td key={j} className={`px-2 py-1 tabular-nums ${j > 0 && cell.startsWith("-") ? "text-red-400" : j > 0 ? "" : ""}`}>
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

const slicingTotalReturnData = [
  { date: "2024-01", midCap: 1.2, smallCap: 0.8, micro: 0.5 },
  { date: "2024-02", midCap: 2.5, smallCap: 1.9, micro: 1.1 },
  { date: "2024-03", midCap: 3.1, smallCap: 2.8, micro: 1.8 },
  { date: "2024-04", midCap: 4.8, smallCap: 3.5, micro: 2.4 },
  { date: "2024-05", midCap: 5.2, smallCap: 4.1, micro: 3.0 },
  { date: "2024-06", midCap: 6.8, smallCap: 5.6, micro: 3.9 },
  { date: "2024-07", midCap: 7.5, smallCap: 6.2, micro: 4.5 },
  { date: "2024-08", midCap: 8.9, smallCap: 7.8, micro: 5.2 },
  { date: "2024-09", midCap: 9.4, smallCap: 8.1, micro: 5.8 },
  { date: "2024-10", midCap: 10.8, smallCap: 9.5, micro: 6.4 },
  { date: "2024-11", midCap: 12.1, smallCap: 10.2, micro: 7.1 },
  { date: "2024-12", midCap: 12.92, smallCap: 10.8, micro: 7.5 },
];

const slicingRollingVolData = [
  { date: "2024-01", midCap: 14.2, smallCap: 16.8, micro: 19.5 },
  { date: "2024-02", midCap: 13.8, smallCap: 16.2, micro: 18.9 },
  { date: "2024-03", midCap: 14.5, smallCap: 17.1, micro: 20.2 },
  { date: "2024-04", midCap: 13.1, smallCap: 15.8, micro: 18.4 },
  { date: "2024-05", midCap: 12.9, smallCap: 15.2, micro: 17.8 },
  { date: "2024-06", midCap: 13.5, smallCap: 16.0, micro: 18.6 },
  { date: "2024-07", midCap: 14.0, smallCap: 16.5, micro: 19.1 },
  { date: "2024-08", midCap: 13.3, smallCap: 15.5, micro: 18.0 },
  { date: "2024-09", midCap: 13.8, smallCap: 16.1, micro: 18.8 },
  { date: "2024-10", midCap: 14.1, smallCap: 16.7, micro: 19.4 },
  { date: "2024-11", midCap: 13.6, smallCap: 15.9, micro: 18.5 },
  { date: "2024-12", midCap: 13.9, smallCap: 16.3, micro: 19.0 },
];

const slicingPEData = [
  { date: "2024-01", midCap: 24.5, smallCap: 28.2, micro: 32.1 },
  { date: "2024-02", midCap: 25.1, smallCap: 28.8, micro: 33.0 },
  { date: "2024-03", midCap: 24.8, smallCap: 28.5, micro: 32.5 },
  { date: "2024-04", midCap: 25.5, smallCap: 29.2, micro: 33.8 },
  { date: "2024-05", midCap: 25.2, smallCap: 28.9, micro: 33.2 },
  { date: "2024-06", midCap: 24.9, smallCap: 28.6, micro: 32.8 },
  { date: "2024-07", midCap: 25.8, smallCap: 29.5, micro: 34.1 },
  { date: "2024-08", midCap: 25.4, smallCap: 29.1, micro: 33.5 },
  { date: "2024-09", midCap: 25.0, smallCap: 28.7, micro: 33.0 },
  { date: "2024-10", midCap: 25.6, smallCap: 29.3, micro: 33.9 },
  { date: "2024-11", midCap: 25.3, smallCap: 29.0, micro: 33.4 },
  { date: "2024-12", midCap: 25.1, smallCap: 28.8, micro: 33.1 },
];

const slicingAllocationData = [
  { date: "2024-01", midCap: 0.05, smallCap: 0.02, micro: -0.01 },
  { date: "2024-02", midCap: 0.08, smallCap: 0.04, micro: 0.01 },
  { date: "2024-03", midCap: 0.12, smallCap: 0.06, micro: 0.02 },
  { date: "2024-04", midCap: 0.15, smallCap: 0.09, micro: 0.03 },
  { date: "2024-05", midCap: 0.18, smallCap: 0.11, micro: 0.04 },
  { date: "2024-06", midCap: 0.22, smallCap: 0.14, micro: 0.05 },
  { date: "2024-07", midCap: 0.25, smallCap: 0.17, micro: 0.06 },
  { date: "2024-08", midCap: 0.28, smallCap: 0.19, micro: 0.07 },
  { date: "2024-09", midCap: 0.32, smallCap: 0.22, micro: 0.08 },
  { date: "2024-10", midCap: 0.35, smallCap: 0.25, micro: 0.09 },
  { date: "2024-11", midCap: 0.38, smallCap: 0.28, micro: 0.10 },
  { date: "2024-12", midCap: 0.42, smallCap: 0.31, micro: 0.12 },
];

const slicingTopHoldingsBar = [
  { name: "CANHLIFE", value: 3.39 },
  { name: "SENCO", value: 3.14 },
  { name: "FUSION", value: 2.78 },
  { name: "SUBEXLTD", value: 2.73 },
  { name: "TRENT", value: -1.28 },
  { name: "PAYTM", value: -1.41 },
  { name: "532960", value: -1.71 },
  { name: "IDFCFIRSTB", value: -3.25 },
];

const slicingSeriesConfig = [
  { key: "midCap", name: "Mid Cap", color: "#3b82f6" },
  { key: "smallCap", name: "Small Cap", color: "#10b981" },
  { key: "micro", name: "Micro", color: "#f59e0b" },
];

const CHART_CONFIGS: Record<string, { data: Record<string, unknown>[]; yFormatter?: (v: number) => string }> = {
  "Total Return (%)": { data: slicingTotalReturnData },
  "Rolling 1Y Realized (%)": { data: slicingRollingVolData },
  "PE Ratio": { data: slicingPEData, yFormatter: (v: number) => `${v.toFixed(1)}x` },
  "Allocation Effect (%)": { data: slicingAllocationData },
};

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
            series={slicingSeriesConfig}
            height={144}
            yFormatter={config.yFormatter}
          />
        </CardContent>
      </Card>
    );
  }
  // Fallback for "Top Holdings (%)" bar chart
  return (
    <Card>
      <CardHeader className="pb-1 flex-row items-center justify-between py-2 px-3">
        <CardTitle className="text-[11px]">{title}</CardTitle>
        <CardControls />
      </CardHeader>
      <CardContent>
        <BarChartPanel data={slicingTopHoldingsBar} height={144} />
      </CardContent>
    </Card>
  );
}

export default function SlicingAndDicingPage() {
  const [activeDimension, setActiveDimension] = useState("Market Cap");

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
      <h1 className="text-xl font-bold">Slicing and Dicing</h1>

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
          title="Return Decomposition"
          columns={decompositionCols}
          rows={decompositionRows}
          kpi
        />
        <DataTable
          title="Realized Volatility (%)"
          columns={volCols}
          rows={volRows}
          kpi
        />
        <DataTable
          title="Valuation Ratios"
          columns={["P/E Ratio", "ROE (%)"]}
          rows={[["22.5", "18.2%"], ["19.8", "15.7%"], ["24.1", "20.3%"], ["—", "—"]]}
          kpi
        />
        <DataTable
          title="Brinson Decomposition Summary"
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
          <h2 className="text-sm font-semibold">Contributors and Detractors</h2>
          <Tabs defaultValue="overall">
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
