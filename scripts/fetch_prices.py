"""Fetch latest EOD prices for all symbols and export to /tmp/prices_export.csv"""
import sys
sys.path.insert(0, '/Users/vaibhav.shukla/Developer/galedge/backend')

import pandas as pd
import yfinance as yf
from app.services.data_ingestion import ALL_NSE_STOCKS, US_STOCKS

all_symbols = ALL_NSE_STOCKS + US_STOCKS
print(f"Fetching {len(all_symbols)} symbols...", flush=True)

rows = []
BATCH = 50
for i in range(0, len(all_symbols), BATCH):
    chunk = all_symbols[i:i + BATCH]
    print(f"Batch {i//BATCH + 1}/{-(-len(all_symbols)//BATCH)}: {chunk[0]}...", flush=True)
    try:
        df = yf.download(chunk, period="5d", interval="1d", group_by="ticker",
                         progress=False, threads=True, auto_adjust=True)
        if df.empty:
            continue
        for sym in chunk:
            try:
                sym_df = df[sym] if len(chunk) > 1 else df
                sym_df = sym_df.dropna(subset=["Close"])
                for idx, row in sym_df.iterrows():
                    rows.append({
                        "symbol": sym,
                        "date": str(idx.date() if hasattr(idx, "date") else idx),
                        "open": float(row.get("Open", 0)),
                        "high": float(row.get("High", 0)),
                        "low": float(row.get("Low", 0)),
                        "close": float(row.get("Close", 0)),
                        "adj_close": float(row.get("Close", 0)),
                        "volume": int(row.get("Volume", 0)),
                    })
            except Exception as e:
                print(f"  Skip {sym}: {e}", flush=True)
    except Exception as e:
        print(f"Batch failed: {e}", flush=True)

out = pd.DataFrame(rows)
out.to_csv("/tmp/prices_export.csv", index=False)
print(f"Done: {len(out)} rows, {out['symbol'].nunique()} symbols -> /tmp/prices_export.csv", flush=True)
