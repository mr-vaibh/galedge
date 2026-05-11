"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  BarChart3, Brain, Code2, LineChart, Shield, Zap, TrendingUp,
  PieChart, Target, Activity, Layers, Database, ArrowRight,
  ChevronDown, Star, Users, Globe, CheckCircle2, XCircle, Plus, Minus,
  BookOpen, Cpu, GraduationCap, Briefcase,
} from "lucide-react";

const FEATURES = [
  {
    icon: PieChart,
    title: "Know exactly where your returns come from",
    desc: "Brinson attribution, factor decomposition, peer comparison — see which decisions added alpha and which didn't.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    icon: TrendingUp,
    title: "Test before you risk real money",
    desc: "Backtest any strategy over real NSE price history. See the equity curve, drawdowns, and Sharpe before committing capital.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: Brain,
    title: "Understand what's really driving your risk",
    desc: "21-factor risk model reveals your true exposures — market beta, size, momentum, value, and 10 industry tilts.",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
  {
    icon: Target,
    title: "Build portfolios that match your constraints",
    desc: "Set position limits, beta bounds, sector caps. The optimizer finds the best allocation within your rules — not just the textbook answer.",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
  },
  {
    icon: Code2,
    title: "Research without leaving your browser",
    desc: "Full VS Code IDE with Python, pandas, and live market data. Isolated sandbox per user — no setup, no cloud bills.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  {
    icon: Zap,
    title: "Go from backtest to trade list in one click",
    desc: "Promote a strategy to production. Get exact BUY/SELL quantities at current prices, updated at each rebalance.",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
  },
  {
    icon: Layers,
    title: "Build and score your own alpha models",
    desc: "Combine VALUE, PROFIT, MOMENTUM factors into a scoring model. Compute IC, IR, and t-stats to know if your signal is real — or noise.",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
  },
  {
    icon: Target,
    title: "Screen → Score → Backtest in one pipeline",
    desc: "Filter stocks with a screener, rank survivors with alpha scores, weight by signal strength, backtest with real transaction costs.",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
  },
];

const PERSONAS = [
  {
    icon: Cpu,
    title: "Quant Researcher",
    desc: "Write factor models in Python, screen thousands of stocks in seconds, upload your alpha signals and backtest them against real data.",
  },
  {
    icon: Briefcase,
    title: "Portfolio Manager",
    desc: "Upload your current holdings, run Brinson attribution, optimize against a benchmark, generate rebalance trade lists.",
  },
  {
    icon: TrendingUp,
    title: "Self-Directed Investor",
    desc: "Stop guessing. Screen stocks by fundamentals, compare against peers, build rule-based strategies that remove emotion.",
  },
  {
    icon: GraduationCap,
    title: "Finance Student",
    desc: "Learn factor models, CAPM, and portfolio theory hands-on with real NSE data — not toy examples from a textbook.",
  },
];

const VS_EXCEL = [
  { feature: "Factor attribution", galedge: true, excel: false },
  { feature: "21-factor risk model", galedge: true, excel: false },
  { feature: "Portfolio optimizer (CVXPY)", galedge: true, excel: false },
  { feature: "Backtesting with transaction costs", galedge: true, excel: false },
  { feature: "Live rebalance trade lists", galedge: true, excel: false },
  { feature: "Python research environment", galedge: true, excel: false },
  { feature: "NSE market data (500+ stocks, 2yr history)", galedge: true, excel: "Manual download" },
  { feature: "Peer comparison", galedge: true, excel: "Manual" },
  { feature: "Alpha model IC/IR analysis", galedge: true, excel: false },
  { feature: "Free to start", galedge: true, excel: true },
];

const FAQS = [
  {
    q: "Do I need to know how to code?",
    a: "No. The platform works entirely through the UI — upload your portfolio, set constraints, run the optimizer. The Python code editor is optional, for researchers who want to go deeper.",
  },
  {
    q: "What data does Galedge use?",
    a: "NSE price and fundamental data for 500+ stocks (NIFTY 50, 100, 200, 500, MidCap, SmallCap) plus select US stocks. Price history goes back ~2 years, updated nightly. All data stored locally — no live API calls during analysis.",
  },
  {
    q: "What is a factor model and why does it matter?",
    a: "A factor model explains stock returns through systematic exposures — market beta, size, momentum, value, industry. Instead of saying 'the stock went up', a factor model tells you why it went up, and whether that source of return is repeatable.",
  },
  {
    q: "How is this different from a brokerage platform?",
    a: "Brokerage platforms show you prices and let you trade. Galedge is a research and decision-support platform — analytics, optimization, backtesting, attribution. You bring the trades back to your broker.",
  },
  {
    q: "Is my portfolio data private?",
    a: "Yes. Each user has an isolated workspace. Your portfolio data and scripts are not shared with other users.",
  },
  {
    q: "Can I use Galedge for live trading?",
    a: "Not directly — Galedge doesn't connect to brokers. But it generates trade lists (BUY/SELL/HOLD with quantities and current prices) that you can execute manually through any broker.",
  },
  {
    q: "What is an Alpha Model and how do I use it?",
    a: "An Alpha Model scores every stock in your universe by combining factor signals — Value, Momentum, Profitability etc. The score predicts which stocks will outperform. Use it to rank your screener output, weight your portfolio proportionally, or just understand what's driving returns. Galedge includes IC and Information Ratio analysis so you know if the signal is statistically meaningful.",
  },
];

const STATS = [
  { value: "500+", label: "NSE Stocks", icon: Database },
  { value: "21", label: "Risk Factors", icon: Layers },
  { value: "500+", label: "Trading Days of Data", icon: Activity },
  { value: "3", label: "Alpha Model Types", icon: Cpu },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border border-neutral-800 rounded-xl overflow-hidden cursor-pointer"
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center justify-between px-6 py-4">
        <span className="font-medium text-sm">{q}</span>
        {open ? <Minus className="h-4 w-4 text-neutral-500 shrink-0" /> : <Plus className="h-4 w-4 text-neutral-500 shrink-0" />}
      </div>
      {open && (
        <div className="px-6 pb-4 text-sm text-neutral-400 leading-relaxed border-t border-neutral-800 pt-4">
          {a}
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const isLoggedIn = !!(user || token);

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
            <a href="#what-is" className="text-sm text-neutral-400 hover:text-white transition-colors">What is it?</a>
            <a href="#features" className="text-sm text-neutral-400 hover:text-white transition-colors">Features</a>
            <a href="#who" className="text-sm text-neutral-400 hover:text-white transition-colors">Who it&apos;s for</a>
            <a href="#faq" className="text-sm text-neutral-400 hover:text-white transition-colors">FAQ</a>
            <a href="/docs" className="text-sm text-neutral-400 hover:text-white transition-colors">Docs</a>
          </div>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <span className="text-sm text-neutral-400">{user?.full_name || user?.email || "Welcome"}</span>
                <Button className="text-sm bg-emerald-600 hover:bg-emerald-700 gap-1.5" onClick={() => router.push("/home")}>
                  Go to App <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" className="text-sm" onClick={() => router.push("/login")}>Login</Button>
                <Button className="text-sm bg-emerald-600 hover:bg-emerald-700" onClick={() => router.push("/register")}>Get Started Free</Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-8">
            <Shield className="h-3.5 w-3.5" />
            Built for systematic investors. Not financial advice.
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
              Start Building Free <ArrowRight className="h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base px-8 py-6 gap-2 rounded-xl border-neutral-700 hover:bg-neutral-800"
              onClick={() => router.push("/docs")}
            >
              <BookOpen className="h-5 w-5" /> Read the Docs
            </Button>
          </div>

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

      {/* What is Systematic Investing */}
      <section id="what-is" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-4">The Idea</div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">What is systematic investing?</h2>
              <p className="text-neutral-400 leading-relaxed mb-4">
                Most investors make portfolio decisions based on news, gut feel, or tips. Systematic investing is the opposite: you define rules, test them on historical data, and follow the system — not emotions.
              </p>
              <p className="text-neutral-400 leading-relaxed mb-4">
                Hedge funds and large asset managers have done this for decades using factor models — mathematical frameworks that explain why stocks go up or down (size, momentum, value, quality). Until now, these tools were inaccessible without institutional infrastructure.
              </p>
              <p className="text-neutral-400 leading-relaxed">
                Galedge brings that infrastructure to individual researchers, students, and portfolio managers. You define the strategy. The platform handles the math.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Rules-based", desc: "Decisions follow pre-defined criteria, not hunches" },
                { label: "Evidence-based", desc: "Strategies tested on historical data before real capital" },
                { label: "Factor-driven", desc: "Returns attributed to systematic risk premia" },
                { label: "Repeatable", desc: "Same inputs produce same outputs, every time" },
              ].map((item) => (
                <div key={item.label} className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40">
                  <div className="text-sm font-semibold text-emerald-400 mb-1">{item.label}</div>
                  <div className="text-xs text-neutral-500 leading-relaxed">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Product Preview */}
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/50 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-neutral-800 bg-neutral-900">
              <div className="h-3 w-3 rounded-full bg-red-500/60" />
              <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
              <div className="h-3 w-3 rounded-full bg-emerald-500/60" />
              <span className="text-xs text-neutral-600 ml-3">Galedge Alpha — Analytics</span>
            </div>
            <div className="grid grid-cols-3 divide-x divide-neutral-800 min-h-[320px]">
              <div className="p-6 col-span-1 bg-neutral-950/40">
                <div className="text-xs text-neutral-600 uppercase tracking-widest mb-4">Portfolio</div>
                {["HDFC Bank", "Infosys", "Reliance", "TCS", "ICICI Bank"].map((s, i) => (
                  <div key={s} className="flex items-center justify-between py-2 border-b border-neutral-800/50">
                    <span className="text-xs text-neutral-300">{s}</span>
                    <span className={`text-xs font-mono ${i % 2 === 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {i % 2 === 0 ? "+" : "-"}{(Math.random() * 5 + 1).toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
              <div className="p-6 col-span-2">
                <div className="text-xs text-neutral-600 uppercase tracking-widest mb-4">Factor Attribution</div>
                <div className="space-y-3">
                  {[
                    { factor: "Market Beta", contribution: 3.2, color: "bg-emerald-500" },
                    { factor: "Momentum", contribution: 1.8, color: "bg-blue-500" },
                    { factor: "Quality", contribution: 0.9, color: "bg-purple-500" },
                    { factor: "Value", contribution: -0.4, color: "bg-red-500" },
                    { factor: "Size", contribution: -0.2, color: "bg-orange-500" },
                  ].map((f) => (
                    <div key={f.factor} className="flex items-center gap-3">
                      <div className="w-24 text-xs text-neutral-500 shrink-0">{f.factor}</div>
                      <div className="flex-1 bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full ${f.color} rounded-full`}
                          style={{ width: `${Math.abs(f.contribution) * 15}%`, marginLeft: f.contribution < 0 ? "auto" : 0 }}
                        />
                      </div>
                      <div className={`w-12 text-xs font-mono text-right ${f.contribution >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {f.contribution >= 0 ? "+" : ""}{f.contribution}%
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-neutral-800 grid grid-cols-3 gap-4">
                  {[
                    { label: "Total Return", value: "+18.4%" },
                    { label: "Sharpe Ratio", value: "1.42" },
                    { label: "Max Drawdown", value: "-7.2%" },
                  ].map((m) => (
                    <div key={m.label}>
                      <div className="text-xs text-neutral-600 mb-1">{m.label}</div>
                      <div className="text-sm font-bold text-white">{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-4">Platform</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Tools that answer real questions</h2>
            <p className="text-neutral-400 text-lg max-w-2xl mx-auto">Not dashboards. Not charts for the sake of charts. Every feature answers a specific question a portfolio manager or researcher would actually ask.</p>
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
                <h3 className="text-base font-semibold mb-2 leading-snug">{f.title}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who is this for */}
      <section id="who" className="py-24 px-6 bg-neutral-900/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-4">Who it&apos;s for</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for people who take investing seriously</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PERSONAS.map((p) => (
              <div key={p.title} className="flex gap-5 p-6 rounded-2xl border border-neutral-800 bg-neutral-900/40">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <p.icon className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <div className="font-semibold mb-1">{p.title}</div>
                  <div className="text-sm text-neutral-400 leading-relaxed">{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Galedge vs Excel */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-4">Comparison</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why not just use Excel?</h2>
            <p className="text-neutral-400">Excel is great for simple models. It breaks down the moment you need live data, optimization, or proper attribution.</p>
          </div>
          <div className="rounded-2xl border border-neutral-800 overflow-hidden">
            <div className="grid grid-cols-3 bg-neutral-900 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              <div>Feature</div>
              <div className="text-center text-emerald-400">Galedge</div>
              <div className="text-center">Excel</div>
            </div>
            {VS_EXCEL.map((row, i) => (
              <div key={row.feature} className={`grid grid-cols-3 px-6 py-3.5 text-sm items-center ${i % 2 === 0 ? "bg-neutral-950/40" : ""}`}>
                <div className="text-neutral-300">{row.feature}</div>
                <div className="flex justify-center">
                  {row.galedge === true ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <span className="text-xs text-neutral-500">{row.galedge}</span>}
                </div>
                <div className="flex justify-center">
                  {row.excel === true ? <CheckCircle2 className="h-4 w-4 text-neutral-400" /> : row.excel === false ? <XCircle className="h-4 w-4 text-red-500/60" /> : <span className="text-xs text-neutral-500">{row.excel}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6 bg-neutral-900/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-4">Workflow</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">From raw data to live portfolio</h2>
            <p className="text-neutral-400 text-lg">Four steps. No infrastructure to set up.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Upload Portfolio", desc: "Upload a CSV with your holdings. Market data is fetched automatically in the background.", icon: Database },
              { step: "02", title: "Analyze & Research", desc: "Run factor attribution, compare against benchmark, write custom Python research in the code editor.", icon: BarChart3 },
              { step: "03", title: "Build & Backtest", desc: "Set constraints and objectives, run the optimizer, see the backtest equity curve with transaction costs.", icon: Target },
              { step: "04", title: "Go Live", desc: "Promote to production. Generate rebalance trade lists with exact quantities and current prices.", icon: Zap },
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

      {/* FAQ */}
      <section id="faq" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-4">FAQ</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Common questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="p-12 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-neutral-900 to-cyan-500/10 border border-emerald-500/20">
            <Users className="h-10 w-10 text-emerald-400 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to invest systematically?</h2>
            <p className="text-neutral-400 text-lg mb-8">
              Free to start. Upload your portfolio, run analytics, backtest strategies. Go live when you&apos;re ready.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                className="text-base px-10 py-6 bg-emerald-600 hover:bg-emerald-700 gap-2 rounded-xl"
                onClick={() => router.push("/register")}
              >
                Get Started Free <ArrowRight className="h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base px-8 py-6 gap-2 rounded-xl border-neutral-700 hover:bg-neutral-800"
                onClick={() => router.push("/docs")}
              >
                <BookOpen className="h-5 w-5" /> Read the Docs
              </Button>
            </div>
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
            © 2025 Galedge Alpha
          </p>
          <div className="flex items-center gap-6">
            <button onClick={() => router.push("/login")} className="text-xs text-neutral-500 hover:text-white transition-colors">Login</button>
            <button onClick={() => router.push("/register")} className="text-xs text-neutral-500 hover:text-white transition-colors">Register</button>
            <button onClick={() => router.push("/home")} className="text-xs text-neutral-500 hover:text-white transition-colors">Market Data</button>
            <button onClick={() => router.push("/docs")} className="text-xs text-neutral-500 hover:text-white transition-colors">Docs</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
