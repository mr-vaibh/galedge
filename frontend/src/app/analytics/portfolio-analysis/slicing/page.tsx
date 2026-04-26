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
import { Download, Filter, Info, Maximize2, BarChart3 } from "lucide-react";

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

function ChartPanel({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader className="pb-1 flex-row items-center justify-between py-2 px-3">
        <CardTitle className="text-[11px]">{title}</CardTitle>
        <CardControls />
      </CardHeader>
      <CardContent>
        <div className="h-36 flex items-center justify-center border border-dashed border-border/30 rounded">
          <div className="text-center">
            <BarChart3 className="h-5 w-5 mx-auto mb-1 opacity-20 text-muted-foreground" />
            <p className="text-[9px] text-muted-foreground/60">{title}</p>
            <div className="flex gap-2 justify-center mt-1">
              {["Mid Cap", "Small Cap", "Micro"].map((l, i) => (
                <span key={l} className="flex items-center gap-0.5 text-[7px] text-muted-foreground/40">
                  <span className="w-1.5 h-0.5 rounded" style={{ backgroundColor: ["#3b82f6", "#10b981", "#f59e0b"][i] }} />
                  {l}
                </span>
              ))}
            </div>
          </div>
        </div>
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
