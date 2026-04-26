"use client";

import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { CardControls } from "@/components/CardControls";

const overviewTabs = [
  { label: "Performance Summary", href: "/analytics/overview/performance" },
  { label: "Peer Comparison", href: "/analytics/overview/peer-comparison" },
  { label: "Holdings Summary", href: "/analytics/overview/holdings" },
  { label: "Period Analysis", href: "/analytics/overview/period-analysis" },
];

const SAMPLE_HOLDINGS = [
  { symbol: "CANBLIFE", weight: "3.39%", return: "17.26%", risk: "1.78%" },
  { symbol: "SENCO", weight: "3.14%", return: "80.55%", risk: "10.44%" },
  { symbol: "FUSION", weight: "2.78%", return: "15.49%", risk: "1.14%" },
  { symbol: "SUBEXLTD", weight: "2.73%", return: "24.29%", risk: "11.58%" },
  { symbol: "CHOICEIN", weight: "2.77%", return: "39.71%", risk: "0.9%" },
];

const SAMPLE_FACTORS = [
  { factor: "MARKET", exposure: "0.98", return: "6.91%", risk: "8.2%" },
  { factor: "BETA", exposure: "-0.32", return: "1.26%", risk: "1.5%" },
  { factor: "SIZE", exposure: "1.45", return: "1.07%", risk: "2.1%" },
  { factor: "LTMOM", exposure: "0.72", return: "3.42%", risk: "1.8%" },
  { factor: "FINLVG", exposure: "-0.18", return: "-0.52%", risk: "0.9%" },
];

const holdingsTimeSeries = Array.from({ length: 50 }, (_, i) => ({
  date: `2025-${String(Math.floor(i / 4) + 1).padStart(2, "0")}-01`,
  CANBLIFE: 3 + Math.random() * 2,
  SENCO: 2.5 + Math.random() * 2,
  FUSION: 2 + Math.random() * 1.5,
  CHOICEIN: 2.5 + Math.random() * 1.5,
}));

export default function HoldingsSummaryPage() {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Holdings & Factor Summary</h1>
        <div className="flex items-center gap-1 bg-card border rounded-lg p-0.5">
          {overviewTabs.map((tab) => (
            <Button
              key={tab.href}
              variant={pathname === tab.href ? "secondary" : "ghost"}
              size="sm"
              onClick={() => router.push(tab.href)}
              className="h-7 text-[10px]"
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Holdings Table */}
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <div>
              <CardTitle className="text-[11px]">Holdings Summary</CardTitle>
              <span className="text-[9px] text-muted-foreground">5/5 Selected · Clear Selection</span>
            </div>
            <CardControls />
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-border/50">
                  {["", "Symbol", "Weight", "Return", "Risk Contrib"].map(h => (
                    <th key={h} className="px-2 py-1.5 text-left text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SAMPLE_HOLDINGS.map((h) => (
                  <tr key={h.symbol} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="px-2 py-1"><input type="checkbox" defaultChecked className="h-3 w-3" /></td>
                    <td className="px-2 py-1 font-medium">{h.symbol}</td>
                    <td className="px-2 py-1 tabular-nums">{h.weight}</td>
                    <td className="px-2 py-1 tabular-nums text-emerald-400">{h.return}</td>
                    <td className="px-2 py-1 tabular-nums">{h.risk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-2">
              <Button size="sm" variant="outline" className="text-[9px] h-6">Update Graph</Button>
            </div>
          </CardContent>
        </Card>

        {/* Factor Summary Table */}
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Factor Summary</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-border/50">
                  {["Factor", "Exposure", "Return", "Risk Contrib"].map(h => (
                    <th key={h} className="px-2 py-1.5 text-left text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SAMPLE_FACTORS.map((f) => (
                  <tr key={f.factor} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="px-2 py-1 font-medium">{f.factor}</td>
                    <td className="px-2 py-1 tabular-nums">{f.exposure}</td>
                    <td className={`px-2 py-1 tabular-nums ${f.return.startsWith("-") ? "text-red-400" : "text-emerald-400"}`}>{f.return}</td>
                    <td className="px-2 py-1 tabular-nums">{f.risk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Holdings Chart */}
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Holdings (%)</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent className="p-2">
            <TimeSeriesChart
              data={holdingsTimeSeries}
              series={[
                { key: "CANBLIFE", name: "CANBLIFE", color: "#f97316" },
                { key: "SENCO", name: "SENCO", color: "#3b82f6" },
                { key: "FUSION", name: "FUSION", color: "#10b981" },
                { key: "CHOICEIN", name: "CHOICEIN", color: "#a855f7" },
              ]}
              height={200}
              yFormatter={(v) => `${v.toFixed(1)}%`}
            />
          </CardContent>
        </Card>

        {/* Factor Exposure Chart */}
        <Card>
          <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
            <CardTitle className="text-[11px]">Factor Exposure (%)</CardTitle>
            <CardControls />
          </CardHeader>
          <CardContent className="p-2">
            <TimeSeriesChart
              data={holdingsTimeSeries.map(d => ({
                date: d.date,
                FINLVG: -0.2 + Math.random() * 0.3,
                LTMOM: 0.5 + Math.random() * 0.4,
                BETA: -0.3 + Math.random() * 0.2,
                SIZE: 1.2 + Math.random() * 0.3,
              }))}
              series={[
                { key: "FINLVG", name: "FINLVG", color: "#ef4444" },
                { key: "LTMOM", name: "LTMOM", color: "#f97316" },
                { key: "BETA", name: "BETA", color: "#3b82f6" },
                { key: "SIZE", name: "SIZE", color: "#10b981" },
              ]}
              height={200}
              yFormatter={(v) => v.toFixed(2)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
