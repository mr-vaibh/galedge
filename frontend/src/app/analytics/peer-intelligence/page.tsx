"use client";

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

const peerData = Array.from({ length: 50 }, (_, i) => ({
  date: `2025-${String(Math.floor(i / 4) + 1).padStart(2, "0")}-01`,
  portfolio: 100 + i * 0.4 + Math.random() * 10,
  peer1: 100 + i * 0.3 + Math.random() * 8,
  peer2: 100 + i * 0.2 + Math.random() * 12,
}));

const factorContrib = [
  { name: "LTMOM", value: 4.21 }, { name: "SIZE", value: 3.12 },
  { name: "MARKET", value: 2.14 }, { name: "PROFIT", value: 1.56 },
  { name: "BETA", value: -1.25 }, { name: "FINLVG", value: -2.01 },
];

export default function PeerIntelligencePage() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Peer Intelligence</h1>
        <Tabs defaultValue="returns">
          <TabsList className="h-7">
            <TabsTrigger value="returns" className="text-[10px] h-6">Peer Returns and Risks</TabsTrigger>
            <TabsTrigger value="breakdown" className="text-[10px] h-6">Peer Breakdown</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Total Return (%)</CardTitle>
            <CC />
          </CardHeader>
          <CardContent className="p-2">
            <TimeSeriesChart
              data={peerData}
              series={[
                { key: "portfolio", name: "Portfolio", color: "#f97316" },
                { key: "peer1", name: "Peer 1", color: "#3b82f6" },
                { key: "peer2", name: "Peer 2", color: "#10b981" },
              ]}
              height={220}
              yFormatter={(v) => v.toFixed(0)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Top Factor Contributors / Detractors</CardTitle>
            <CC />
          </CardHeader>
          <CardContent className="p-2">
            <BarChartPanel data={factorContrib} height={220} />
          </CardContent>
        </Card>
      </div>

      {/* Contributors Tables */}
      <div className="flex items-center gap-3 mb-2">
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
            <CardTitle className="text-[11px]">Long Portfolio - Multi Factor:Small...</CardTitle>
            <CC />
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-border/50">
                  {["Factor Type", "Factor Name", "Factor Exposure (%)", "Factor Return (%)"].map(h => (
                    <th key={h} className="px-2 py-1.5 text-left text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Market", "MARKET", "33.71%", "173.79%"],
                  ["Style", "SIZE", "30.73%", "128.06%"],
                  ["Industry", "AUTOCOMP", "12.54%", "15.52%"],
                ].map((r, i) => (
                  <tr key={i} className="border-b border-border/30">{r.map((c, j) => <td key={j} className="px-2 py-1 tabular-nums">{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Long Portfolio - Multi Factor:Small...</CardTitle>
            <CC />
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-border/50">
                  {["Factor Type", "Factor Name", "Factor Exposure (%)", "Factor Return (%)"].map(h => (
                    <th key={h} className="px-2 py-1.5 text-left text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Market", "MARKET", "-11.37%", "23.79%"],
                  ["Style", "LTMOM", "-4.83%", "31.38%"],
                  ["Industry", "FINLVG", "-3.76%", "376.63%"],
                ].map((r, i) => (
                  <tr key={i} className="border-b border-border/30">{r.map((c, j) => <td key={j} className="px-2 py-1 tabular-nums">{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
