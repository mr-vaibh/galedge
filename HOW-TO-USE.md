# How to Use Galedge Alpha — Complete Testing Guide

Every field, every dropdown value, every button — nothing left out.

---

## Prerequisites

### Start Backend
```bash
cd /Users/vaibhav.shukla/Developer/galedge
source .venv/bin/activate
cd backend
uvicorn app.main:app --port 8001 --reload
```
Wait 30 seconds for auto-seeding (100 stocks, 1 year prices, factor model).

### Start Frontend
```bash
cd /Users/vaibhav.shukla/Developer/galedge/frontend
npm run dev
```
Open http://localhost:3000

---

## Step 1: Register (`/register`)

| Field | Value to Enter |
|-------|---------------|
| Full Name | `Vaibhav Shukla` |
| Email | `vaibhav@galedge.com` |
| Password | `Test@12345` |
| Organization | `Galedge Capital` |
| → Click | **Create Account** |

You're redirected to home. Sidebar shows your email at bottom.

---

## Step 2: Login (`/login`) (if logged out)

| Field | Value |
|-------|-------|
| Email | `vaibhav@galedge.com` |
| Password | `Test@12345` |
| → Click | **Sign In** |

---

## Step 3: Risk Model — Factor Summary (`/risk-model/factor-summary`)

**What this page does:** Shows how different market factors (momentum, value, size, etc.) have performed historically.

| Element | Action/Value |
|---------|-------------|
| Universe dropdown | Select `INEC1` (Indian Equity Model — already has data) |
| | Select `INEC2` → auto-builds the model (wait ~5 sec) |
| Factor Performance Table | Read-only — shows MARKET, BETA, SIZE, LTMOM, EARNYILD, VALUE, GROWTH, DIVYILD, PROFIT, FINLVG, LIQUIDITY |
| | Columns: CAGR (%), Cumulative Return (%), Sharpe, Daily Return (%), Max Drawdown (%), Start/End Date |
| Factor Correlation | Read-only heatmap — green=positive correlation, red=negative |
| Factor Returns Chart | Line chart of cumulative factor returns over time |
| Factor Correlation Time Series | Select Factor 1 dropdown: pick any factor (e.g., `BETA`) |
| | Select Factor 2 dropdown: pick another (e.g., `SIZE`) |
| | Chart shows rolling correlation between them |
| Download Raw Data button | Click → downloads factor_summary_INEC1.csv |

---

## Step 4: Risk Model — Stock Summary (`/risk-model/stock-summary`)

**What this page does:** Shows each stock's exposure to risk factors. Tells you WHY a stock moves the way it does.

| Element | Action/Value |
|---------|-------------|
| Universe dropdown | Select `INEC1` |
| Selected Stocks | Pre-loaded: Reliance, HDFC Bank, TCS, Infosys, SBI |
| Search input | Type `MARUTI` → click "MARUTI.NS" in dropdown → added to list |
| | Type `BAJFINANCE` → click result → added |
| | Click × on any badge to remove a stock |
| Stock Factor Exposures table | Shows each stock's z-score on each factor |
| | Positive green = above average, Negative red = below average |
| | Example: RELIANCE SIZE=2.67 means it's much larger than average |
| Return Decomposition table | Shows factor contribution to returns for each stock |
| Return Decomposition chart | Line chart showing factor attribution over time |
| Download Raw Data | Click → downloads stock exposures CSV |

**Note:** Only Indian (.NS) stocks have factor exposure data. US stocks show 0.00.

---

## Step 5: Build a Stock Screen (`/alpha-machine/build-screen`)

**What this page does:** Filters stocks by financial metrics. Like SQL WHERE clause for stocks.

| Field | Value to Enter |
|-------|---------------|
| **Name*** | `Value Quality Screen` |
| **Description*** | `High ROE, low PE, low debt companies` |
| **Parent Universe** dropdown | `Risk Model Estimation...` (options: Risk Model Estimation, NIFTY 500) |
| **Sector** dropdown | `All Sectors` (options: All Sectors, Technology, Financial Services, Healthcare) |
| **Industry** dropdown | `All Industries` |
| **Portfolio Weight** dropdown | `Market Cap Weight` (options: Market Cap Weight, Equal Weight) |
| **Date** | `2026-04-24` (default) |
| **Screener Query** textarea | `MarketCap > 500 AND PE < 25 AND ROE > 10` |
| **Score Equation** textarea | (leave empty for basic screen) |
| **Score Variable** | (leave empty) |
| **Metrics Library** panel | Tab: Library — shows all 33+ metrics |
| | Tab: Metric — shows metric descriptions |
| | Tab: Operator — shows operators |
| | Search: type `ROE` → click it → appends to query |
| → Click | **Verify Query** → shows "✓ Query syntax is valid" |
| → Click | **Compute & Save** → runs query, shows results table, saves screen |

**Results table columns:** #, Symbol, Name, Sector, Market Cap, P/E, ROE, Div Yield, Weight

**Example queries to try:**

| Query | What it finds |
|-------|--------------|
| `MarketCap > 500 AND PE < 25 AND ROE > 10` | Large, cheap, profitable |
| `DividendYield > 2` | High dividend payers |
| `PE < 15 AND DebtToEquity < 1` | Cheap, low-debt |
| `Beta > 1.5` | High volatility stocks |
| `ROE > 20 AND ProfitMargin > 0.15` | High quality |
| `MarketCap > 1000` | Large caps only |
| `Sector == "Technology"` | Tech sector only |

After Compute & Save → auto-navigates to `/alpha-machine` → your screen appears in the list.

---

## Step 6: Alpha Machine Home (`/alpha-machine`)

| Tab | What it shows |
|-----|--------------|
| **Screener/Factors** | Your saved screens. Click ✏️ to edit, 🗑️ to delete |
| **Alpha Model** | Your alpha models + platform models |
| → Click | **+ New Screen** → goes to build screen page |
| → Click | **+ New Model** → goes to build model page |
| **Refresh** button | Re-fetches data from API |

---

## Step 7: Build Alpha Model (`/alpha-machine/build-model`)

**What this page does:** Combines factors into a composite stock ranking.

| Field | Value |
|-------|-------|
| → Click | **Build Alpha Model** button to open dialog |
| **Name** | `Momentum Value Mix` |
| **Input Factors** — click to add: | `LTMOM` (momentum), `VALUE` (value), `PROFIT` (profitability) |
| **Control Factors** — click to add: | `MARKET` (neutralize market effect), `SIZE` (neutralize size) |
| **Return Type** dropdown | `Total` (options: Total, Excess) |
| **Regression Weight** dropdown | `Sort Market Cap` (options: Sort Market Cap, Equal) |
| **Universe** dropdown | `Risk Model Estimation Universe` (options: Risk Model Estimation Universe, NIFTY 500) |
| **Half Life (days)** | `90` |
| **Estimation Frequency** dropdown | `Quarterly` (options: Monthly, Quarterly) |
| **Min Observations** | `20` |
| → Click | **Compute** → creates model, shows success message, redirects |

---

## Step 8: Upload Alpha Factors (`/alpha-machine/upload-factors`)

| Element | Action |
|---------|--------|
| → Click | **Upload Alpha** button |
| **Alpha Name** | `Custom Momentum` |
| **Description** | `12-month price momentum signal` |
| **Upload CSV/ZIP** | Click to select file OR drag-and-drop |
| → Click | **Download Template** to get sample CSV format |

**CSV format:**
```csv
Date,ExchangeSymbol,Alpha
20250204,HDFCBANK,0.318
20250204,RELIANCE,0.137
20250204,TCS,0.03
20250204,INFY,0.211
20250204,POONAWALLA,0.187
```

| → Click | **Save Alpha** → uploads and saves |
| **Refresh** | Re-fetches list |
| Delete (🗑️) | Removes an alpha |

---

## Step 9: Upload Portfolio (`/portfolio-construction/upload`)

**What this page does:** Upload your actual stock holdings to analyze.

| Field | Value |
|-------|-------|
| **Fund** | `My Growth Fund` |
| **Scheme** | `Equity Scheme A` |
| **Benchmark** dropdown | `NIFTY 500` |
| | Options: NIFTY 50, NIFTY 500, NIFTY 100, NIFTY 200, SENSEX, BSE 500, NIFTY MIDCAP 150, NIFTY SMALLCAP 250 |
| **Date** | `2026-04-24` |
| **Upload CSV** | Click Browse Files or drag-and-drop |
| → Click | **Download Template — CSV** to get sample file |
| → Click | **Proceed** → creates portfolio + uploads holdings → redirects to Select |

**Portfolio CSV file to create (save as `my_portfolio.csv`):**
```csv
ExchangeSymbol,SEMV
HDFCBANK,5.00
RELIANCE,4.50
TCS,3.20
INFY,2.80
ICICIBANK,2.50
SBIN,2.00
LT,1.80
BHARTIARTL,1.50
ITC,1.20
MARUTI,1.00
```

**SEMV = Stock Equivalent Market Value in Crores** (how much money in each stock)

---

## Step 10: Select Portfolio & View Analytics (`/portfolio-construction/select`)

| Element | Action |
|---------|--------|
| **Your Portfolios** table | Shows portfolios you created |
| **View Analytics** button | Click on any portfolio row → sets this as active portfolio → navigates to analytics |
| **Delete** (🗑️) | Removes portfolio |
| **Upload Portfolio** button | Goes to upload page |
| **Refresh** button | Re-fetches list |

---

## Step 11: Performance Summary (`/analytics/overview/performance`)

**What this page does:** Shows REAL return, risk, and value metrics for your selected portfolio.

| Element | What it shows |
|---------|--------------|
| **Header** | "Portfolio: My Growth Fund" (or "Showing demo data" if none selected) |
| **Tab navigation** | Performance Summary \| Peer Comparison \| Holdings Summary \| Period Analysis |
| **P&L Summary** | Total Return (%), CAGR (%), Sharpe Ratio, # Positions |
| **Risk Summary** | Max Drawdown (%), Avg Turnover (%), Tx Cost Drag (%), Total Trades |
| **Portfolio Summary** | Initial Capital (₹ Cr), Final Value (₹ Cr), Rebalances, Fund Name |
| **Portfolio Value chart** | Line chart of portfolio value over time (₹ Lakhs) |
| **Drawdown chart** | Red line showing peak-to-trough declines |
| **Value Trend chart** | Portfolio value in ₹ Crores |
| **Refresh** button | Re-fetches data |
| **CardControls** (⬇️) | Downloads chart/table data as CSV |

---

## Step 12: Holdings Summary (`/analytics/overview/holdings`)

| Element | What it shows/does |
|---------|-------------------|
| **Holdings table** | Each stock: symbol, weight, sector, market cap, factor exposures |
| **Checkboxes** | Select/deselect holdings |
| **Update Graph** button | Re-renders chart with only selected holdings |
| **Factor Summary table** | Portfolio-level factor exposures |
| **Holdings (%) chart** | Weight of each holding over time |
| **Factor Exposure chart** | Factor exposure over time |

---

## Step 13: Build Strategy & Backtest (`/strategy-builder/build`)

| Field | Value |
|-------|-------|
| **Fund Name** | `Nifty Momentum` |
| **Scheme Name** | `Monthly Rebalance` |
| **Iteration Name** | `v1` |
| **Universe** dropdown | `NIFTY 500` |
| | Full options: NIFTY, SENSEX, BSE 500, NIFTY 500, NIFTY 100, NIFTY 200, NIFTY MIDCAP 150, NIFTY SMALLCAP 250, NIFTY LARGEMIDCAP 250, NIFTY MICROCAP 250, NIFTY NEXT 50, FNO |
| **Benchmark** dropdown | `Nifty 500` |
| | Full options: BSE 500, Current Portfolio, Nifty, Nifty 100, NIFTY 200, Nifty 500, Nifty 50 Value 20, Nifty Auto, Nifty IT, Nifty Large and Mid Cap 250, Nifty Microcap 250, Nifty Midcap 150, Nifty Midcap Select, Nifty Next 50 |
| **Date** | `2026-04-24` |
| **Include futures** checkbox | Unchecked |

### Add Constraints:
Click **+ Add** → select from dialog → enter values in the inline fields

| Constraint | Values to Enter |
|-----------|----------------|
| Position Size Bound | min_weight: `0.01`, max_weight: `0.05` |
| Maximum Number of Positions | max_positions: `30` |
| Beta Exposure Constraint | min_beta: `0.8`, max_beta: `1.2` |
| Portfolio Turnover Constraint | max_turnover: `0.3` |
| Factor Exposure Constraint | factor_name: `LTMOM`, lower_bound: `-0.5`, upper_bound: `0.5` |

### Add Objectives:
Click **+ Add** → select from dialog → enter values

| Objective | Values |
|----------|--------|
| Risk Minimization Objective | risk_type: `total`, weight: `1.0` |

### Additional Analytics:
Click **Additional Analytics** button → check factors:
- User factors: ✅ Momentum Score, ✅ Value Composite, ✅ Quality Rank
- Screener factors: ✅ P/E Ratio, ✅ ROE, ✅ Beta
- Click **Done** → selected factors appear as badges below the button bar

### Configure Backtest:
Click **Configure Backtest** button:

| Field | Value |
|-------|-------|
| **Start Date** | `2025-06-01` |
| **End Date** | `2026-04-24` |
| Tab: **Regular Interval** | Selected |
| **Rebalance Frequency** dropdown | `Monthly` (options: Weekly, Monthly, Quarterly) |
| **Weight Method** dropdown | `equal` (options: equal, momentum) |

#### Stop Loss (expand):
| Field | Value |
|-------|-------|
| Total Stop Loss (%) | `10` |
| Portfolio % to trigger | `50` |
| Days to exclude | `5` |
| Residual Stop Loss (%) | `5` |

#### Burn-in and Chunking (expand):
| Field | Value |
|-------|-------|
| Max chunks | `5` |
| Min rebalance per chunk | `5` |
| Burn-in rebalances | `2` |

| → Click | **Run Full Backtest** → runs on NIFTY 50, shows equity curve + metrics |

### Results:
| Metric | What it shows |
|--------|--------------|
| Total Return | e.g., +4.41% |
| CAGR | Annualized return |
| Sharpe | Return per unit risk |
| Max DD | Worst decline |
| Trades | Number of buy/sell trades |
| Final Value | e.g., ₹1.04 Cr |
| Equity curve chart | Portfolio value over time |

Click **Compute 1-Day Results** for a quick single-day check.

---

## Step 14: Portfolio Optimizer (`/optimizer`)

| Field | Value |
|-------|-------|
| **Stock Universe** | Pre-loaded: RELIANCE.NS, TCS.NS, HDFCBANK.NS, INFY.NS, ICICIBANK.NS, HINDUNILVR.NS, BHARTIARTL.NS, ITC.NS |
| | Add more: type `MARUTI` → click result |
| | Remove: click × on any badge |
| **Objective** | Click `Minimize Risk` (green highlight) |
| | Options: Minimize Risk, Maximize Return, Maximize Sharpe, Min Tracking Error |

### Constraints:
Click **+ Add Constraint** → select type → enter values

| Constraint | Values |
|-----------|--------|
| Position Size Bound | min_weight: `0.02`, max_weight: `0.25` |
| Max Positions | max_positions: `8` |

| → Click | **Run Optimization** |

### Results:
| Element | What it shows |
|---------|--------------|
| Status badge | OPTIMAL (green) or INFEASIBLE (red) |
| Expected Return | e.g., 10.49% |
| Expected Risk | e.g., 11.89% |
| Sharpe Ratio | e.g., 0.462 |
| Positions | Number of stocks with weight > 0 |
| Weights table | Each stock with allocation % and visual bar |
| Weight Distribution chart | Bar chart of allocations |
| Efficient Frontier chart | Risk-return tradeoff curve (20 points) |
| **Export CSV** button | Downloads weights as CSV |

---

## Step 15: AI Prediction (`/predict`)

| Field | Value |
|-------|-------|
| **Symbol** | Type `RELIANCE` → select `RELIANCE.NS` from dropdown |
| **Portfolio Value** (₹) | `1000000` (₹10 Lakhs) |
| **Risk Tolerance** dropdown | `medium` (options: low, medium, high) |
| → Click | **Analyze** |

### Results:
| Section | What it shows |
|---------|--------------|
| **Composite Score** | 0-100 gauge (60+ = bullish, <40 = bearish) |
| **Action badge** | BUY (green) / SELL (red) / HOLD (yellow) |
| **Recommendation** | Entry price, Stop loss, Position size, Hold duration |
| **Targets** | Target 1 price + probability, Target 2 price + probability |
| **Signal Gauges** | Technical (RSI, MACD), Momentum, Fundamental (P/E), Sentiment |
| **Expected Returns** | 5-day, 10-day, 20-day return probabilities with progress bars |
| **Risk Metrics** | VaR 95%, Max Drawdown, Volatility, Beta |
| **Monte Carlo** | 10,000 simulations: expected return, prob of loss, worst/best case |
| **CVaR** | Average loss in worst 5% scenarios |
| **Stress Test** | 2008 Crisis, COVID crash, Rate hike, Flash crash impacts |
| **Drawdown Analysis** | Max drawdown %, duration, recovery time |
| **Feature Importance** | Top 10 factors driving the prediction |
| **Backtest** | Win rate, Sharpe, total trades, recent trade history |

---

## Step 16: Other Tools

### Stock Screener (`/screener`)
| Field | Value |
|-------|-------|
| Sector | `Technology` (options: All, Technology, Healthcare, Financial Services, Consumer Cyclical, Communication Services, Industrials, Consumer Defensive, Energy, Utilities, Real Estate, Basic Materials) |
| Max P/E | `30` |
| Min Div Yield | `0.02` |
| Sort By | `marketCap` (options: marketCap, trailingPE, dividendYield, changePercent) |
| → Click | **Apply** |
| → Click | **Export CSV** to download results |

### Stock Comparison (`/compare`)
| Field | Value |
|-------|-------|
| Symbols | `AAPL`, `MSFT` (add more: `GOOGL`, `AMZN`) — max 5 |
| Period | Click `6M` (options: 1M, 3M, 6M, 1Y, 5Y) |
| → See | Normalized chart + fundamentals comparison table |
| → Click | **Export CSV** |

### Correlation Matrix (`/correlation`)
| Field | Value |
|-------|-------|
| Symbols | `AAPL`, `MSFT`, `GOOGL`, `AMZN` — max 10 |
| Period | Click `1Y` (options: 3M, 6M, 1Y, 2Y) |
| → See | Color-coded matrix: green=correlated, red=inverse |
| → Click | **Export CSV** |

### Market Heatmap (`/heatmap`)
| Field | Value |
|-------|-------|
| Market toggle | `US` or `India` |
| → See | Treemap: size=market cap, color=daily change |
| → Click | Any stock tile → goes to stock detail page |
| Hover | Shows stock name, change%, market cap |

### Portfolio Tracker (`/portfolio`)
| Field | Value |
|-------|-------|
| Symbol | Type `RELIANCE` → select `RELIANCE.NS` |
| Shares | `100` |
| Buy Price (₹) | `1300` |
| Buy Date | `2026-01-15` |
| → Click | **Add** |
| → See | Live P&L with current price from API |
| → Click | **Export CSV** |
| Delete (🗑️) | Removes a holding |

### Settings (`/settings`)
| Field | Value |
|-------|-------|
| Currency dropdown | `₹ INR — Indian Rupee` (options: $ USD, ₹ INR) |
| → See | Live exchange rate, auto-converts all prices |

---

## Key Terms

| Term | Meaning |
|------|---------|
| CAGR | Compound Annual Growth Rate — your annualized return |
| Sharpe | Return per unit risk. >1 good, >2 excellent, <0 losing money |
| Max Drawdown | Worst peak-to-trough decline. -20% = lost 20% from highest point |
| Alpha | Return above benchmark. +5% alpha = beat market by 5% |
| Beta | Market sensitivity. 1.0 = moves with market, 1.5 = 50% more volatile |
| Factor | A measurable stock characteristic (momentum, value, size, quality) |
| SEMV | Stock Equivalent Market Value — money invested per stock (in ₹ Crores) |
| Backtest | Testing a strategy on historical data |
| Rebalance | Adjusting portfolio back to target weights |
| Stop Loss | Auto-sell if losses exceed threshold |
| VaR | Value at Risk — max expected loss at 95% confidence |
| CVaR | Average loss in worst 5% of scenarios |
| P/E | Price-to-Earnings. Lower = cheaper stock |
| ROE | Return on Equity. Higher = more profitable |
| RSI | 0-100 indicator. <30 = oversold (buy signal), >70 = overbought (sell signal) |
| MACD | Trend indicator. Crossovers signal buy/sell |
| Brinson | Attribution method: allocation vs selection effects |
