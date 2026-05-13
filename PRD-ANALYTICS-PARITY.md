# PRD: Analytics Suite — MethodTech Parity

## 1. Active / Benchmark / Main — Why the difference

**Pages with Active + Benchmark + Main** (Performance Summary, Holdings, Period Analysis, Returns & Risk, Event Sensitivity):
- **Main** = your portfolio's absolute values
- **Benchmark** = the index (NIFTY 500) values over same period
- **Active** = Main minus Benchmark (your excess/alpha)

**Pages with Active + Main only** (Peer Comparison, Peer Returns & Risks, Peer Breakdown):
- There is no third "Benchmark" because the PEER IS the comparison entity. On peer pages, "Active" means YOUR portfolio minus the PEER portfolio — not vs an index. Adding a benchmark column would mean 4 entities (you, peer, benchmark, active-vs-peer) which is too much. The peer replaces the benchmark role.

This is logically consistent — on peer pages the peer replaces the benchmark role.

---

## 2. Exact Table Schemas (verified from JSONs)

### All tables share the SAME nested row pattern:
```
Row (expandable [+])
  └── Child row
        └── Grandchild row
```
The `+/-` icon is the expand/collapse toggle. This is the biggest visual gap from MethodTech.

---

### Performance Summary + Returns & Risk + Peer Comparison (same tables, different columns)

**P&L Summary** — Columns: `[Metric, Active, Benchmark, Main]` (or portfolio names for peer pages)

```
Total Return (%)                [+]   82.38    121.38    203.76
  Idiosyncratic Return (%)           18.22    -24.52     -6.30
  Factor Return (%)             [+]  73.89    145.85    219.74
    Market Return (%)                12.47    168.83    181.30
    Style Return (%)                 49.65     -4.20     45.45
    Industry Return (%)              11.77    -18.79     -7.02
  Dividend Return (%)                 0.00      0.00      0.00
  Other Return (%)                   -9.73      0.05     -9.68
  Transaction Cost (%)          [+]   0.00      0.00      0.00
    Market Impact (%)                 0.00      ...
    Spread (%)                        0.00      ...
    Brokerage and Fees (%)            0.00      ...

CAGR (%)                        [+]  11.10     14.93     21.48
  (same decomposition as Total Return)

Sharpe Ratio                    [+]   0.97      0.85      1.11
  Idiosyncratic Sharpe Ratio          0.18     -1.58     -0.44
  Factor Sharpe Ratio           [+]   1.32      1.01      1.28
    Market Sharpe Ratio               0.67      1.16      1.14
    Style Sharpe Ratio                0.94     -0.29      0.86
    Industry Sharpe Ratio             0.66     -2.88     -0.10

Sortino Ratio                   [+]   1.42      0.94      1.22
  (same decomposition as Sharpe)

Treynor Ratio                         1.49      0.17      0.24

Execution Summary               [+]   (empty header row)
  Annualized Turnover                  3.20      0.45      3.20
  Total Transaction Cost (bps) [+]    0
    Market Impact Cost (bps)          0
    Spread Cost (bps)                 0
    Brokerage and Fees (bps)   [+]    0
      Brokerage (bps)                 0
      Exchange Charges (bps)          0
      SEBI Charges (bps)              0
      Stamp Charges (bps)             0
      STT Fees (bps)                  0
      GST (bps)                       0
```

**Risk Summary** — Columns same:
```
Beta                                   0.05      0.90      0.87

Realized Risk (%)               [+]   7.19     17.92     18.86
  Idiosyncratic Realized Risk (%)     4.23      1.66      4.04
  Factor Realized Risk (%)      [+]   5.40     17.79     18.46
    Market Realized Risk (%)          1.90     17.74     17.63
    Style Realized Risk (%)           4.41      1.72      4.25
    Industry Realized Risk (%)        2.64      0.75      2.49

Total Predicted Risk (%)        [+]   6.07     16.06     16.83
  Idiosyncratic Predicted Risk (%)    3.95      2.17      3.85
  Factor Predicted Risk (%)     [+]   4.54     15.88     16.38
    Market Predicted Risk (%)         0.13     15.97     15.85
    Style Predicted Risk (%)          3.72      1.79      3.70
    Industry Predicted Risk (%)       2.60      0.87      2.57

Risk Contribution (%)           [+]   (empty header)
  Idiosyncratic Risk Contribution (%) 43.27      2.51      5.39
  Factor Risk Contribution (%)  [+]  56.73     97.49     94.61
    Market Risk Contribution (%)      0.83     96.97     88.66
    Style Risk Contribution (%)      38.30      0.42      4.39
    Industry Risk Contribution (%)   17.60      0.11      1.57

Portfolio Concentration         [+]   (empty header)
  Top Holdings (%)              [+]
    Top 5 Holdings (%)               16.29     25.64     20.82
    Top 10 Holdings (%)              27.59     35.95     40.53
    Top 20 Holdings (%)              46.19     48.81     73.63
  Top Total Risk Contribution (%) [+]
    Top 5 Total Risk Contribution (%) 41.08    25.77     25.77
    Top 10 ...                        62.01    36.06     46.45
    Top 20 ...                        89.07    48.92     77.30
  Top Idiosyncratic Risk Contribution (%) [+]
    Top 5 ...                         37.76    43.59     35.85
    Top 10 ...                        55.84    56.01     58.45
    Top 20 ...                        75.95    70.09     85.70
  Top Factor Risk Contribution (%) [+]
    Top 5 ...                         72.83   103.09    102.95
    Top 10 ...                        92.43   104.36    105.92
    Top 20 ...                       103.23   105.04    106.98

Gross AUM (INR cr)                  780.60   810.13    780.60
Unlevered AUM (INR cr)              780.60   810.13    780.60
```

**Valuation Summary**:
```
PE Ratio              18.40   25.68   19.62
P/B Ratio              2.81    2.94    3.60
Return on Equity (%)  15.22   10.49   15.40
```

---

### Holdings Summary

**Holdings table** — Columns:
`[Symbol, Holdings(%), Raw Return(%), Total Return(%), Total Risk Contribution(%), Idio Raw Return(%), Idio Return(%), Idio Risk Contribution(%)]`

One row per stock (flat, no nesting). Sorted by Holdings% descending.

**Factor Summary** — Columns:
`[Factor Type, Factor Name, Factor Exposure(%), Factor Raw Return(%), Factor Return(%), Factor Risk Contribution(%)]`

Rows: one per factor. Factor Type = Market / Style / Industry.
Sorted by Factor Exposure% descending.

---

### Period Analysis

**P&L Summary** — Columns: `[Metric, 2020, 2021, 2022, 2023, 2024, YTD]`

Same nested row structure as Performance Summary P&L table, but one column per calendar year instead of Active/Benchmark/Main.

```
Total Return (%)     [+]  15.94   28.57    1.66   41.18   31.76    5.60
  Idio Return (%)        -5.93   -3.99   -5.31    2.27    3.73    0.20
  Factor Return (%) [+]  22.74   33.68    7.92   39.89   29.13    6.10
    Market Return (%)    22.10   35.01    6.08   29.47   19.78    6.30
    Style Return (%)     -0.75    0.63    2.69    9.73    7.84    2.93
    Industry Return (%)   1.39   -1.96   -0.86    0.68    1.51   -3.13
CAGR (%)             [+]  (same decomposition)
Sharpe Ratio         [+]  (same decomposition)
...
```

**Risk Summary** — same per-year columns.

**P&L Statistics** — Distribution stats table (need screenshot to confirm exact rows).

---

### Event Sensitivity

**Event Sensitivity Summary** — Columns: `[Event Name, Start Date, End Date, Event Return(%)]`

19 events (full list):
- Policy 'bazooka' rebound (Apr-May 2020)
- 2024 Pre-election melt-up (Nov 2023 - Jan 2024)
- 2024 election whipsaw & rebound (Jun-Aug 2024)
- 2025 Trump Tariff Shock (Apr 2025)
- COVID crash (Feb-Mar 2020)
- China devaluation / Black Monday spillover (Jun-Jul 2015)
- China slowdown / 2016 global lows (Dec 2015 - Jan 2016)
- Demonetisation shock (Nov 2016 - Jan 2017)
- Earnings/liquidity melt-up (Jul-Aug 2021)
- GST passage + global risk-on (Apr-May 2017)
- IL&FS / NBFC liquidity squeeze (Sep-Oct 2018)
- Late-2024 to early-2025 valuation reset (Sep 2024 - Mar 2025)
- Modi Wave' election run-up (Mar-Apr 2014)
- Reform push + global QE3 (Aug-Sep 2012)
- Russia-Ukraine invasion & Fed liftoff shock (Jan-Jun 2022)
- Taper tantrum / INR & EM sell-off (Jun-Jul 2013)
- Vaccine & liquidity surge (Nov-Dec 2020)
- Volmageddon + LTCG overhang / smallcaps (Jan-Mar 2018)
- 2019 election run-up (Mar-Apr 2019)

**Portfolio & Common Index Returns** (per-event drill-down) — Columns: `[Portfolio/Index Name, Event Return(%)]`

Rows:
- Your Portfolio Return (%)
- NIFTY BANK
- NIFTY 500
- NIFTY MIDCAP 100
- NIFTY SMALLCAP 100
- NIFTY 50

**Contributors and Detractors** (per-event drill-down):
- Factor Return table: Factor Type, Factor Name, Factor Raw Return(%), Factor Exposure(%)
- Top/Bottom factor bar charts

---

### Contributor / Detractor (Returns & Risk page)

Three tabs: **Overall / Idio / Factor**

Each tab has:

| Tab | Top 10 Columns | Bottom 10 Columns |
|---|---|---|
| Overall | Symbol, Holdings%, Raw Return%, Total Return%, Total Risk Contribution% | same |
| Idio | Symbol, Holdings%, Idio Raw Return%, Idio Return%, Idio Risk Contribution% | same |
| Factor | Symbol, Factor Exposure%, Factor Raw Return%, Factor Return%, Factor Risk Contribution% | same |

Plus a bar chart: Top Holdings (%) by the relevant metric.

---

### Peer Comparison & Peer Returns & Risks

Same P&L / Risk / Valuation tables but:
- Columns are portfolio/strategy names instead of Active/Benchmark/Main
- "Active" tab = values for your portfolio vs peer (excess)
- "Main" tab = absolute values for both portfolios side by side

Example:
```
Columns: [Metric, Bandhan-MultiFactorBT, MethodTech-MultiFactorBT:1.0]
Total Return (%) [+]:  203.76    229.26
  Idio Return (%):      -6.30     -8.03
  Factor Return (%)[+]: 219.74   250.38
    Market Return (%):  181.30   195.19
    ...
```

---

## 3. What We Have vs What's Missing

| Feature | Galedge Today | Gap |
|---|---|---|
| Active/Benchmark/Main toggle | ❌ None | Full build needed |
| Expandable nested table rows | ❌ Flat rows only | Tree table component needed |
| P&L: Total Return, CAGR, Sharpe | ✅ Partial | Missing Sortino, Treynor, Dividend, Transaction Cost |
| P&L: Factor decomposition (Market/Style/Industry/Idio) | ✅ Have data | Not shown in tables |
| P&L: Execution Summary section | ❌ None | Need turnover + cost tracking |
| Risk: Realized Risk + decomposition | ✅ Partial | Missing decomposition display |
| Risk: Predicted Risk | ❌ None | Requires covariance matrix |
| Risk: Portfolio Concentration (Top 5/10/20) | ❌ None | Computable from holdings data |
| Valuation: PE, PB, ROE | ✅ Have | Already in DB |
| Holdings table | ✅ Close | Missing Idio Raw Return column |
| Factor Summary | ✅ Good | Already implemented |
| Period Analysis: per-year columns | ❌ None | Need per-year analytics compute |
| Event Sensitivity: Common Index Returns table | ❌ None | Have price data for indices |
| Event Sensitivity: Factor Contributors table | ❌ None | Have factor data |
| Peer Comparison: multi-portfolio column tables | ❌ None | Need peer data fetch |
| Contributor/Detractor: Top/Bottom 10 per tab | ⚠️ Partial | Need Idio + Factor tabs |

---

## 4. What's Computable From Our Data Right Now

### Can compute immediately:
- **Sortino Ratio** — return / downside deviation (from price data)
- **Treynor Ratio** — return / beta (have beta from factor model)
- **Portfolio Concentration** — Top 5/10/20 holdings % (from holdings weights)
- **Factor decomposition of all metrics** — have factor_returns + factor_exposures
- **Event returns for common indices** — have price data for NIFTY 50, 500, MIDCAP, SMALLCAP
- **Per-year P&L breakdown** — slice equity_curve by calendar year
- **Idiosyncratic vs Factor risk contribution split** — already computing this
- **Annualized Turnover** — can track from rebalance data

### Cannot compute without new infrastructure:
- **Predicted Risk** — needs full factor covariance matrix (complex quantitative finance)
- **Transaction cost decomposition** (Market Impact, Spread, Brokerage) — don't track granularly
- **Dividend Return separately** — prices are total return; dividends implicit

---

## 5. Priority Order

### Phase 1 — Foundational (prerequisite for everything)
1. **Tree table component** with expandable/collapsible rows — affects ALL pages
2. **Active/Benchmark/Main toggle** on analytics pages

### Phase 2 — High value, computable now
3. P&L Summary: add Sortino, Treynor, full factor decomposition (Market/Style/Industry/Idio)
4. Risk Summary: add Portfolio Concentration, full risk decomposition display
5. Event Sensitivity: add Common Index Returns table per event
6. Contributor/Detractor: proper Top/Bottom 10 per Overall/Idio/Factor tab

### Phase 3 — Requires more backend compute
7. Period Analysis: per-year P&L columns (yearly analytics)
8. Peer Comparison: multi-portfolio column tables
9. Peer Returns & Risks: all tables with peer columns

### Phase 4 — Hard / deprioritize
10. Predicted Risk (covariance matrix — weeks of work)
11. Transaction cost detail (no source data currently)

---

## 6. Open Questions

1. **Peer comparison data source**: MethodTech compares against OTHER funds/users' portfolios. On Galedge, peer comparison would be between your own portfolios or strategies — is that the intended use case, or should external portfolios/benchmarks be peers too?

2. **Period Analysis columns**: MethodTech shows calendar years (2020, 2021…). Do you want calendar years or rolling 12-month periods?

3. **Screenshots needed**:
   - Period Analysis — P&L Statistics table (third table, distribution stats)
   - Contributor/Detractor — Top 10 table fully expanded (Overall tab)
   - Peer Breakdown — any tab other than Market Cap

4. **Scope for Phase 1**: Should we start with ONLY the tree table + toggle across existing pages before adding new metrics, or build both in parallel?

---

## 7. Notes on JSON Data Sources

Files parsed from `mt-data/`:
- `overview/performance-summary.json` — 923KB
- `overview/holding-summary.json` — 858KB
- `overview/peer-comparison.json` — 2.2MB
- `overview/period-analysis.json` — 247KB
- `portfolio-analysis/returns-and-risks.json` — 2.9MB
- `portfolio-analysis/event-sensitivity.json` — 1.9MB
- `peer-intelligence/peer-returns-and-risks.json` — 4.2MB
- `peer-intelligence/peer-breakdown.json` — 4.7MB

**Not parsed** (excluded per user instruction):
- `portfolio-analysis/slicing-and-dicing.json`
- `portfolio-analysis/drawdowns.json`

The JSONs are structured as `{ Active: {...}, Benchmark: {...}, Main: {...} }` for pages with the toggle, and `{ Active: {...}, Main: {...} }` for peer pages. Chart data is time-series heavy (bulk of the file size). Table data is compact and was fully extracted above.

---

## 8. Answers to Open Questions (Updated)

### Peer Comparison Data Source
Peers can be: your own other portfolios, your strategies (with backtests), AND external benchmarks (NIFTY 50, NIFTY 500, etc. as peers). All three types in the same comparison.

### Period Analysis Columns
Calendar years (2020, 2021, 2022...) same as MethodTech. May change to rolling later but start with calendar years.

### Screenshots Confirmed

**P&L Statistics table (Period Analysis - 3rd table)**
- Title: "Profit and Loss Statistics - Total Return (%)"  
- Columns: `[metric, Active]` (single value column, no Benchmark/Main)
- Has own KPI dropdown switching between: Total Return (%), Idio Return (%), Factor Return (%), Market Return (%), Style Return (%), Industry Return (%), Transaction Cost (%)
- Rows:
  ```
  Hit Rate (%)                    [+]  83.33%
    Positive Periods Count              5
    Negative Periods Count              1
    Total Periods                       6
  Max Period Return                    20.32
  Min Period Return                    -3.20
  Average Return Across Periods        6.75
  Median Return Across Periods         1.75
  25th Percentile Return               0.29
  75th Percentile Return              15.51
  ```

**Contributor/Detractor Top 10 (Overall tab)**
- Flat table (no nesting) 
- Title: "Top 10 - Holdings (%)"
- Columns: `[Symbol, Holdings(%), Raw Return(%), Total Return(%), Total Risk Contribution(%)]`
- KPI dropdown switches the sort/rank metric: Holdings(%), Raw Return(%), Total Return(%), Total Risk Contribution(%)

**Peer Breakdown tabs (Liquidity, Total Risk, Idiosyncratic Risk)**

Each tab follows identical layout: 4 tables (top row) + 4 charts (bottom row)

Tables — Columns: `[Bucket, Portfolio1, Portfolio2]`

Bucket values per tab:
- Liquidity: High, Medium, Unknown
- Total Risk: High, Low, Medium, Unknown  
- Idiosyncratic Risk: High, Low, Medium, Unknown
- Sector: sector names (Energy, IT, Financials…)
- Industry: industry names
- Market Cap: Large Cap, Mid Cap, Small Cap, Unknown

Each tab has 4 tables with different KPIs:
1. Total Return (%) table — shows return per bucket for each portfolio
2. Beta table — shows beta per bucket
3. PE Ratio table — shows PE per bucket
4. Brinson Decomposition table — shows Allocation Effect per bucket

Charts (4 per tab, dual-line — one per portfolio):
1. Total Return time series per bucket (with Level 2 KPI selecting bucket)
2. Rolling 1Y Risk time series per bucket
3. PE Ratio time series per bucket
4. Allocation Effect time series per bucket

---

## 9. Implementation Plan (Confirmed Phase Order)

### Phase 1A: Core UI Primitives (no backend changes)
1. **AnalyticsTreeTable component** — reusable expandable row table  
   - expand/collapse with +/- toggle per row
   - configurable columns
   - nested depth indentation
   - supports Active/Benchmark/Main as column headers
2. **ViewToggle component** — Active / Benchmark / Main segmented control
   - Active/Main only variant (for peer pages)
   - Active/Benchmark/Main variant (for non-peer pages)

### Phase 1B: Performance Summary Rebuild
Replace stat cards with AnalyticsTreeTable.
Use existing `analyticsData` for initial rows (total return, CAGR, Sharpe, max DD).
Toggle shows/hides Benchmark column based on existing `benchmark_*` fields in pnl_metrics.

### Phase 2A: Backend Metric Additions (analytics_engine.py)
New fields to add to `pnl_metrics`:
- `sortino_ratio` — return / downside std * sqrt(252)
- `treynor_ratio` — annualized_return / portfolio_beta
- `market_return_pct` — cumulative from factor_decomp_ts daily market returns
- `style_return_pct` — cumulative from factor_decomp_ts
- `industry_return_pct` — cumulative from factor_decomp_ts  
- `idio_return_pct` — cumulative from factor_decomp_ts
- `factor_return_pct` — market + style + industry

### Phase 2B: Full P&L Tree Table
With Phase 2A backend data, populate the full nested tree:
Total Return → [Idio, Factor [→ Market, Style, Industry], Dividend, Other, Transaction Cost]
Same for CAGR, Sharpe, Sortino, Treynor.

### Phase 3: Risk Summary + Period Analysis
Risk tree table (Beta, Realized Risk, Predicted Risk, Risk Contribution, Portfolio Concentration).
Period Analysis with per-year columns + P&L Statistics table.

### Phase 4: Holdings + Event Sensitivity Upgrades
Holdings with all columns. Event sensitivity Common Index Returns table.

### Phase 5: Peer pages
Peer Comparison with multi-portfolio columns. Peer Breakdown with 10 tabs.
