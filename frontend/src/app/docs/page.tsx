import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Documentation | Galedge Docs",
  description: "Complete documentation for the Galedge platform — portfolio analytics, risk modelling, optimization, backtesting, and more for systematic investors.",
  keywords: ["Galedge documentation", "portfolio analytics", "systematic investing", "factor model", "NSE", "backtesting"],
  openGraph: {
    title: "Documentation | Galedge Docs",
    description: "Complete documentation for the Galedge platform — portfolio analytics, risk modelling, optimization, backtesting, and more for systematic investors.",
  },
};
import {
  Rocket, GraduationCap, Briefcase, BarChart3, Shield, Sliders,
  Target, Atom, Wrench, Settings, Code2, BookA, ArrowRight,
} from "lucide-react";

const SECTIONS = [
  { icon: Rocket, title: "Getting Started", desc: "Create an account, upload your portfolio, and run your first analytics in under 5 minutes.", href: "/docs/getting-started", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { icon: GraduationCap, title: "Concepts", desc: "Stock market fundamentals, factor models, attribution, and risk metrics explained simply.", href: "/docs/concepts", color: "text-blue-400", bg: "bg-blue-500/10" },
  { icon: Briefcase, title: "Portfolio", desc: "Upload holdings via CSV, select portfolios for analysis, and track P&L in real time.", href: "/docs/portfolio", color: "text-purple-400", bg: "bg-purple-500/10" },
  { icon: BarChart3, title: "Analytics", desc: "Performance tracking, return decomposition, drawdown analysis, and peer comparison.", href: "/docs/analytics", color: "text-orange-400", bg: "bg-orange-500/10" },
  { icon: Shield, title: "Risk Model", desc: "21-factor risk model with market, style, and industry factors. Factor returns and correlations.", href: "/docs/risk-model", color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { icon: Sliders, title: "Optimizer", desc: "CVXPY-powered portfolio optimization with position, beta, sector, and turnover constraints.", href: "/docs/optimizer", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  { icon: Target, title: "Strategy Builder", desc: "Build strategies, run backtests with transaction costs, promote to production, generate trade lists.", href: "/docs/strategy-builder", color: "text-red-400", bg: "bg-red-500/10" },
  { icon: Atom, title: "Alpha Machine", desc: "VS Code in the browser, Python sandbox, build models, upload custom factors.", href: "/docs/alpha-machine", color: "text-indigo-400", bg: "bg-indigo-500/10" },
  { icon: Wrench, title: "Tools", desc: "Stock screener, market heatmap, stock comparison, correlation matrix, and AI predictions.", href: "/docs/tools", color: "text-pink-400", bg: "bg-pink-500/10" },
  { icon: Settings, title: "Settings", desc: "Configure display currency, view exchange rates, and manage your profile.", href: "/docs/settings", color: "text-neutral-400", bg: "bg-neutral-500/10" },
  { icon: Code2, title: "API Reference", desc: "Complete REST API documentation for market data, analytics, strategies, and optimization.", href: "/docs/api-reference", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { icon: BookA, title: "Glossary", desc: "A-Z definitions of financial terms, metrics, and concepts used across the platform.", href: "/docs/glossary", color: "text-blue-400", bg: "bg-blue-500/10" },
];

export default function DocsHomePage() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-4">Galedge Documentation</h1>
      <p className="text-lg text-neutral-400 mb-4 leading-relaxed">
        Welcome to the Galedge platform documentation. Galedge is an institutional-grade
        systematic investment platform that lets you build, test, and deploy quantitative
        strategies using real market data.
      </p>
      <p className="text-neutral-500 mb-10 leading-relaxed">
        Whether you are a portfolio manager, quant researcher, or someone learning about
        systematic investing, these docs cover everything from basic stock market concepts
        to advanced factor models and portfolio optimization.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group p-5 rounded-xl border border-neutral-800 hover:border-neutral-700 bg-neutral-900/50 hover:bg-neutral-900 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  {s.title}
                  <ArrowRight className="h-3.5 w-3.5 text-neutral-600 group-hover:text-neutral-400 transition-colors" />
                </h3>
                <p className="text-sm text-neutral-500 mt-1 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
