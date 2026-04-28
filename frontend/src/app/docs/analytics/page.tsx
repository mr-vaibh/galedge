import Link from "next/link";

export default function AnalyticsDocsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Analytics Suite</h1>
      <p className="text-neutral-400 mb-10">
        Comprehensive portfolio analytics covering performance, risk, attribution, and peer comparison.
        All analytics use real data from your selected portfolio.
      </p>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-10">
        <p className="text-sm text-blue-400">
          <strong>Prerequisite:</strong> You need to have a portfolio selected.
          Go to <Link href="/docs/portfolio#select-portfolio" className="underline">Portfolio &rarr; Select Portfolio</Link> first.
        </p>
      </div>

      {/* Analytics Hub */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Analytics Hub</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          The main analytics page (<strong className="text-white">Analytics</strong> in the sidebar) shows all your portfolios
          organized by type:
        </p>
        <ul className="list-disc list-inside text-sm text-neutral-400 space-y-1 mb-3">
          <li><strong className="text-white">Backtested</strong> &mdash; strategies that have been backtested</li>
          <li><strong className="text-white">User Uploaded</strong> &mdash; portfolios you uploaded via CSV</li>
          <li><strong className="text-white">Standard</strong> &mdash; predefined benchmark portfolios</li>
          <li><strong className="text-white">Production</strong> &mdash; strategies promoted to production</li>
          <li><strong className="text-white">Shared / Received</strong> &mdash; portfolios shared between users</li>
        </ul>
        <p className="text-neutral-500 text-sm">
          Click any portfolio to navigate to its analytics. Use the Refresh button to reload the list.
        </p>
      </section>

      {/* Performance */}
      <section id="performance" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Performance Summary</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          The Performance tab gives you a high-level overview of how your portfolio has performed.
        </p>

        <h3 className="font-medium text-white mb-2">Metrics Cards</h3>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 mb-4">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-neutral-500"><th className="pb-2">Card</th><th className="pb-2">Metrics</th><th className="pb-2">What It Tells You</th></tr></thead>
            <tbody className="text-neutral-300">
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Profit &amp; Loss</td>
                <td className="py-2">Total Return %, CAGR, Sharpe, Positions</td>
                <td className="py-2">Overall profitability and risk-adjusted performance</td>
              </tr>
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Risk Summary</td>
                <td className="py-2">Max Drawdown %, Volatility %, Avg Turnover, Trading Days</td>
                <td className="py-2">Risk profile and how much the portfolio fluctuated</td>
              </tr>
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Portfolio Summary</td>
                <td className="py-2">Initial Capital, Final Value, Rebalances, Fund Name</td>
                <td className="py-2">Administrative details about the portfolio</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="font-medium text-white mb-2">Charts</h3>
        <ul className="list-disc list-inside text-sm text-neutral-400 space-y-1 mb-4">
          <li><strong className="text-white">Portfolio Value</strong> &mdash; equity curve showing portfolio value over time</li>
          <li><strong className="text-white">Drawdown %</strong> &mdash; how far below peak the portfolio dropped at each point</li>
          <li><strong className="text-white">Value Trend</strong> &mdash; smoothed trend line of portfolio value</li>
        </ul>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
          <p className="text-sm text-amber-400">
            <strong>First-time loading:</strong> When you view analytics for a newly uploaded portfolio,
            the platform may need to ingest market data. This takes 30-60 seconds. You will see a progress spinner.
          </p>
        </div>
      </section>

      {/* Holdings */}
      <section id="holdings" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Holdings Summary</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Shows the composition of your portfolio — what you hold and how much.
        </p>
        <ul className="list-disc list-inside text-sm text-neutral-400 space-y-1 mb-4">
          <li><strong className="text-white">Holdings table</strong> &mdash; each stock with its weight %, sector, and market cap</li>
          <li><strong className="text-white">Holdings % chart</strong> &mdash; bar chart of portfolio weights</li>
          <li><strong className="text-white">Factor Exposure chart</strong> &mdash; how much your portfolio tilts toward each of the 21 factors</li>
          <li><strong className="text-white">Factor Summary table</strong> &mdash; average factor exposure across all holdings</li>
        </ul>
        <p className="text-neutral-500 text-sm">
          Use the checkboxes to select/deselect specific holdings for analysis. The &quot;All&quot; and &quot;None&quot; buttons help with bulk selection.
        </p>
      </section>

      {/* Returns & Risk */}
      <section id="returns-risk" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Returns &amp; Risk Analysis</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Deep dive into return sources and risk decomposition using the factor model.
        </p>

        <h3 className="font-medium text-white mb-2">View Modes</h3>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Toggle between three views using the tabs at the top:
        </p>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 mb-4">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-neutral-500"><th className="pb-2">Mode</th><th className="pb-2">Shows</th><th className="pb-2">Use When</th></tr></thead>
            <tbody className="text-neutral-300">
              <tr className="border-t border-neutral-800"><td className="py-2 font-medium">Active</td><td className="py-2">Portfolio returns and risk only</td><td className="py-2">Analyzing your own performance</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2 font-medium">Benchmark</td><td className="py-2">Benchmark returns and risk</td><td className="py-2">Understanding the benchmark</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2 font-medium">Excess</td><td className="py-2">Portfolio minus benchmark</td><td className="py-2">Measuring your value-add vs index</td></tr>
            </tbody>
          </table>
        </div>

        <h3 className="font-medium text-white mb-2">Return Decomposition</h3>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Your portfolio return is broken into <strong className="text-white">Factor Return</strong> (driven by systematic factors like
          market, momentum, value) and <strong className="text-white">Idiosyncratic Return</strong> (stock-specific, not explained by factors).
        </p>

        <h3 className="font-medium text-white mb-2">Charts</h3>
        <ul className="list-disc list-inside text-sm text-neutral-400 space-y-1">
          <li><strong className="text-white">Factor Returns %</strong> &mdash; contribution of each factor to total return</li>
          <li><strong className="text-white">Factor Risk Contribution %</strong> &mdash; how much risk each factor adds</li>
          <li><strong className="text-white">Factor Exposure</strong> &mdash; current portfolio exposure to each factor</li>
          <li><strong className="text-white">Top Contributors / Detractors</strong> &mdash; top 3 factors helping and hurting performance</li>
        </ul>
      </section>

      {/* Peer Comparison */}
      <section id="peer-comparison" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Peer Comparison</h2>
        <p className="text-neutral-400 leading-relaxed">
          Compare your portfolio&apos;s metrics against peer funds and industry benchmarks. See how your returns,
          risk, and Sharpe ratio stack up. Available under <strong className="text-white">Analytics &rarr; Peer Comparison</strong>.
        </p>
      </section>

      {/* Drawdown */}
      <section id="drawdown" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Drawdown Analysis</h2>
        <p className="text-neutral-400 leading-relaxed">
          Visualizes every peak-to-trough decline in your portfolio. Identifies the worst drawdowns by
          depth and duration, helping you understand the downside risk profile.
          Available under <strong className="text-white">Analytics &rarr; Portfolio Analysis &rarr; Drawdown</strong>.
        </p>
      </section>

      {/* Period Analysis */}
      <section id="period-analysis" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Period Analysis</h2>
        <p className="text-neutral-400 leading-relaxed">
          Breaks down performance by time period — monthly, quarterly, or yearly. See which periods
          contributed the most and least to overall returns. Available under <strong className="text-white">Analytics &rarr; Period Analysis</strong>.
        </p>
      </section>

      {/* Additional views */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Additional Views</h2>
        <ul className="list-disc list-inside text-sm text-neutral-400 space-y-2">
          <li><strong className="text-white">Event Sensitivity</strong> &mdash; analyzes portfolio response to specific market events (e.g., rate hikes, earnings)</li>
          <li><strong className="text-white">Portfolio Slicing</strong> &mdash; slice holdings by sector, market cap, or factor exposure to see sub-portfolio performance</li>
          <li><strong className="text-white">Peer Intelligence</strong> &mdash; deeper industry-level benchmarking with peer breakdown by metrics</li>
          <li><strong className="text-white">Lite Analytics</strong> &mdash; simplified, single-page view of key metrics for quick reference</li>
        </ul>
      </section>

      {/* Card Controls */}
      <section className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-6">
        <h3 className="font-semibold mb-3">Card Toolbar</h3>
        <p className="text-neutral-400 text-sm mb-3 leading-relaxed">
          Every card in the analytics suite has a toolbar with these controls:
        </p>
        <ul className="list-disc list-inside text-sm text-neutral-400 space-y-1">
          <li><strong className="text-white">Filter</strong> &mdash; Excel-level filtering and sorting for table cards (column filters, operators, multi-criteria)</li>
          <li><strong className="text-white">Info</strong> &mdash; contextual description of what the card shows</li>
          <li><strong className="text-white">Expand</strong> &mdash; view the card content in a full-screen modal</li>
          <li><strong className="text-white">Download</strong> &mdash; CSV download for tables, PNG screenshot for charts</li>
        </ul>
      </section>
    </div>
  );
}
