import Link from "next/link";

export default function RiskModelDocsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Risk Model</h1>
      <p className="text-neutral-400 mb-10">
        Galedge&apos;s 21-factor risk model decomposes stock returns into systematic factors,
        helping you understand what drives portfolio risk and return.
      </p>

      {/* Factor Model */}
      <section id="factor-model" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">21-Factor Risk Model</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          The risk model uses <strong className="text-white">cross-sectional regression</strong> to estimate factor exposures
          and factor returns. Each day, stock returns are regressed against factor exposures to compute factor returns.
          Over time, this builds a complete picture of what drives your portfolio.
        </p>

        <h3 className="font-medium text-white mt-6 mb-2">Market Factor (1)</h3>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 mb-4">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-neutral-500"><th className="pb-2">Factor</th><th className="pb-2">Description</th><th className="pb-2">Interpretation</th></tr></thead>
            <tbody className="text-neutral-300">
              <tr className="border-t border-neutral-800"><td className="py-2 font-mono text-xs">BETA</td><td className="py-2">Sensitivity to overall market</td><td className="py-2">High beta = moves more with market</td></tr>
            </tbody>
          </table>
        </div>

        <h3 className="font-medium text-white mb-2">Style Factors (10)</h3>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 mb-4">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-neutral-500"><th className="pb-2">Factor</th><th className="pb-2">Description</th><th className="pb-2">High Exposure Means</th></tr></thead>
            <tbody className="text-neutral-300">
              <tr className="border-t border-neutral-800"><td className="py-2 font-mono text-xs">SIZE</td><td className="py-2">Market capitalization</td><td className="py-2">Large-cap stock</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2 font-mono text-xs">MOMENTUM</td><td className="py-2">Recent price trend (6-12 months)</td><td className="py-2">Strong recent performer</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2 font-mono text-xs">VALUE</td><td className="py-2">Price relative to fundamentals</td><td className="py-2">Cheap stock (low P/E, P/B)</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2 font-mono text-xs">VOLATILITY</td><td className="py-2">Historical return volatility</td><td className="py-2">More volatile stock</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2 font-mono text-xs">QUALITY</td><td className="py-2">Profitability and stability</td><td className="py-2">High-quality, profitable company</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2 font-mono text-xs">GROWTH</td><td className="py-2">Earnings/revenue growth rate</td><td className="py-2">Fast-growing company</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2 font-mono text-xs">LEVERAGE</td><td className="py-2">Debt-to-equity ratio</td><td className="py-2">Highly leveraged company</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2 font-mono text-xs">LIQUIDITY</td><td className="py-2">Trading volume relative to market cap</td><td className="py-2">Highly liquid stock</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2 font-mono text-xs">DIVIDEND_YIELD</td><td className="py-2">Dividend as % of price</td><td className="py-2">High-dividend payer</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2 font-mono text-xs">EARNINGS_YIELD</td><td className="py-2">Earnings as % of price (inverse P/E)</td><td className="py-2">High-earnings yield (cheap)</td></tr>
            </tbody>
          </table>
        </div>

        <h3 className="font-medium text-white mb-2">Industry Factors (10)</h3>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Industry factors capture sector-specific risk. Each stock belongs to one industry. The 10 industry factors are:
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {["TECHNOLOGY", "FINANCIALS", "HEALTHCARE", "ENERGY", "CONSUMER_DISCRETIONARY", "CONSUMER_STAPLES", "INDUSTRIALS", "MATERIALS", "UTILITIES", "COMMUNICATION"].map((f) => (
            <span key={f} className="px-2 py-1 text-xs font-mono bg-neutral-900 border border-neutral-800 rounded text-neutral-300">{f}</span>
          ))}
        </div>
      </section>

      {/* Factor Summary */}
      <section id="factor-summary" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Factor Summary Page</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Navigate to <strong className="text-white">Risk Model &rarr; Factor Summary</strong>. Select a model (e.g., INEC1 for Indian equities).
        </p>

        <h3 className="font-medium text-white mb-2">What You See</h3>
        <ul className="list-disc list-inside text-sm text-neutral-400 space-y-1 mb-4">
          <li><strong className="text-white">Factor Performance Table</strong> &mdash; CAGR, cumulative return, Sharpe ratio, daily return, max drawdown for each factor</li>
          <li><strong className="text-white">Factor Correlation Matrix</strong> &mdash; heatmap showing how factors correlate with each other (green = positive, red = negative)</li>
          <li><strong className="text-white">Factor Returns Time Series</strong> &mdash; cumulative return chart for top factors over time</li>
          <li><strong className="text-white">Factor Pair Selector</strong> &mdash; select any two factors to see their exact correlation value</li>
        </ul>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
          <p className="text-sm text-amber-400">
            <strong>Auto-build:</strong> If the risk model hasn&apos;t been built yet, the page automatically triggers a build.
            This uses cross-sectional regression across all available stock data and takes 1-2 minutes.
          </p>
        </div>
      </section>

      {/* Stock Exposures */}
      <section id="stock-exposures" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Stock Factor Exposures</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Navigate to <strong className="text-white">Risk Model &rarr; Stock Summary</strong> to see individual stock exposures
          to all 21 factors.
        </p>

        <h3 className="font-medium text-white mb-2">How to Read Exposures</h3>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Factor exposures are standardized scores (z-scores). A value of:
        </p>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 mb-4">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-neutral-500"><th className="pb-2">Value</th><th className="pb-2">Meaning</th></tr></thead>
            <tbody className="text-neutral-300">
              <tr className="border-t border-neutral-800"><td className="py-2 font-mono">0.0</td><td className="py-2">Average exposure (neutral)</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2 font-mono">+1.0</td><td className="py-2">One standard deviation above average (strong positive tilt)</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2 font-mono">-1.0</td><td className="py-2">One standard deviation below average (strong negative tilt)</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2 font-mono">+2.0</td><td className="py-2">Very high exposure (top percentile)</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-neutral-400 text-sm leading-relaxed">
          Example: If RELIANCE.NS has a MOMENTUM exposure of +1.5 and a VALUE exposure of -0.8, it means
          Reliance has strong recent performance (momentum) but is relatively expensive (low value tilt).
        </p>
      </section>

      <section className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-6">
        <h3 className="font-semibold mb-3">Related</h3>
        <div className="flex flex-col gap-2">
          <Link href="/docs/concepts#factor-models" className="text-sm text-emerald-400 hover:underline">&rarr; Factor model concepts explained</Link>
          <Link href="/docs/analytics#returns-risk" className="text-sm text-emerald-400 hover:underline">&rarr; Factor-based return decomposition</Link>
          <Link href="/docs/optimizer" className="text-sm text-emerald-400 hover:underline">&rarr; Using factor constraints in the optimizer</Link>
        </div>
      </section>
    </div>
  );
}
