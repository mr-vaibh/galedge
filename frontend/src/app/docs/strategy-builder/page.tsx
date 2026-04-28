import Link from "next/link";

export default function StrategyBuilderDocsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Strategy Builder</h1>
      <p className="text-neutral-400 mb-10">
        Build quantitative strategies, backtest them with real data and transaction costs,
        promote winning strategies to production, and generate actionable trade lists.
      </p>

      {/* Create Strategy */}
      <section id="create" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Creating a Strategy</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Navigate to <strong className="text-white">Strategy Builder &rarr; Build New Strategy</strong>. Fill in the strategy identity fields at the top:
        </p>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 mb-4">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-neutral-500"><th className="pb-2">Field</th><th className="pb-2">Description</th><th className="pb-2">Example</th></tr></thead>
            <tbody className="text-neutral-300">
              <tr className="border-t border-neutral-800"><td className="py-2">Fund Name</td><td className="py-2">Display name for your strategy</td><td className="py-2">Momentum Alpha Fund</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2">Scheme Name</td><td className="py-2">Strategy classification or category</td><td className="py-2">Long Only Equity</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2">Iteration Name</td><td className="py-2">Label for this version of the strategy — useful when running multiple variants of the same idea</td><td className="py-2">v1, Tight Constraints, High Beta</td></tr>
            </tbody>
          </table>
        </div>

        <h3 className="font-medium text-white mb-2">Configuration Bar</h3>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Below the identity fields, a configuration bar lets you set the top-level strategy parameters:
        </p>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 mb-4">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-neutral-500"><th className="pb-2">Control</th><th className="pb-2">Description</th><th className="pb-2">Options / Example</th></tr></thead>
            <tbody className="text-neutral-300">
              <tr className="border-t border-neutral-800">
                <td className="py-2">Universe</td>
                <td className="py-2">The pool of stocks the optimizer can allocate to</td>
                <td className="py-2">NIFTY, SENSEX, BSE 500, NIFTY 500, NIFTY 100, NIFTY 200, NIFTY MIDCAP 150, NIFTY SMALLCAP 250, NIFTY LARGEMIDCAP 250, NIFTY MICROCAP 250, NIFTY NEXT 50, FNO, Custom Screener</td>
              </tr>
              <tr className="border-t border-neutral-800">
                <td className="py-2">Benchmark</td>
                <td className="py-2">Index used for excess-return and tracking-error calculations</td>
                <td className="py-2">Nifty, BSE 500, Nifty 100, Nifty 500, Nifty Next 50, and more</td>
              </tr>
              <tr className="border-t border-neutral-800">
                <td className="py-2">Date</td>
                <td className="py-2">Reference date (used for data anchoring in some analyses)</td>
                <td className="py-2">Any valid trading date</td>
              </tr>
              <tr className="border-t border-neutral-800">
                <td className="py-2">Include Futures</td>
                <td className="py-2">Checkbox — when enabled, FNO (futures &amp; options) eligible stocks are included in the universe</td>
                <td className="py-2">Enabled / Disabled</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Constraints */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Constraints</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Click <strong className="text-white">Add</strong> in the Constraints card to add one or more constraints.
          The optimizer enforces all active constraints at every rebalance date. You can upload/download constraint sets as files
          or delete individual constraints.
        </p>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 mb-4">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-neutral-500"><th className="pb-2">Constraint</th><th className="pb-2">Parameters</th><th className="pb-2">What It Controls</th></tr></thead>
            <tbody className="text-neutral-300">
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Maximum Capital</td>
                <td className="py-2 font-mono text-xs">max_capital</td>
                <td className="py-2">Upper bound on total capital deployed (e.g. 1.0 = fully invested)</td>
              </tr>
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Maximum Number of Positions</td>
                <td className="py-2 font-mono text-xs">max_positions</td>
                <td className="py-2">Hard cap on how many stocks the optimizer can hold</td>
              </tr>
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Position Size Bound</td>
                <td className="py-2 font-mono text-xs">min_weight, max_weight</td>
                <td className="py-2">Min and max weight per stock (e.g. 0.01–0.10 for 1%–10%)</td>
              </tr>
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Minimum Position Size Constraint</td>
                <td className="py-2 font-mono text-xs">min_position_size</td>
                <td className="py-2">Ensures each held position is at least this large — avoids tiny, unactionable allocations</td>
              </tr>
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Portfolio Risk Budget Constraint</td>
                <td className="py-2 font-mono text-xs">risk_budget</td>
                <td className="py-2">Caps total portfolio variance/risk at a target level</td>
              </tr>
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Beta Exposure Constraint</td>
                <td className="py-2 font-mono text-xs">min_beta, max_beta</td>
                <td className="py-2">Keeps portfolio beta within a band (e.g. 0.8–1.2 for near market-neutral)</td>
              </tr>
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Factor Exposure Constraint</td>
                <td className="py-2 font-mono text-xs">factor_name, lower_bound, upper_bound</td>
                <td className="py-2">Constrains the portfolio&apos;s exposure to a specific factor (e.g. MOMENTUM between 0.2 and 1.5)</td>
              </tr>
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Sub Portfolio Capital Constraint</td>
                <td className="py-2 font-mono text-xs">sub_capital</td>
                <td className="py-2">Limits capital allocated to a sub-group of stocks within the universe</td>
              </tr>
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Single Name Idiosyncratic Contribution</td>
                <td className="py-2 font-mono text-xs">max_contribution</td>
                <td className="py-2">Caps how much idiosyncratic (stock-specific) risk any single stock can contribute to the portfolio</td>
              </tr>
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Portfolio Turnover Constraint</td>
                <td className="py-2 font-mono text-xs">max_turnover</td>
                <td className="py-2">Limits how much of the portfolio can change at each rebalance (e.g. 0.3 = max 30% traded)</td>
              </tr>
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Category Selection Constraint</td>
                <td className="py-2 font-mono text-xs">category, min_count, max_count</td>
                <td className="py-2">Enforces min/max number of stocks from a specific category (e.g. at least 3, at most 8 from IT)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Objectives */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Objectives</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Click <strong className="text-white">Add</strong> in the Objectives card to define what the optimizer should aim for.
          Only one objective is used at a time (the first active one).
        </p>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 mb-4">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-neutral-500"><th className="pb-2">Objective</th><th className="pb-2">Parameters</th><th className="pb-2">What It Does</th></tr></thead>
            <tbody className="text-neutral-300">
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Risk Minimization Objective</td>
                <td className="py-2 font-mono text-xs">risk_type, weight</td>
                <td className="py-2">Finds the lowest-variance portfolio. Best for capital preservation</td>
              </tr>
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Return Maximization Objective</td>
                <td className="py-2 font-mono text-xs">weight</td>
                <td className="py-2">Maximizes expected return. Tends to concentrate — pair with position size constraints</td>
              </tr>
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Risk-Adjusted Return Objective</td>
                <td className="py-2 font-mono text-xs">weight</td>
                <td className="py-2">Maximizes Sharpe ratio — balances return and risk. Most practical general-purpose objective</td>
              </tr>
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Tracking Error Minimization</td>
                <td className="py-2 font-mono text-xs">benchmark, weight</td>
                <td className="py-2">Keeps the portfolio close to a benchmark. Good for enhanced index strategies</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Backtesting */}
      <section id="backtesting" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Configure &amp; Run Backtest</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Click <strong className="text-white">Configure Backtest</strong> to open the backtest configuration dialog.
        </p>

        <h3 className="font-medium text-white mb-2">Date Range</h3>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 mb-4">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-neutral-500"><th className="pb-2">Field</th><th className="pb-2">Description</th></tr></thead>
            <tbody className="text-neutral-300">
              <tr className="border-t border-neutral-800"><td className="py-2">Start Date</td><td className="py-2">First date of the simulation. Choose a date with at least 6–12 months of data before it for warm-up</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2">End Date</td><td className="py-2">Last date. Auto-filled with the latest available trading date</td></tr>
            </tbody>
          </table>
        </div>

        <h3 className="font-medium text-white mb-2">Rebalance Schedule</h3>
        <p className="text-neutral-400 mb-3 leading-relaxed">Two modes:</p>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 mb-4">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-neutral-500"><th className="pb-2">Mode</th><th className="pb-2">How</th><th className="pb-2">Options</th></tr></thead>
            <tbody className="text-neutral-300">
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Regular Interval</td>
                <td className="py-2">Optimizer re-runs at a fixed cadence</td>
                <td className="py-2">Weekly, Monthly, Quarterly</td>
              </tr>
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Specified Dates</td>
                <td className="py-2">Optimizer re-runs only on the exact dates you provide</td>
                <td className="py-2">Comma-separated dates in YYYY-MM-DD format (e.g. 2025-07-01, 2025-08-01)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="font-medium text-white mb-2">Weight Method</h3>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 mb-4">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-neutral-500"><th className="pb-2">Method</th><th className="pb-2">Description</th></tr></thead>
            <tbody className="text-neutral-300">
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Equal Weight</td>
                <td className="py-2">Each stock in the portfolio receives the same weight. Simple and transparent</td>
              </tr>
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Momentum</td>
                <td className="py-2">Weights are proportional to each stock&apos;s recent momentum score — higher momentum gets a larger allocation</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="font-medium text-white mb-2">Stop Loss</h3>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          An expandable section with two independent stop loss types. Both are optional and can be configured independently.
        </p>
        <div className="space-y-4 mb-4">
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <h4 className="text-sm font-medium text-white mb-2">Total Stop Loss</h4>
            <p className="text-xs text-neutral-500 mb-3">Triggers on the total portfolio return (including factor exposure).</p>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-neutral-500"><th className="pb-1">Field</th><th className="pb-1">Description</th><th className="pb-1">Example</th></tr></thead>
              <tbody className="text-neutral-300">
                <tr className="border-t border-neutral-800"><td className="py-1.5">Stop Loss (%)</td><td className="py-1.5">Maximum allowed loss before the stop fires</td><td className="py-1.5 font-mono text-xs">10</td></tr>
                <tr className="border-t border-neutral-800"><td className="py-1.5">% of Portfolio</td><td className="py-1.5">The portion of the portfolio this stop applies to (100 = entire portfolio)</td><td className="py-1.5 font-mono text-xs">100</td></tr>
                <tr className="border-t border-neutral-800"><td className="py-1.5">Days to Exclude</td><td className="py-1.5">Number of trading days the position is held out after the stop fires before being eligible to re-enter</td><td className="py-1.5 font-mono text-xs">5</td></tr>
              </tbody>
            </table>
          </div>

          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <h4 className="text-sm font-medium text-white mb-2">Residual Stop Loss</h4>
            <p className="text-xs text-neutral-500 mb-3">Triggers on the residual (idiosyncratic, stock-specific) return — the portion not explained by factor moves.</p>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-neutral-500"><th className="pb-1">Field</th><th className="pb-1">Description</th><th className="pb-1">Example</th></tr></thead>
              <tbody className="text-neutral-300">
                <tr className="border-t border-neutral-800"><td className="py-1.5">Stop Loss (%)</td><td className="py-1.5">Maximum allowed residual loss before the stop fires</td><td className="py-1.5 font-mono text-xs">8</td></tr>
                <tr className="border-t border-neutral-800"><td className="py-1.5">% of Portfolio</td><td className="py-1.5">Fraction of portfolio this stop covers</td><td className="py-1.5 font-mono text-xs">100</td></tr>
                <tr className="border-t border-neutral-800"><td className="py-1.5">Days to Exclude</td><td className="py-1.5">Cooldown period in trading days after the stop fires</td><td className="py-1.5 font-mono text-xs">5</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-6">
          <p className="text-sm text-blue-400">
            <strong>Total vs Residual:</strong> Total stop loss fires on the stock&apos;s full price drop (including market and factor moves). Residual stop loss fires only on company-specific bad news, ignoring broad market selloffs — useful for avoiding false exits during market corrections.
          </p>
        </div>

        <h3 className="font-medium text-white mb-2">Burn-in and Chunking</h3>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          An expandable section that controls how the backtest periods are structured and how the model warms up.
        </p>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 mb-4">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-neutral-500"><th className="pb-2">Field</th><th className="pb-2">Description</th><th className="pb-2">Default</th></tr></thead>
            <tbody className="text-neutral-300">
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Max Chunks</td>
                <td className="py-2">Splits the backtest into this many out-of-sample evaluation windows. Each chunk trains on prior data and tests on the next period — similar to walk-forward testing</td>
                <td className="py-2 font-mono text-xs">5</td>
              </tr>
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Min Rebalance / Chunk</td>
                <td className="py-2">Minimum number of rebalances each chunk must contain. Prevents chunks from being too short to be statistically meaningful</td>
                <td className="py-2 font-mono text-xs">5</td>
              </tr>
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Burn-in Rebalances</td>
                <td className="py-2">Number of initial rebalances discarded from performance reporting. Allows the model to settle before measurement begins — avoids distorting results with the cold-start period</td>
                <td className="py-2 font-mono text-xs">2</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="font-medium text-white mb-2">Running the Backtest</h3>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Click <strong className="text-white">Run Full Backtest</strong>. The system:
        </p>
        <ol className="list-decimal list-inside text-sm text-neutral-400 space-y-1.5 mb-4">
          <li>Saves your strategy, constraints, and objectives to the database</li>
          <li>At the start date, runs the optimizer to compute initial weights</li>
          <li>Simulates the portfolio daily using real historical prices</li>
          <li>At each rebalance date, re-runs the optimizer with updated data</li>
          <li>Applies transaction costs and stop loss rules</li>
          <li>Returns an equity curve, rebalance history, and summary metrics</li>
        </ol>

        <h3 className="font-medium text-white mb-2">Backtest Results</h3>
        <p className="text-neutral-400 mb-3">After completion you see:</p>
        <ul className="list-disc list-inside text-sm text-neutral-400 space-y-1 mb-4">
          <li><strong className="text-white">Total Return %</strong>, <strong className="text-white">CAGR</strong>, <strong className="text-white">Sharpe</strong>, <strong className="text-white">Max Drawdown</strong>, <strong className="text-white">Total Trades</strong>, <strong className="text-white">Final Value</strong></li>
          <li><strong className="text-white">Equity curve chart</strong> — portfolio value over time</li>
          <li><strong className="text-white">Rebalance history table</strong> — date, portfolio value, positions, turnover, trades at each rebalance</li>
          <li><strong className="text-white">Latest portfolio weights</strong> — current optimal allocations sorted by weight</li>
        </ul>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
          <p className="text-sm text-amber-400">
            <strong>Backtest Credits:</strong> Running a backtest costs credits (shown in the bottom bar as X / Y). Each account has a credit quota. Credits reset periodically.
          </p>
        </div>
      </section>

      {/* 1-Day Results */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Compute 1-Day Results</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          The <strong className="text-white">Compute 1-Day Results</strong> button runs the optimizer once on today&apos;s data — no backtest,
          no simulation. This is useful for quickly seeing the current optimal portfolio without spending backtest credits.
        </p>
        <p className="text-neutral-400 leading-relaxed">Output:</p>
        <ul className="list-disc list-inside text-sm text-neutral-400 space-y-1">
          <li><strong className="text-white">Expected Return %</strong>, <strong className="text-white">Expected Risk %</strong>, <strong className="text-white">Sharpe</strong>, <strong className="text-white">Positions</strong></li>
          <li><strong className="text-white">Optimal Portfolio Weights</strong> — full weight table sorted by allocation</li>
        </ul>
      </section>

      {/* Additional Analytics */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Additional Analytics</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Click <strong className="text-white">Additional Analytics</strong> to attach factor signals to the backtest for enriched analysis.
          Two categories are available:
        </p>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 mb-4">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-neutral-500"><th className="pb-2">Category</th><th className="pb-2">Description</th><th className="pb-2">Examples</th></tr></thead>
            <tbody className="text-neutral-300">
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">User Created Factors</td>
                <td className="py-2">Factors you have built or uploaded in the Alpha Machine</td>
                <td className="py-2 text-neutral-500">Momentum Score, Value Composite, Quality Rank, Growth Score</td>
              </tr>
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Screener Factors</td>
                <td className="py-2">Standard fundamental and technical screener metrics</td>
                <td className="py-2 text-neutral-500">P/E Ratio, P/B Ratio, ROE, ROCE, EPS Growth, Beta, RSI, Operating Margin</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-neutral-500 text-sm">
          Selected factors appear as badges below the constraints/objectives section and are included in the analytics output.
          Use the search box to find specific factors. Selected factors are shown with remove badges.
        </p>
      </section>

      {/* Promote & Demote */}
      <section id="promote" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Promote &amp; Demote</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Once you are satisfied with a strategy&apos;s backtest results, you can <strong className="text-white">promote it to production</strong>.
        </p>
        <ul className="list-disc list-inside text-sm text-neutral-400 space-y-1 mb-4">
          <li>Click <strong className="text-white">Promote</strong> on a backtested strategy &mdash; it moves to the Production tab</li>
          <li>Production strategies can generate live rebalance trade lists</li>
          <li>Click <strong className="text-white">Demote</strong> to move it back to the Backtested tab</li>
        </ul>
      </section>

      {/* Live Rebalance */}
      <section id="rebalance" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Live Rebalance</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          For production strategies, click <strong className="text-white">Rebalance</strong> to generate an actionable trade list
          using current market prices and the optimizer&apos;s latest target weights.
        </p>

        <h3 className="font-medium text-white mb-2">Trade Actions</h3>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 mb-4">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-neutral-500"><th className="pb-2">Action</th><th className="pb-2">Color</th><th className="pb-2">Meaning</th></tr></thead>
            <tbody className="text-neutral-300">
              <tr className="border-t border-neutral-800"><td className="py-2 font-medium">NEW BUY</td><td className="py-2 text-emerald-400">Green</td><td className="py-2">Buy a stock not currently held</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2 font-medium">INCREASE</td><td className="py-2 text-emerald-400">Green</td><td className="py-2">Buy more of an existing holding</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2 font-medium">REDUCE</td><td className="py-2 text-amber-400">Amber</td><td className="py-2">Sell some shares of an existing holding</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2 font-medium">EXIT</td><td className="py-2 text-red-400">Red</td><td className="py-2">Sell all shares (completely exit position)</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2 font-medium">HOLD</td><td className="py-2 text-neutral-400">Gray</td><td className="py-2">No change needed</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-neutral-500 text-sm">
          The trade list shows Symbol, Action, Current %, Target %, Delta %, Qty, Value, and Price for each position.
          Download as CSV for manual execution through your broker.
        </p>
      </section>
    </div>
  );
}
