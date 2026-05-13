"""Fetch news, recommendations, financial statements, and options snapshots via yfinance.
Runs on GitHub Actions (not IP-blocked there). Exports to /tmp/intel_export.json.
"""
import sys, os, json, time
sys.path.insert(0, os.path.dirname(__file__))

import yfinance as yf
import pandas as pd
from symbols import ALL_SYMBOLS, US_STOCKS
from datetime import date

today = str(date.today())
results = {
    "date": today,
    "news": [],
    "recommendations": [],
    "financials": [],   # income_statement, balance_sheet, cashflow + quarterly variants
    "options": [],      # nearest-expiry snapshot for US stocks only
}

def df_to_records(df):
    """Convert a financial statement DataFrame to a list of period dicts."""
    if df is None or df.empty:
        return []
    records = []
    for col in df.columns:
        row = {"period": str(col.date() if hasattr(col, 'date') else col)[:10]}
        for idx in df.index:
            val = df.loc[idx, col]
            if pd.notna(val):
                row[str(idx)] = float(val)
        records.append(row)
    return records

print(f"Fetching intel for {len(ALL_SYMBOLS)} symbols...", flush=True)

for i, sym in enumerate(ALL_SYMBOLS):
    if i % 50 == 0:
        print(f"  {i}/{len(ALL_SYMBOLS)}: {sym}", flush=True)
    try:
        t = yf.Ticker(sym)

        # ── News (filtered to this stock only) ──────────────────────────────
        try:
            # Tokens to match: full symbol + base without exchange suffix
            sym_tokens = {sym.upper(), sym.replace(".NS", "").replace(".BO", "").upper()}
            added = 0
            for item in (t.news or []):
                if added >= 5:
                    break
                c = item.get("content", {})
                title = c.get("title", "")

                # Check relatedTickers field — most reliable signal
                related_syms = {
                    (r.get("symbol") or "").upper()
                    for r in c.get("relatedTickers", [])
                }
                is_related = bool(sym_tokens & related_syms)

                # Fallback: company base name appears in title
                if not is_related:
                    base = sym.replace(".NS", "").replace(".BO", "").upper()
                    is_related = base in title.upper()

                if not is_related:
                    continue  # skip generic market news

                results["news"].append({
                    "symbol": sym, "fetched_at": today,
                    "title": title[:500],
                    "publisher": c.get("provider", {}).get("displayName", "")[:100],
                    "link": (c.get("canonicalUrl") or {}).get("url", "")[:1000] if isinstance(c.get("canonicalUrl"), dict) else "",
                    "published_at": c.get("pubDate", "")[:50],
                })
                added += 1
        except Exception:
            pass

        # ── Recommendations ─────────────────────────────────────────────────
        try:
            rec = t.recommendations
            if rec is not None and not rec.empty:
                for _, row in rec.tail(3).iterrows():
                    results["recommendations"].append({
                        "symbol": sym, "fetched_at": today,
                        "period": str(row.get("period", ""))[:20],
                        "strong_buy": int(row.get("strongBuy", 0)),
                        "buy": int(row.get("buy", 0)),
                        "hold": int(row.get("hold", 0)),
                        "sell": int(row.get("sell", 0)),
                        "strong_sell": int(row.get("strongSell", 0)),
                    })
        except Exception:
            pass

        # ── Financial Statements ─────────────────────────────────────────────
        SHEETS = [
            ("income_statement",          lambda t: t.income_stmt),
            ("balance_sheet",             lambda t: t.balance_sheet),
            ("cashflow",                  lambda t: t.cashflow),
            ("quarterly_income_statement",lambda t: t.quarterly_income_stmt),
            ("quarterly_balance_sheet",   lambda t: t.quarterly_balance_sheet),
            ("quarterly_cashflow",        lambda t: t.quarterly_cashflow),
        ]
        for sheet_name, getter in SHEETS:
            try:
                df = getter(t)
                records = df_to_records(df)
                if records:
                    results["financials"].append({
                        "symbol": sym, "sheet": sheet_name,
                        "fetched_at": today, "data": json.dumps(records),
                    })
            except Exception:
                pass

        # ── Options (US stocks only, nearest expiry) ─────────────────────────
        if sym in US_STOCKS:
            try:
                expirations = t.options
                if expirations:
                    expiry = expirations[0]
                    chain = t.option_chain(expiry)
                    def chain_records(df):
                        cols = ["strike","lastPrice","bid","ask","volume","openInterest","impliedVolatility","inTheMoney","change","percentChange"]
                        available = [c for c in cols if c in df.columns]
                        recs = []
                        for _, row in df[available].iterrows():
                            r = {}
                            for c in available:
                                v = row[c]
                                r[c] = bool(v) if c == "inTheMoney" else (float(v) if pd.notna(v) else None)
                            recs.append(r)
                        return recs
                    results["options"].append({
                        "symbol": sym, "fetched_at": today,
                        "expiry": expiry,
                        "expirations": json.dumps(list(expirations)),
                        "calls": json.dumps(chain_records(chain.calls)),
                        "puts": json.dumps(chain_records(chain.puts)),
                    })
            except Exception:
                pass

        time.sleep(0.05)

    except Exception as e:
        print(f"  Skip {sym}: {e}", flush=True)

with open("/tmp/intel_export.json", "w") as f:
    json.dump(results, f)

print(f"Done: {len(results['news'])} news, {len(results['recommendations'])} recs, "
      f"{len(results['financials'])} financial sheets, {len(results['options'])} options snapshots", flush=True)
