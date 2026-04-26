"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Pencil, Trash2, ChevronDown } from "lucide-react";

const SAMPLE_BACKTESTS = [
  { fund: "Golden Crossover", scheme: "Monthly Rebalance", portfolio: "", created: "", modified: "", start: "01-Apr-2026", end: "24-Apr-2026", rebalance: "AVAILABLE", analytics: "AVAILABLE", production: false },
  { fund: "Golden Crossover", scheme: "Monthly Rebalance", portfolio: "", created: "29-Apr-2026", modified: "", start: "01-Feb-2026", end: "", rebalance: "IN PROGRESS", analytics: "NOT AVAILABLE", production: false },
  { fund: "Long Passive", scheme: "N500", portfolio: "", created: "", modified: "", start: "", end: "", rebalance: "IN PROGRESS", analytics: "NOT AVAILABLE", production: false },
];

const SAMPLE_STRATEGIES = [
  { fund: "Long Passive", scheme: "N500", portfolio: "GoldenCrossover", created: "", modified: "", start: "", end: "", rebalance: "IN PROGRESS", analytics: "", production: false },
];

const PRODUCTION_ARCHIVED = [
  { fund: "Long", scheme: "Passive Production", iteration: "—", aum: "—", start: "—", lastRun: "—", nextRebalance: "—" },
];

export default function StrategyBuilderPage() {
  const [tab, setTab] = useState("backtest");

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Strategy Builder</h1>
        <Button variant="outline" size="sm" className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="backtest">Backtest</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
        </TabsList>

        <TabsContent value="backtest" className="space-y-6 mt-4">
          {/* User Strategies */}
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20">
                  {["Fund Name", "Scheme Name", "Portfolio", "Created Date", "Last Modified", "Start Date", "End Date", "Rebalance Status", "Analytics Status", "Modify", "Production", "Delete"].map((h) => (
                    <th key={h} className="px-2 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SAMPLE_BACKTESTS.map((s, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-muted/30">
                    <td className="px-2 py-2">{s.fund}</td>
                    <td className="px-2 py-2">{s.scheme}</td>
                    <td className="px-2 py-2 text-muted-foreground">{s.portfolio || "—"}</td>
                    <td className="px-2 py-2 text-muted-foreground">{s.created || "—"}</td>
                    <td className="px-2 py-2 text-muted-foreground">{s.modified || "—"}</td>
                    <td className="px-2 py-2 text-muted-foreground">{s.start || "—"}</td>
                    <td className="px-2 py-2 text-muted-foreground">{s.end || "—"}</td>
                    <td className="px-2 py-2">
                      <Badge className={`text-[8px] ${s.rebalance === "AVAILABLE" ? "bg-emerald-600" : s.rebalance === "IN PROGRESS" ? "bg-amber-600" : "bg-red-600"}`}>
                        {s.rebalance}
                      </Badge>
                    </td>
                    <td className="px-2 py-2">
                      <Badge className={`text-[8px] ${s.analytics === "AVAILABLE" ? "bg-emerald-600" : "bg-red-600"}`}>
                        {s.analytics || "—"}
                      </Badge>
                    </td>
                    <td className="px-2 py-2"><Button variant="ghost" size="icon" className="h-5 w-5"><Pencil className="h-2.5 w-2.5" /></Button></td>
                    <td className="px-2 py-2">
                      <div className="h-4 w-8 rounded-full bg-muted relative">
                        <div className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full transition-all ${s.production ? "bg-blue-500 translate-x-4" : "bg-muted-foreground/30"}`} />
                      </div>
                    </td>
                    <td className="px-2 py-2"><Button variant="ghost" size="icon" className="h-5 w-5 text-destructive"><Trash2 className="h-2.5 w-2.5" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sample Strategies */}
          <div>
            <h2 className="text-sm font-semibold mb-2">Sample Strategies</h2>
            <div className="text-[9px] text-amber-500 mb-2">
              Disclaimer: The sample strategies displayed here are for demonstration purposes only and do not constitute investment advice or recommendations.
            </div>
            <div className="rounded-lg border bg-card overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    {["Fund Name", "Scheme Name", "Status"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_STRATEGIES.map((s, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-muted/30">
                      <td className="px-3 py-2">{s.fund}</td>
                      <td className="px-3 py-2">{s.scheme}</td>
                      <td className="px-3 py-2"><Badge className="text-[8px] bg-amber-600">{s.rebalance}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="production" className="space-y-6 mt-4">
          <div>
            <h2 className="text-sm font-semibold mb-3">Active Productions</h2>
            <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground text-xs">
              No active production strategies to display.
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold mb-3">Archived Productions</h2>
            <div className="rounded-lg border bg-card overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    {["Fund Name", "Scheme Name", "Iteration", "Current AUM", "Start Date", "Last Run Date", "Next Rebalance Date", "Manual Trigger"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PRODUCTION_ARCHIVED.map((p, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-muted/30">
                      <td className="px-3 py-2">{p.fund}</td>
                      <td className="px-3 py-2">{p.scheme}</td>
                      <td className="px-3 py-2">{p.iteration}</td>
                      <td className="px-3 py-2">{p.aum}</td>
                      <td className="px-3 py-2">{p.start}</td>
                      <td className="px-3 py-2">{p.lastRun}</td>
                      <td className="px-3 py-2">{p.nextRebalance}</td>
                      <td className="px-3 py-2"><ChevronDown className="h-3 w-3 text-muted-foreground" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
