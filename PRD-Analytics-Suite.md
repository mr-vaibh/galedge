# Galedge Analytics Suite — Product Requirements Document

**Version:** 1.0  
**Status:** Draft — Ready for Implementation

---

## Executive Summary

Build a full MethodTech-style analytics suite for Galedge covering both uploaded portfolios and strategy backtests. The infrastructure is 70% there. The work is: (1) a background analytics compute engine that pre-computes everything, (2) a cache table, (3) upgraded frontend pages reading from the cache.

---

## Current State

### What already works
- `services/attribution.py` — Brinson + return decomposition (stateless, correct)
- `routers/analytics_router.py` — 3 v1 endpoints (on-the-fly, slow)
- `Portfolio.analytics_status` column exists
- `Backtest.results` JSON stores equity curve + holdings per rebalance
- `FactorExposure`, `FactorReturn`, `StockInfo` (PE, PB, ROE, Beta, MarketCap, sector) — all populated
- All analytics frontend routes exist as real pages (mostly showing placeholder data)
- `TimeSeriesChart`, `BarChartPanel`, `CardControls` components work

### What is missing
1. No pre-computation pipeline — everything computed live = 5-30s per request
2. Sortino, Treynor, Portfolio Concentration, Predicted Risk not computed
3. No rolling metrics time series (rolling Sharpe, rolling vol, rolling beta)
4. Drawdowns computed client-side from 60 sampled points (wrong dates, misses many)
5. Event Sensitivity is 100% hardcoded mock data
6. Slicing & Dicing shows only weights, no returns/risk/Brinson per bucket
7. Strategy backtests not connected to analytics at all
8. No portfolio selector supporting strategies (only uploaded portfolios)
9. No benchmark stored time series (fetched live from yfinance = blocked on server)
10. No historical valuation time series (only latest PE/PB snapshot)

---

## Feature List & Priorities

### P0 — Foundation (blocks everything)
| ID | Feature |
|----|---------|
| F-01 | `analytics_engine.py` — background compute service |
| F-02 | `PortfolioAnalytics` cache table |
| F-03 | Strategy-to-holdings bridge (read rebalance weights from Backtest.results) |
| F-04 | Sortino, Treynor, Beta, Concentration metrics |
| F-05 | Rolling metrics: 252-day rolling Sharpe, vol, beta |
| F-06 | Per-holding return contribution + idiosyncratic return |
| F-07 | Drawdown detection with start/bottom/end dates |
| F-08 | Background compute trigger + status polling UI |
| F-09 | `BenchmarkPrice` table + ingestion (NIFTY 50/500/BANK/MIDCAP/SMALLCAP) |

### P1 — Core Pages
| ID | Feature |
|----|---------|
| F-10 | Portfolio Selector sidebar: nested Fund/Scheme/Iteration for portfolios + strategies |
| F-11 | Performance Summary: 3-column (Active/Benchmark/Comparison), KPI-switchable charts |
| F-12 | Holdings & Factor Summary: time-series weight/exposure charts per selected item |
| F-13 | Period Analysis: real decomposition stacked bar per period |
| F-14 | Returns & Risk: 4 tables, 4 time-series charts, Contributors & Detractors |
| F-15 | Slicing & Dicing: per-bucket return/vol/valuation/Brinson for Market Cap + Sector + Industry |
| F-16 | Drawdown: treemap, per-drawdown decomposition, index comparison chart |

### P2 — Enhanced
| ID | Feature |
|----|---------|
| F-17 | Event Sensitivity: real portfolio return per event window |
| F-18 | Peer Returns & Risks: multi-portfolio comparison with factor breakdown |
| F-19 | Peer Breakdown: market cap split side-by-side for N portfolios |
| F-20 | Predicted Risk from factor covariance |
| F-21 | Historical valuation time series (estimated from price movement) |

### Out of Scope
- Liquidity/IPO/Financial Type/Position Age/Earnings Window buckets (missing data)
- Execution Summary (no actual fills)

---

## Data Model Additions

### `portfolio_analytics` table (new, in `galedge_alpha.db`)

```sql
id                    INTEGER PRIMARY KEY
portfolio_id          INTEGER FK portfolios.id NULLABLE
strategy_id           INTEGER FK strategies.id NULLABLE  
backtest_id           INTEGER FK backtests.id NULLABLE
computed_at           DATETIME
status                TEXT  -- pending | running | ready | failed
error_message         TEXT NULLABLE
params_hash           TEXT  -- detect staleness

-- Scalar metrics (fast access)
total_return_pct      REAL
cagr_pct              REAL
sharpe                REAL
sortino               REAL
treynor               REAL
volatility_pct        REAL
beta                  REAL
max_drawdown_pct      REAL
concentration_hhi     REAL
predicted_risk_pct    REAL
gross_aum_cr          REAL
pe_ratio              REAL
pb_ratio              REAL
roe_pct               REAL

-- Heavy pre-computed blobs
equity_curve          JSON  -- [{date, value, drawdown_pct, cumulative_return_pct}]
daily_returns         JSON  -- [{date, portfolio_return, benchmark_return}]
rolling_metrics       JSON  -- [{date, rolling_sharpe_1y, rolling_vol_1y, rolling_beta_1y}]
factor_returns_ts     JSON  -- [{date, market, style, industry, idio, total}]
holdings_weights_ts   JSON  -- [{date, symbol: weight}] -- at rebalance dates only
factor_exposure_ts    JSON  -- [{date, factor_name: exposure}]
drawdowns             JSON  -- [{id, start, bottom, end, loss_pct, recovery_days}]
period_stats          JSON  -- {monthly:[...], quarterly:[...], annual:[...]}
brinson_overall       JSON  -- {allocation, selection, interaction, by_sector:[...], by_mcap:[...]}
holdings_detail       JSON  -- [{symbol, weight, raw_return_pct, total_return_pct, idio_return_pct, risk_contribution_pct}]
factor_detail         JSON  -- [{factor_type, name, exposure_pct, raw_return_pct, return_pct, risk_contribution_pct}]
mcap_breakdown        JSON  -- [{bucket, weight, return_pct, vol_pct, pe, allocation_effect, selection_effect}]
sector_breakdown      JSON  -- same shape
industry_breakdown    JSON  -- same shape
valuation_ts          JSON  -- [{date, portfolio_pe, portfolio_pb}]
benchmark_curve       JSON  -- [{date, value}]
event_returns         JSON  -- [{name, start, end, portfolio_return_pct, benchmark_return_pct}]
```

### `benchmark_prices` table (new, in `galedge_prices.db`)

```sql
id          INTEGER PRIMARY KEY
index_name  TEXT INDEX  -- "NIFTY 50", "NIFTY 500", "NIFTY BANK", "NIFTY MIDCAP 100", "NIFTY SMALLCAP 100"
date        DATE INDEX
close       REAL
UNIQUE(index_name, date)
```

---

## Backend Endpoints (`/api/analytics/v2/`)

```
POST   /{source}/{source_id}/compute          -- trigger background compute
GET    /{analytics_id}/status                 -- poll: pending|running|ready|failed
GET    /selector                              -- all portfolios+strategies with analytics_id + status

GET    /{analytics_id}/summary                -- all scalar metrics
GET    /{analytics_id}/equity-curve           -- ?downsample=500
GET    /{analytics_id}/rolling-metrics        -- rolling Sharpe/vol/beta time series
GET    /{analytics_id}/factor-returns-ts      -- market/style/industry/idio time series
GET    /{analytics_id}/period-stats           -- ?granularity=monthly|quarterly|annual
GET    /{analytics_id}/drawdowns              -- list of drawdown periods
GET    /{analytics_id}/drawdown/{id}/decomp   -- per-drawdown breakdown
GET    /{analytics_id}/holdings-detail        -- per-stock contributions
GET    /{analytics_id}/factor-detail          -- per-factor contributions
GET    /{analytics_id}/holdings-weights-ts    -- ?symbols=A,B,C
GET    /{analytics_id}/factor-exposure-ts     -- ?factors=BETA,SIZE
GET    /{analytics_id}/slicing                -- ?dimension=market_cap|sector|industry
GET    /{analytics_id}/valuation-ts           -- portfolio PE/PB over time
GET    /{analytics_id}/event-returns          -- returns per predefined event
GET    /{analytics_id}/event/{name}/decomp    -- factor contributors during event
```

---

## Computation Logic

### Holdings Time Series
- **Uploaded portfolio**: forward-fill weights from last upload date
- **Strategy backtest**: read `Backtest.results["rebalances"]` → forward-fill weights between rebalance dates

### P&L Metrics
```python
total_return = (equity[-1] / equity[0]) - 1
years = len(trading_days) / 252
cagr = (1 + total_return) ** (1/years) - 1
sharpe = mean(daily_r) / std(daily_r) * sqrt(252)
sortino = mean(daily_r) / std(daily_r[daily_r < 0]) * sqrt(252)
beta = cov(portfolio_r, benchmark_r) / var(benchmark_r)
treynor = (total_return - 0) / beta  # rf=0 initially
concentration_hhi = sum(weight_i ** 2)
```

### Rolling Metrics
252-day rolling window over `daily_returns`:
- `rolling_sharpe_1y = rolling_mean(252) / rolling_std(252) * sqrt(252)`
- `rolling_vol_1y = rolling_std(252) * sqrt(252)`
- `rolling_beta_1y = rolling_cov(portfolio, benchmark, 252) / rolling_var(benchmark, 252)`

### Return Decomposition Time Series
For each day:
```
portfolio_daily_r = sum(weight_s * daily_return_s)
factor_r_for_stock_s = sum(exposure[s,f] * factor_daily_return[f])
portfolio_factor_r = sum(weight_s * factor_r_for_stock_s)
market_r = weight-sum of MARKET factor contribution
style_r = weight-sum of style factor contributions
industry_r = weight-sum of industry factor contributions
idio_r = portfolio_daily_r - portfolio_factor_r
```

### Per-Holding Attribution
```
raw_return_s = (price_end_s - price_start_s) / price_start_s
total_return_contribution_s = weight_s * raw_return_s
factor_return_s = sum(exposure[s,f] * cumulative_factor_return[f])
idio_return_s = raw_return_s - factor_return_s
risk_contribution_s = weight_s * beta_s * portfolio_var / portfolio_vol
```

### Brinson Attribution (time-weighted)
For each rebalance period [t0, t1], compute:
- `allocation_effect_cat = (wp_cat - wb_cat) * rb_cat`
- `selection_effect_cat = wb_cat * (rp_cat - rb_cat)`
- `interaction_effect_cat = (wp_cat - wb_cat) * (rp_cat - rb_cat)`

Time-weight by `days_in_period / total_days`. Repeat with sector, market cap bucket as grouping.

### Drawdown Detection
```python
cummax = equity_curve.cummax()
dd_series = (equity_curve - cummax) / cummax
# Identify contiguous periods where dd_series < -0.001
# Record: start (last peak), bottom (max loss), end (recovery to 0)
```

### Market Cap Buckets
- Large Cap: MarketCap > 20,000 Cr (`market_cap > 20000 * 1e7` in raw rupees)
- Mid Cap: 5,000–20,000 Cr
- Small Cap: < 5,000 Cr
- Unknown: no data in StockInfo

### Event Library (Python constant + TypeScript constant, shared)
```python
EVENTS = [
    {"name": "COVID Crash", "start": "2020-03-06", "end": "2020-03-24"},
    {"name": "Vaccine & Liquidity Surge", "start": "2020-11-01", "end": "2021-02-28"},
    {"name": "2019 Election Run-up", "start": "2019-03-01", "end": "2019-04-29"},
    {"name": "2024 Pre-election Melt-up", "start": "2023-11-03", "end": "2024-01-31"},
    {"name": "2024 Election Whipsaw", "start": "2024-06-05", "end": "2024-08-03"},
    {"name": "2025 Trump Tariff Shock", "start": "2025-04-02", "end": "2025-04-07"},
    {"name": "Taper Tantrum", "start": "2013-05-22", "end": "2013-09-18"},
    {"name": "IL&FS / NBFC Crisis", "start": "2018-09-01", "end": "2019-03-31"},
    {"name": "Russia-Ukraine Invasion", "start": "2022-02-24", "end": "2022-03-16"},
    {"name": "GST Launch", "start": "2017-07-01", "end": "2017-07-31"},
    {"name": "Modi Wave (2014 Election)", "start": "2014-04-07", "end": "2014-05-26"},
    {"name": "Volmageddon", "start": "2018-02-05", "end": "2018-02-09"},
]
```

---

## Frontend Pages to Build/Upgrade

### New Components
| Component | Purpose |
|-----------|---------|
| `PortfolioSelectorSidebar` | Nested tree: Fund→Scheme→Iteration for portfolios + strategies |
| `AnalyticsStatusBadge` | NOT AVAILABLE / COMPUTING (spinner) / READY |
| `AnalyticsInitiateButton` | Calls compute, polls status |
| `KpiDropdown` | `<Select>` to switch chart metric (Total Return / Rolling Risk / PE Ratio / etc.) |
| `StackedBarChart` | Recharts BarChart with stacking — for period decomposition |
| `TreemapGrid` | CSS grid of colored tiles — for drawdown + event pages |
| `MultiPortfolioPicker` | Chip-based multi-select for peer pages |

### Page Upgrades

**Performance Summary**
- 3-column tables: Active / Benchmark / Comparison (user picks Comparison portfolio)
- Add Sortino, Treynor to P&L table
- Add Beta, Predicted Risk, Concentration to Risk table
- Add PE, PB, ROE to Valuation table
- 3 KPI-switchable charts (replace hardcoded): Total Return% / Rolling 1Y Risk% / PE Ratio

**Holdings & Factor Summary**
- Holdings table: add Raw Return%, Total Contribution%, Idio Return%, Risk Contribution%
- Factor table: add Factor Type, Raw Return%, Risk Contribution%
- Holdings chart: weight-over-time per selected (checkbox) stock
- Factor chart: exposure-over-time per selected factor

**Period Analysis**
- Real period stats from backend (not client-computed)
- Add Sortino, Treynor, Beta columns to period tables
- Statistics panel: Hit Rate, Max/Min, Avg, Median, 25th/75th percentile
- Stacked bar chart: Market/Style/Industry/Idio/Transaction Cost per period

**Returns & Risk**
- 4th table: Brinson Decomposition Summary (Allocation/Selection/Interaction by Market Cap)
- 4 time-series charts: Return Decomp / Predicted Risk / PE Ratio / Allocation Effect
- Contributors & Detractors: Overall/Idio/Factor tabs
- Top 10 Holdings / Bottom 10 Holdings tables
- Top Holdings % chart: top 5/10/20 weight over time

**Slicing & Dicing**
- Active tabs only: Market Cap, Sector, Industry (others → "Coming Soon")
- 4 tables per tab: Return Decomp / Realized Vol / Valuation Ratios / Brinson
- 4 charts per tab: Total Return% / Rolling Risk% / PE Ratio / Allocation Effect%
- All broken by bucket (one line/bar per bucket)
- Contributors & Detractors section

**Drawdowns**
- Add Bottom Date column
- Drawdown Loss treemap (tiles sized by severity, shaded red)
- Click row → load decomposition for that drawdown below
- Drop Detractors + Recovery Contributors tables
- Drawdown Decomposition: switchable (Risk Model / Market Cap / Sector)
- Portfolio vs 5 indices comparison chart during drawdown period

**Event Sensitivity**
- Real portfolio + benchmark returns per event (not mocked)
- Event Returns treemap (green=positive, red=negative, sized by magnitude)
- Click event → Portfolio vs indices table, factor contributors, Top/Bottom 10 factors

**Peer Returns & Risks**
- Use pre-computed analytics instead of live v1 endpoint
- Add factor exposure comparison: Top 10 / Bottom 10 factors per portfolio as grouped bars

**Peer Breakdown**
- Multi-portfolio picker
- 4 charts × N portfolios: Total Return / Rolling Risk / PE Ratio / Allocation Effect
- Each chart: one line per portfolio, broken by Large/Mid/Small cap

**Analytics Selector (main page)**
- Show `PortfolioSelectorSidebar`
- Route to `/analytics/overview/performance` on selection with `analytics_id` in context
- "Initiate Analytics" button when status=NOT AVAILABLE
- Progress indicator when status=running

---

## Build Order

### Sprint 1 — Foundation (Weeks 1-2)
1. `analytics_engine.py` core: holdings bridge, P&L metrics, rolling metrics, drawdowns
2. `PortfolioAnalytics` SQLAlchemy model + `init_db()` migration
3. `BenchmarkPrice` model + ingestion service
4. `/api/analytics/v2/` router: compute trigger, status poll, summary + equity-curve endpoints
5. `portfolio-context.tsx` extension: add `analytics_id`
6. Analytics selector page: status badge + Initiate button

### Sprint 2 — Core Analytics Pages (Weeks 3-4)
1. Return decomposition time series + per-holding attribution
2. Brinson time-weighted full period
3. Remaining v2 endpoints: period-stats, holdings-detail, factor-detail, weights-ts, exposure-ts, valuation-ts
4. Performance Summary upgrade
5. Holdings & Factor Summary upgrade
6. Period Analysis upgrade

### Sprint 3 — Portfolio Analysis Pages (Weeks 5-6)
1. Slicing engine (market cap + sector + industry)
2. v2 endpoints: slicing, drawdowns, drawdown decomp
3. Returns & Risk upgrade
4. Slicing & Dicing upgrade
5. Drawdown upgrade
6. BenchmarkPrice queries for index comparison

### Sprint 4 — Event Sensitivity + Peer (Weeks 7-8)
1. Event returns computation + endpoints
2. Event Sensitivity upgrade
3. Peer Returns & Risks upgrade
4. Peer Breakdown upgrade
5. `PortfolioSelectorSidebar` component
6. Analytics layout with sidebar

---

## Complexity Estimate

~35 developer-days total.
- Backend: ~18 days
- Frontend: ~17 days
- Sprint 1 is the critical path — nothing else works without the compute engine.
