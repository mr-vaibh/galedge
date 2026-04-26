"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Pencil, Trash2, Eye, Upload } from "lucide-react";

const SAMPLE_SCREENS = [
  { name: "Edelweiss", desc: "Test", created: "05-Mar-2026", modified: "05-Mar-2026" },
  { name: "Industry Relative Reversal", desc: "Short Term Industry Relative Reversal", created: "20-Dec-2025", modified: "20-Dec-2025" },
  { name: "Industry Relative Reversal Vol Adjusted", desc: "Short Term Industry Relative Reversal", created: "21-Dec-2025", modified: "21-Dec-2025" },
  { name: "Industry Relative Reversal Vol Adjusted v2", desc: "Short Term Industry Relative Reversal", created: "21-Dec-2025", modified: "21-Dec-2025" },
  { name: "Jain Portfolio Exclusions", desc: "Exclusions", created: "20-Mar-2026", modified: "20-Mar-2026" },
  { name: "Momentum Marcellus", desc: "Momentum Description", created: "29-Dec-2025", modified: "29-Dec-2025" },
  { name: "Momentum Value Mixture", desc: "Momentum Value Mixture", created: "21-Dec-2025", modified: "21-Dec-2025" },
  { name: "Momentum Value Mixture v2", desc: "Momentum Value Mixture", created: "21-Dec-2025", modified: "21-Dec-2025" },
  { name: "Nippon Sample", desc: "Placeholder", created: "13-Feb-2026", modified: "13-Feb-2026" },
];

const SAMPLE_BACKTESTS = [
  { name: "Backtest 1", screen: "Edelweiss", start: "01-Jan-2020", end: "31-Dec-2025" },
];

const SAMPLE_ALPHA_MODELS: { name: string; start: string; end: string; status: string }[] = [];

const SAMPLE_MT_ALPHAS: { name: string; start: string; end: string; status: string }[] = [];

export default function AlphaMachinePage() {
  const [activeTab, setActiveTab] = useState("screeners");

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Alpha Machine</h1>
        <Button variant="outline" size="sm" className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="screeners">Screener/Factors</TabsTrigger>
          <TabsTrigger value="alpha">Alpha Model</TabsTrigger>
        </TabsList>

        <TabsContent value="screeners" className="space-y-6 mt-4">
          {/* User Created Screens */}
          <div>
            <h2 className="text-sm font-semibold mb-3">User Created Screens</h2>
            <div className="rounded-lg border bg-card overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    {["Screen Name", "Description", "Created Date", "Modified Date", "Modify", "Delete"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_SCREENS.map((s) => (
                    <tr key={s.name} className="border-b border-border/30 hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">{s.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{s.desc}</td>
                      <td className="px-3 py-2 text-muted-foreground">{s.created}</td>
                      <td className="px-3 py-2 text-muted-foreground">{s.modified}</td>
                      <td className="px-3 py-2">
                        <Button variant="ghost" size="icon" className="h-6 w-6"><Pencil className="h-3 w-3" /></Button>
                      </td>
                      <td className="px-3 py-2">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Backtests */}
          <div>
            <h2 className="text-sm font-semibold mb-3">Backtests</h2>
            <div className="rounded-lg border bg-card overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    {["Backtest Name", "Screen Name", "Start Date", "End Date", "Modify", "Delete"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_BACKTESTS.length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No records</td></tr>
                  ) : (
                    SAMPLE_BACKTESTS.map((b) => (
                      <tr key={b.name} className="border-b border-border/30 hover:bg-muted/30">
                        <td className="px-3 py-2">{b.name}</td>
                        <td className="px-3 py-2">{b.screen}</td>
                        <td className="px-3 py-2">{b.start}</td>
                        <td className="px-3 py-2">{b.end}</td>
                        <td className="px-3 py-2"><Button variant="ghost" size="icon" className="h-6 w-6"><Pencil className="h-3 w-3" /></Button></td>
                        <td className="px-3 py-2"><Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"><Trash2 className="h-3 w-3" /></Button></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="alpha" className="space-y-6 mt-4">
          {/* User Created Alpha Models */}
          <div>
            <h2 className="text-sm font-semibold mb-3">User Created Alpha Models</h2>
            <div className="rounded-lg border bg-card overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    {["Model Name", "Start Date", "End Date", "Status", "View Results", "Enable Production", "Delete"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_ALPHA_MODELS.length === 0 ? (
                    <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No records</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          {/* MethodTech Alphas */}
          <div>
            <h2 className="text-sm font-semibold mb-3">Galedge Alphas</h2>
            <div className="rounded-lg border bg-card overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    {["Model Name", "Start Date", "End Date", "Status", "View Results"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_MT_ALPHAS.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No records</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
