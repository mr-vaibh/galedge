"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Filter, Info, Maximize2, BarChart3 } from "lucide-react";

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
            <div className="h-40 flex items-center justify-center border border-dashed border-border/30 rounded">
              <div className="text-center">
                <BarChart3 className="h-5 w-5 mx-auto mb-1 opacity-20 text-muted-foreground" />
                <p className="text-[9px] text-muted-foreground/60">Portfolio vs NIFTY BANK, NIFTY 500, etc.</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Return Decomposition</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent>
            <div className="h-40 flex items-center justify-center border border-dashed border-border/30 rounded">
              <BarChart3 className="h-5 w-5 opacity-20 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Risk Decomposition</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent>
            <div className="h-40 flex items-center justify-center border border-dashed border-border/30 rounded">
              <BarChart3 className="h-5 w-5 opacity-20 text-muted-foreground" />
            </div>
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
            <div className="h-40 flex items-center justify-center border border-dashed border-border/30 rounded">
              <BarChart3 className="h-5 w-5 opacity-20 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Bottom 10 Factor Return Detractors</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent>
            <div className="h-40 flex items-center justify-center border border-dashed border-border/30 rounded">
              <BarChart3 className="h-5 w-5 opacity-20 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
