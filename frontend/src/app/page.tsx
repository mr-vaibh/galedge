"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  BarChart3, Brain, Code2, LineChart, Shield, Zap, TrendingUp,
  PieChart, Target, Activity, Layers, Database, ArrowRight,
  ChevronDown, Star, Users, Globe,
} from "lucide-react";

const FEATURES = [
  {
    icon: PieChart,
    title: "Portfolio Analytics",
    desc: "Real-time performance tracking, Brinson attribution, factor decomposition, peer comparison — all from your actual portfolio data.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    icon: TrendingUp,
    title: "Strategy Builder",
    desc: "Define constraints, set objectives, run optimizer — backtest with real market data and promote winning strategies to production.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: Brain,
    title: "Risk Model",
    desc: "21-factor risk model (BETA, SIZE, MOMENTUM, VALUE + 10 industries). Cross-sectional regression, correlation matrix, factor returns.",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
  {
    icon: Target,
    title: "Portfolio Optimizer",
    desc: "CVXPY-powered optimization. Minimize risk, maximize Sharpe, or track a benchmark — with position, beta, and sector constraints.",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
  },
  {
    icon: Code2,
    title: "Code Editor",
    desc: "Full VS Code IDE in the browser. Write Python, access market data via SDK, run strategies — all in an isolated sandbox per user.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  {
    icon: Zap,
    title: "Live Rebalance",
    desc: "Generate actionable trade lists for production strategies. BUY/SELL/HOLD signals with exact quantities and current prices.",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
  },
  {
    icon: BarChart3,
    title: "Screener & Heatmap",
    desc: "Screen stocks by fundamental and technical criteria. Visualize the entire market in a single heatmap view.",
    color: "text-red-400",
    bg: "bg-red-500/10",
  },
  {
    icon: Shield,
    title: "Factor Attribution",
    desc: "Decompose returns into Market, Style, and Industry. Know exactly which factors are helping or hurting your portfolio.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    icon: LineChart,
    title: "Backtesting Engine",
    desc: "Path-dependent backtest with transaction costs, stop-loss, monthly rebalancing. Optimizer runs at each rebalance date.",
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
  },
];

const STATS = [
  { value: "100+", label: "NSE Stocks", icon: Database },
  { value: "21", label: "Risk Factors", icon: Layers },
  { value: "250+", label: "Trading Days", icon: Activity },
  { value: "Real-time", label: "Market Data", icon: Globe },
];

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-800/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo-icon.svg" alt="Galedge" width={32} height={32} className="rounded-lg" />
            <span className="text-lg font-bold">Galedge Alpha</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-neutral-400 hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-neutral-400 hover:text-white transition-colors">How It Works</a>
            <a href="#stats" className="text-sm text-neutral-400 hover:text-white transition-colors">Platform</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="text-sm" onClick={() => router.push("/login")}>Login</Button>
            <Button className="text-sm bg-emerald-600 hover:bg-emerald-700" onClick={() => router.push("/register")}>Get Started Free</Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-8">
            <Star className="h-3.5 w-3.5" />
            Institutional-Grade Investment Platform
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight mb-6">
            Systematic Investing,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-500 to-cyan-400">
              Made Simple
            </span>
          </h1>

          <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Build, test, and deploy quantitative strategies with real market data.
            Factor models, portfolio optimization, Python sandbox — all in one platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button
              size="lg"
              className="text-base px-8 py-6 bg-emerald-600 hover:bg-emerald-700 gap-2 rounded-xl"
              onClick={() => router.push("/register")}
            >
              Start Building <ArrowRight className="h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base px-8 py-6 gap-2 rounded-xl border-neutral-700 hover:bg-neutral-800"
              onClick={() => router.push("/home")}
            >
              Explore Market Data
            </Button>
          </div>

          {/* Scroll indicator */}
          <div className="animate-bounce">
            <ChevronDown className="h-6 w-6 text-neutral-600 mx-auto" />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="py-16 px-6 border-y border-neutral-800/50">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <s.icon className="h-6 w-6 text-emerald-400 mx-auto mb-3" />
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">{s.value}</div>
              <div className="text-sm text-neutral-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Invest Systematically</h2>
            <p className="text-neutral-400 text-lg max-w-2xl mx-auto">From data ingestion to live trade execution — a complete workflow for quantitative portfolio management.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group p-6 rounded-2xl border border-neutral-800 hover:border-neutral-700 bg-neutral-900/50 hover:bg-neutral-900 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <f.icon className={`h-6 w-6 ${f.color}`} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6 bg-neutral-900/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-neutral-400 text-lg">Four steps from raw data to live portfolio management.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Upload Portfolio", desc: "Upload your holdings CSV with stock symbols and weights. Market data is fetched automatically.", icon: Database },
              { step: "02", title: "Analyze & Research", desc: "View real analytics, run factor decomposition, compare against benchmarks, write custom Python research.", icon: BarChart3 },
              { step: "03", title: "Build Strategy", desc: "Set constraints and objectives, run the optimizer, backtest over historical data with transaction costs.", icon: Target },
              { step: "04", title: "Go Live", desc: "Promote your strategy to production. Generate rebalance trade lists with exact quantities and prices.", icon: Zap },
            ].map((s) => (
              <div key={s.step} className="relative">
                <div className="text-6xl font-black text-neutral-800 mb-4">{s.step}</div>
                <s.icon className="h-6 w-6 text-emerald-400 mb-3" />
                <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Built With Modern Tech</h2>
          <p className="text-neutral-400 text-lg mb-12">Production-grade infrastructure for serious quantitative work.</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: "Next.js 16", desc: "React framework" },
              { name: "FastAPI", desc: "Python backend" },
              { name: "CVXPY", desc: "Optimization" },
              { name: "Recharts", desc: "Visualization" },
              { name: "yfinance", desc: "Market data" },
              { name: "Pandas", desc: "Data analysis" },
              { name: "SQLite", desc: "Database" },
              { name: "VS Code", desc: "Code editor" },
            ].map((t) => (
              <div key={t.name} className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/30">
                <div className="font-semibold text-sm">{t.name}</div>
                <div className="text-xs text-neutral-500">{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="p-12 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-neutral-900 to-cyan-500/10 border border-emerald-500/20">
            <Users className="h-10 w-10 text-emerald-400 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Build Your Edge?</h2>
            <p className="text-neutral-400 text-lg mb-8">
              Start with free market data. Upload your portfolio. Build and backtest strategies. Go live when you&apos;re ready.
            </p>
            <Button
              size="lg"
              className="text-base px-10 py-6 bg-emerald-600 hover:bg-emerald-700 gap-2 rounded-xl"
              onClick={() => router.push("/register")}
            >
              Get Started Free <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-neutral-800/50">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Image src="/logo-icon.svg" alt="Galedge" width={24} height={24} className="rounded" />
            <span className="text-sm font-semibold">Galedge Alpha</span>
          </div>
          <p className="text-xs text-neutral-600">
            Built for systematic investors. Not financial advice.
          </p>
          <div className="flex items-center gap-6">
            <button onClick={() => router.push("/login")} className="text-xs text-neutral-500 hover:text-white transition-colors">Login</button>
            <button onClick={() => router.push("/register")} className="text-xs text-neutral-500 hover:text-white transition-colors">Register</button>
            <button onClick={() => router.push("/home")} className="text-xs text-neutral-500 hover:text-white transition-colors">Market Data</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
