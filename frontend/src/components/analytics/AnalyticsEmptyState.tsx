"use client";

import Link from "next/link";
import {
  TrendingUp, Shield, BarChart3, Activity,
  PieChart, Users, ArrowRight, LogIn, Layers,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

const FEATURES = [
  {
    icon: TrendingUp,
    title: "Factor Attribution",
    desc: "Decompose returns into market, style, industry, and idiosyncratic alpha",
  },
  {
    icon: Shield,
    title: "Risk Analysis",
    desc: "Volatility, beta, Sharpe, Sortino, drawdowns and tail-risk metrics",
  },
  {
    icon: BarChart3,
    title: "Period Breakdown",
    desc: "Annual, quarterly and monthly P&L with hit-rate statistics",
  },
  {
    icon: Activity,
    title: "Event Sensitivity",
    desc: "See how your portfolio reacted across 19+ macro and market events",
  },
  {
    icon: PieChart,
    title: "Holdings & Exposure",
    desc: "Factor exposures, sector slicing, and market-cap attribution",
  },
  {
    icon: Users,
    title: "Peer Comparison",
    desc: "Benchmark side-by-side against any portfolio or index",
  },
];

interface Props {
  title: string;
  analyticsError?: string | null;
}

export function AnalyticsEmptyState({ title, analyticsError }: Props) {
  const { user, loading } = useAuth();

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold">{title}</h1>

      {analyticsError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{analyticsError}</p>
        </div>
      )}

      <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden">
        {/* Ambient gradient */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-56 bg-emerald-500/8 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-64 h-40 bg-blue-500/6 rounded-full blur-3xl" />
        </div>

        {/* Hero section */}
        <div className="relative px-8 pt-12 pb-10 flex flex-col items-center text-center">
          {/* Layered icon badge */}
          <div className="relative mb-7">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 flex items-center justify-center shadow-lg">
              <BarChart3 className="h-9 w-9 text-emerald-500" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/20 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-blue-400" />
            </div>
          </div>

          {!loading && !user ? (
            <>
              <h2 className="text-2xl font-bold tracking-tight mb-2">
                Unlock institutional-grade analytics
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm mb-8 leading-relaxed">
                Create a free account to access factor attribution, risk
                decomposition, event sensitivity analysis, and peer comparison
                — powered by 20+ years of NSE market data.
              </p>
              <div className="flex items-center gap-3 flex-wrap justify-center">
                <Link href="/login">
                  <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors shadow-sm shadow-emerald-500/20">
                    <LogIn className="h-4 w-4" />
                    Sign In
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </Link>
                <Link href="/register">
                  <button className="inline-flex items-center gap-2 px-5 py-2.5 border border-border bg-background hover:bg-muted/50 text-sm font-medium rounded-lg transition-colors">
                    Create Account — Free
                  </button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold tracking-tight mb-2">
                Connect your portfolio to begin
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm mb-8 leading-relaxed">
                Upload a portfolio CSV or run a strategy backtest, then select
                it from the sidebar. Analytics compute in seconds.
              </p>
              <div className="flex items-center gap-3 flex-wrap justify-center">
                <Link href="/portfolio-construction/upload">
                  <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors shadow-sm shadow-emerald-500/20">
                    <Layers className="h-4 w-4" />
                    Upload Portfolio
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </Link>
                <Link href="/strategy-builder">
                  <button className="inline-flex items-center gap-2 px-5 py-2.5 border border-border bg-background hover:bg-muted/50 text-sm font-medium rounded-lg transition-colors">
                    Build a Strategy
                  </button>
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Feature grid */}
        <div className="relative border-t border-border/40 bg-muted/10 grid grid-cols-2 md:grid-cols-3 gap-px bg-border/20">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-card/80 p-4 flex items-start gap-3">
              <div className="shrink-0 mt-0.5 w-7 h-7 rounded-lg bg-muted/60 border border-border/40 flex items-center justify-center">
                <f.icon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">{f.title}</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
