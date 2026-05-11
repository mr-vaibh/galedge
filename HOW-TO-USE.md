# How to Use Galedge Alpha — Complete Testing Guide

Every feature, every field, every workflow — nothing left out. Updated for the current build.

---

## Prerequisites

### Start Backend
```bash
cd /Users/vaibhav.shukla/Developer/galedge
source .venv/bin/activate
cd backend
uvicorn app.main:app --port 8001 --reload
```
Wait ~30 seconds for startup. Auto-seeds 100 stocks, 1 year of prices, and the INEC1 factor model.

### Start Frontend
```bash
cd /Users/vaibhav.shukla/Developer/galedge/frontend
npm run dev
```
Open http://localhost:3000

---

## Step 1: Register (`/register`)

| Field | Value |
|---|---|
| Full Name | `Vaibhav Shukla` |
| Email | `vaibhav@galedge.com` |
| Password | `Test@12345` |
| Organization | `Galedge Capital` |
| → Click | **Create Account** |

Redirected to home. Sidebar shows your email at the bottom.

---

## Step 2: Login (`/login`)

| Field | Value |
|---|---|
| Email | `vaibhav@galedge.com` |
| Password | `Test@12345` |
| → Click | **Sign In** |

---

## Step 3: Risk Model — Factor Summary (`/risk-model/factor-summary`)

| Element | What to do |
|---|---|
| Universe selector | Select `INEC1` |
| Factor Performance table | View CAGR, Sharpe, Max Drawdown per factor (MARKET, BETA, SIZE, LTMOM, VALUE…) |
| Factor Correlation heatmap | Hover to see correlation coefficients |
| Factor Returns chart | Click any factor name in legend to toggle |
| Download button | Downloads factor data as CSV |

**Expected**: 21 factors shown (1 Market + 10 Style + 10 Industry).

---

## Step 4: Risk Model — Stock Summary (`/risk-model/stock-summary`)

| Element | What to do |
|---|---|
| Universe selector | Select `INEC1` |
| Stock search | Type `RELIANCE` → select `RELIANCE.NS` |
| Add more stocks | Add `TCS.NS`, `HDFCBANK.NS` |
| Factor Exposures table | Shows z-scored exposure per factor (e.g. VALUE = 2.1 means cheap relative to peers) |
| Return Decomposition | See how much of the return came from Market / Style / Industry / Idiosyncratic |
| Download raw data | Downloads per-stock exposure CSV |

---

## Step 5: Upload Portfolio (`/portfolio-construction/upload`)

| Field | Value |
|---|---|
| Fund Name | `NSE Portfolio` |
| Scheme Name | `My Holdings` |
| Benchmark | `NIFTY 500` |
| Date | Today's date |
| CSV upload | Upload a file with columns: `ExchangeSymbol`, `SEMV` |
| → Click | **Download Template** first, fill it, re-upload |
| → Click | **Upload** |

**CSV format example:**
```
ExchangeSymbol,SEMV
RELIANCE.NS,500000
TCS.NS,300000
HDFCBANK.NS,200000
INFY.NS,150000
```

`SEMV` = Stock Estimated Market Value (₹ invested in each stock).

---

## Step 6: Select Portfolio & Load Analytics (`/portfolio-construction/select`)

| Element | What to do |
|---|---|
| Portfolios table | Find your uploaded portfolio |
| → Click | **View Analytics** |

Wait 10–30 seconds while analytics compute. The sidebar will now show your portfolio loaded — orange dot on portfolio name.

---

## Step 7: Analytics — Performance Summary (`/analytics/overview/performance`)

| Element | What to see |
|---|---|
| P&L Summary | Total Return, CAGR, Sharpe Ratio, Active Positions |
| Risk Summary | Max Drawdown, Portfolio Turnover, Transaction Cost, Total Trades |
| Portfolio Summary | Capital, Current Value, Total Rebalances, Fund Name |
| Equity Curve chart | Portfolio vs Benchmark over time |
| Drawdown chart | Shows peak-to-trough drawdowns |
| View Mode | Toggle Active / Benchmark / Excess |
| Benchmark selector | Change benchmark from NIFTY 500 to NIFTY 50 |

---

## Step 8: Analytics — Holdings & Factor Summary (`/analytics/overview/holdings`)

| Element | What to do |
|---|---|
| Holdings table | Shows each stock: Weight %, Raw Return, Return Contribution, Risk Contribution, Idio Return |
| Select / deselect | Click checkboxes to toggle holdings in chart |
| Factor Summary table | Shows portfolio-level factor exposures |
| Holdings Weight chart | Time series of top 5 holdings' weights |
| Factor Exposure chart | Time series of factor exposures |

**Note**: Portfolio has a single upload date, so weight lines are flat — this is correct.

---

## Step 9: Analytics — Returns & Risk (`/analytics/portfolio-analysis/returns-risk`)

| Tab | What to see |
|---|---|
| Returns | Factor return contributions, cumulative return decomposition |
| Risk | Rolling volatility, realized risk by factor type |
| Attribution | Brinson attribution — Allocation / Selection / Interaction by sector |
| Top Holdings | Weight chart for top contributors |

---

## Step 10: Analytics — Peer Comparison (`/analytics/overview/peer-comparison`)

| Element | What to do |
|---|---|
| Auto-selected portfolio | Your active portfolio appears as first chip |
| Add Portfolio button | Add other portfolios for comparison |
| Benchmark toggle | Toggle benchmark overlay on/off |
| Comparison table | Side-by-side: Return, CAGR, Sharpe, Volatility, Max DD, Holdings |
| Charts | Total Return, Sharpe Ratio, Volatility bar charts |
| Rankings table | Ranked by total return (only visible with 2+ portfolios) |

---

## Step 11: Analytics — Drawdown Analysis (`/analytics/portfolio-analysis/drawdown`)

| Element | What to see |
|---|---|
| Drawdown table | All drawdown periods: Start, Bottom, End, Loss % |
| D3 Treemap | Visual loss map — larger/darker cells = bigger drawdowns. First item auto-selected |
| Click a row/cell | Loads detail panel below |
| Drop Detractors | Bottom 5 holdings by return contribution during drawdown |
| Recovery Contributors | Top 5 holdings |
| Factor tab | Factor decomposition during the drawdown period |

---

## Step 12: Analytics — Event Sensitivity (`/analytics/portfolio-analysis/event-sensitivity`)

| Element | What to see |
|---|---|
| Event table | Historical market events (COVID crash, GST, elections…) + Portfolio return during each |
| D3 Treemap | Color-coded returns: green = positive, red = negative. Sized by magnitude |
| Click an event | Loads equity curve for that event window + factor contributors |

---

## Step 13: Build Stock Screen (`/alpha-machine/build-screen`)

| Field | Value |
|---|---|
| Screen Name | `Value Quality Screen` |
| Screener Query | `MarketCap > 500 AND PE < 15 AND ROCE > 22` |
| Score Equation | (optional) `PE * -1 + ROE` |
| Parent Universe | `NIFTY 500` |
| → Click | **Verify Query** first (validates syntax) |
| → Click | **Compute & Save** |

**Results table** shows matching stocks with: Symbol, Name, Sector, Market Cap, P/E, ROE, Div Yield, Weight.

**Download CSV**: button top-right of results.
**Send to Strategy Builder**: blue button — lands on SB with these stocks as universe.

---

## Step 14: Alpha Machine Home (`/alpha-machine`)

### Screener / Factors Tab

| Element | What to do |
|---|---|
| My Screens table | Lists saved screens with Edit (pencil), Duplicate (copy), Delete (bin) |
| Standard Alphas section | 8 pre-built locked screens. Click **Run** to open in Build Screen pre-filled. Click **Clone** to save as your own |

### Alpha Models Tab

| Element | What to do |
|---|---|
| My Alpha Models table | Lists models with status, factors, stocks, compute date |
| + New Model | Opens Build Model form |
| Compute button | Runs the factor scoring against the risk model |
| Results button | Opens results modal (appears after compute) |
| Edit (pencil) | Edit model name, factors, and settings |
| Clone (copy) | Duplicates the model as a new draft |
| Galedge Alphas section | 3 pre-built locked models. Click **Compute & View** to run. Click **Clone** to save as editable copy |

---

## Step 15: Build Alpha Model (`/alpha-machine/build-model`)

Click **Build Alpha Model** → dialog opens.

| Field | Value |
|---|---|
| Name | `Quality Compounder Alpha` |
| Input Factors | Click to add: `PROFIT`, `FINLVG`, `EARNYILD` |
| Control Factors | Click to add: `MARKET`, `SIZE` |
| Return Type | `Excess` |
| Regression Weight | `mcap` (Sort Market Cap) |
| Universe | `risk_model` |
| Half Life | `126` |
| Estimation Frequency | `Monthly` |
| Min Observations | `60` |
| → Click | **Compute** |

After computing, click **Results** on the model row to see:
- All stocks ranked by alpha z-score
- Factor return contributions  
- **IC Analysis tab**: per-factor IC mean, IC std, IR (Information Ratio), t-stat, % positive IC days, rolling IC chart

**Use Top 50 in Strategy Builder** button sends the top 50 alpha-scored stocks to the Strategy Builder.

---

## Step 16: Build Strategy & Backtest (`/strategy-builder/build`)

### Normal Mode

| Field | Value |
|---|---|
| Fund Name | `Alpha Momentum Fund` |
| Scheme Name | `Long Only Equity` |
| Iteration Name | `v1` |
| Universe | `NIFTY 100` or **Custom Screener…** |
| Benchmark | `NIFTY 50` |
| Include Futures | Toggle on/off |

### Quick Test Mode

Click **⚡ Quick Test** (top-right) to:
- Skip Fund/Scheme/Iteration fields
- Run a one-time backtest without saving a strategy
- Results still show in full — just not persisted to DB

### Custom Universe (from Screener or Alpha Model)

Click **Universe → Custom Screener…** → dialog opens with 4 tabs:
1. **Standard Alphas**: Pre-built screener queries (Quality Compounder, Deep Value, GARP…)
2. **My Screens**: Your saved screens — click **Run** to execute
3. **Alpha Models**: Your computed alpha models — click **Use Top 50** to use alpha scores as universe
4. **Quick Query**: Type any ad-hoc screener query

After "Use as Universe" → universe chip shows `Quality Compounder (14 stocks)`.

### Constraints

Click **Add** → select type:

| Type | Key Parameters |
|---|---|
| Position Size Bound | min_weight: `0.02`, max_weight: `0.10` |
| Maximum Number of Positions | max_positions: `20` |
| Beta Exposure Constraint | min_beta: `0.7`, max_beta: `1.2` |
| Portfolio Turnover Constraint | max_turnover: `0.30` |
| Maximum Capital | max_capital: `0.95` |

**Upload JSON**: Click ↑ to upload a constraints.json file.  
**Download JSON**: Click ↓ to export current constraints.  
**Guide**: Click **Constraints & Objectives Guide** to open full documentation.

### Objectives

Click **Add** → select:
- `Risk-Adjusted Return Objective` (Sharpe maximization) ← most common
- `Risk Minimization Objective`
- `Return Maximization Objective`
- `Tracking Error Minimization`

### Weight Method

In Configure Backtest → Weight Method:
- **Optimizer**: Uses objectives + constraints (default)
- **Equal Weight**: Equal allocation to all symbols
- **Momentum**: Weights by recent price momentum
- **Alpha Score Weighted**: Uses alpha z-scores via softmax (available when universe loaded from alpha model)

### Configure Backtest

Click **Configure Backtest**:

| Field | Value |
|---|---|
| Start Date | Auto-set to 1 year before latest trading date |
| End Date | Auto-set to latest available trading date |
| Rebalance Frequency | `Monthly` |
| Weight Method | `Optimizer` |
| Stop Loss | Optional: total portfolio stop loss % |

→ Click **Run Full Backtest**

### Results

- **Metrics**: Total Return, CAGR, Sharpe, Volatility, Max Drawdown, Alpha, Beta vs benchmark
- **Equity Curve**: Portfolio vs Benchmark
- **Rebalance table**: Each rebalance date with weights

---

## Step 17: Compute 1-Day Optimizer Output

On the Strategy Builder page, below Configure Backtest:

→ Click **Compute 1-Day Results**

Shows:
- Expected Return (annualised)
- Expected Risk (annualised volatility)
- Sharpe Ratio
- Number of Positions
- **Allocation table**: stock-by-stock weights + sector breakdown

---

## Step 18: Portfolio Optimizer (`/optimizer`)

Standalone optimizer — no strategy required.

| Field | Value |
|---|---|
| Universe | `NIFTY 50` or add custom stocks by symbol |
| Objective | `Maximize Sharpe` |
| Constraints | Add position bounds, beta limits |
| → Click | **Optimize** |

**Results**: Status (optimal/infeasible), Expected Return, Expected Risk, Sharpe, N Positions, Weights table, Efficient Frontier chart, Export CSV.

---

## Step 19: Go Live — Promote Strategy (`/strategy-builder`)

After a successful backtest:

| Element | What to do |
|---|---|
| Strategy table | Find your strategy, Status = `draft` |
| → Click | **Analytics** to review backtest results |
| → Click | **Promote to Live** (in Analytics or strategy row) |
| Status changes | `draft` → `live` |

---

## Step 20: Live Rebalance

With a live strategy:

| Element | What to do |
|---|---|
| → Click | **Rebalance** button on the strategy row |
| Trade list | Shows BUY / SELL / HOLD / INCREASE / REDUCE / EXIT for each stock |
| Quantities | Pre-calculated at current market prices |
| → Execute | Manually in your broker |
| → Click | **Demote to Draft** to pause the strategy |

---

## Step 21: Upload Alpha Factors (`/alpha-machine/upload-factors`)

| Field | Value |
|---|---|
| Alpha Name | `My Custom Factor` |
| Description | `Earnings surprise signal` |
| CSV Upload | Format: `Date, ExchangeSymbol, Alpha` |
| → Click | **Download Template** first |
| → Click | **Save Alpha** |

CSV format:
```
Date,ExchangeSymbol,Alpha
2024-01-01,RELIANCE.NS,0.82
2024-01-01,TCS.NS,0.61
2024-01-01,INFY.NS,0.45
```

---

## Step 22: Tools

### Stock Screener (`/screener`)

| Field | Value |
|---|---|
| Sector filter | `Technology` |
| Max P/E | `25` |
| Min Div Yield | `0.01` |
| Sort By | `P/E Ratio` |
| → Click | **Screen Stocks** |
| → Click | **Export CSV** |

### Market Heatmap (`/heatmap`)

- Toggle **India / US** markets
- Treemap: size = Market Cap, color = today's change %
- Hover any cell for stock details

### Compare Stocks (`/compare`)

- Add up to 5 stock symbols
- Select time period (1M, 3M, 6M, 1Y, 2Y)
- Normalized chart + fundamentals table
- Export CSV

### Correlation Matrix (`/correlation`)

- Add up to 10 symbols
- Select period
- Heatmap: green = positive correlation, red = negative

### AI Predict (`/predict`)

| Field | Value |
|---|---|
| Symbol | `RELIANCE.NS` |
| Portfolio Value | `1000000` |
| Risk Tolerance | `Moderate` |
| → Click | **Analyze** |

Shows: Composite Score (0–100), Action (BUY/SELL/HOLD), Expected Return range, Probability of Loss, Monte Carlo simulation, Factor signals breakdown.

---

## Step 23: Portfolio Tracker (`/portfolio`)

Manual holding tracker (uses local storage — not your uploaded portfolio).

| Field | Value |
|---|---|
| Symbol | `RELIANCE.NS` |
| Shares | `10` |
| Buy Price | `2400` |
| Buy Date | Today's date (pre-filled) |
| → Click | **Add** |

Shows live P&L, current price, return %.

---

## Step 24: Settings (`/settings`)

| Field | Value |
|---|---|
| Display Currency | `INR` or `USD` |
| Live exchange rate | Auto-fetched |

All monetary values across the platform convert based on this setting.

---

## Step 25: Documentation (`/docs`)

Full platform docs with:
- **Sidebar navigation** — 12 sections with sub-pages
- **⌘K Search** — Fuzzy search across all docs content. Press `Cmd+K` (Mac) or `Ctrl+K` (Windows) to open
- **SEO-optimised** pages with metadata for each section

---

## Key Terms Reference

| Term | Meaning |
|---|---|
| CAGR | Compound Annual Growth Rate — annualised return |
| Sharpe Ratio | Return / Volatility — higher is better (>1 is good, >2 is excellent) |
| Max Drawdown | Worst peak-to-trough loss — lower magnitude is better |
| Alpha | Return not explained by market beta |
| Beta | Portfolio's sensitivity to market moves (1.0 = moves with market) |
| Factor | A systematic driver of returns (VALUE, MOMENTUM, QUALITY…) |
| IC | Information Coefficient — correlation between alpha score and actual returns. |0.05| = good |
| IR | Information Ratio = IC mean / IC std × √252. > 0.5 = strong signal |
| SEMV | Stock Estimated Market Value — your ₹ invested in each holding |
| Brinson | Attribution framework splitting excess return into Allocation + Selection + Interaction |
| Rebalance | Adjusting portfolio weights back to target on a schedule |
| Stop Loss | Automatic trigger to exit a position if loss exceeds a threshold |
| Tracking Error | Std deviation of portfolio returns minus benchmark returns |
| VaR / CVaR | Value at Risk / Conditional VaR — tail loss measures |
| P/E | Price-to-Earnings — lower often means cheaper relative to earnings |
| ROE | Return on Equity — how efficiently a company uses shareholder capital |
| ROCE | Return on Capital Employed — broader efficiency measure including debt |
| Idiosyncratic | Stock-specific return not explained by any factor |
| Turnover | Fraction of portfolio traded at each rebalance |
