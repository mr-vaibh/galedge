"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Filter, Info, Maximize2 } from "lucide-react";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";

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
              <th className="px-2 py-1.5 text-left text-muted-foreground" />
              <th className="px-2 py-1.5 text-right text-muted-foreground">Active</th>
              <th className="px-2 py-1.5 text-right text-muted-foreground">Peer</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([l, a, b], i) => (
              <tr key={i} className="border-b border-border/30">
                <td className="px-2 py-1 text-muted-foreground">{l}</td>
                <td className="px-2 py-1 text-right tabular-nums">{a}</td>
                <td className="px-2 py-1 text-right tabular-nums">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// Sample data for charts
const sampleData = Array.from({ length: 60 }, (_, i) => ({
  date: `2025-${String(Math.floor(i / 5) + 1).padStart(2, "0")}-${String((i % 5) * 6 + 1).padStart(2, "0")}`,
  active: 100 + Math.random() * 30 + i * 0.3,
  peer: 100 + Math.random() * 25 + i * 0.2,
}));

export default function PeerComparisonPage() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Peer Comparison</h1>
        <Tabs defaultValue="performance">
          <TabsList className="h-7">
            <TabsTrigger value="performance" className="text-[10px] h-6">Performance Summary</TabsTrigger>
            <TabsTrigger value="peer" className="text-[10px] h-6">Peer Comparison</TabsTrigger>
            <TabsTrigger value="holdings" className="text-[10px] h-6">Holdings Summary</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <STable title="Profit and Loss Summary" rows={[
          ["Total Return (%)", "18.97%", "14.23%"],
          ["CAGR (%)", "5.07%", "3.82%"],
          ["Sharpe Ratio", "0.52", "0.38"],
        ]} />
        <STable title="Risk Summary" rows={[
          ["Realized Risk (%)", "14.5%", "15.8%"],
          ["Predicted Risk (%)", "12.8%", "13.5%"],
        ]} />
        <STable title="Valuation Summary" rows={[
          ["P/E Ratio", "22.5", "24.1"],
          ["ROE (%)", "18.2%", "16.1%"],
        ]} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Return Decomposition (%)</CardTitle>
            <CC />
          </CardHeader>
          <CardContent className="p-2">
            <TimeSeriesChart
              data={sampleData}
              series={[
                { key: "active", name: "Active", color: "#f97316" },
                { key: "peer", name: "Peer", color: "#3b82f6" },
              ]}
              height={180}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Predicted Risk (%)</CardTitle>
            <CC />
          </CardHeader>
          <CardContent className="p-2">
            <TimeSeriesChart
              data={sampleData.map(d => ({ ...d, active: 12 + Math.random() * 5, peer: 13 + Math.random() * 4 }))}
              series={[
                { key: "active", name: "Active", color: "#f97316" },
                { key: "peer", name: "Peer", color: "#3b82f6" },
              ]}
              height={180}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">PE Ratio</CardTitle>
            <CC />
          </CardHeader>
          <CardContent className="p-2">
            <TimeSeriesChart
              data={sampleData.map(d => ({ ...d, active: 20 + Math.random() * 8, peer: 22 + Math.random() * 6 }))}
              series={[
                { key: "active", name: "Active", color: "#f97316" },
                { key: "peer", name: "Peer", color: "#3b82f6" },
              ]}
              height={180}
              yFormatter={(v) => v.toFixed(1)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
