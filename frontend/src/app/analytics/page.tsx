"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Share2, Download } from "lucide-react";

const PORTFOLIOS = [
  { fund: "Long Portfolio", scheme: "Multi Factor:SmallMicroV1", start: "31-Dec-2015", end: "20-Feb-2026", fullAnalytics: "AVAILABLE", liteAnalytics: "—" },
  { fund: "Long Portfolio", scheme: "Multi Factor:4.0", start: "01-Jan-2020", end: "31-Oct-2025", fullAnalytics: "AVAILABLE", liteAnalytics: "—" },
  { fund: "BF", scheme: "Type I:6.0", start: "", end: "", fullAnalytics: "NOT AVAILABLE", liteAnalytics: "—" },
  { fund: "Long", scheme: "Momentum and Value 1.1", start: "", end: "", fullAnalytics: "NOT AVAILABLE", liteAnalytics: "—" },
  { fund: "Long Portfolio", scheme: "Multi Factor B.t", start: "01-Jan-2020", end: "31-Oct-2025", fullAnalytics: "AVAILABLE", liteAnalytics: "—" },
  { fund: "Long Portfolio", scheme: "Multi Factor:8.0", start: "01-Jan-2020", end: "31-Oct-2025", fullAnalytics: "AVAILABLE", liteAnalytics: "—" },
  { fund: "Long Portfolio", scheme: "Short Term Industry Relative Reversal Vol Adjusted 2.0", start: "", end: "", fullAnalytics: "AVAILABLE", liteAnalytics: "—" },
  { fund: "N500:9.0", scheme: "", start: "", end: "", fullAnalytics: "AVAILABLE", liteAnalytics: "—" },
  { fund: "N500:11.0", scheme: "", start: "", end: "", fullAnalytics: "NOT AVAILABLE", liteAnalytics: "—" },
  { fund: "N250:4.0", scheme: "", start: "", end: "", fullAnalytics: "NOT AVAILABLE", liteAnalytics: "—" },
  { fund: "Momentum", scheme: "", start: "", end: "", fullAnalytics: "AVAILABLE", liteAnalytics: "—" },
  { fund: "Golden Crossover", scheme: "Monthly Rebalance:v3", start: "31-Dec-2024", end: "", fullAnalytics: "NOT AVAILABLE", liteAnalytics: "—" },
];

export default function AnalyticsPage() {
  const router = useRouter();
  const [tab, setTab] = useState("backtested");

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Portfolios</h1>
        <Button variant="outline" size="sm" className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-8">
          <TabsTrigger value="backtested" className="text-[10px]">Backtested Portfolios</TabsTrigger>
          <TabsTrigger value="uploaded" className="text-[10px]">User Uploaded Portfolios</TabsTrigger>
          <TabsTrigger value="standard" className="text-[10px]">Standard Portfolios</TabsTrigger>
          <TabsTrigger value="production" className="text-[10px]">Production Portfolios</TabsTrigger>
          <TabsTrigger value="shared" className="text-[10px]">Shared Portfolios</TabsTrigger>
          <TabsTrigger value="received" className="text-[10px]">Received Portfolios</TabsTrigger>
        </TabsList>

        <TabsContent value="backtested" className="mt-4">
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20">
                  {["Fund", "Scheme", "Start Date", "End Date", "Full Analytics Status", "Lite Analytics Status", "Share", "Upload"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PORTFOLIOS.map((p, i) => (
                  <tr
                    key={i}
                    className="border-b border-border/30 hover:bg-muted/30 cursor-pointer"
                    onClick={() => router.push("/analytics/overview/performance")}
                  >
                    <td className="px-3 py-2 font-medium">{p.fund}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.scheme || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.start || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.end || "—"}</td>
                    <td className="px-3 py-2">
                      <Badge className={`text-[8px] ${p.fullAnalytics === "AVAILABLE" ? "bg-emerald-600" : "bg-red-600"}`}>
                        {p.fullAnalytics}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{p.liteAnalytics}</td>
                    <td className="px-3 py-2">
                      <Button variant="ghost" size="icon" className="h-6 w-6"><Share2 className="h-3 w-3" /></Button>
                    </td>
                    <td className="px-3 py-2">
                      <Button variant="ghost" size="icon" className="h-6 w-6 bg-blue-600/20"><Download className="h-3 w-3" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="uploaded" className="mt-4">
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground text-xs">
            No uploaded portfolios yet.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
