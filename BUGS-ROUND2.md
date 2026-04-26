# Galedge Alpha — Bug Fixes Round 2

Every single issue from user's testing session, saved for reference.

## 1. INEC2 should auto-build, not show error
- When INEC2 selected on Factor Summary, auto-trigger POST /api/data/risk-model/build?model_name=INEC2
- Show loading state while building, then display data

## 2. Stock Summary — exposure table doesn't update with new stocks
- Newly added stocks show 0.00 for all factors (they're not in the factor model)
- Only .NS stocks have exposure data — US stocks (AAPL) won't have exposures
- Fix: filter out stocks with all-zero exposures, show message for non-Indian stocks
- Table needs overflow-x-auto for horizontal scroll when many stocks
- When all stocks removed, table should show empty state, not stale data

## 3. Return Decomposition shows only one stock name
- The chart title says "Return Decomposition — Select stock" when no stocks
- Should update title with first selected stock
- Chart data is static/fake — should reflect selected stocks

## 4. Login broken — shows [object Object],[object Object]
- The error display is rendering objects instead of strings
- Fix: in login page, ensure error state is always a string, not an object
- Parse error response properly: `err.detail` or `JSON.stringify(err)`

## 5. Build Screen — Compute & Save doesn't save screen
- Verify Query works ✓
- Compute & Save runs the query but doesn't POST to /api/alpha/screens
- Fix: after computing, also POST to save the screen (requires auth)
- Then the screen should appear on /alpha-machine home page

## 6. Build Screen — Library/Metric/Operator tabs show same content
- All 3 tabs show the same metrics list
- Library: should show all metrics
- Metric: should show metric details/description when one is selected
- Operator: should show available operators (AND, OR, >, <, >=, <=, ==, !=)

## 7. Build Alpha Model — "Please login first" before showing modal
- Check auth BEFORE opening the dialog, redirect to /login if not authenticated
- Also verify the Compute actually creates and saves the model via API

## 8. Upload Factors — Save Alpha doesn't work
- File upload + save should POST to /api/alpha/upload-factor
- Also add download template button (CSV format)

## 9. Upload Portfolio — shows "Please log in" AFTER filling form
- Check auth on page load, redirect to /login if not authenticated
- Don't let user fill the form only to get rejected

## 10. Strategy Builder Build — Constraint/Objective values
- After adding a constraint (e.g., Factor Exposure), need input fields for values
- Currently constraint is added as a row but no way to enter lower/upper bounds
- Additional Analytics selections should persist and show as badges

## 11. Strategy Builder — Run Full Backtest / Compute 1-D verification
- Need to verify these actually call the API and show results
- After backtest, should show analytics link

## 12. Analytics Performance Summary — tab layout shift
- When switching tabs (Performance/Peer/Holdings), the tab bar shifts right
- Fix: use controlled tabs with proper widths, or navigate via router instead of tabs

## 13. Analytics Performance Summary — date range/Custom Periods
- Period buttons (1D, 1M, 3M, etc.) don't filter data
- Custom Periods dropdown needs: Create Period Set dialog with named date ranges
- Match MethodTech's design exactly

## 14. Analytics Holdings Summary — Update Graph button
- Button exists but doesn't do anything
- Should re-render the holdings chart with selected/filtered holdings

## 15. Analytics Returns & Risk — Active/Benchmark/Excess tabs
- These tabs don't switch content
- Should filter the summary tables to show only Active, Benchmark, or Excess view

## 16. Analytics Returns & Risk — Contributors chart doesn't update with tab
- Top Holdings (%) bar chart should show different data for Overall/Idio/Factor

## 17. Peer Intelligence — tabs don't work
- "Peer Returns and Risks" / "Peer Breakdown" tabs should navigate

## 18. CardControls — filter/info/expand/download not working ANYWHERE
- These appear on every chart/table card but do nothing
- Download: should export the card's data as CSV
- Info: show tooltip describing the chart
- Filter: show filter options or "coming soon"
- Expand: fullscreen the card

## 19. Refresh/Download buttons not working throughout
- "Refresh" buttons on various pages should re-fetch data
- "Download Raw Data" buttons should export as CSV

## Execution Priority
1. Fix login error display (blocks everything)
2. Auth guard on protected pages (redirect to login before showing form)
3. Build Screen save to API
4. Stock Summary fixes (table, empty state)
5. INEC2 auto-build
6. Analytics tab navigation + period selector
7. Strategy Builder constraint values
8. CardControls functionality
