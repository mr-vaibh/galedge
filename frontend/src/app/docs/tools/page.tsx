import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tools | Galedge Docs",
  description: "Market research tools available to all users — stock screener with fundamental filters, sector heatmap, correlation matrix, and AI-powered price predictions.",
  keywords: ["stock screener", "heatmap", "correlation matrix", "AI prediction", "market research", "fundamental filters"],
  openGraph: {
    title: "Tools | Galedge Docs",
    description: "Market research tools available to all users — stock screener with fundamental filters, sector heatmap, correlation matrix, and AI-powered price predictions.",
  },
};

export default function ToolsDocsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Tools</h1>
      <p className="text-neutral-400 mb-10">
        Market research and analysis tools available to all users — no portfolio required.
      </p>

      {/* Screener */}
      <section id="screener" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Stock Screener</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Filter and rank stocks based on fundamental and technical criteria. Navigate to <strong className="text-white">Tools &rarr; Screener</strong>.
        </p>

        <h3 className="font-medium text-white mb-2">Filters</h3>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 mb-4">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-neutral-500"><th className="pb-2">Filter</th><th className="pb-2">Description</th><th className="pb-2">Values</th></tr></thead>
            <tbody className="text-neutral-300">
              <tr className="border-t border-neutral-800"><td className="py-2">Sector</td><td className="py-2">Industry sector</td><td className="py-2">All, Tech, Healthcare, Finance, Consumer, Energy, etc.</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2">Max P/E</td><td className="py-2">Maximum price-to-earnings ratio</td><td className="py-2">Any number (e.g., 25)</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2">Min Div Yield</td><td className="py-2">Minimum dividend yield %</td><td className="py-2">Any number (e.g., 2.0)</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2">Sort By</td><td className="py-2">Sort results</td><td className="py-2">Market Cap, P/E, Div Yield, Change %</td></tr>
            </tbody>
          </table>
        </div>

        <h3 className="font-medium text-white mb-2">Results Table</h3>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Shows stocks matching your criteria with: Symbol, Name, Sector, Price, Change %, Market Cap,
          P/E (trailing), Forward P/E, Dividend Yield, and Beta.
        </p>
        <p className="text-neutral-500 text-sm">
          Click any stock symbol to navigate to its detail page. Export results to CSV.
        </p>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mt-3">
          <p className="text-sm text-amber-400">
            <strong>Note:</strong> First load may take 15-30 seconds as the screener fetches data for all stocks.
            Subsequent loads are faster due to caching.
          </p>
        </div>
      </section>

      {/* Heatmap */}
      <section id="heatmap" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Market Heatmap</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Visualize the entire market in a single treemap view. Navigate to <strong className="text-white">Tools &rarr; Heatmap</strong>.
        </p>

        <h3 className="font-medium text-white mb-2">How to Read It</h3>
        <ul className="list-disc list-inside text-sm text-neutral-400 space-y-1 mb-4">
          <li><strong className="text-white">Rectangle size</strong> = market capitalization (bigger = larger company)</li>
          <li><strong className="text-white">Color</strong> = daily price change (green = up, red = down, gray = flat)</li>
          <li><strong className="text-white">Grouping</strong> = stocks are grouped by sector</li>
          <li><strong className="text-white">Hover</strong> = shows symbol, company name, change %, and market cap</li>
        </ul>

        <h3 className="font-medium text-white mb-2">Markets</h3>
        <p className="text-neutral-400 leading-relaxed">
          Toggle between <strong className="text-white">US</strong> and <strong className="text-white">India</strong> markets
          using the toggle button. The heatmap reloads with the selected market&apos;s data.
        </p>

        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 mt-3">
          <p className="text-xs text-neutral-500 mb-1">Color scale:</p>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 bg-red-600 rounded text-white">-3%</span>
            <span className="px-2 py-0.5 bg-red-800/50 rounded text-neutral-300">-1%</span>
            <span className="px-2 py-0.5 bg-neutral-700 rounded text-neutral-300">0%</span>
            <span className="px-2 py-0.5 bg-emerald-800/50 rounded text-neutral-300">+1%</span>
            <span className="px-2 py-0.5 bg-emerald-600 rounded text-white">+3%</span>
          </div>
        </div>
      </section>

      {/* Compare */}
      <section id="compare" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Stock Comparison</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Compare up to <strong className="text-white">5 stocks</strong> side by side.
          Navigate to <strong className="text-white">Tools &rarr; Compare</strong>.
        </p>

        <h3 className="font-medium text-white mb-2">Features</h3>
        <ul className="list-disc list-inside text-sm text-neutral-400 space-y-1 mb-4">
          <li><strong className="text-white">Performance chart</strong> &mdash; normalized to base 100, showing relative performance over time</li>
          <li><strong className="text-white">Time periods</strong> &mdash; 1 month, 3 months, 6 months, 1 year, 5 years</li>
          <li><strong className="text-white">Fundamentals table</strong> &mdash; side-by-side comparison of market cap, P/E, dividend yield, beta, 52-week high/low, etc.</li>
        </ul>

        <h3 className="font-medium text-white mb-2">How to Use</h3>
        <ol className="list-decimal list-inside text-sm text-neutral-400 space-y-1 mb-4">
          <li>Type stock symbols in the multi-select input</li>
          <li>Select a time period</li>
          <li>View the normalized chart — all stocks start at 100, divergence shows relative performance</li>
          <li>Scroll down for the fundamentals comparison table</li>
          <li>Export fundamentals to CSV</li>
        </ol>
        <p className="text-neutral-500 text-sm">
          Each stock is shown in a different color. The chart uses the Lightweight Charts library for interactive zoom and pan.
        </p>
      </section>

      {/* Correlation */}
      <section id="correlation" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Correlation Matrix</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Analyze how stocks move together. Navigate to <strong className="text-white">Tools &rarr; Correlation</strong>.
          Select up to <strong className="text-white">10 stocks</strong>.
        </p>

        <h3 className="font-medium text-white mb-2">How to Read It</h3>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 mb-4">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-neutral-500"><th className="pb-2">Correlation</th><th className="pb-2">Color</th><th className="pb-2">Meaning</th></tr></thead>
            <tbody className="text-neutral-300">
              <tr className="border-t border-neutral-800"><td className="py-2 font-mono">+1.0</td><td className="py-2 text-emerald-400">Deep green</td><td className="py-2">Perfect positive — stocks always move together</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2 font-mono">+0.5</td><td className="py-2 text-emerald-400/60">Light green</td><td className="py-2">Moderate positive — tend to move together</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2 font-mono">0.0</td><td className="py-2 text-neutral-400">Gray</td><td className="py-2">No relationship — movements are independent</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2 font-mono">-0.5</td><td className="py-2 text-red-400/60">Light red</td><td className="py-2">Moderate negative — tend to move opposite</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2 font-mono">-1.0</td><td className="py-2 text-red-400">Deep red</td><td className="py-2">Perfect negative — always move opposite</td></tr>
            </tbody>
          </table>
        </div>

        <h3 className="font-medium text-white mb-2">Time Periods</h3>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Choose from 3 months, 6 months, 1 year, or 2 years. Longer periods give more stable correlations;
          shorter periods capture recent dynamics.
        </p>
        <p className="text-neutral-500 text-sm">
          Uses Pearson correlation of daily returns. Export the matrix to CSV.
        </p>
      </section>

      {/* AI Predict */}
      <section id="predict" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">AI Predict</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          ML-powered stock prediction with multiple signal types. Navigate to <strong className="text-white">Tools &rarr; AI Predict</strong>.
        </p>

        <h3 className="font-medium text-white mb-2">Inputs</h3>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 mb-4">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-neutral-500"><th className="pb-2">Field</th><th className="pb-2">Description</th><th className="pb-2">Example</th></tr></thead>
            <tbody className="text-neutral-300">
              <tr className="border-t border-neutral-800"><td className="py-2">Symbol</td><td className="py-2">Stock to analyze</td><td className="py-2">RELIANCE.NS</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2">Portfolio Value</td><td className="py-2">Your total portfolio value</td><td className="py-2">1,000,000</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2">Risk Tolerance</td><td className="py-2">Low / Medium / High</td><td className="py-2">Medium</td></tr>
            </tbody>
          </table>
        </div>

        <h3 className="font-medium text-white mb-2">Output</h3>
        <ul className="list-disc list-inside text-sm text-neutral-400 space-y-1 mb-4">
          <li><strong className="text-white">Direction</strong> &mdash; UP, DOWN, or NEUTRAL prediction</li>
          <li><strong className="text-white">Confidence</strong> &mdash; 0-100% model confidence score</li>
          <li><strong className="text-white">Expected Returns</strong> &mdash; 5-day, 10-day, 20-day forecasts</li>
          <li><strong className="text-white">Signal Breakdown</strong> &mdash; technical (RSI, MACD, Bollinger), momentum, fundamental (P/E, earnings), sentiment</li>
          <li><strong className="text-white">Recommendation</strong> &mdash; BUY/SELL/HOLD with entry price, stop loss, price targets, position size</li>
          <li><strong className="text-white">Risk Metrics</strong> &mdash; VaR (95%), max drawdown, volatility, beta</li>
          <li><strong className="text-white">Backtest</strong> &mdash; historical accuracy of the prediction model</li>
        </ul>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
          <p className="text-sm text-amber-400">
            <strong>Disclaimer:</strong> AI predictions are based on historical patterns and technical indicators.
            They are not financial advice and should not be the sole basis for investment decisions.
            Always do your own research.
          </p>
        </div>
      </section>
    </div>
  );
}
