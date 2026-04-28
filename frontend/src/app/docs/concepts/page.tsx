export default function ConceptsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Concepts</h1>
      <p className="text-neutral-400 mb-10">Core financial concepts and terminology used throughout the platform.</p>

      {/* Stocks & Indices */}
      <section id="stocks-indices" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Stocks &amp; Indices</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          A <strong className="text-white">stock</strong> (or share) represents partial ownership in a company.
          When you buy a stock, you own a fraction of that company and are entitled to a share of its profits (dividends)
          and asset value.
        </p>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          A <strong className="text-white">stock index</strong> is a collection of stocks that measures the performance
          of a market or sector. Common indices include:
        </p>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 mb-3">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-neutral-500"><th className="pb-2">Index</th><th className="pb-2">Market</th><th className="pb-2">Description</th></tr></thead>
            <tbody className="text-neutral-300">
              <tr className="border-t border-neutral-800"><td className="py-2">NIFTY 50</td><td className="py-2">India (NSE)</td><td className="py-2">Top 50 Indian companies by market cap</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2">NIFTY 100</td><td className="py-2">India (NSE)</td><td className="py-2">Top 100 Indian companies</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2">NIFTY 500</td><td className="py-2">India (NSE)</td><td className="py-2">Broad Indian market coverage</td></tr>
              <tr className="border-t border-neutral-800"><td className="py-2">S&amp;P 500</td><td className="py-2">US</td><td className="py-2">Top 500 US companies</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-neutral-400 leading-relaxed">
          <strong className="text-white">Market capitalization</strong> (market cap) is the total value of a company&apos;s
          outstanding shares: <code className="text-emerald-400 text-xs">Price x Shares Outstanding</code>. It determines
          a stock&apos;s weight in most indices and is a key measure of company size.
        </p>
      </section>

      {/* Key Metrics */}
      <section id="key-metrics" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Key Metrics</h2>
        <p className="text-neutral-400 mb-4 leading-relaxed">
          These metrics appear throughout the platform. Understanding them helps you interpret analytics correctly.
        </p>

        <div className="space-y-4">
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <h3 className="font-medium text-white mb-1">P/E Ratio (Price-to-Earnings)</h3>
            <p className="text-sm text-neutral-400">
              How much investors pay per rupee/dollar of earnings. A P/E of 20 means investors pay 20x annual earnings.
              <strong className="text-neutral-300"> Lower P/E</strong> may indicate undervaluation;
              <strong className="text-neutral-300"> higher P/E</strong> may indicate growth expectations.
            </p>
            <p className="text-xs text-neutral-500 mt-1">Formula: Stock Price / Earnings Per Share</p>
          </div>

          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <h3 className="font-medium text-white mb-1">Beta</h3>
            <p className="text-sm text-neutral-400">
              Measures a stock&apos;s sensitivity to market movements. A beta of 1.0 means the stock moves with the market.
              Beta &gt; 1.0 means more volatile; beta &lt; 1.0 means less volatile.
            </p>
            <p className="text-xs text-neutral-500 mt-1">Example: Beta = 1.3 means the stock moves 30% more than the market on average</p>
          </div>

          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <h3 className="font-medium text-white mb-1">Sharpe Ratio</h3>
            <p className="text-sm text-neutral-400">
              Risk-adjusted return. Measures how much excess return you receive per unit of risk (volatility).
              <strong className="text-neutral-300"> Higher is better.</strong> A Sharpe above 1.0 is generally considered good; above 2.0 is excellent.
            </p>
            <p className="text-xs text-neutral-500 mt-1">Formula: (Portfolio Return - Risk-Free Rate) / Portfolio Volatility</p>
          </div>

          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <h3 className="font-medium text-white mb-1">CAGR (Compound Annual Growth Rate)</h3>
            <p className="text-sm text-neutral-400">
              The annualized rate of return, smoothed over the entire period. Tells you the consistent yearly growth rate
              that would have produced the same total return.
            </p>
            <p className="text-xs text-neutral-500 mt-1">Formula: (Ending Value / Starting Value)^(1/Years) - 1</p>
          </div>

          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <h3 className="font-medium text-white mb-1">Maximum Drawdown</h3>
            <p className="text-sm text-neutral-400">
              The largest peak-to-trough decline in portfolio value. Measures the worst-case loss you would have experienced
              if you invested at the peak and sold at the trough.
            </p>
            <p className="text-xs text-neutral-500 mt-1">Example: Max Drawdown of -15% means the portfolio dropped 15% from its highest point</p>
          </div>

          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <h3 className="font-medium text-white mb-1">Volatility</h3>
            <p className="text-sm text-neutral-400">
              Standard deviation of returns, usually annualized. Measures how much a portfolio&apos;s returns fluctuate.
              <strong className="text-neutral-300"> Lower volatility</strong> means more stable returns.
            </p>
            <p className="text-xs text-neutral-500 mt-1">Annualized by multiplying daily volatility by sqrt(252 trading days)</p>
          </div>

          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <h3 className="font-medium text-white mb-1">Dividend Yield</h3>
            <p className="text-sm text-neutral-400">
              Annual dividends paid as a percentage of the stock price. A 3% yield means you receive 3% of your investment
              as dividends each year.
            </p>
            <p className="text-xs text-neutral-500 mt-1">Formula: Annual Dividends Per Share / Stock Price</p>
          </div>
        </div>
      </section>

      {/* Factor Models */}
      <section id="factor-models" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Factor Models</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          A <strong className="text-white">factor model</strong> explains stock returns using common drivers called &quot;factors.&quot;
          Instead of analyzing each stock individually, factor models identify systematic patterns that affect groups of stocks.
        </p>
        <p className="text-neutral-400 mb-4 leading-relaxed">
          Galedge uses a <strong className="text-white">21-factor risk model</strong> with three types of factors:
        </p>

        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 mb-4">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-neutral-500"><th className="pb-2">Type</th><th className="pb-2">Count</th><th className="pb-2">Examples</th><th className="pb-2">What It Captures</th></tr></thead>
            <tbody className="text-neutral-300">
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Market</td><td className="py-2">1</td>
                <td className="py-2">BETA</td><td className="py-2">Overall market direction</td>
              </tr>
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Style</td><td className="py-2">10</td>
                <td className="py-2">SIZE, MOMENTUM, VALUE, VOLATILITY, QUALITY, GROWTH, LEVERAGE, LIQUIDITY, DIVIDEND_YIELD, EARNINGS_YIELD</td>
                <td className="py-2">Company characteristics</td>
              </tr>
              <tr className="border-t border-neutral-800">
                <td className="py-2 font-medium">Industry</td><td className="py-2">10</td>
                <td className="py-2">TECHNOLOGY, FINANCIALS, HEALTHCARE, ENERGY, CONSUMER, INDUSTRIALS, etc.</td>
                <td className="py-2">Sector membership</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-neutral-400 mb-3 leading-relaxed">
          <strong className="text-white">Factor exposure</strong> measures how much a stock tilts toward a particular factor.
          A stock with high MOMENTUM exposure has had strong recent returns. A stock with high VALUE exposure trades at a
          low price relative to its fundamentals.
        </p>
        <p className="text-neutral-400 leading-relaxed">
          <strong className="text-white">Factor return</strong> is the return earned by that factor over a given period.
          If the MOMENTUM factor returned 2% this month, stocks with high momentum exposure benefited from this tailwind.
        </p>
      </section>

      {/* Attribution */}
      <section id="attribution" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Attribution</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          <strong className="text-white">Performance attribution</strong> answers the question: &quot;Why did my portfolio
          return X%?&quot; It decomposes returns into their sources.
        </p>

        <h3 className="font-medium text-white mt-4 mb-2">Return Decomposition</h3>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Splits portfolio return into two components:
        </p>
        <ul className="list-disc list-inside text-sm text-neutral-400 space-y-1 mb-4">
          <li><strong className="text-white">Factor Return</strong> &mdash; return explained by factor exposures (systematic risk)</li>
          <li><strong className="text-white">Idiosyncratic Return</strong> &mdash; stock-specific return not explained by factors (alpha or noise)</li>
        </ul>

        <h3 className="font-medium text-white mt-4 mb-2">Brinson Attribution</h3>
        <p className="text-neutral-400 leading-relaxed">
          Decomposes excess return (vs benchmark) into:
        </p>
        <ul className="list-disc list-inside text-sm text-neutral-400 space-y-1">
          <li><strong className="text-white">Allocation Effect</strong> &mdash; did you pick the right sectors to overweight/underweight?</li>
          <li><strong className="text-white">Selection Effect</strong> &mdash; within each sector, did you pick the right stocks?</li>
          <li><strong className="text-white">Interaction Effect</strong> &mdash; the combined impact of allocation and selection</li>
        </ul>
      </section>

      {/* Optimization */}
      <section id="optimization" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Portfolio Optimization</h2>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          <strong className="text-white">Portfolio optimization</strong> finds the best set of weights (how much to invest in each stock)
          given an objective (maximize return, minimize risk) and constraints (position limits, sector limits, beta bounds).
        </p>
        <p className="text-neutral-400 mb-3 leading-relaxed">
          Galedge uses <strong className="text-white">CVXPY</strong>, a convex optimization library, to solve these problems.
          The optimizer takes historical return data, computes a covariance matrix (how stocks move together), and finds weights
          that satisfy your objective and constraints.
        </p>
        <p className="text-neutral-400 leading-relaxed">
          Key concepts:
        </p>
        <ul className="list-disc list-inside text-sm text-neutral-400 space-y-1">
          <li><strong className="text-white">Efficient Frontier</strong> &mdash; the set of portfolios that give the highest return for each risk level</li>
          <li><strong className="text-white">Tracking Error</strong> &mdash; deviation of portfolio returns from a benchmark; minimizing this keeps you close to the index</li>
          <li><strong className="text-white">Turnover</strong> &mdash; how much of the portfolio changes at each rebalance; higher turnover means higher transaction costs</li>
        </ul>
      </section>
    </div>
  );
}
