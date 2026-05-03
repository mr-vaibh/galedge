"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, TrendingUp, Layers, Users } from "lucide-react";
import { usePortfolio } from "@/lib/portfolio-context";

const QUICK_LINKS = [
  {
    icon: TrendingUp,
    label: "Performance Summary",
    description: "Returns, risk metrics, and equity curve",
    href: "/analytics/overview/performance",
  },
  {
    icon: Layers,
    label: "Holdings & Factors",
    description: "Holdings detail and factor decomposition",
    href: "/analytics/overview/holdings",
  },
  {
    icon: BarChart3,
    label: "Returns & Risk",
    description: "Full analytics with Brinson decomposition",
    href: "/analytics/portfolio-analysis/returns-risk",
  },
  {
    icon: Users,
    label: "Peer Intelligence",
    description: "Compare portfolios side-by-side",
    href: "/analytics/peer-intelligence",
  },
];

export default function AnalyticsIndexPage() {
  const router = useRouter();
  const { analyticsData } = usePortfolio();

  // If analytics data is already loaded, redirect to performance page
  useEffect(() => {
    if (analyticsData) {
      router.replace("/analytics/overview/performance");
    }
  }, [analyticsData, router]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select a portfolio or strategy from the sidebar to view analytics
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6 text-center space-y-3">
        <BarChart3 className="h-12 w-12 text-muted-foreground/40 mx-auto" />
        <p className="text-sm font-medium">No source selected</p>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Choose a portfolio or strategy backtest from the left sidebar to compute and view
          full analytics including performance, risk, factor attribution, and more.
        </p>
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-3">Analytics Pages</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {QUICK_LINKS.map(({ icon: Icon, label, description, href }) => (
            <button
              key={href}
              onClick={() => router.push(href)}
              className="text-left p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors space-y-1"
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{label}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">{description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
