"""Fetch news and analyst recommendations for all symbols via yfinance.
Runs on GitHub Actions (not IP-blocked there). Exports to /tmp/intel_export.json.
"""
import sys, os, json, time
sys.path.insert(0, os.path.dirname(__file__))

import yfinance as yf
from symbols import ALL_SYMBOLS
from datetime import date

today = str(date.today())
results = {"date": today, "news": [], "recommendations": []}

print(f"Fetching intel for {len(ALL_SYMBOLS)} symbols...", flush=True)

for i, sym in enumerate(ALL_SYMBOLS):
    if i % 50 == 0:
        print(f"  {i}/{len(ALL_SYMBOLS)}: {sym}", flush=True)
    try:
        t = yf.Ticker(sym)

        # News
        try:
            news = t.news or []
            for item in news[:5]:
                c = item.get("content", {})
                results["news"].append({
                    "symbol": sym,
                    "fetched_at": today,
                    "title": c.get("title", "")[:500],
                    "publisher": c.get("provider", {}).get("displayName", "")[:100],
                    "link": c.get("canonicalUrl", {}).get("url", "")[:1000] if isinstance(c.get("canonicalUrl"), dict) else "",
                    "published_at": c.get("pubDate", "")[:50],
                })
        except Exception:
            pass

        # Recommendations
        try:
            rec = t.recommendations
            if rec is not None and not rec.empty:
                # Keep last 3 months
                for _, row in rec.tail(3).iterrows():
                    results["recommendations"].append({
                        "symbol": sym,
                        "fetched_at": today,
                        "period": str(row.get("period", ""))[:20],
                        "strong_buy": int(row.get("strongBuy", 0)),
                        "buy": int(row.get("buy", 0)),
                        "hold": int(row.get("hold", 0)),
                        "sell": int(row.get("sell", 0)),
                        "strong_sell": int(row.get("strongSell", 0)),
                    })
        except Exception:
            pass

        time.sleep(0.05)  # light rate limiting

    except Exception as e:
        print(f"  Skip {sym}: {e}", flush=True)

with open("/tmp/intel_export.json", "w") as f:
    json.dump(results, f)

print(f"Done: {len(results['news'])} news, {len(results['recommendations'])} recommendations -> /tmp/intel_export.json", flush=True)
