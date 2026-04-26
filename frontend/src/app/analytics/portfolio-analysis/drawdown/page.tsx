"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Filter, Info, Maximize2 } from "lucide-react";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { BarChartPanel } from "@/components/charts/BarChartPanel";

function CardControls() {
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-5 w-5"><Filter className="h-2.5 w-2.5" /></Button>
      <Button variant="ghost" size="icon" className="h-5 w-5"><Info className="h-2.5 w-2.5" /></Button>
      <Button variant="ghost" size="icon" className="h-5 w-5"><Maximize2 className="h-2.5 w-2.5" /></Button>
      <Button variant="ghost" size="icon" className="h-5 w-5"><Download className="h-2.5 w-2.5" /></Button>
    </div>
  );
}

const DRAWDOWNS = [
  { id: 1, start: "15-Jan-2024", end: "28-Mar-2024", maxDD: "-18.42%", recovery: "12-Jun-2024", duration: "72 days" },
  { id: 2, start: "01-Sep-2024", end: "15-Oct-2024", maxDD: "-12.85%", recovery: "—", duration: "45 days" },
  { id: 3, start: "20-Feb-2020", end: "23-Mar-2020", maxDD: "-35.62%", recovery: "15-Nov-2020", duration: "23 days" },
];

export default function DrawdownPage() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Drawdown Summary</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Drawdown Summary Table */}
        <Card>
          <CardHeader className="pb-1 flex-row items-center justify-between py-2 px-3">
            <CardTitle className="text-[11px]">Drawdown Summary</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-border/50">
                  {["#", "Start Date", "End Date", "Max Drawdown", "Recovery Date", "Duration"].map((h) => (
                    <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DRAWDOWNS.map((d) => (
                  <tr key={d.id} className="border-b border-border/30 hover:bg-muted/20 cursor-pointer">
                    <td className="px-2 py-1.5">{d.id}</td>
                    <td className="px-2 py-1.5">{d.start}</td>
                    <td className="px-2 py-1.5">{d.end}</td>
                    <td className="px-2 py-1.5 text-red-400 font-medium tabular-nums">{d.maxDD}</td>
                    <td className="px-2 py-1.5">{d.recovery}</td>
                    <td className="px-2 py-1.5">{d.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Drawdown Loss Heatmap */}
        <Card>
          <CardHeader className="pb-1 flex-row items-center justify-between py-2 px-3">
            <CardTitle className="text-[11px]">Drawdown Loss (%)</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 gap-1">
              {Array.from({ length: 24 }).map((_, i) => {
                const loss = Math.random() * -20;
                const opacity = Math.min(1, Math.abs(loss) / 20);
                return (
                  <div
                    key={i}
                    className="aspect-square rounded text-[7px] flex items-center justify-center tabular-nums"
                    style={{ backgroundColor: `rgba(220, 38, 38, ${opacity * 0.7})`, color: opacity > 0.3 ? "white" : "transparent" }}
                  >
                    {loss.toFixed(1)}%
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contributors and Detractors */}
      <div>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card>
            <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
              <CardTitle className="text-[11px]">Drop Detractors</CardTitle>
              <CardControls />
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-border/50">
                    {["Symbol", "Raw Return (%)", "Total Return (%)", "Total Risk Contribution (%)"].map((h) => (
                      <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["KESORAMIND", "1.08%", "-93.92%", "-1.15%"],
                    ["NATCOPHARM", "1.76%", "-40.73%", "-0.92%"],
                    ["MGL", "0.68%", "1.31%", "-0.68%"],
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-border/30">
                      {row.map((cell, j) => (
                        <td key={j} className={`px-2 py-1 tabular-nums ${j > 0 && cell.startsWith("-") ? "text-red-400" : ""}`}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
              <CardTitle className="text-[11px]">Recovery Contributors</CardTitle>
              <CardControls />
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-border/50">
                    {["Symbol", "Raw Return (%)", "Total Return (%)", "Total Risk Contribution (%)"].map((h) => (
                      <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["GABRIEL", "4.98%", "98.76%", "2.9%"],
                    ["ATHERENERG", "2.83%", "32.85%", "0.95%"],
                    ["CHOICEIN", "2.77%", "39.71%", "0.9%"],
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-border/30">
                      {row.map((cell, j) => (
                        <td key={j} className={`px-2 py-1 tabular-nums ${j > 0 && !cell.startsWith("-") && j > 0 ? "text-emerald-400" : ""}`}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Portfolio / Common Index Return (%)</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent>
            <TimeSeriesChart
              data={[
                { date: "2024-01-15", portfolio: 0, niftyBank: 0, nifty500: 0 },
                { date: "2024-01-22", portfolio: -2.1, niftyBank: -1.8, nifty500: -1.5 },
                { date: "2024-01-29", portfolio: -5.4, niftyBank: -3.9, nifty500: -3.2 },
                { date: "2024-02-05", portfolio: -8.2, niftyBank: -6.1, nifty500: -5.0 },
                { date: "2024-02-12", portfolio: -12.5, niftyBank: -8.5, nifty500: -7.2 },
                { date: "2024-02-19", portfolio: -15.8, niftyBank: -10.2, nifty500: -8.8 },
                { date: "2024-02-26", portfolio: -18.42, niftyBank: -12.1, nifty500: -10.5 },
                { date: "2024-03-04", portfolio: -16.5, niftyBank: -10.8, nifty500: -9.2 },
                { date: "2024-03-11", portfolio: -13.2, niftyBank: -8.5, nifty500: -7.1 },
                { date: "2024-03-18", portfolio: -9.8, niftyBank: -6.2, nifty500: -5.0 },
                { date: "2024-03-25", portfolio: -5.1, niftyBank: -3.1, nifty500: -2.4 },
              ]}
              series={[
                { key: "portfolio", name: "Portfolio", color: "#3b82f6" },
                { key: "niftyBank", name: "NIFTY BANK", color: "#f59e0b" },
                { key: "nifty500", name: "NIFTY 500", color: "#10b981" },
              ]}
              height={160}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Return Decomposition</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent>
            <TimeSeriesChart
              data={[
                { date: "2024-01-15", factor: 0, idio: 0, total: 0 },
                { date: "2024-01-22", factor: -1.2, idio: -0.9, total: -2.1 },
                { date: "2024-01-29", factor: -3.1, idio: -2.3, total: -5.4 },
                { date: "2024-02-05", factor: -4.8, idio: -3.4, total: -8.2 },
                { date: "2024-02-12", factor: -7.5, idio: -5.0, total: -12.5 },
                { date: "2024-02-19", factor: -9.2, idio: -6.6, total: -15.8 },
                { date: "2024-02-26", factor: -10.8, idio: -7.62, total: -18.42 },
                { date: "2024-03-04", factor: -9.5, idio: -7.0, total: -16.5 },
                { date: "2024-03-11", factor: -7.2, idio: -6.0, total: -13.2 },
                { date: "2024-03-18", factor: -5.1, idio: -4.7, total: -9.8 },
                { date: "2024-03-25", factor: -2.8, idio: -2.3, total: -5.1 },
              ]}
              series={[
                { key: "total", name: "Total", color: "#ef4444" },
                { key: "factor", name: "Factor", color: "#f59e0b" },
                { key: "idio", name: "Idiosyncratic", color: "#a855f7" },
              ]}
              height={160}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Risk Decomposition</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent>
            <TimeSeriesChart
              data={[
                { date: "2024-01-15", total: 14.2, factor: 9.8, idio: 4.4 },
                { date: "2024-01-22", total: 16.5, factor: 11.2, idio: 5.3 },
                { date: "2024-01-29", total: 19.8, factor: 13.5, idio: 6.3 },
                { date: "2024-02-05", total: 22.1, factor: 15.1, idio: 7.0 },
                { date: "2024-02-12", total: 25.4, factor: 17.8, idio: 7.6 },
                { date: "2024-02-19", total: 28.2, factor: 19.5, idio: 8.7 },
                { date: "2024-02-26", total: 30.5, factor: 21.2, idio: 9.3 },
                { date: "2024-03-04", total: 27.8, factor: 19.1, idio: 8.7 },
                { date: "2024-03-11", total: 23.5, factor: 16.2, idio: 7.3 },
                { date: "2024-03-18", total: 19.2, factor: 13.0, idio: 6.2 },
                { date: "2024-03-25", total: 16.1, factor: 11.0, idio: 5.1 },
              ]}
              series={[
                { key: "total", name: "Total Risk", color: "#ef4444" },
                { key: "factor", name: "Factor Risk", color: "#3b82f6" },
                { key: "idio", name: "Idio Risk", color: "#10b981" },
              ]}
              height={160}
            />
          </CardContent>
        </Card>
      </div>

      {/* Factor Bar Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Top 10 Factor Return Contributors</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent>
            <BarChartPanel
              data={[
                { name: "MARKET", value: 2.14 },
                { name: "LTMOM", value: 0.89 },
                { name: "SIZE", value: 0.72 },
                { name: "GROWTH", value: 0.58 },
                { name: "VOLTL", value: 0.45 },
                { name: "BETA", value: 0.38 },
                { name: "EARNQLTY", value: 0.31 },
                { name: "PROFIT", value: 0.27 },
                { name: "DIVYLD", value: 0.22 },
                { name: "MGMTQLTY", value: 0.18 },
              ]}
              height={160}
              color="#10b981"
              showNegativeColors={false}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Bottom 10 Factor Return Detractors</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent>
            <BarChartPanel
              data={[
                { name: "FINLVG", value: -0.42 },
                { name: "STMOM", value: -0.38 },
                { name: "VALUE", value: -0.35 },
                { name: "LIQUIDITY", value: -0.29 },
                { name: "EARNVAR", value: -0.24 },
                { name: "LEVERAGE", value: -0.21 },
                { name: "RESVOL", value: -0.18 },
                { name: "BTOP", value: -0.15 },
                { name: "INDMOM", value: -0.12 },
                { name: "SEASON", value: -0.08 },
              ]}
              height={160}
              color="#ef4444"
              showNegativeColors={false}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
