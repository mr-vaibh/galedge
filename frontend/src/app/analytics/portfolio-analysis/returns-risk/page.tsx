"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Filter, Info, Maximize2, BarChart3 } from "lucide-react";

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

function Chart({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
        <CardTitle className="text-[11px]">{title}</CardTitle>
        <CC />
      </CardHeader>
      <CardContent>
        <div className="h-40 flex items-center justify-center border border-dashed border-border/30 rounded">
          <BarChart3 className="h-5 w-5 opacity-20 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReturnsAndRiskPage() {
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
        <Chart title="Return Decomposition (%)" />
        <Chart title="Predicted Risk (%)" />
        <Chart title="PE Ratio" />
        <Chart title="Market Cap" />
      </div>

      {/* Contributors */}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Card>
            <CardHeader className="pb-1 py-2 px-3"><CardTitle className="text-[11px]">Top 10 - Holdings (%)</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-[10px]">
                <thead><tr className="border-b border-border/50">
                  {["Symbol", "Holdings (%)", "Raw Return (%)", "Total Return (%)", "Risk Contrib (%)"].map(h => <th key={h} className="px-2 py-1.5 text-left text-muted-foreground font-medium">{h}</th>)}
                </tr></thead>
                <tbody>
                  {[["CANHLIFE","3.39%","17.26%","0.48%","1.78%"],["SENCO","3.14%","80.55%","2%","10.44%"],["FUSION","2.78%","15.49%","0.4%","1.14%"]].map((r,i)=>(
                    <tr key={i} className="border-b border-border/30">{r.map((c,j)=><td key={j} className="px-2 py-1 tabular-nums">{c}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 py-2 px-3"><CardTitle className="text-[11px]">Bottom 10 - Holdings (%)</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-[10px]">
                <thead><tr className="border-b border-border/50">
                  {["Symbol", "Holdings (%)", "Raw Return (%)", "Total Return (%)", "Risk Contrib (%)"].map(h => <th key={h} className="px-2 py-1.5 text-left text-muted-foreground font-medium">{h}</th>)}
                </tr></thead>
                <tbody>
                  {[["IDFCFIRSTB","-3.25%","-24.16%","0.88%","9.52%"],["PAYTM","-1.41%","9.54%","-0.15%","11.77%"]].map((r,i)=>(
                    <tr key={i} className="border-b border-border/30">{r.map((c,j)=><td key={j} className={`px-2 py-1 tabular-nums ${c.startsWith("-")?"text-red-400":""}`}>{c}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <Chart title="Top Holdings (%)" />
        </div>
      </div>
    </div>
  );
}
