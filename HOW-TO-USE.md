# How to Use Galedge Alpha — Complete Step-by-Step Guide

## Quick Start

### 1. Start the Backend
```bash
cd /Users/vaibhav.shukla/Developer/galedge
source .venv/bin/activate
cd backend
uvicorn app.main:app --port 8001 --reload
```
The first time it starts, it auto-seeds data (100 Indian stocks, 1 year of prices, factor model). Wait ~30 seconds.

### 2. Start the Frontend
```bash
cd /Users/vaibhav.shukla/Developer/galedge/frontend
npm run dev
```
Open http://localhost:3000

---

## The Complete Workflow

### Step 1: Register / Login

1. Click **Login** in the sidebar (bottom)
2. Click **Register** link
3. Enter: email, password, name, organization
4. Click **Create Account**
5. You're logged in — sidebar shows your email

**Why:** Most features require authentication to save your work.

---

### Step 2: Explore the Risk Model

**What it is:** The risk model decomposes stock returns into factors — market movements, style effects (value, momentum, size), and industry effects. This tells you WHERE returns come from.

#### Factor Summary (`/risk-model/factor-summary`)
1. Select universe **INEC1** (the Indian equity factor model)
2. See the **Factor Performance Summary** table:
   - **MARKET** — the broad market return (should have highest CAGR)
   - **BETA** — stocks sensitive to market moves
   - **SIZE** — small vs large cap effect
   - **LTMOM** — momentum (stocks that went up keep going up)
   - **EARNYILD** — cheap stocks (high earnings yield)
   - CAGR = annualized return, Sharpe = return per unit risk, Max DD = worst peak-to-trough
3. **Factor Correlation** heatmap — shows which factors move together
   - Green = positive correlation, Red = negative
   - SIZE and BETA being negatively correlated means small stocks have different beta patterns
4. **Factor Returns Time Series** — cumulative return of each factor over time
5. Click **Download Raw Data** to export as CSV

#### Stock Summary (`/risk-model/stock-summary`)
1. See pre-loaded Indian stocks (Reliance, HDFC Bank, TCS, etc.)
2. **Search** to add more: type "SBIN" or "Infosys" → click result
3. **Stock Factor Exposures** table shows each stock's loading on each factor:
   - Positive = above average exposure
   - Negative = below average
   - Example: RELIANCE with SIZE=2.67 means it's a large cap (high size exposure)
4. **Return Decomposition** chart shows how much of each stock's return came from each factor

---

### Step 3: Build a Stock Screen

**What it is:** A screener filters stocks by financial metrics. Like saying "show me all stocks with P/E < 15 AND ROE > 15%".

#### Build Screen (`/alpha-machine/build-screen`)

1. Fill in:
   - **Name**: "Value Stocks" (required to save)
   - **Description**: "High quality undervalued companies"
   - **Parent Universe**: Risk Model Estimation (uses all ~100 stocks)
   - **Sector**: All (or pick "Technology", "Financial Services", etc.)
   - **Portfolio Weight**: Market Cap Weight or Equal Weight

2. Write a **Screener Query** in the text box:
   ```
   MarketCap > 500 AND PE < 25 AND ROE > 10
   ```
   This means: stocks with market cap > ₹500 Cr, P/E ratio under 25, and return on equity above 10%.

   **Available operators:** `AND`, `OR`, `>`, `<`, `>=`, `<=`, `==`, `!=`
   **Available metrics** (in the Library panel on the right): Beta, BookValue, CurrentRatio, DebtToEquity, DividendYield, EPS, MarketCap, PE, PB, ROE, ROA, Revenue, Volume, etc.

3. Click **Verify Query** — shows "Query syntax is valid" if correct
4. Click **Compute & Save**:
   - Runs the screen on real stocks via yfinance
   - Shows results table: Symbol, Name, Sector, Market Cap, P/E, ROE, Weight
   - Saves the screen to your account
   - Auto-navigates back to Alpha Machine home

**Example queries to try:**
- `MarketCap > 1000 AND DividendYield > 2` — Large dividend payers
- `PE < 15 AND DebtToEquity < 1` — Cheap, low-debt companies
- `Beta > 1.5` — High-volatility stocks
- `ROE > 20 AND ProfitMargin > 0.15` — Profitable quality companies

#### Alpha Machine Home (`/alpha-machine`)
- See your saved screens in **Screener/Factors** tab
- Click **Modify** (pencil) to edit a screen
- Click **Delete** (trash) to remove

---

### Step 4: Build an Alpha Model

**What it is:** An alpha model combines multiple factors (like momentum + value + quality) into a single stock ranking score. It answers: "which stocks should I buy?"

#### Build Alpha Model (`/alpha-machine/build-model`)

1. Click **Build Alpha Model** button
2. In the dialog:
   - **Name**: "Momentum Value Mix"
   - **Input Factors**: Click to add factors that you think predict returns
     - `LTMOM` (momentum — stocks going up tend to keep going up)
     - `VALUE` (value — cheap stocks tend to outperform)
     - `PROFIT` (quality — profitable companies are better)
   - **Control Factors** (optional): `SIZE`, `MARKET` — these neutralize size and market effects
   - **Return Type**: Total (total return) or Excess (return above benchmark)
   - **Regression Weight**: Sort Market Cap (larger stocks get more weight in regression)
   - **Universe**: Risk Model Estimation Universe
   - **Estimation Frequency**: Quarterly (re-estimate the model every quarter)
3. Click **Compute** — creates the alpha model in the database

---

### Step 5: Upload a Portfolio

**What it is:** A portfolio is a list of stocks with their weights (how much money in each). Upload yours to analyze it.

#### Upload Portfolio (`/portfolio-construction/upload`)

1. Fill in:
   - **Fund**: "My Portfolio" (your fund name)
   - **Scheme**: "Growth" (optional label)
   - **Benchmark**: NIFTY 500 (what to compare against)
   - **Date**: Today's date

2. Prepare a CSV file with this format:
   ```csv
   ExchangeSymbol,SEMV
   HDFCBANK,3.18
   RELIANCE,1.37
   TCS,0.3
   INFY,0.5
   ICICIBANK,0.8
   ```
   - **ExchangeSymbol** = stock ticker (NSE symbol without .NS)
   - **SEMV** = Stock Equivalent Market Value in crores (how much money in each stock)
   - Click **Download Template** to get a sample CSV

3. Drag or click **Browse Files** to upload the CSV
4. Click **Proceed** — creates portfolio + uploads holdings

#### Select Portfolio (`/portfolio-construction/select`)
- See your uploaded portfolios
- Click **View Analytics** → takes you to real analytics for THAT portfolio

---

### Step 6: View Analytics (Real Data!)

**What it is:** Performance analytics for your specific portfolio — returns, risk, factor attribution, drawdowns.

#### Performance Summary (`/analytics/overview/performance`)
After selecting a portfolio, you see:
- **P&L Summary**: Total Return, CAGR (annualized), Sharpe Ratio
- **Risk Summary**: Max Drawdown, Average Turnover, Transaction Cost Drag
- **Portfolio Summary**: Initial Capital, Final Value, Total Trades
- **Charts**: Portfolio value over time, Drawdown chart, Value trend

If no portfolio selected, shows demo data (NIFTY 50 equal weight).

#### Holdings Summary (`/analytics/overview/holdings`)
- **Holdings table**: each stock with weight, sector, factor exposures
- Check/uncheck holdings → click **Update Graph** → chart updates
- **Factor Summary**: your portfolio's exposure to each risk factor

#### Returns & Risk (`/analytics/portfolio-analysis/returns-risk`)
- Toggle **Active / Benchmark / Excess** tabs
- **Return Decomposition**: how much return came from factor vs idiosyncratic
- **Contributors and Detractors**: which stocks helped/hurt most
  - **Overall**: raw returns
  - **Idio**: stock-specific (not explained by factors)
  - **Factor**: which factor bets paid off

#### Slicing & Dicing (`/analytics/portfolio-analysis/slicing`)
- Cut your portfolio by dimensions: **Sector, Market Cap, Liquidity, Risk**
- See weight distribution and top/bottom holdings per slice
- Example: "How much is in Financial Services vs Technology?"

#### Drawdown (`/analytics/portfolio-analysis/drawdown`)
- Worst peak-to-trough declines
- Recovery analysis

---

### Step 7: Build a Strategy & Backtest

**What it is:** A systematic strategy defines rules for portfolio construction — which stocks to buy, how much, when to rebalance. Backtesting runs these rules on historical data.

#### Build New Strategy (`/strategy-builder/build`)

1. **Metadata**:
   - Fund Name: "Momentum Strategy"
   - Scheme Name: "Monthly Rebalance"
   - Iteration Name: "v1"

2. **Universe**: Select NIFTY 500 (which stocks to pick from)

3. **Benchmark**: NIFTY 500 (what to measure against)

4. **Add Constraints** (click "+ Add"):
   - **Position Size Bound**: min_weight=0.01, max_weight=0.05 (each stock 1-5%)
   - **Maximum Number of Positions**: max_positions=30
   - **Beta Exposure Constraint**: min_beta=0.8, max_beta=1.2
   
5. **Add Objectives** (click "+ Add"):
   - **Risk Minimization Objective**: risk_type=total, weight=1.0

6. **Configure Backtest** (click button):
   - Start Date: 2025-06-01
   - End Date: 2026-04-24
   - Tab: **Regular Interval** → Rebalance Frequency: Monthly
   - Stop Loss: optional (e.g., 10% total stop loss)
   - Click **Run Full Backtest**

7. **Results appear**:
   - Total Return, CAGR, Sharpe, Max Drawdown
   - Equity curve chart showing portfolio value over time
   - Final value in ₹ Crores

8. Click **Compute 1-Day Results** for a quick check

---

### Step 8: Use the Portfolio Optimizer

**What it is:** Given a set of stocks, mathematically find the optimal weights to minimize risk or maximize return.

#### Optimizer (`/optimizer`)

1. **Stock Universe**: Pre-loaded with Indian stocks. Add/remove as needed.

2. **Objective** (click one):
   - **Minimize Risk**: find the least-risky portfolio
   - **Maximize Return**: go for highest return (more volatile)
   - **Maximize Sharpe**: best risk-adjusted return (recommended)
   - **Min Tracking Error**: stay close to benchmark

3. **Add Constraints**:
   - Position Size Bound: min=0.02, max=0.25 (each stock 2-25%)
   - Max Positions: 15

4. Click **Run Optimization**

5. **Results**:
   - Status: OPTIMAL (solver found a solution) or INFEASIBLE
   - Expected Return, Risk, Sharpe Ratio
   - Weights table: how much to put in each stock
   - Weight distribution bar chart
   - Efficient Frontier: the risk-return tradeoff curve
   - **Export CSV** to download weights

---

### Step 9: AI Stock Prediction

**What it is:** ML model trained on 180+ features predicts stock direction probability, entry/exit prices, and position sizing.

#### AI Predict (`/predict`)

1. Enter a stock symbol: `RELIANCE.NS`
2. Enter portfolio value: ₹10,00,000
3. Select risk tolerance: Medium
4. Click **Analyze**

5. **Results**:
   - **Composite Score** (0-100): overall signal strength
   - **Action**: BUY / SELL / HOLD
   - **Signals**: Technical (RSI, MACD), Momentum, Fundamental (P/E, margins), Sentiment
   - **Recommendation**: entry price, stop loss, targets with probabilities
   - **Position Size**: how much to invest (Kelly Criterion)
   - **Risk**: VaR, max drawdown, volatility
   - **Monte Carlo**: 10,000 simulations of future returns
   - **Stress Test**: what happens in a crisis scenario
   - **Backtest**: historical win rate and Sharpe ratio

---

### Other Tools

#### Market Heatmap (`/heatmap`)
- Finviz-style treemap of all stocks
- Size = market cap, Color = daily change
- Toggle US / India
- Click any stock → go to stock detail

#### Stock Screener (`/screener`)
- Filter by Sector, P/E, Dividend Yield
- Sort by Market Cap, P/E, Change%
- Click any row → stock detail page

#### Stock Comparison (`/compare`)
- Add 2-5 stocks
- Overlaid normalized performance chart
- Side-by-side fundamentals table

#### Correlation Matrix (`/correlation`)
- Add 2-10 stocks
- Color-coded Pearson correlation grid
- Green = move together, Red = move opposite

#### Portfolio Tracker (`/portfolio`)
- Add holdings manually (symbol, shares, buy price)
- Live P&L tracking
- Stored in browser localStorage (no login needed)

#### Settings (`/settings`)
- Switch currency: USD ($) or INR (₹)
- Live exchange rate from API

---

## Key Terms Explained

| Term | What it means |
|------|---------------|
| **CAGR** | Compound Annual Growth Rate — annualized return |
| **Sharpe Ratio** | Return per unit of risk. >1 is good, >2 is excellent |
| **Max Drawdown** | Worst peak-to-trough decline. -20% means you lost 20% from the peak |
| **Alpha** | Return above the benchmark. Positive = you beat the market |
| **Beta** | Sensitivity to market moves. 1.0 = moves with market, >1 = more volatile |
| **Factor** | A characteristic that explains returns (momentum, value, size, etc.) |
| **SEMV** | Stock Equivalent Market Value — how much money is in each stock (in crores) |
| **Backtest** | Running a strategy on historical data to see how it would have performed |
| **Rebalance** | Periodically adjusting portfolio weights back to target |
| **Stop Loss** | Auto-sell if losses exceed a threshold |
| **VaR** | Value at Risk — maximum expected loss at 95% confidence |
| **CVaR** | Expected Shortfall — average loss in the worst 5% of scenarios |
| **Brinson** | Performance attribution: allocation effect vs selection effect |
| **P/E** | Price-to-Earnings ratio. Lower = cheaper stock |
| **ROE** | Return on Equity. Higher = more profitable |
| **RSI** | Relative Strength Index. <30 = oversold, >70 = overbought |
| **MACD** | Moving Average Convergence Divergence. Crossovers signal trend changes |
