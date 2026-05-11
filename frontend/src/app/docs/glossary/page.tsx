import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Glossary | Galedge Docs",
  description: "Financial and quantitative investing glossary — definitions for CAGR, Sharpe ratio, drawdown, alpha, beta, factor exposure, attribution, and more.",
  keywords: ["CAGR", "Sharpe ratio", "drawdown", "alpha", "beta", "factor exposure", "glossary", "financial terms"],
  openGraph: {
    title: "Glossary | Galedge Docs",
    description: "Financial and quantitative investing glossary — definitions for CAGR, Sharpe ratio, drawdown, alpha, beta, factor exposure, attribution, and more.",
  },
};

const TERMS = [
  { term: "Alpha", definition: "Return in excess of what the risk model (factor exposures) would predict. True stock-picking skill, not explained by systematic factors. Positive alpha = outperformance; negative = underperformance." },
  { term: "Annualized Return", definition: "Return expressed as a yearly rate, regardless of the actual holding period. Converts returns over different periods to a common annual basis for comparison." },
  { term: "Attribution", definition: "The process of explaining a portfolio's return by decomposing it into sources — which factors, sectors, or stocks contributed to performance. See Brinson Attribution and Return Decomposition." },
  { term: "Backtest", definition: "A simulation of a strategy using historical data. Backtesting shows how a strategy would have performed in the past, helping validate logic before deploying real capital." },
  { term: "Benchmark", definition: "A reference index used to measure portfolio performance against. Common benchmarks include NIFTY 50 (India) and S&P 500 (US). 'Beating the benchmark' means outperforming it." },
  { term: "Beta", definition: "A stock's sensitivity to overall market movements. Beta = 1.0 means the stock moves with the market. Beta = 1.5 means 50% more volatile than the market. Beta = 0.7 means 30% less volatile." },
  { term: "Brinson Attribution", definition: "A framework that decomposes excess return (vs benchmark) into Allocation Effect (sector bets), Selection Effect (stock picking within sectors), and Interaction Effect." },
  { term: "CAGR", definition: "Compound Annual Growth Rate — the smoothed annualized return that accounts for compounding. If a portfolio grows from ₹100 to ₹161 over 5 years, the CAGR is 10% per year." },
  { term: "Covariance Matrix", definition: "A matrix showing how stocks' returns move together (co-vary). Essential for portfolio optimization — high covariance between stocks means they offer less diversification benefit." },
  { term: "CVXPY", definition: "An open-source Python library for convex optimization problems. Galedge uses CVXPY to solve portfolio optimization with objectives (min risk, max Sharpe) and constraints (position limits, beta bounds)." },
  { term: "Drawdown", definition: "The decline from a portfolio's peak value to its lowest point before recovering. A 20% drawdown means the portfolio fell 20% from its high. Max Drawdown is the worst such decline." },
  { term: "Efficient Frontier", definition: "The set of portfolios that offer the highest expected return for each level of risk. Portfolios on the frontier are 'efficient' — you can't get more return without taking more risk." },
  { term: "Factor", definition: "A systematic driver of stock returns. Examples: market beta, size, momentum, value. Factor models explain portfolio returns using these common factors rather than analyzing each stock individually." },
  { term: "Factor Exposure", definition: "How much a stock or portfolio 'tilts' toward a particular factor. Expressed as a standardized score (z-score). A MOMENTUM exposure of +1.5 means the stock has strong recent price momentum." },
  { term: "Factor Return", definition: "The historical return earned by a factor portfolio. If MOMENTUM returned 3% last month, stocks with high momentum exposure benefited from this tailwind." },
  { term: "Idiosyncratic Return", definition: "The portion of a stock's return not explained by factor exposures. Also called 'stock-specific return.' Positive idiosyncratic return means the stock beat what the factor model predicted." },
  { term: "Long Only", definition: "A portfolio that only buys stocks (goes 'long'), never shorts them. All weights are positive and sum to 100%. Galedge currently supports long-only portfolios." },
  { term: "Market Cap", definition: "Market capitalization — the total market value of a company's outstanding shares. Market Cap = Current Stock Price × Total Shares Outstanding. Used to classify company size (large, mid, small cap)." },
  { term: "Max Drawdown", definition: "The maximum observed loss from a peak to a trough of a portfolio before a new peak is attained. Measures the worst-case scenario for an investor who bought at the worst time." },
  { term: "NIFTY 50", definition: "India's benchmark stock market index, comprising the top 50 companies listed on the National Stock Exchange (NSE). Represents approximately 65% of the float-adjusted market capitalization of the NSE." },
  { term: "NSE", definition: "National Stock Exchange of India — the country's largest stock exchange. Indian stocks on NSE use the .NS suffix in Yahoo Finance format (e.g., RELIANCE.NS)." },
  { term: "Objective Function", definition: "In portfolio optimization, what the optimizer tries to maximize or minimize. Common objectives: minimize variance, maximize Sharpe ratio, maximize return, or minimize tracking error." },
  { term: "P/E Ratio", definition: "Price-to-Earnings Ratio — a valuation metric showing how much investors pay per unit of earnings. P/E = Stock Price / Earnings Per Share. Lower P/E may indicate undervaluation; higher may indicate growth expectations." },
  { term: "Portfolio Weight", definition: "The fraction of total portfolio value invested in each stock. Weights must sum to 100%. A weight of 5% means 5% of your money is in that stock." },
  { term: "Rebalancing", definition: "Periodically adjusting portfolio weights back to target allocations. In strategy backtesting, rebalancing triggers the optimizer to re-run and update weights. Transaction costs are incurred on each rebalance." },
  { term: "Return Decomposition", definition: "Breaking a portfolio's total return into Factor Return (systematic, driven by factor exposures) and Idiosyncratic Return (stock-specific). Helps identify the source of performance." },
  { term: "Sharpe Ratio", definition: "A risk-adjusted performance measure. Sharpe = (Portfolio Return - Risk-Free Rate) / Portfolio Volatility. Higher Sharpe means better return per unit of risk. A Sharpe above 1.0 is generally considered good." },
  { term: "Style Factor", definition: "A factor capturing a company characteristic that explains stock returns. Galedge's style factors include SIZE, MOMENTUM, VALUE, VOLATILITY, QUALITY, GROWTH, LEVERAGE, LIQUIDITY, DIVIDEND_YIELD, EARNINGS_YIELD." },
  { term: "Tracking Error", definition: "The standard deviation of the difference between portfolio returns and benchmark returns. Low tracking error means the portfolio closely follows the benchmark; high means it deviates significantly." },
  { term: "Transaction Costs", definition: "Costs incurred when buying or selling stocks — commissions, bid-ask spread, market impact. In backtesting, transaction costs are subtracted from returns at each rebalance. Typically modeled as basis points (bps)." },
  { term: "Treemap", definition: "A visualization where nested rectangles represent hierarchical data. In Galedge's Market Heatmap, rectangle size represents market cap and color represents daily price change." },
  { term: "Turnover", definition: "The fraction of portfolio value traded at each rebalance. High turnover = more trading = higher transaction costs. A turnover constraint limits how much the optimizer can change the portfolio." },
  { term: "Universe", definition: "The set of stocks the optimizer can choose from. Examples: NIFTY 50 (50 stocks), NIFTY 100 (100 stocks), custom (user-defined list). A larger universe offers more diversification but is harder to manage." },
  { term: "VaR (Value at Risk)", definition: "The maximum expected loss over a given time period at a given confidence level. VaR(95%, 1-day) = ₹50,000 means there is a 5% chance of losing more than ₹50,000 in a single day." },
  { term: "Volatility", definition: "Statistical measure of return dispersion — how much returns fluctuate around their average. Usually expressed as annualized standard deviation. Higher volatility = more uncertainty = more risk." },
  { term: "Yahoo Finance", definition: "The market data source used by Galedge for stock prices, fundamentals, options data, and news. Use Yahoo Finance ticker format: RELIANCE.NS for NSE, RELIANCE.BO for BSE, AAPL for US stocks." },
  { term: "Z-Score", definition: "A standardized score measuring how many standard deviations a value is from the mean. Used for factor exposures: z-score of +2.0 means the stock has an exposure two standard deviations above the average." },
];

export default function GlossaryPage() {
  const grouped = TERMS.reduce<Record<string, typeof TERMS>>((acc, term) => {
    const letter = term.term[0].toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(term);
    return acc;
  }, {});

  const letters = Object.keys(grouped).sort();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Glossary</h1>
      <p className="text-neutral-400 mb-8">
        Definitions for financial terms, metrics, and platform-specific concepts used throughout Galedge.
      </p>

      {/* Alphabet index */}
      <div className="flex flex-wrap gap-1.5 mb-10">
        {letters.map((l) => (
          <a
            key={l}
            href={`#letter-${l}`}
            className="w-8 h-8 flex items-center justify-center text-xs font-mono font-medium rounded bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600 transition-colors"
          >
            {l}
          </a>
        ))}
      </div>

      {/* Terms by letter */}
      <div className="space-y-10">
        {letters.map((letter) => (
          <section key={letter} id={`letter-${letter}`}>
            <h2 className="text-lg font-bold text-emerald-400 mb-4 pb-2 border-b border-neutral-800">
              {letter}
            </h2>
            <div className="space-y-4">
              {grouped[letter].map((item) => (
                <div key={item.term}>
                  <dt className="font-medium text-white">{item.term}</dt>
                  <dd className="text-sm text-neutral-400 mt-1 leading-relaxed">{item.definition}</dd>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
