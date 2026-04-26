"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Filter, Info, Maximize2 } from "lucide-react";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { BarChartPanel } from "@/components/charts/BarChartPanel";

function CC() {
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-5 w-5"><Filter className="h-2.5 w-2.5" /></Button>
      <Button variant="ghost" size="icon" className="h-5 w-5"><Info className="h-2.5 w-2.5" /></Button>
      <Button variant="ghost" size="icon" className="h-5 w-5"><Maximize2 className="h-2.5 w-2.5" /></Button>
      <Button variant="ghost" size="icon" className="h-5 w-5"><Download className="h-2.5 w-2.5" /></Button>
    </div>
  );
}

function STable({ title, rows }: { title: string; rows: [string, string, string][] }) {
  return (
    <Card>
      <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
        <CardTitle className="text-[11px]">{title}</CardTitle>
        <CC />
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-border/50">
              <th className="px-2 py-1.5 text-left font-medium text-muted-foreground" />
              <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Active</th>
              <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Benchmark</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, active, benchmark], i) => (
              <tr key={i} className="border-b border-border/30">
                <td className="px-2 py-1 text-muted-foreground">{label}</td>
                <td className="px-2 py-1 text-right tabular-nums">{active}</td>
                <td className="px-2 py-1 text-right tabular-nums">{benchmark}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

const returnDecompData = [
  { date: "2024-01", factor: 1.2, idio: 0.8, total: 2.0 },
  { date: "2024-02", factor: 2.1, idio: 1.1, total: 3.2 },
  { date: "2024-03", factor: 1.8, idio: 1.5, total: 3.3 },
  { date: "2024-04", factor: 3.0, idio: 0.9, total: 3.9 },
  { date: "2024-05", factor: 2.5, idio: 1.8, total: 4.3 },
  { date: "2024-06", factor: 4.1, idio: 2.2, total: 6.3 },
  { date: "2024-07", factor: 5.3, idio: 2.8, total: 8.1 },
  { date: "2024-08", factor: 6.8, idio: 3.1, total: 9.9 },
  { date: "2024-09", factor: 7.5, idio: 3.9, total: 11.4 },
  { date: "2024-10", factor: 9.2, idio: 4.5, total: 13.7 },
  { date: "2024-11", factor: 10.8, idio: 5.6, total: 16.4 },
  { date: "2024-12", factor: 12.3, idio: 6.67, total: 18.97 },
];

const riskData = [
  { date: "2024-01", realized: 15.1, predicted: 13.2, factor: 8.8 },
  { date: "2024-02", realized: 14.8, predicted: 13.0, factor: 8.5 },
  { date: "2024-03", realized: 15.5, predicted: 13.5, factor: 9.0 },
  { date: "2024-04", realized: 14.2, predicted: 12.6, factor: 8.1 },
  { date: "2024-05", realized: 13.9, predicted: 12.4, factor: 7.9 },
  { date: "2024-06", realized: 14.7, predicted: 13.1, factor: 8.4 },
  { date: "2024-07", realized: 15.0, predicted: 12.9, factor: 8.3 },
  { date: "2024-08", realized: 14.3, predicted: 12.7, factor: 8.0 },
  { date: "2024-09", realized: 14.6, predicted: 12.8, factor: 8.2 },
  { date: "2024-10", realized: 14.1, predicted: 12.5, factor: 7.8 },
  { date: "2024-11", realized: 14.8, predicted: 13.0, factor: 8.4 },
  { date: "2024-12", realized: 14.5, predicted: 12.8, factor: 8.2 },
];

const peData = [
  { date: "2024-01", active: 20.1, benchmark: 18.5 },
  { date: "2024-02", active: 20.8, benchmark: 18.9 },
  { date: "2024-03", active: 21.2, benchmark: 19.2 },
  { date: "2024-04", active: 21.8, benchmark: 19.5 },
  { date: "2024-05", active: 22.1, benchmark: 19.7 },
  { date: "2024-06", active: 21.5, benchmark: 19.4 },
  { date: "2024-07", active: 22.0, benchmark: 19.6 },
  { date: "2024-08", active: 22.3, benchmark: 19.8 },
  { date: "2024-09", active: 22.8, benchmark: 20.0 },
  { date: "2024-10", active: 22.1, benchmark: 19.7 },
  { date: "2024-11", active: 22.4, benchmark: 19.9 },
  { date: "2024-12", active: 22.5, benchmark: 19.8 },
];

const mktCapData = [
  { date: "2024-01", active: 85200, benchmark: 92400 },
  { date: "2024-02", active: 87100, benchmark: 93200 },
  { date: "2024-03", active: 88400, benchmark: 94100 },
  { date: "2024-04", active: 90200, benchmark: 95300 },
  { date: "2024-05", active: 91800, benchmark: 96100 },
  { date: "2024-06", active: 93500, benchmark: 97200 },
  { date: "2024-07", active: 95100, benchmark: 98400 },
  { date: "2024-08", active: 96800, benchmark: 99100 },
  { date: "2024-09", active: 98200, benchmark: 100300 },
  { date: "2024-10", active: 99800, benchmark: 101500 },
  { date: "2024-11", active: 101400, benchmark: 102800 },
  { date: "2024-12", active: 103200, benchmark: 104100 },
];

const topHoldingsBarData = [
  { name: "CANHLIFE", value: 3.39 },
  { name: "SENCO", value: 3.14 },
  { name: "FUSION", value: 2.78 },
  { name: "SUBEXLTD", value: 2.73 },
  { name: "GABRIEL", value: 2.51 },
  { name: "ATHERENERG", value: 2.35 },
  { name: "CHOICEIN", value: 2.12 },
  { name: "TRENT", value: -1.28 },
  { name: "PAYTM", value: -1.41 },
  { name: "IDFCFIRSTB", value: -3.25 },
];

const OVERALL_TOP = [
  ["CANHLIFE", "3.39%", "17.26%", "0.48%", "1.78%"],
  ["SENCO", "3.14%", "80.55%", "2%", "10.44%"],
  ["FUSION", "2.78%", "15.49%", "0.4%", "1.14%"],
];
const OVERALL_BOTTOM = [
  ["IDFCFIRSTB", "-3.25%", "-24.16%", "0.88%", "9.52%"],
  ["PAYTM", "-1.41%", "9.54%", "-0.15%", "11.77%"],
];
const OVERALL_COLS = ["Symbol", "Holdings (%)", "Raw Return (%)", "Total Return (%)", "Risk Contrib (%)"];

const IDIO_TOP = [
  ["SENCO", "3.14%", "72.11%", "1.85%", "8.92%"],
  ["CANHLIFE", "3.39%", "12.04%", "0.33%", "1.02%"],
  ["FUSION", "2.78%", "10.21%", "0.26%", "0.78%"],
];
const IDIO_BOTTOM = [
  ["IDFCFIRSTB", "-3.25%", "-18.92%", "0.69%", "7.14%"],
  ["PAYTM", "-1.41%", "5.12%", "-0.08%", "9.41%"],
];
const IDIO_COLS = ["Symbol", "Holdings (%)", "Idio Raw Return (%)", "Idio Return (%)", "Idio Risk (%)"];

const FACTOR_TOP = [
  ["Market", "MARKET", "0.98", "6.91%", "8.2%"],
  ["Style", "LTMOM", "0.72", "3.42%", "1.8%"],
  ["Style", "SIZE", "1.45", "1.07%", "2.1%"],
];
const FACTOR_BOTTOM = [
  ["Style", "FINLVG", "-0.18", "-0.52%", "0.9%"],
  ["Style", "BETA", "-0.32", "1.26%", "1.5%"],
];
const FACTOR_COLS = ["Factor Type", "Factor Name", "Factor Exposure", "Factor Return (%)", "Factor Risk Contrib (%)"];

export default function ReturnsAndRiskPage() {
  const [contributorTab, setContributorTab] = useState("overall");
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Performance Summary</h1>
        <Tabs defaultValue="active">
          <TabsList className="h-7">
            <TabsTrigger value="active" className="text-[10px] h-6">Active</TabsTrigger>
            <TabsTrigger value="benchmark" className="text-[10px] h-6">Benchmark</TabsTrigger>
            <TabsTrigger value="excess" className="text-[10px] h-6">Excess</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary Tables Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <STable title="Profit and Loss Summary" rows={[
          ["Total Return (%)", "18.97%", "9.57%"],
          ["Factor Return (%)", "12.3%", "8.9%"],
          ["Idiosyncratic Return (%)", "6.67%", "0.67%"],
          ["CAGR (%)", "5.07%", "0.07%"],
          ["Sharpe Ratio", "0.52", "0.13"],
        ]} />
        <STable title="Risk Summary" rows={[
          ["Realized Risk (%)", "14.5%", "16.2%"],
          ["Total Predicted Risk (%)", "12.8%", "14.1%"],
          ["Factor Predicted Risk (%)", "8.2%", "12.5%"],
          ["Portfolio Concentration", "0.042", "0.018"],
        ]} />
        <STable title="Valuation Summary" rows={[
          ["P/E Ratio", "22.5", "19.8"],
          ["Return on Equity (%)", "18.2%", "15.7%"],
        ]} />
        <STable title="Brinson Decomposition Summary" rows={[
          ["Allocation Effect (%)", "1.2%", "—"],
          ["Selection Effect (%)", "3.4%", "—"],
          ["Interaction Effect (%)", "0.8%", "—"],
        ]} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Return Decomposition (%)</CardTitle>
            <CC />
          </CardHeader>
          <CardContent>
            <TimeSeriesChart
              data={returnDecompData}
              series={[
                { key: "total", name: "Total", color: "#3b82f6" },
                { key: "factor", name: "Factor", color: "#10b981" },
                { key: "idio", name: "Idiosyncratic", color: "#f59e0b" },
              ]}
              height={160}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Predicted Risk (%)</CardTitle>
            <CC />
          </CardHeader>
          <CardContent>
            <TimeSeriesChart
              data={riskData}
              series={[
                { key: "realized", name: "Realized", color: "#ef4444" },
                { key: "predicted", name: "Predicted", color: "#3b82f6" },
                { key: "factor", name: "Factor", color: "#10b981" },
              ]}
              height={160}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">PE Ratio</CardTitle>
            <CC />
          </CardHeader>
          <CardContent>
            <TimeSeriesChart
              data={peData}
              series={[
                { key: "active", name: "Active", color: "#3b82f6" },
                { key: "benchmark", name: "Benchmark", color: "#f59e0b" },
              ]}
              height={160}
              yFormatter={(v) => `${v.toFixed(1)}x`}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Market Cap</CardTitle>
            <CC />
          </CardHeader>
          <CardContent>
            <TimeSeriesChart
              data={mktCapData}
              series={[
                { key: "active", name: "Active", color: "#3b82f6" },
                { key: "benchmark", name: "Benchmark", color: "#f59e0b" },
              ]}
              height={160}
              yFormatter={(v) => `${(v / 1000).toFixed(0)}K Cr`}
            />
          </CardContent>
        </Card>
      </div>

      {/* Contributors */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-semibold">Contributors and Detractors</h2>
          <Tabs value={contributorTab} onValueChange={(v) => { if (typeof v === "string") setContributorTab(v); }}>
            <TabsList className="h-7">
              <TabsTrigger value="overall" className="text-[10px] h-6">Overall</TabsTrigger>
              <TabsTrigger value="idio" className="text-[10px] h-6">Idio</TabsTrigger>
              <TabsTrigger value="factor" className="text-[10px] h-6">Factor</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Card>
            <CardHeader className="pb-1 py-2 px-3"><CardTitle className="text-[11px]">
              {contributorTab === "factor" ? "Top Factors" : "Top 10 - Holdings (%)"}
            </CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-[10px]">
                <thead><tr className="border-b border-border/50">
                  {(contributorTab === "overall" ? OVERALL_COLS : contributorTab === "idio" ? IDIO_COLS : FACTOR_COLS).map(h => <th key={h} className="px-2 py-1.5 text-left text-muted-foreground font-medium">{h}</th>)}
                </tr></thead>
                <tbody>
                  {(contributorTab === "overall" ? OVERALL_TOP : contributorTab === "idio" ? IDIO_TOP : FACTOR_TOP).map((r,i)=>(
                    <tr key={i} className="border-b border-border/30">{r.map((c,j)=><td key={j} className="px-2 py-1 tabular-nums">{c}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 py-2 px-3"><CardTitle className="text-[11px]">
              {contributorTab === "factor" ? "Bottom Factors" : "Bottom 10 - Holdings (%)"}
            </CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-[10px]">
                <thead><tr className="border-b border-border/50">
                  {(contributorTab === "overall" ? OVERALL_COLS : contributorTab === "idio" ? IDIO_COLS : FACTOR_COLS).map(h => <th key={h} className="px-2 py-1.5 text-left text-muted-foreground font-medium">{h}</th>)}
                </tr></thead>
                <tbody>
                  {(contributorTab === "overall" ? OVERALL_BOTTOM : contributorTab === "idio" ? IDIO_BOTTOM : FACTOR_BOTTOM).map((r,i)=>(
                    <tr key={i} className="border-b border-border/30">{r.map((c,j)=><td key={j} className={`px-2 py-1 tabular-nums ${c.startsWith("-")?"text-red-400":""}`}>{c}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
              <CardTitle className="text-[11px]">Top Holdings (%)</CardTitle>
              <CC />
            </CardHeader>
            <CardContent>
              <BarChartPanel data={topHoldingsBarData} height={160} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
