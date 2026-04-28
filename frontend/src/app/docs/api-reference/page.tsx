export default function ApiReferenceDocsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">API Reference</h1>
      <p className="text-neutral-400 mb-4">
        Complete REST API documentation for the Galedge backend. All endpoints return JSON.
      </p>
      <p className="text-neutral-500 text-sm mb-10">
        Base URL: <code className="text-emerald-400 text-xs">/api</code> (relative to the application domain).
        Authenticated endpoints require a <code className="text-emerald-400 text-xs">Bearer</code> token in the
        <code className="text-emerald-400 text-xs"> Authorization</code> header.
      </p>

      {/* Auth */}
      <section id="auth" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Authentication</h2>
        <div className="space-y-4">
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-mono bg-emerald-500/20 text-emerald-400 rounded">POST</span>
              <code className="text-sm text-white">/api/auth/register</code>
            </div>
            <p className="text-sm text-neutral-400 mb-2">Create a new user account.</p>
            <p className="text-xs text-neutral-500">Body: <code>{`{ "email", "password", "full_name", "organization" }`}</code></p>
            <p className="text-xs text-neutral-500">Returns: <code>{`{ "access_token", "token_type": "bearer" }`}</code></p>
          </div>

          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-mono bg-emerald-500/20 text-emerald-400 rounded">POST</span>
              <code className="text-sm text-white">/api/auth/login</code>
            </div>
            <p className="text-sm text-neutral-400 mb-2">Authenticate and receive a JWT token.</p>
            <p className="text-xs text-neutral-500">Body: <code>{`{ "email", "password" }`}</code></p>
            <p className="text-xs text-neutral-500">Returns: <code>{`{ "access_token", "token_type": "bearer", "user": {...} }`}</code></p>
          </div>
        </div>
      </section>

      {/* Market Data */}
      <section id="market-data" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Market Data</h2>
        <div className="space-y-4">
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-mono bg-blue-500/20 text-blue-400 rounded">GET</span>
              <code className="text-sm text-white">/api/quote/{`{symbol}`}</code>
            </div>
            <p className="text-sm text-neutral-400 mb-2">Get real-time quote for a single stock.</p>
            <p className="text-xs text-neutral-500">Returns: price, change, change%, volume, market cap, name, exchange</p>
          </div>

          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-mono bg-blue-500/20 text-blue-400 rounded">GET</span>
              <code className="text-sm text-white">/api/quotes?symbols=AAPL,MSFT,GOOGL</code>
            </div>
            <p className="text-sm text-neutral-400 mb-2">Get quotes for multiple stocks at once.</p>
            <p className="text-xs text-neutral-500">Query: <code>symbols</code> — comma-separated list</p>
          </div>

          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-mono bg-blue-500/20 text-blue-400 rounded">GET</span>
              <code className="text-sm text-white">/api/history/{`{symbol}`}</code>
            </div>
            <p className="text-sm text-neutral-400 mb-2">Get historical OHLCV price data.</p>
            <p className="text-xs text-neutral-500">Query params: <code>interval</code> (1d, 1wk, 1mo), <code>period</code> (1mo, 3mo, 6mo, 1y, 2y, 5y)</p>
          </div>

          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-mono bg-blue-500/20 text-blue-400 rounded">GET</span>
              <code className="text-sm text-white">/api/technicals/{`{symbol}`}</code>
            </div>
            <p className="text-sm text-neutral-400 mb-2">Get technical indicators (RSI, MACD, Bollinger Bands, SMAs, EMAs).</p>
          </div>

          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-mono bg-blue-500/20 text-blue-400 rounded">GET</span>
              <code className="text-sm text-white">/api/fundamentals/{`{symbol}`}?sheet=info</code>
            </div>
            <p className="text-sm text-neutral-400 mb-2">Get fundamental data (income statement, balance sheet, cash flow).</p>
            <p className="text-xs text-neutral-500">Query: <code>sheet</code> — info, income_stmt, balance_sheet, cashflow</p>
          </div>

          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-mono bg-blue-500/20 text-blue-400 rounded">GET</span>
              <code className="text-sm text-white">/api/options/{`{symbol}`}?kind=calls</code>
            </div>
            <p className="text-sm text-neutral-400 mb-2">Get options chain data.</p>
            <p className="text-xs text-neutral-500">Query: <code>kind</code> (calls, puts), <code>expiry</code> (YYYY-MM-DD)</p>
          </div>

          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-mono bg-blue-500/20 text-blue-400 rounded">GET</span>
              <code className="text-sm text-white">/api/intel/{`{symbol}`}?kind=all</code>
            </div>
            <p className="text-sm text-neutral-400 mb-2">Get intelligence data (analyst recommendations, insider trades, institutional holders, news).</p>
            <p className="text-xs text-neutral-500">Query: <code>kind</code> — all, recommendations, insider, institutional, mutual_fund, news</p>
          </div>

          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-mono bg-blue-500/20 text-blue-400 rounded">GET</span>
              <code className="text-sm text-white">/api/search?q={`{query}`}</code>
            </div>
            <p className="text-sm text-neutral-400 mb-2">Search for stocks by name or symbol.</p>
          </div>
        </div>
      </section>

      {/* Analytics */}
      <section id="analytics" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Analytics</h2>
        <p className="text-neutral-500 text-sm mb-4">All analytics endpoints require authentication.</p>
        <div className="space-y-4">
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-mono bg-blue-500/20 text-blue-400 rounded">GET</span>
              <code className="text-sm text-white">/api/analytics/performance/{`{portfolio_id}`}</code>
            </div>
            <p className="text-sm text-neutral-400 mb-2">Get performance metrics: total return, CAGR, Sharpe, max drawdown, equity curve.</p>
          </div>

          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-mono bg-blue-500/20 text-blue-400 rounded">GET</span>
              <code className="text-sm text-white">/api/analytics/return-decomposition/{`{portfolio_id}`}</code>
            </div>
            <p className="text-sm text-neutral-400 mb-2">Get factor vs idiosyncratic return decomposition.</p>
          </div>

          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-mono bg-blue-500/20 text-blue-400 rounded">GET</span>
              <code className="text-sm text-white">/api/analytics/holdings/{`{portfolio_id}`}</code>
            </div>
            <p className="text-sm text-neutral-400 mb-2">Get holdings with weights, sectors, and factor exposures.</p>
          </div>
        </div>
      </section>

      {/* Strategies */}
      <section id="strategies" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Strategies</h2>
        <p className="text-neutral-500 text-sm mb-4">All strategy endpoints require authentication.</p>
        <div className="space-y-4">
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-mono bg-blue-500/20 text-blue-400 rounded">GET</span>
              <code className="text-sm text-white">/api/strategies/</code>
            </div>
            <p className="text-sm text-neutral-400 mb-2">List all user strategies (draft and production).</p>
          </div>

          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-mono bg-emerald-500/20 text-emerald-400 rounded">POST</span>
              <code className="text-sm text-white">/api/strategies/</code>
            </div>
            <p className="text-sm text-neutral-400 mb-2">Create a new strategy with fund name, scheme, universe, constraints, and backtest config.</p>
          </div>

          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-mono bg-emerald-500/20 text-emerald-400 rounded">POST</span>
              <code className="text-sm text-white">/api/strategies/{`{id}`}/promote</code>
            </div>
            <p className="text-sm text-neutral-400 mb-2">Promote a backtested strategy to production status.</p>
          </div>

          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-mono bg-emerald-500/20 text-emerald-400 rounded">POST</span>
              <code className="text-sm text-white">/api/strategies/{`{id}`}/demote</code>
            </div>
            <p className="text-sm text-neutral-400 mb-2">Demote a production strategy back to draft.</p>
          </div>

          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-mono bg-emerald-500/20 text-emerald-400 rounded">POST</span>
              <code className="text-sm text-white">/api/strategies/{`{id}`}/rebalance</code>
            </div>
            <p className="text-sm text-neutral-400 mb-2">Generate a live rebalance trade list with BUY/SELL/HOLD actions, quantities, and prices.</p>
          </div>
        </div>
      </section>

      {/* Optimization */}
      <section id="optimization" className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Optimization</h2>
        <div className="space-y-4">
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-mono bg-emerald-500/20 text-emerald-400 rounded">POST</span>
              <code className="text-sm text-white">/api/optimize/smart</code>
            </div>
            <p className="text-sm text-neutral-400 mb-2">
              Run the portfolio optimizer. Auto-computes returns and covariance from historical prices.
            </p>
            <p className="text-xs text-neutral-500">Body: <code>{`{ "universe", "objective", "constraints": [...] }`}</code></p>
            <p className="text-xs text-neutral-500">Returns: expected return, risk, Sharpe, weight allocations</p>
          </div>

          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-mono bg-emerald-500/20 text-emerald-400 rounded">POST</span>
              <code className="text-sm text-white">/api/optimize/efficient-frontier</code>
            </div>
            <p className="text-sm text-neutral-400 mb-2">Generate the efficient frontier — set of optimal portfolios at different risk levels.</p>
          </div>
        </div>
      </section>

      {/* Tools */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Tools</h2>
        <div className="space-y-4">
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-mono bg-blue-500/20 text-blue-400 rounded">GET</span>
              <code className="text-sm text-white">/api/screener</code>
            </div>
            <p className="text-sm text-neutral-400 mb-2">Screen stocks by fundamental criteria.</p>
            <p className="text-xs text-neutral-500">Query: <code>sector</code>, <code>pe_max</code>, <code>div_yield_min</code>, <code>sort_by</code></p>
          </div>

          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-mono bg-blue-500/20 text-blue-400 rounded">GET</span>
              <code className="text-sm text-white">/api/heatmap?market=us</code>
            </div>
            <p className="text-sm text-neutral-400 mb-2">Get market heatmap data (treemap layout).</p>
            <p className="text-xs text-neutral-500">Query: <code>market</code> — us or india</p>
          </div>

          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-mono bg-blue-500/20 text-blue-400 rounded">GET</span>
              <code className="text-sm text-white">/api/compare?symbols=AAPL,MSFT&amp;period=6mo</code>
            </div>
            <p className="text-sm text-neutral-400 mb-2">Compare stock performance over time.</p>
          </div>

          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-mono bg-blue-500/20 text-blue-400 rounded">GET</span>
              <code className="text-sm text-white">/api/correlation?symbols=AAPL,MSFT&amp;period=1y</code>
            </div>
            <p className="text-sm text-neutral-400 mb-2">Get Pearson correlation matrix for selected stocks.</p>
          </div>

          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-mono bg-blue-500/20 text-blue-400 rounded">GET</span>
              <code className="text-sm text-white">/api/predict/{`{symbol}`}</code>
            </div>
            <p className="text-sm text-neutral-400 mb-2">Get ML prediction with signals, recommendation, and risk metrics.</p>
            <p className="text-xs text-neutral-500">Query: <code>portfolio_value</code>, <code>risk_tolerance</code> (low, medium, high)</p>
          </div>
        </div>
      </section>

      {/* Data */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-3">Data &amp; Risk Model</h2>
        <p className="text-neutral-500 text-sm mb-4">Data management and risk model endpoints. Require authentication.</p>
        <div className="space-y-4">
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-mono bg-emerald-500/20 text-emerald-400 rounded">POST</span>
              <code className="text-sm text-white">/api/data/ingest/prices?market=india&amp;period=2y</code>
            </div>
            <p className="text-sm text-neutral-400 mb-2">Ingest historical price data for a market.</p>
          </div>

          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-mono bg-emerald-500/20 text-emerald-400 rounded">POST</span>
              <code className="text-sm text-white">/api/data/risk-model/build?model_name=INEC1</code>
            </div>
            <p className="text-sm text-neutral-400 mb-2">Build the factor risk model using cross-sectional regression.</p>
          </div>

          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-mono bg-blue-500/20 text-blue-400 rounded">GET</span>
              <code className="text-sm text-white">/api/data/risk-model/factors?model_name=INEC1</code>
            </div>
            <p className="text-sm text-neutral-400 mb-2">Get factor summary (CAGR, Sharpe, drawdown for each factor).</p>
          </div>

          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-mono bg-blue-500/20 text-blue-400 rounded">GET</span>
              <code className="text-sm text-white">/api/data/risk-model/correlation?model_name=INEC1</code>
            </div>
            <p className="text-sm text-neutral-400 mb-2">Get factor correlation matrix.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
