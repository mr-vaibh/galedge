import Link from "next/link";

export default function OptimizerDocsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Portfolio Optimizer</h1>
      <p className="text-neutral-400 mb-10">
        Find the optimal stock weights given your investment objective and constraints.
        Powered by CVXPY convex optimization.
      </p>

      {/* Universe */}
      <section id="universe" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Universe Selection</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          The <strong className="text-white">universe</strong> is the set of stocks the optimizer can choose from.
          Select one of the predefined universes or define your own:
        </p>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 mb-4">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-neutral-500"><th className="pb-2">Universe</th><th className="pb-2">Stocks</th><th className="pb-2">Description</th></tr></thead>
            <tbody className="text-neutral-300">
              <tr className="border-t border-neutral-800"><td className="py-2">NIFTY 50</td><td className="py-2">50</td><td className="py-2">Top 50 Indian companies — blue-chip, highly liquid</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2">NIFTY 100</td><td className="py-2">100</td><td className="py-2">Top 100 — includes large and some mid-cap</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2">NIFTY NEXT 50</td><td className="py-2">50</td><td className="py-2">Stocks ranked 51-100 — emerging large-caps</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2">NIFTY 500</td><td className="py-2">500</td><td className="py-2">Broad market — includes mid and small-cap</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2">Custom</td><td className="py-2">Variable</td><td className="py-2">Your own list of stock symbols</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-neutral-500 text-sm">
          The optimizer uses real historical price data from the database to compute expected returns and the covariance matrix.
        </p>
      </section>

      {/* Objectives */}
      <section id="objectives" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Optimization Objectives</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Choose what the optimizer should aim for. Each objective finds different optimal weights:
        </p>
        <div className="space-y-4">
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <h3 className="font-medium text-white mb-1">Minimize Risk</h3>
            <p className="text-sm text-neutral-400">
              Finds the portfolio with the <strong className="text-neutral-300">lowest possible volatility</strong>
              (minimum variance). Best for conservative investors who prioritize capital preservation.
            </p>
            <p className="text-xs text-neutral-500 mt-1">Mathematically: minimize w&apos; &Sigma; w (portfolio variance)</p>
          </div>

          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <h3 className="font-medium text-white mb-1">Maximize Return</h3>
            <p className="text-sm text-neutral-400">
              Finds the portfolio with the <strong className="text-neutral-300">highest expected return</strong>.
              This tends to concentrate into the highest-returning stocks, so add position size constraints.
            </p>
            <p className="text-xs text-neutral-500 mt-1">Mathematically: maximize w&apos; &mu; (expected portfolio return)</p>
          </div>

          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <h3 className="font-medium text-white mb-1">Maximize Sharpe Ratio</h3>
            <p className="text-sm text-neutral-400">
              Finds the portfolio with the best <strong className="text-neutral-300">risk-adjusted return</strong>.
              Balances return and risk — generally the most practical objective.
            </p>
            <p className="text-xs text-neutral-500 mt-1">Mathematically: maximize (w&apos; &mu; - r_f) / sqrt(w&apos; &Sigma; w)</p>
          </div>

          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <h3 className="font-medium text-white mb-1">Minimize Tracking Error</h3>
            <p className="text-sm text-neutral-400">
              Finds the portfolio that <strong className="text-neutral-300">stays closest to a benchmark</strong> (e.g., NIFTY 50).
              Best for index tracking or enhanced index strategies.
            </p>
            <p className="text-xs text-neutral-500 mt-1">Mathematically: minimize (w - w_bench)&apos; &Sigma; (w - w_bench)</p>
          </div>
        </div>
      </section>

      {/* Constraints */}
      <section id="constraints" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Constraints</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Constraints limit what the optimizer can do. Without constraints, the optimizer might put 100% into one stock.
          Add constraints to make the output realistic and investable.
        </p>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 mb-4">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-neutral-500"><th className="pb-2">Constraint</th><th className="pb-2">What It Controls</th><th className="pb-2">Example Values</th><th className="pb-2">Impact</th></tr></thead>
            <tbody className="text-neutral-300">
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Position Size</td>
                <td className="py-2">Min/max weight per stock</td>
                <td className="py-2 font-mono text-xs">min: 1%, max: 10%</td>
                <td className="py-2">Prevents over-concentration in any single stock</td>
              </tr>
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Max Positions</td>
                <td className="py-2">Maximum number of stocks</td>
                <td className="py-2 font-mono text-xs">20</td>
                <td className="py-2">Limits portfolio to N stocks — forces selection</td>
              </tr>
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Beta Exposure</td>
                <td className="py-2">Portfolio beta range</td>
                <td className="py-2 font-mono text-xs">min: 0.8, max: 1.2</td>
                <td className="py-2">Controls market sensitivity — keeps portfolio near market-neutral if tight</td>
              </tr>
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Turnover</td>
                <td className="py-2">Max % changed at rebalance</td>
                <td className="py-2 font-mono text-xs">max: 30%</td>
                <td className="py-2">Limits trading costs by restricting how much changes</td>
              </tr>
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Sector Weight</td>
                <td className="py-2">Min/max per sector</td>
                <td className="py-2 font-mono text-xs">max: 25%</td>
                <td className="py-2">Ensures diversification across sectors</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
          <p className="text-sm text-emerald-400">
            <strong>Tip:</strong> Start with Position Size (2-10%) and Max Positions (15-25). Add Beta and Sector
            constraints if the output is too concentrated. The Sharpe objective + these constraints usually gives
            the most practical results.
          </p>
        </div>
      </section>

      {/* Results */}
      <section id="results" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Reading Results</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          After running the optimizer, you see:
        </p>
        <ul className="list-disc list-inside text-sm text-neutral-400 space-y-1 mb-4">
          <li><strong className="text-white">Expected Return %</strong> &mdash; annualized return based on historical data</li>
          <li><strong className="text-white">Expected Risk %</strong> &mdash; annualized volatility (standard deviation)</li>
          <li><strong className="text-white">Sharpe Ratio</strong> &mdash; risk-adjusted return metric</li>
          <li><strong className="text-white">Positions</strong> &mdash; number of stocks in the optimal portfolio</li>
          <li><strong className="text-white">Weight table</strong> &mdash; each stock with its optimal weight allocation</li>
          <li><strong className="text-white">Weight bar chart</strong> &mdash; visual distribution of weights</li>
        </ul>
        <p className="text-neutral-500 text-sm">
          You can download the weights as CSV or use them directly in the{" "}
          <Link href="/docs/strategy-builder" className="text-emerald-400 hover:underline">Strategy Builder</Link> for backtesting.
        </p>
      </section>
    </div>
  );
}
