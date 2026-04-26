# Galedge Alpha — Comprehensive UI Fixes Plan

## Priority 1: Critical — Pages that don't work at all

### 1.1 Remove ALL hardcoded/dummy data
Every page currently shows hardcoded sample data that confuses users into thinking they created it.

**Pages affected:**
- `/alpha-machine` — 9 hardcoded screens + 1 backtest in Screener/Factors tab
- `/alpha-machine/upload-factors` — 6 hardcoded user alphas + 6 standard alphas
- `/strategy-builder` — 3 hardcoded backtests + 1 sample strategy + 1 archived production
- `/portfolio-construction/select` — 1 hardcoded "Taurus ELSS" portfolio
- `/analytics` — 12 hardcoded portfolio entries

**Fix:** Replace ALL hardcoded data with API calls. Show "No records" when empty. Add "Create New" buttons.

### 1.2 Make CRUD actually work (with auth)
Currently: edit/delete/modify buttons do nothing.

**Fix for each module:**
- Alpha Machine screens: Wire edit (pencil), delete (trash) to API. Add "Create New Screen" button.
- Alpha Machine models: Wire to API. Add "Create New" button.
- Upload Factors: Wire upload dialog to actually POST file. Wire delete buttons.
- Strategy Builder: Wire edit/delete/production toggle to API. Add "Build New Strategy" link.
- Portfolio Construction: Wire Proceed button, delete, modify to API.
- Analytics: Wire portfolio list to API.

### 1.3 Portfolio Construction — make functional
- Select Portfolio: Wire Fund/Scheme dropdowns to fetch from `/api/portfolios`
- Upload Portfolio: Wire Browse Files to actual file upload + POST to `/api/portfolios/{id}/upload-holdings`
- Proceed button: Navigate to analytics with selected portfolio

### 1.4 Alpha Machine Build Model — make Compute work
- Wire "Compute" button to POST `/api/alpha/models` 
- Show progress/results after computation
- Factor selection dropdowns should populate from available factors

### 1.5 Code Editor — show "Coming Soon" or embed Monaco
- Currently misleading — shows "Start Coding" but nothing happens
- Quick fix: Show "Coming Soon — Python sandbox environment" message
- Future: Embed Monaco editor or link to JupyterHub

## Priority 2: Risk Model fixes

### 2.1 Factor Summary — INEC2 fails
- Only INEC1 has data. When INEC2 selected, show "No data for INEC2. Only INEC1 is available."
- OR auto-build INEC2 if selected

### 2.2 Factor Correlation Time Series — no way to select factors
- Add two dropdown selectors above the chart: "Factor 1" and "Factor 2"
- Compute rolling correlation between selected factors
- Wire to API or compute client-side from factor returns

### 2.3 Correlation heatmap — doesn't fit card
- Add `overflow-x-auto` and responsive sizing
- Reduce font size on small screens

### 2.4 Stock Summary — same data for INEC1/INEC2
- Same fix as 2.1 — only one model exists

### 2.5 Stock Summary — search/autocomplete not working
- Wire the search input to yfinance search API
- Allow adding stocks from search results

### 2.6 Download Raw Data button — not working
- Wire to CSV export: download the factor table as CSV

### 2.7 CardControls (filter, info, expand, download) — all non-functional
- Filter: Show filter dropdown (if applicable) 
- Info: Show tooltip with description
- Expand: Toggle fullscreen modal for the chart/table
- Download: Export chart data as CSV

**Quick fix for all:** Make Download actually download CSV. Info shows a tooltip. Filter/Expand show "Coming soon" toast.

## Priority 3: Strategy Builder fixes

### 3.1 Strategy Builder Home — remove dummy data
- Fetch strategies from GET `/api/strategies/` (requires auth)
- Show empty state with "Build New Strategy" button

### 3.2 Build Strategy — Configure Backtest dialog
Match MethodTech's backtest dialog:
- Regular Interval / Specified Dates tabs
- Stop Loss section (collapsible): Total Stop Loss + Residual Stop Loss fields
- Burn-in and Chunking section (collapsible): max chunks, min per chunk, burn-in
- Run Full Backtest button

### 3.3 Build Strategy — Additional Analytics dialog
- Add factor multi-select (user created + screener factors)
- Wire to factor list from API

### 3.4 Build Strategy — flow
- Remove "Build Strategy" button (redundant)
- "Compute 1-Day Results" → runs quick backtest → shows 1-day analytics
- "Configure Backtest" → full dialog → "Run Full Backtest" → shows full analytics
- After backtest, navigate to analytics page for this strategy

## Priority 4: Analytics fixes

### 4.1 Period selector — not functional
- Wire period buttons to filter data by date range
- Custom Periods: show date picker dialog

### 4.2 Tab navigation — doesn't navigate
- Performance Summary / Peer Comparison / Holdings Summary tabs should navigate to respective pages
- Wire with `router.push()`

### 4.3 Contributors and Detractors tabs — don't switch
- Overall / Idio / Factor tabs should show different data views
- Wire tab switching to filter the table data

### 4.4 Missing Analytics pages (from MethodTech)
- `/analytics/overview/period-analysis` — Period Analysis page
- `/analytics/peer-intelligence/peer-breakdown` — Peer Breakdown page
- These exist in MethodTech but we haven't built them

### 4.5 Analytics sidebar — portfolio selector
MethodTech has a left sidebar in Analytics showing:
- Portfolio selector (Fund > Scheme hierarchy)
- CAGR, Sharpe, Treynor per scheme
- Add Portfolio / Edit Portfolio links
- This drives which portfolio's analytics are displayed

**Fix:** Add a portfolio context that determines which portfolio analytics are shown. Left panel with fund/scheme selector.

## Priority 5: Polish

### 5.1 Optimizer — add usage guide
- Add help text explaining the workflow
- Tooltip on "Run Optimization" explaining inputs

### 5.2 All pages — consistent empty states
- When no data: show icon + message + action button
- No hardcoded placeholder data anywhere

## Execution Order

1. Remove ALL dummy data, add empty states + "Create" buttons (30 min)
2. Wire CRUD operations with auth for all modules (2 hrs)
3. Fix Risk Model pages (factor selector, correlation, heatmap fit) (1 hr)
4. Fix Strategy Builder dialog to match MethodTech (1 hr)
5. Fix Analytics tab navigation + period selector (1 hr)
6. Add analytics portfolio selector sidebar (1 hr)
7. Code Editor "Coming Soon" state (10 min)
8. CardControls — Download as CSV + Info tooltips (30 min)
