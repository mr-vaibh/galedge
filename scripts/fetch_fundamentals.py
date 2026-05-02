"""Fetch fundamental data for all symbols and export to /tmp/fundamentals_export.csv.
Standalone — runs on GitHub Actions or locally. No app imports needed.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import pandas as pd
import yfinance as yf
from symbols import ALL_SYMBOLS

FIELDS = {
    "pe": "trailingPE",
    "forward_pe": "forwardPE",
    "pb": "priceToBook",
    "ps": "priceToSalesTrailing12Months",
    "peg": "pegRatio",
    "ev_ebitda": "enterpriseToEbitda",
    "dividend_yield": "dividendYield",
    "roe": "returnOnEquity",
    "roa": "returnOnAssets",
    "profit_margin": "profitMargins",
    "operating_margin": "operatingMargins",
    "gross_margin": "grossMargins",
    "revenue_growth": "revenueGrowth",
    "earnings_growth": "earningsGrowth",
    "eps": "trailingEps",
    "debt_to_equity": "debtToEquity",
    "current_ratio": "currentRatio",
    "free_cash_flow": "freeCashflow",
    "book_value": "bookValue",
    "beta": "beta",
    "revenue": "totalRevenue",
    "net_income": "netIncomeToCommon",
    "high_52w": "fiftyTwoWeekHigh",
    "low_52w": "fiftyTwoWeekLow",
    "name": "shortName",
    "sector": "sector",
    "industry": "industry",
    "market_cap": "marketCap",
}

rows = []
print(f"Fetching fundamentals for {len(ALL_SYMBOLS)} symbols...", flush=True)

for i, sym in enumerate(ALL_SYMBOLS):
    try:
        info = yf.Ticker(sym).info
        row = {"symbol": sym}
        for col, key in FIELDS.items():
            val = info.get(key)
            row[col] = val if val is not None else None
        rows.append(row)
        if i % 50 == 0:
            print(f"  {i}/{len(ALL_SYMBOLS)}: {sym}", flush=True)
    except Exception as e:
        rows.append({"symbol": sym})
        print(f"  Skip {sym}: {e}", flush=True)

df = pd.DataFrame(rows)
df.to_csv("/tmp/fundamentals_export.csv", index=False)
print(f"Done: {len(df)} symbols → /tmp/fundamentals_export.csv", flush=True)
