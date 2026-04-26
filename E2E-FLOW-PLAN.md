# End-to-End Flow: Upload Portfolio → Backtest → Real Analytics

## The Flow

```
1. User uploads portfolio CSV (/portfolio-construction/upload)
   → Creates portfolio in DB + uploads holdings
   → Redirects to /portfolio-construction/select

2. User clicks "Run Analytics" on a portfolio (/portfolio-construction/select)
   → Triggers POST /api/backtest/run with portfolio holdings
   → Saves backtest results to DB
   → Redirects to /analytics/overview/performance?portfolio_id=X

3. Analytics pages fetch REAL data (/analytics/overview/performance?portfolio_id=X)
   → GET /api/analytics/performance/{portfolio_id} returns real P&L, risk, metrics
   → GET /api/analytics/holdings/{portfolio_id} returns real holdings
   → GET /api/analytics/return-decomposition/{portfolio_id} returns factor attribution
   → Charts plot REAL equity curve, drawdown, return decomposition
```

## What Needs to Change

### Backend
1. POST /api/backtest/run — accept portfolio_id, use holdings as universe, save results
2. GET /api/analytics/performance/{portfolio_id} — compute P&L from price data
3. Store backtest equity curve + trades in the Backtest model results JSON

### Frontend
1. Portfolio Select page — add "Run Analytics" button per portfolio
2. All analytics pages — read portfolio_id from URL search params
3. Performance Summary — fetch from /api/analytics/performance/{portfolio_id}
4. Holdings Summary — fetch from /api/analytics/holdings/{portfolio_id}
5. Portfolio context — store selected portfolio_id globally

## Files to Change
- backend/app/routers/backtest_router.py — add portfolio-based backtest
- backend/app/routers/analytics_router.py — compute real performance metrics
- frontend/src/app/portfolio-construction/select/page.tsx — add Run Analytics
- frontend/src/app/analytics/overview/performance/page.tsx — real data
- frontend/src/lib/portfolio-context.tsx — global portfolio selection
