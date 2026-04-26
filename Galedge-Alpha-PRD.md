# Galedge Alpha — Product Requirements Document

## Institutional-Grade Systematic Investment Platform

**Version:** 1.0
**Date:** April 25, 2026
**Product:** Galedge Alpha
**Target Users:** Institutional investors, portfolio managers, quants, asset management companies
**Market Focus:** India-first (NSE/BSE), with US market support

---

## 1. Executive Summary

Galedge Alpha is a SaaS-based systematic investment platform that unifies data, multi-factor risk modeling, alpha research, portfolio construction, strategy backtesting, and performance analytics into a single stack. It provides a practitioner-first, no-code environment for institutional investors while also exposing Python APIs for custom development.

### Core Pillars

| Pillar | Description |
|--------|-------------|
| **Risk Model** | Decompose portfolios using India-centric multi-factor risk framework |
| **Alpha Machine** | Generate alpha by screening and ranking stocks using custom signals |
| **Portfolio Construction** | Build portfolios using constraints, weights, and optimization |
| **Strategy Builder** | Build, optimize, and deploy systematic investment strategies |
| **Analytics** | Evaluate performance, attribution, and risk with detailed diagnostics |

---

## 2. Platform Architecture

### 2.1 Navigation Structure

```
Sidebar Navigation:
├── Home
├── Risk Model
│   ├── Factor Summary
│   └── Stock Summary
├── Alpha Machine (expandable)
│   ├── Home (Screeners/Factors | Alpha Model tabs)
│   ├── Build Your Screen/Factor
│   ├── Build Alpha Model
│   ├── Upload Factors
│   └── Code Editor
├── Portfolio Construction
│   ├── Select Portfolio
│   └── Upload Portfolio
├── Strategy Builder (expandable)
│   ├── Home (Backtest | Production tabs)
│   └── Build New Strategy
├── Analytics (expandable)
│   ├── Home (Portfolio list with tabs)
│   ├── Overview
│   │   ├── Performance Summary
│   │   ├── Peer Comparison
│   │   ├── Holdings Summary
│   ├── Portfolio Analysis
│   │   ├── Returns and Risk
│   │   ├── Slicing and Dicing
│   │   ├── Drawdown
│   │   └── Event Sensitivity
│   ├── Peer Intelligence
│   │   ├── Peer Returns and Risks
│   │   └── Peer Breakdown
│   └── Lite Analytics
│       └── Performance Summary
├── Product Tour
└── User Profile
```

### 2.2 Global UI Elements

- **Header Bar**: Period selector (1D, 1M, 3M, 6M, 1Y, WTD, MTD, QTD, YTD), Custom Periods dropdown, date range picker with Apply button
- **Custom Period Sets**: User-created named period ranges (e.g., "Pre-Rate Increase: 2020-01-01 to 2021-12-31", "Post-Rate Increase: 2022-01-03 to 2025-10-31"). CRUD operations: Create, Update, Delete period sets with multiple named sub-periods.
- **Dark Theme**: Full application in dark mode (zinc/black backgrounds)
- **Collapsible Sidebar**: Icon-only collapsed, full labels expanded
- **Breadcrumbs**: e.g., "Alpha Machine > Build Your Screen Factor"
- **Refresh Button**: Top-right on most pages
- **Data Export**: Download buttons (CSV, ZIP) on tables and charts
- **Chart Controls**: Each chart card has filter, info tooltip, expand/fullscreen, and download icons

---

## 3. Module 1: Risk Model

### 3.1 Factor Summary

**Route:** `/risk-model/factor-summary`

**Purpose:** Analyze factor performance across the risk model universe.

**UI Components:**

#### Universe Selector
- Dropdown at top: Select risk model universe (e.g., "INEC1")

#### Factor Performance Summary Table
- Columns: Factor Type, Factor, CAGR, Cumulative Return, Sharpe, Daily Return, Max Drawdown, Start Date, End Date
- Factor Types: MARKET, BETA, SIZE, EARNYILD, LTMOM, LIQUIDITY, FINLVG, PROFIT, GROWTH, DIVYILD, VALUE (India-centric factors)
- Rows are selectable/clickable
- Sortable by any column

#### Factor Correlation Heatmap
- N x N matrix of all factors
- Color-coded: green (positive correlation) to red (negative correlation)
- Values displayed in each cell (e.g., 0.07, -0.13)
- Factors on both axes: AUTOCOMP, BETA, CAPGOODS, CEMENT, DIVYILD, EARNYILD, etc.

#### Factor Returns Time Series Chart
- Line chart showing cumulative returns of selected factors over time
- Multiple factor lines overlaid (e.g., BETA vs EARNYILD vs SIZE)
- Time range: configurable (e.g., 2013-2026)
- Legend: color-coded factor names
- Toggleable: BUSINESSES, F1-SERVIC, METALMINE, TELECOM, etc.

#### Factor Correlation Time Series
- Line chart showing rolling correlation between two selected factors (e.g., "BETA vs BETA")
- Time axis with same range as factor returns

### 3.2 Stock Summary

**Route:** `/risk-model/stock-summary`

**Purpose:** Decompose individual stock risk into factor exposures.

**UI Components:**

#### Stock Selector
- Multi-select search: "Search stock by symbol or name"
- Selected stocks shown as colored chips/tags (e.g., "Reliance Industries Ltd", "HDFC Bank Ltd", "State Bank of India Ltd", "Bajaj Finserv Ltd", "Coal India Ltd", "Indo Count Industries Ltd")
- "Selected Stocks: Updated Stocks: 10" counter

#### Stock Risk Summary Table
- Columns per selected stock: specific risk metrics
- Data: factor exposure breakdown per stock

#### Return Decomposition Table
- Dimensions: MARKET, BETA, CONNECTIVITY, EARNYILD, FINLVG, LTMOM, VALUE
- Values: percentage decomposition
- Per stock column showing contribution

#### Return Decomposition Chart
- Per-stock return decomposition time series (e.g., "Return Decomposition - BAJFINANCE")
- Multiple colored lines showing factor contribution over time
- Balance scale showing factor-level attribution

---

## 4. Module 2: Alpha Machine

### 4.1 Home / Dashboard

**Route:** `/alpha-machine`

**Tabs:** Screener/Factors | Alpha Model

#### Screener/Factors Tab — User Created Screens
- Table columns: Screen Name, Description, Created Date, Modified Date, Modify (edit icon), Delete (trash icon)
- Rows: user-created screens (e.g., "Edelweiss", "Industry Relative Reversal", "Momentum Marcellus", "Momentum Value Mixture")
- Each row has edit and delete actions

#### Screener/Factors Tab — Backtests
- Table columns: Backtest Name, Screen Name, Start Date, End Date, Modify, Delete
- Lists all backtests linked to screens

#### Alpha Model Tab — User Created Alpha Models
- Table columns: Model Name, Start Date, End Date, Status (badge), View Results, Enable Production, Delete
- Status badges: colored indicators

#### Alpha Model Tab — MethodTech Alphas (Platform-Provided)
- Table columns: Model Name, Start Date, End Date, Status, View Results
- Pre-built institutional alpha models

### 4.2 Build Your Screen/Factor

**Route:** `/alpha-machine/build-screen-factor`

**Purpose:** No-code builder for stock screening and factor construction.

**UI Components:**

#### Header Fields
- **Name** (required): Text input
- **Description** (required): Text input
- **Parent Universe**: Dropdown (e.g., "Risk Model Estimation...")
- **Sector**: Dropdown (e.g., "Select Sector")
- **Industry**: Dropdown (e.g., "Select Industry")
- **Portfolio Weight**: Dropdown (e.g., "Market Cap Weight")
- **Date**: Date picker (e.g., "April 24th, 2026")

#### Screener Query Builder
- Text area for query expression
- Example syntax: `MarketCap > 500 AND PE < 15 AND ROEC > 22`
- "Select example" dropdown with pre-built queries
- Expand/collapse icon

#### Score Equation Builder
- Text area for score formula
- Example syntax: `MarketCap > 500 AND PE < 15 AND ROEC > 22`
- "Select example" dropdown
- **Score Variable**: Named input for the score variable

#### Description Field
- Rich text area: "Select or type a metric to see its description here"

#### Metrics Library Panel (Right Side)
- **Tabs**: Library | Metric | Operator
- **Search**: "Search Metrics" input
- **Count**: "204 Metrics Available"
- **Metric List**: Scrollable list including:
  - 200D SMA, 20D SMA, 50D SMA
  - (204 total financial/technical metrics)

#### Action Buttons
- **Verify Query**: Validates the screener expression
- **Compute & Save**: Runs the screen and saves results

#### Results Area
- Table/chart area showing screened stocks
- Filter, expand, download icons

### 4.3 Build Alpha Model

**Route:** `/alpha-machine/build-alpha-model`

**Purpose:** Construct alpha models from input and control factors.

**UI Components:**

#### Build Alpha Model Dialog/Page
- **Name**: Text input
- **Input Factors**: Multi-select dropdown ("Select factors"), counter "Selected Input Factors: 0"
  - Shows list of available factors in a panel
  - "No factors selected" placeholder
- **Control Factors (Optional)**: Multi-select dropdown
- **Return Type**: Dropdown (Total, ...)
- **Regression Weight**: Dropdown (Sort Market Cap, ...)
- **Universe**: Dropdown (Risk Model Estimation Universe, ...)
- **Half Life (in days)**: Number input
- **Forward Horizons**: Multi-select dropdown (Select horizons)
- **Estimation Frequency**: Dropdown (Quarterly, Monthly, ...)
- **Minimum Number of Observations**: Number input
- **Compute** button

### 4.4 Upload Factors

**Route:** `/alpha-machine/upload-factors`

**Purpose:** Upload custom alpha factors via CSV/ZIP.

**UI Components:**

#### Alpha Models Page
- **Refresh** and **Upload Alpha** buttons (top-right)

#### User Created Alphas Table
- Columns: Alpha Name, Description, Start Date, End Date, Frequency, Upload (icon), Status (badge), Delete
- Status: Colored badges (blue, green, etc.)
- Upload column: numbered version indicator (e.g., "1.")

#### Standard Alphas Table
- Columns: Alpha Name, Description, Start Date, End Date, Status
- Pre-built alphas: Industry-Momentum (Q-5), Industry-Momentum (Q-3), Residual-Momentum (Q-5), etc.
- Status: "AVAILABLE" badge

#### Upload Alpha Dialog
- **Alpha Name**: Text input
- **Description**: Text area
- **Upload CSV/ZIP**: Drag-and-drop zone with "Browse Files" button
- **Download Template**: CSV | ZIP toggle buttons
- **Example Table**: Shows expected format
  - Columns: Date, ExchangeSymbol, Alpha
  - Example rows: 20250204, HDFCBANK, 0.318 | RELIANCE, 0.137 | TCS, 0.03
- **Save Alpha** button

### 4.5 Code Editor

**Route:** `/alpha-machine/code-editor`

**Purpose:** Python-based sandboxed coding environment for custom alpha research.

**UI Components:**

#### Start Coding Page
- "Start Coding" button centered

#### Start Coding Session Dialog
- **Branch**: Radio selection
  - Scratch (new workspace)
  - Production (existing code)
- **RAM (GB)**: Dropdown (32 GB, options for different sizes)
- **CPU cores**: Dropdown (16 cores)
- **Session inactivity time**: Dropdown (2 hours)
- **Cancel** and **Start Coding** buttons

#### IDE (after session starts)
- Full-screen Python IDE (Jupyter-like or VS Code-like)
- Access to platform APIs and data

---

## 5. Module 3: Portfolio Construction

### 5.1 Select Portfolio

**Route:** `/portfolio-construction/select-portfolio`

**Purpose:** Select existing portfolios (funds/schemes) to work with.

**UI Components:**

#### Select Portfolio Page
- **Fund**: Dropdown (e.g., Bandhan, Test, Taurus, F1, Sim)
- **Scheme**: Dropdown (dependent on Fund selection, "Select Fund First")
- **Date**: Date picker
- **Proceed** button

#### Select Portfolio Section
- Table: Fund Name, Scheme Name, Iteration, Created Date, Last Modified, Modify, Delete
- "No records" placeholder when empty

#### Upload Portfolio Section
- Same table structure
- Shows uploaded portfolios (e.g., Fund: "Taurus", Scheme: "ELSS", Iteration: 1.0)

### 5.2 Upload Portfolio

**Route:** `/portfolio-construction/upload-portfolio`

**Purpose:** Upload custom portfolio holdings via CSV.

**UI Components:**

- **Fund**: Text input
- **Scheme**: Text input
- **Benchmark**: Dropdown (Select Benchmark)
- **Date**: Date picker (e.g., "April 24th, 2026")
- **Upload CSV**: Drag-and-drop zone + "Browse Files"
- **Note**: "SEMV = Stock Equivalent Market Value (Uploaded values must be in crores)"
- **Example Table**: ExchangeSymbol | SEMV (e.g., HDFCBANK: 3.18, RELIANCE: 1.37, TCS: 0.3)
- **Download Template**: CSV button
- **Proceed** button

---

## 6. Module 4: Strategy Builder

### 6.1 Home / Dashboard

**Route:** `/strategy-builder`

**Tabs:** Backtest | Production

#### Backtest Tab
- Table: Fund Name, Scheme Name, Portfolio, Created Date, Last Modified, Start Date, End Date, Rebalance Status (badges: "AVAILABLE", "IN PROGRESS", "NOT AVAILABLE"), Analytics Status, Modify (icon), Production (toggle), Delete
- Sample Strategies section with same columns
- **Disclaimer**: "The sample strategies displayed here are for demonstration purposes only and do not constitute investment advice or recommendations..."

#### Production Tab
- **Active Productions**: Table (Fund Name, Scheme Name, Iteration, Current AUM, Start Date, Last Run Date, Next Rebalance Date, Manual Trigger)
- **Archived Productions**: Same columns
- Expand/collapse per row

### 6.2 Build New Strategy

**Route:** `/strategy-builder/build-new-strategy`

**Purpose:** Full strategy construction wizard with universe selection, constraints, objectives, and backtest configuration.

**UI Components:**

#### Header Fields
- **Fund Name**: Text input
- **Scheme Name**: Text input
- **Iteration Name**: Text input

#### Configuration Tabs Row
- **Universe**: Select A Universe dropdown
- **Performance Benchmark**: Select benchmark dropdown
- **Date**: Date picker
- **Include futures instruments**: Toggle switch

#### Universe Selection (expandable)
- **Standard Universes**: NIFTY, SENSEX, BSE 500, NIFTY 500, NIFTY 100, NIFTY 200, NIFTY MIDCAP 150, NIFTY SMALLCAP 250, NIFTY LARGEMIDCAP 250, NIFTY MICROCAP 250, NIFTY NEXT 50, FNO
- **Screener Universes**: User-created screens (Edelweiss, Industry Relative Reversal, etc.)

#### Benchmark Selection
- Standard indices: BSE 500, Current Portfolio, Nifty, Nifty 100, NIFTY 200, Nifty 500, Nifty 50 Value 20, Nifty Auto, Nifty IT, Nifty Large and Mid Cap 250, Nifty Microcap 250, Nifty Midcap 150, Nifty Midcap Select, Nifty Next 50, etc.
- User-created screener benchmarks

#### Constraints Section
- Table: S.No., Constraint Name, Maximum Capital, Status, Actions
- **Add** button
- Upload/download constraints (icons)

##### Constraint Types (from "Choose Constraint Option" dialog):
1. **Maximum Capital** — Total capital limit
2. **Maximum Number of Positions** — Position count limit
3. **Position Size Bound** — Per-position min/max weight
4. **Minimum Position Size Constraint** — Floor per position
5. **Portfolio Risk Budget Constraint** — Total risk budget allocation
6. **Beta Exposure Constraint** — Portfolio beta bounds
7. **Factor Exposure Constraint** — Per-factor exposure bounds
   - Sub-tabs: Factor | Factor Group | Screener Factor | User Created Factor
   - Fields: Constraint Name, Select Factor (dropdown), Lower Bound (in %), Upper Bound (in %), Add Factor button, Save Changes
8. **Sub Portfolio Capital Constraint** — Capital allocation to sub-portfolios
9. **Single Name Idiosyncratic Contribution** — Single-stock risk limit
10. **Portfolio Turnover Constraint** — Turnover limit per rebalance
11. **Category Selection Constraint** — Sector/category constraints

#### Objectives Section
- Table: S.No., Objective Name, Status, Actions
- **Add** button
- Upload/download objectives (icons)

##### Objective Types (from "Choose Objective Option" dialog):
1. **Risk Minimization Objective**
   - Objective Name, Risk Type (dropdown: Select), Objective Weight
   - Add Term Type
   - Save Changes

#### Additional Analytics Dialog
- **User created factors**: Multi-select with search, Select All, checkboxes per factor
  - Lists: SampleFactor, TestFactor, factoring, test23, testing12, testingfile
- **Screener factors**: Multi-select with search, Select All, checkboxes
  - Lists: Edelweiss, Industry Relative Reversal (+ variations), Jain Portfolio Exclusions, Momentum Marcellus, Momentum Value Mixture (+ variations), Nippon Sample

#### Configure Backtest Dialog
- **Start Date** (required): Date picker
- **End Date** (required): Date picker
- **Rebalance Frequency** (required): Dropdown (Regular Interval | Specified Dates toggle)
  - Options: Monthly, Quarterly, etc.
- **Stop Loss** (expandable section):
  - Total Stop Loss (+ button)
  - Residual Stop Loss (+ button)
- **Burn-in and Chunking** (expandable section):
  - Maximum number of chunks: Number input (default: 5)
  - Minimum rebalance per chunk: Number input (default: 5)
  - Burn in rebalances: Number input (default: 2)
- **Run Full Backtest** button

#### Bottom Action Bar
- **Backtest Credits**: "22 / 71" usage counter
- **Additional Analytics** button
- **Configure Backtest** button
- **Compute 1-Day Results** button

---

## 7. Module 5: Analytics

### 7.1 Home / Portfolio List

**Route:** `/analytics`

**Purpose:** List all portfolios available for analysis.

**Tabs:** Backtested Portfolios | User Uploaded Portfolios | Standard Portfolios | Production Portfolios | Shared Portfolios | Received Portfolios

#### Table Columns
- Fund, Scheme, Start Date, End Date, Full Analytics Status (badge: AVAILABLE / NOT AVAILABLE), Lite Analytics Status, Share (icon), Upload (icon)

#### Left Panel (when portfolio selected)
- **Portfolio selector**: Funds dropdown > Schemes dropdown
  - Backtested Portfolios, User Uploaded Portfolios, Production Portfolios
  - Lists: Long Portfolio, Golden Crossover, etc.
  - Shows CAGR, Sharpe Ratio, Treynor Ratio, Execution Summary per scheme

### 7.2 Overview — Performance Summary

**Route:** `/analytics/overview/performance-summary`

**Purpose:** High-level portfolio performance dashboard.

**UI Layout:** 6-panel grid (2 rows x 3 columns)

#### Panel 1: Profit and Loss Summary Table
- Metrics: Total Return (%), CAGR (%), Sharpe Ratio, Treynor Ratio, + more rows
- Columns: Active, Benchmark, Excess (or similar comparison columns)

#### Panel 2: Risk Summary Table
- Metrics: Realized Risk (%), Total Predicted Risk (%), Factor Predicted Risk (%), Portfolio Concentration, Crossover (b.Ask EUR DP vs)
- Columns: Active, Benchmark, values

#### Panel 3: Valuation Summary Table
- Metrics: P/E Ratio, Return on Equity (%), other valuation metrics
- Columns: Active, Benchmark

#### Panel 4: Total Return (%) Time Series Chart
- Lines: Active (orange), Benchmark (yellow), Main (green)
- X-axis: Time, Y-axis: Cumulative return %
- Legend toggleable

#### Panel 5: Rolling 1Y Realized Risk (%) Chart
- Same multi-line time series format
- Shows risk evolution over time

#### Panel 6: PE Ratio Chart
- Time series of portfolio P/E ratio vs benchmark

### 7.3 Overview — Peer Comparison

**Route:** `/analytics/overview/peer-comparison`

**Same 6-panel layout** as Performance Summary but comparing:
- Profit and Loss Summary (Active vs peers)
- Risk Summary (Active vs peers)
- Valuation Summary
- Return Decomposition (%) chart — with multiple colored series
- Predicted Risk (%) chart — Total Predicted Risk vs Factor/Idiosyncratic
- PE Ratio chart

### 7.4 Overview — Holdings Summary

**Route:** `/analytics/overview/holdings-summary`

**Layout:** 4-panel grid

#### Panel 1: Holdings Summary Table
- Sortable table with stock-level data
- Columns include weight %, return metrics
- Rows selectable (checkboxes), "5/5 Selected", "Clear Selection"
- **Update Graph** button

#### Panel 2: Factor Summary Table
- Factor-level exposure data
- Same selection/filter controls

#### Panel 3: Holdings (%) Time Series Chart
- Stacked or overlaid line chart showing holding weights over time
- Legend: CANBLIFE, CHOICEIN, CORONA, PARKODRI, UJJIVNSFB

#### Panel 4: Factor Exposure (%) Time Series Chart
- Factor exposure evolution over time
- Legend: FINLVG, LTMOM, MKTCALLN, BETA, etc.

### 7.5 Portfolio Analysis — Returns and Risk

**Route:** `/analytics/portfolio-analysis/returns-and-risk`

**Tabs at top:** Active | Benchmark | Excess

**Layout:** Top section + 6-panel grid + Contributors section

#### Top Section (3 tables + 1 summary):
1. **Profit and Loss Summary** — Total Return, Factor Return, Idiosyncratic Return, etc.
2. **Risk Summary** — Realized Risk, Total/Factor/Idiosyncratic Predicted Risk
3. **Valuation Summary** — P/E, ROE
4. **Brinson Decomposition Summary** — Allocation Effect, Selection Effect

#### Chart Panels:
1. **Return Decomposition (%)** — Stacked bar chart showing Total Return, Factor Return, Idiosyncratic, etc.
2. **Predicted Risk (%)** — Time series: Total, Factor, Idiosyncratic predicted risk
3. **PE Ratio** — Time series
4. **Market Cap** — Time series or bar chart

#### Contributors and Detractors Section

**Tabs:** Overall | Idio | Factor

##### Overall Tab:
- **Top 10 Holdings (%)** — Table: Symbol, Holdings %, Raw Return %, Total Return %, Total Risk Contribution %
- **Bottom 10 Holdings (%)** — Same columns
- **Top Holdings (%)** — Time series chart of top holding weights

##### Idio (Idiosyncratic) Tab:
- **Drop Detractors** — Table: Symbol, Holdings %, Idiosyncratic Raw Return %, Idiosyncratic Return %, Idiosyncratic Risk Contribution %
- **Recovery Contributors** — Same columns

##### Factor Tab:
- **Drop Detractors** — Table: Factor Type, Factor Name, Factor Exposure %, Factor Return %, Factor Raw Return %, Factor Risk Contribution %
- **Recovery Contributors** — Same columns
- Factor Types: Market, Style (SIZE, PROFIT, LIQUIDITY, etc.), Industry (AUTOCOMP, etc.)

### 7.6 Portfolio Analysis — Slicing and Dicing

**Route:** `/analytics/portfolio-analysis/slicing-and-dicing`

**Purpose:** Break down portfolio by various dimensions.

**Dimension Tabs:** Market Cap | Liquidity | Total Risk | Idiosyncratic Risk | Sector | Industry | Earnings Window | IPO | Financial Type | Position Age

Each dimension tab shows the same 8-panel layout:

#### Panel 1: Return Decomposition Table
- KPI dropdown selector
- Columns vary by dimension (e.g., for Market Cap: Large Cap, Mid Cap, Small Cap)
- Metrics: Dividend Return %, Other Return %, Transaction Cost %, Brokerage Fees %, Spread %, Market Impact %

#### Panel 2: Realized Volatility (%) Table
- Market Realized Risk %, Style Realized Risk %, Industry Realized Risk %
- (or Factor Realized Risk % depending on the tab)

#### Panel 3: Valuation Ratios Table
- P/E, ROE, other ratios segmented by dimension

#### Panel 4: Brinson Decomposition Summary Table
- Allocation Effect, Selection Effect

#### Chart Panels:
5. **Total Return (%)** — Time series by segment (e.g., Mid Cap vs Small Cap)
6. **Rolling 1Y Realized Risk (%)** — Time series by segment
7. **PE Ratio** — Time series by segment
8. **Allocation Effect (%)** — Time series

#### Special Dimensions:
- **Idiosyncratic Risk**: Shows Dividend Return, Other Return, Transaction Cost, Brokerage Fees, Spread, Market Impact
- **IPO**: Segments into "In IPO Window" vs "Not in IPO Window"
- **Earnings Window**: Segments by earnings proximity
- **Position Age**: Segments by holding duration

### 7.7 Portfolio Analysis — Drawdown

**Route:** `/analytics/portfolio-analysis/drawdown`

**Layout:** Multi-panel dashboard

#### Panel 1: Drawdown Summary Table
- Columns: Drawdown #, Start Date, End Date, Max Drawdown %, Recovery Date, Duration
- Multiple drawdown events listed

#### Panel 2: Drawdown Loss (%) Heatmap/Grid
- Color-coded cells (red shading intensity = severity)
- Period-based drawdown visualization

#### Panel 3: Contributors and Detractors

**Tabs:** Overall | Idio | Factor (same structure as Returns & Risk)

- **Drop Detractors** table with: Symbol, Raw Return %, Total Return %, Total Risk Contribution %
- **Recovery Contributors** table

#### Panel 4: Portfolio / Common Index Return (%)
- Time series: Portfolio Return vs NIFTY BANK, NIFTY 500, NIFTY MIDCAP 150, NIFTY SMALLCAP 250, NIFTY 50
- Overlay multiple benchmark indices

#### Panel 5: Risk Model Breakdown
- **Return Decomposition** — Stacked components
- **Risk Decomposition** — Factor vs idiosyncratic breakdown
- Separate line charts for each decomposition

#### Panel 6: Event Returns Time Series
- Time series during drawdown events
- Multiple benchmark overlays

#### Panel 7-8: Top 10 Factor Return Contributors / Detractors
- Bar charts showing factor contribution during drawdowns

### 7.8 Portfolio Analysis — Event Sensitivity

**Route:** `/analytics/portfolio-analysis/event-sensitivity`

**Purpose:** Analyze portfolio behavior during major market events.

#### Event Sensitivity Summary Table
- Columns: Event checkbox, Event Name, Start Date, End Date, Portfolio Return, Benchmark Return, Excess Return
- Events: "2019 election run-up", "GST rollout & demonetisation", "2024 election whipsaw & rebound", etc.
- Selectable rows to drill down

#### Event Returns (%) Treemap/Heatmap
- Finviz-style treemap where:
  - Size = magnitude of event impact
  - Color = positive (green) / negative (red)
  - Labels: event names with return percentages
  - Events: "2019 election run-up +4.1%", "COVID outbreak", "2024 election whipsaw", "Oil shock", "ILFS NBFC Crisis", etc.

#### Per-Event Drill-Down (when event selected):
1. **Portfolio & Common Index Returns** — Table: Portfolio Index Return, NIFTY BANK, etc.
2. **Contributors and Detractors** — Table with Factor Type, Factor Name, values
3. **Event Returns Time Series** — Line chart during event period
4. **Top 10 Factor Return Contributors** — Bar chart
5. **Bottom 10 Factor Return Detractors** — Bar chart

### 7.9 Peer Intelligence — Peer Returns and Risks

**Route:** `/analytics/peer-intelligence/peer-returns-and-risks`

**Purpose:** Compare portfolio against peer funds/schemes.

**Layout:** Same multi-panel structure as Performance Summary

- P&L Summary comparing portfolio vs peers
- Risk Summary comparison
- Valuation Summary comparison
- Return Decomposition chart
- Predicted Risk chart
- PE Ratio chart

#### Contributors and Detractors for Peers
- **Tabs:** Overall | Idio | Factor
- Side-by-side tables: "Long Portfolio - Multi Factor:Small..." showing:
  - KPI dropdowns on each table
  - Factor Exposure %, Factor Raw Return %, Factor Return %, Factor Risk Contribution %

### 7.10 Peer Intelligence — Peer Breakdown

**Route:** `/analytics/peer-intelligence/peer-breakdown`

**Purpose:** Slice peer comparison by dimensions.

Same Slicing & Dicing layout but comparing across peers:
- **Dimension Tabs**: Market Cap, Liquidity, Total Risk, Idiosyncratic Risk, Sector, Industry, Earnings Window, IPO, Financial Type, Position Age
- Each dimension shows Return Decomposition, Realized Volatility, Valuation Ratios, Brinson Decomposition, time series charts

### 7.11 Lite Analytics — Performance Summary

**Route:** `/analytics/lite-analytics/performance-summary`

**Purpose:** Lightweight performance view without full risk model decomposition.

**Layout:** 6-panel grid

1. **Profit and Loss Summary** — Table
2. **Risk Summary** — Table
3. **Factor Return Contribution** — Interactive panel
   - Selectable factors with checkboxes (e.g., APLTP, CAPGOODS, DIVYILD, EARNYILD, FINLVG)
   - "5/5 Selected" counter
4. **Total Return (%)** — Time series (Active, Benchmark, Main)
5. **Total Predicted Risk (%)** — Time series
6. **Factor P/L Time Series** — Per-factor line chart (e.g., "CAPGOODS")

#### Portfolio Selector (Left Panel)
- Hierarchical: Funds > Schemes
- **Add Portfolio** link
- **Edit Portfolio** link
- Shows CAGR (%), Sharpe Ratio, Treynor Ratio per scheme
- "Execution Summary" section

### 7.12 Analytics — Add New Portfolio

**Route:** `/analytics/add-portfolio`

**Purpose:** Onboard a portfolio for analytics.

**UI Components:**

#### Select Portfolio Option
- Dropdown: "Select Portfolio" | "Upload Portfolio"

#### Select Portfolio Mode:
- **Select Portfolio**: Dropdown with existing portfolios
- **Fund**: Dropdown
- **Scheme**: Dropdown (dependent on Fund)

#### Upload Portfolio Mode:
- **Fund**: Text input
- **Scheme**: Text input
- **Benchmark**: Dropdown (Select Benchmark)
- **Initial Portfolio AUM (in crores)**: Number input (default: 500)
- **Enable Transaction Cost**: Dropdown (Yes/No, default: No)

#### Add Peers Section
- "Add Peers (up-to 3)"
- Per peer: Fund dropdown, Scheme dropdown
- **+ Add Peer** button

#### Create Portfolio Button

---

## 8. Data Requirements

### 8.1 Market Data (India-Centric)
- **Price Data**: Daily OHLCV for NSE/BSE listed stocks (15+ years history)
- **Corporate Actions**: Dividends, splits, bonuses, rights issues
- **Index Data**: NIFTY 50, NIFTY 500, NIFTY 100, NIFTY 200, SENSEX, BSE 500, sector indices
- **Futures Data**: F&O segment data for derivatives-enabled strategies
- **Point-in-Time Data**: Survivorship-bias-free historical data

### 8.2 Fundamental Data
- **Financial Statements**: Quarterly and annual (P&L, Balance Sheet, Cash Flow)
- **Ratios**: P/E, P/B, ROE, ROA, Debt/Equity, Dividend Yield, EBITDA margins
- **Earnings Data**: EPS, earnings dates, earnings surprises
- **Sector/Industry Classification**: India-specific sector mapping

### 8.3 Risk Model Data
- **Factor Returns**: Daily returns for 40+ risk factors
- **Factor Exposures**: Per-stock factor loadings, updated regularly
- **Factor Types**: Market, Style (Beta, Size, Momentum, Value, Growth, Volatility, Liquidity, Quality, Leverage, Dividend Yield, Earnings Yield), Industry (60+ Indian industry groups)
- **Covariance Matrix**: Factor covariance matrix for risk prediction

### 8.4 Holdings & Portfolio Data
- **Portfolio Holdings**: Symbol, weight/SEMV, date
- **Benchmark Holdings**: Constituent weights for all supported indices
- **Transaction Data**: Buy/sell records with prices, fees, impact costs

### 8.5 Event Data
- **Market Events**: Elections, policy changes, crises, rate decisions
- **Corporate Events**: Earnings, M&A, management changes
- **IPO Data**: Listing dates, IPO window identification

---

## 9. Factor Risk Model Specification

### 9.1 Factor Categories

#### Market Factor (1)
- MARKET — broad market return

#### Style Factors (10+)
- BETA — market sensitivity
- SIZE — market capitalization
- LTMOM — long-term momentum (12M minus 1M return)
- LIQUIDITY — trading volume / turnover
- EARNYILD — earnings yield (inverse of P/E)
- VALUE — book-to-price ratio
- GROWTH — earnings/revenue growth
- DIVYILD — dividend yield
- PROFIT — profitability (ROE, margins)
- FINLVG — financial leverage (debt/equity)

#### Industry Factors (60+)
- AUTOCOMP, CAPGOODS, CEMENT, METALMINE, TELECOM, etc.
- India-specific GICS-equivalent classification

### 9.2 Risk Decomposition
- **Total Risk** = Factor Risk + Idiosyncratic Risk
- **Factor Risk** = Market Risk + Style Risk + Industry Risk
- **Predicted Risk** = Forward-looking risk from factor model
- **Realized Risk** = Historical volatility

### 9.3 Return Attribution (Brinson Decomposition)
- **Allocation Effect**: Over/underweight in sectors/factors
- **Selection Effect**: Stock selection within sectors
- **Interaction Effect**: Combined allocation + selection

---

## 10. Portfolio Optimization Engine

### 10.1 Optimization Objectives
- Risk Minimization (minimize portfolio variance)
- Return Maximization (maximize expected return)
- Risk-adjusted Return (maximize Sharpe/Information Ratio)
- Tracking Error Minimization (vs benchmark)

### 10.2 Constraint Types
1. Maximum Capital — Total AUM limit
2. Maximum Number of Positions — Cardinality constraint
3. Position Size Bound — Min/max weight per stock
4. Minimum Position Size — Floor weight
5. Portfolio Risk Budget — Risk allocation constraint
6. Beta Exposure — Portfolio beta bounds
7. Factor Exposure — Per-factor exposure bounds (with Factor/Factor Group/Screener/User filters)
8. Sub Portfolio Capital — Sub-portfolio allocation
9. Single Name Idiosyncratic Contribution — Concentration limit
10. Portfolio Turnover — Rebalance turnover cap
11. Category Selection — Sector/category count constraints

### 10.3 Backtesting Engine
- **Path-dependent**: Respects point-in-time data, no look-ahead
- **Rebalance Frequency**: Monthly, Quarterly, Custom dates
- **Transaction Costs**: Configurable brokerage, spread, market impact
- **Stop Loss**: Total and Residual stop loss mechanisms
- **Burn-in & Chunking**: Burn-in periods, chunked backtesting for robustness
- **15+ years history**: Full backtest from 2010+

---

## 11. Non-Functional Requirements

### 11.1 Performance
- Factor model computation: < 30 seconds for full universe
- Backtest execution: < 5 minutes for 15-year daily backtest
- Analytics page load: < 3 seconds from cache
- Screener query execution: < 10 seconds

### 11.2 Data Freshness
- End-of-day data: Available by T+1 morning (9 AM IST)
- Factor model: Updated daily after market close
- Corporate actions: Same-day adjustment

### 11.3 Security
- SOC 2 compliance target
- Data encryption at rest and in transit
- Role-based access control (RBAC)
- Audit logging for all user actions

### 11.4 Scalability
- Support 100+ concurrent institutional users
- Handle 5000+ stock universe
- Store 15+ years of daily data per stock

### 11.5 Infrastructure
- Database: PostgreSQL (relational) + TimescaleDB (time-series) or ClickHouse
- Compute: GPU-capable instances for optimization (or cloud functions)
- Storage: S3-compatible for large datasets, factor files, backtest results
- Cache: Redis for session, query cache, real-time data
- Queue: Celery/RabbitMQ for async backtest jobs

---

## 12. API Layer

### 12.1 REST APIs (for frontend)
- All CRUD operations for portfolios, strategies, screens, factors, alphas
- Analytics data endpoints with period filtering
- Real-time status polling for backtest jobs

### 12.2 Python SDK (for Code Editor & power users)
- Data access: `galedge.data.get_prices(universe, start, end)`
- Factor access: `galedge.factors.get_exposures(date, universe)`
- Risk model: `galedge.risk.predict(portfolio, date)`
- Backtest: `galedge.backtest.run(strategy, config)`
- Portfolio: `galedge.portfolio.optimize(objective, constraints)`

---

## 13. Migration Path from Current Galedge

### What exists today:
- yfinance-based data fetching (limited history, rate-limited)
- Basic ML prediction (XGBoost ensemble, 180+ features)
- Simple portfolio tracker (localStorage)
- Market heatmap, screener, comparison tools
- FastAPI backend (single file), Next.js frontend

### What needs to change:
1. **Database**: Move from no-DB to PostgreSQL + TimescaleDB
2. **Data Sources**: Replace yfinance with institutional data feeds (NSE data vendor, Bloomberg/Refinitiv equivalent for India)
3. **Risk Model Engine**: Build multi-factor risk model from scratch (compute factor returns, covariance matrices, exposures)
4. **Optimization Engine**: Implement mean-variance optimizer with constraint handling (scipy.optimize or CVXPY)
5. **Backtest Engine**: Path-dependent backtester with transaction cost modeling
6. **Auth & Multi-tenancy**: Add user auth, org-level access, subscription tiers
7. **Job Queue**: Async processing for long-running backtests
8. **Code Editor**: Sandboxed Jupyter/Python environment per user

---

## 14. Phased Delivery

### Phase 1: Foundation (Weeks 1-6)
- Database schema design and migration
- User auth + multi-tenancy
- Data pipeline (NSE/BSE historical data ingestion)
- Basic factor computation engine

### Phase 2: Risk Model + Alpha Machine (Weeks 7-14)
- Multi-factor risk model (10 style + 60 industry factors)
- Factor performance dashboard
- Stock risk decomposition
- Screen/Factor builder (no-code)
- Alpha model builder

### Phase 3: Portfolio Construction + Strategy Builder (Weeks 15-22)
- Portfolio optimizer (CVXPY-based)
- Constraint engine (all 11 constraint types)
- Strategy builder with backtest configuration
- Backtesting engine with transaction costs

### Phase 4: Analytics (Weeks 23-30)
- Performance Summary dashboard
- Return attribution (Brinson decomposition)
- Slicing & Dicing (10 dimensions)
- Drawdown analysis
- Event sensitivity
- Peer intelligence

### Phase 5: Advanced Features (Weeks 31-36)
- Code Editor (sandboxed Python environment)
- Production strategy deployment
- Lite Analytics
- Custom period sets
- Sharing & collaboration
- API documentation + Python SDK

---

## 15. Disclaimer

This product is designed for professional/institutional use. It is not a SEBI-registered investment adviser. All analytics, backtests, and strategies are tools for research — not investment recommendations. Past performance does not guarantee future results.
