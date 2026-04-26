"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChartPanel } from "@/components/charts/BarChartPanel";
import { CardControls } from "@/components/CardControls";

function STable({ title, rows, columns }: { title: string; rows: string[][]; columns: string[] }) {
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
                <th key={c} className="px-2 py-1.5 text-left font-medium text-muted-foreground">{c}</th>
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
      </CardContent>
    </Card>
  );
}

const ANNUAL_PNL = [
  ["2020", "12.45%", "8.92%", "3.53%"],
  ["2021", "28.71%", "24.12%", "4.59%"],
  ["2022", "-8.32%", "-10.15%", "1.83%"],
  ["2023", "19.87%", "15.43%", "4.44%"],
  ["2024", "18.97%", "14.23%", "4.74%"],
];

const ANNUAL_RISK = [
  ["2020", "18.2%", "16.8%", "12.5%"],
  ["2021", "14.5%", "13.1%", "9.8%"],
  ["2022", "20.1%", "18.9%", "14.2%"],
  ["2023", "15.3%", "13.8%", "10.1%"],
  ["2024", "14.5%", "12.8%", "8.2%"],
];

const ANNUAL_STATS = [
  ["2020", "0.68", "-15.2%", "1.24"],
  ["2021", "1.98", "-8.1%", "2.15"],
  ["2022", "-0.41", "-22.4%", "0.72"],
  ["2023", "1.30", "-11.8%", "1.85"],
  ["2024", "1.31", "-9.5%", "1.92"],
];

const MONTHLY_PNL = [
  ["Jan 2024", "2.15%", "1.82%", "0.33%"],
  ["Feb 2024", "1.87%", "1.45%", "0.42%"],
  ["Mar 2024", "-0.52%", "-1.12%", "0.60%"],
  ["Apr 2024", "3.21%", "2.54%", "0.67%"],
  ["May 2024", "1.45%", "0.98%", "0.47%"],
  ["Jun 2024", "2.78%", "2.12%", "0.66%"],
  ["Jul 2024", "-1.12%", "-1.85%", "0.73%"],
  ["Aug 2024", "1.95%", "1.42%", "0.53%"],
  ["Sep 2024", "2.34%", "1.89%", "0.45%"],
  ["Oct 2024", "1.67%", "1.24%", "0.43%"],
  ["Nov 2024", "2.89%", "2.31%", "0.58%"],
  ["Dec 2024", "0.30%", "0.43%", "-0.13%"],
];

const MONTHLY_RISK = [
  ["Jan 2024", "14.8%", "13.2%", "8.5%"],
  ["Feb 2024", "14.2%", "12.8%", "8.1%"],
  ["Mar 2024", "15.1%", "13.5%", "8.9%"],
  ["Apr 2024", "13.9%", "12.4%", "7.8%"],
  ["May 2024", "14.5%", "13.0%", "8.3%"],
  ["Jun 2024", "14.1%", "12.6%", "8.0%"],
  ["Jul 2024", "15.3%", "13.8%", "9.2%"],
  ["Aug 2024", "14.6%", "13.1%", "8.4%"],
  ["Sep 2024", "14.3%", "12.7%", "8.1%"],
  ["Oct 2024", "14.0%", "12.5%", "7.9%"],
  ["Nov 2024", "14.8%", "13.3%", "8.6%"],
  ["Dec 2024", "14.5%", "12.8%", "8.2%"],
];

const MONTHLY_STATS = [
  ["Jan 2024", "0.52", "-3.2%", "1.18"],
  ["Feb 2024", "0.47", "-2.8%", "1.29"],
  ["Mar 2024", "-0.12", "-5.1%", "0.46"],
  ["Apr 2024", "0.82", "-1.9%", "1.69"],
  ["May 2024", "0.36", "-3.5%", "1.14"],
  ["Jun 2024", "0.70", "-2.4%", "1.56"],
  ["Jul 2024", "-0.26", "-6.2%", "0.61"],
  ["Aug 2024", "0.48", "-3.0%", "1.30"],
  ["Sep 2024", "0.58", "-2.6%", "1.45"],
  ["Oct 2024", "0.42", "-3.1%", "1.22"],
  ["Nov 2024", "0.69", "-2.2%", "1.62"],
  ["Dec 2024", "0.07", "-4.5%", "1.03"],
];

const annualBarData = [
  { name: "2020", value: 12.45 },
  { name: "2021", value: 28.71 },
  { name: "2022", value: -8.32 },
  { name: "2023", value: 19.87 },
  { name: "2024", value: 18.97 },
];

const monthlyBarData = [
  { name: "Jan", value: 2.15 },
  { name: "Feb", value: 1.87 },
  { name: "Mar", value: -0.52 },
  { name: "Apr", value: 3.21 },
  { name: "May", value: 1.45 },
  { name: "Jun", value: 2.78 },
  { name: "Jul", value: -1.12 },
  { name: "Aug", value: 1.95 },
  { name: "Sep", value: 2.34 },
  { name: "Oct", value: 1.67 },
  { name: "Nov", value: 2.89 },
  { name: "Dec", value: 0.30 },
];

export default function PeriodAnalysisPage() {
  const [period, setPeriod] = useState<"annual" | "monthly">("annual");

  const pnlRows = period === "annual" ? ANNUAL_PNL : MONTHLY_PNL;
  const riskRows = period === "annual" ? ANNUAL_RISK : MONTHLY_RISK;
  const statsRows = period === "annual" ? ANNUAL_STATS : MONTHLY_STATS;
  const barData = period === "annual" ? annualBarData : monthlyBarData;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Period Analysis</h1>
        <div className="flex items-center gap-1 bg-card border rounded-lg p-0.5">
          <Button
            variant={period === "annual" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setPeriod("annual")}
            className="h-7 text-[10px] px-3"
          >
            Annual
          </Button>
          <Button
            variant={period === "monthly" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setPeriod("monthly")}
            className="h-7 text-[10px] px-3"
          >
            Monthly
          </Button>
        </div>
      </div>

      {/* Summary Tables */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <STable
          title="Profit and Loss Summary"
          columns={["Period", "Active Return", "Benchmark Return", "Excess Return"]}
          rows={pnlRows}
        />
        <STable
          title="Risk Summary"
          columns={["Period", "Realized Risk", "Predicted Risk", "Factor Risk"]}
          rows={riskRows}
        />
        <STable
          title="P&L Statistics"
          columns={["Period", "Sharpe Ratio", "Max Drawdown", "Profit Factor"]}
          rows={statsRows}
        />
      </div>

      {/* Return Decomposition Bar Chart */}
      <Card>
        <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
          <CardTitle className="text-[11px]">Return Decomposition (%)</CardTitle>
          <CardControls />
        </CardHeader>
        <CardContent className="p-2">
          <BarChartPanel data={barData} height={220} />
        </CardContent>
      </Card>
    </div>
  );
}
