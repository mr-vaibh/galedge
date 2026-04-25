"""Galedge FastAPI backend — live stock market data API."""

from __future__ import annotations

from contextlib import asynccontextmanager
from functools import lru_cache
from datetime import datetime

import math
import time
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import pandas as pd
import yfinance as yf
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="Galedge API",
    description="Free stock market data API — prices, options, fundamentals, and market intelligence.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "https://galedge.byvaibhav.com",
    ],
    allow_methods=["GET"],
    allow_headers=["*"],
)


# ── Helpers ───────────────────────────────────────────────────────────────────

EXCHANGE_DISPLAY = {
    "NSI": "NSE",
    "NMS": "NASDAQ",
    "NYQ": "NYSE",
    "NGM": "NASDAQ",
    "PCX": "NYSE ARCA",
    "BTS": "CBOE BZX",
    "YHD": "Yahoo",
}


def _exchange_name(code: str) -> str:
    return EXCHANGE_DISPLAY.get(code, code)


def _ticker(symbol: str) -> yf.Ticker:
    return yf.Ticker(symbol.upper())


def _clean_value(v):
    """Make a single value JSON-safe."""
    if v is None:
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


def _df_to_records(df: pd.DataFrame) -> list[dict]:
    """Convert DataFrame to JSON-safe list of dicts."""
    df = df.copy()
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            df[col] = df[col].astype(str)
    records = df.to_dict(orient="records")
    return [{k: _clean_value(v) for k, v in row.items()} for row in records]


def _safe_info(info: dict, keys: list[str]) -> dict:
    """Extract keys from info dict, replacing NaN/None gracefully."""
    result = {}
    for k in keys:
        v = info.get(k)
        if v is not None and v == v:  # NaN check
            result[k] = v
        else:
            result[k] = None
    return result


# ── Quote ─────────────────────────────────────────────────────────────────────

@app.get("/api/quote/{symbol}")
async def get_quote(symbol: str):
    """Get live quote for a single ticker."""
    try:
        t = _ticker(symbol)
        fi = t.fast_info
        info = t.info

        hist = t.history(period="2d", interval="1d")
        prev_close = fi.previous_close
        price = fi.last_price
        change = price - prev_close if prev_close else 0
        change_pct = (change / prev_close * 100) if prev_close else 0

        return {
            "symbol": symbol.upper(),
            "price": price,
            "change": round(change, 2),
            "changePercent": round(change_pct, 2),
            "open": fi.open,
            "high": fi.day_high,
            "low": fi.day_low,
            "previousClose": prev_close,
            "volume": fi.last_volume,
            "marketCap": fi.market_cap,
            "name": info.get("shortName", symbol.upper()),
            "exchange": _exchange_name(info.get("exchange", "")),
            "currency": info.get("currency", "USD"),
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Could not fetch quote for {symbol}: {e}")


# ── Multi-quote ───────────────────────────────────────────────────────────────

@app.get("/api/quotes")
async def get_quotes(symbols: str = Query(..., description="Comma-separated symbols")):
    """Get live quotes for multiple tickers."""
    ticker_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    results = []
    for sym in ticker_list[:20]:  # cap at 20
        try:
            t = _ticker(sym)
            fi = t.fast_info
            info = t.info
            prev_close = fi.previous_close
            price = fi.last_price
            change = price - prev_close if prev_close else 0
            change_pct = (change / prev_close * 100) if prev_close else 0

            results.append({
                "symbol": sym,
                "name": info.get("shortName", sym),
                "price": price,
                "change": round(change, 2),
                "changePercent": round(change_pct, 2),
                "volume": fi.last_volume,
                "marketCap": fi.market_cap,
            })
        except Exception:
            pass
    return results


# ── History ───────────────────────────────────────────────────────────────────

VALID_INTERVALS = ["1m", "2m", "5m", "15m", "30m", "1h", "1d", "1wk", "1mo"]

@app.get("/api/history/{symbol}")
async def get_history(
    symbol: str,
    interval: str = Query("1d", enum=VALID_INTERVALS),
    period: str = Query("6mo"),
    start: str | None = Query(None),
    end: str | None = Query(None),
):
    """Get OHLCV history for a ticker."""
    try:
        t = _ticker(symbol)
        kwargs = {"interval": interval}
        if start:
            kwargs["start"] = start
            if end:
                kwargs["end"] = end
        else:
            kwargs["period"] = period

        df = t.history(**kwargs)
        if df.empty:
            raise HTTPException(status_code=404, detail=f"No data for {symbol}")

        df.columns = [c.lower().replace(" ", "_") for c in df.columns]
        df.index.name = "datetime"
        df = df.reset_index()
        df["datetime"] = df["datetime"].astype(str)

        return {
            "symbol": symbol.upper(),
            "interval": interval,
            "count": len(df),
            "data": df[["datetime", "open", "high", "low", "close", "volume"]].to_dict(orient="records"),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Options ───────────────────────────────────────────────────────────────────

@app.get("/api/options/{symbol}")
async def get_options(
    symbol: str,
    expiry: str | None = Query(None, description="Expiry date YYYY-MM-DD"),
    kind: str = Query("calls", enum=["calls", "puts"]),
):
    """Get options chain for a ticker."""
    try:
        t = _ticker(symbol)
        expirations = t.options

        if not expirations:
            raise HTTPException(status_code=404, detail=f"No options for {symbol}")

        target_expiry = expiry if expiry and expiry in expirations else expirations[0]
        chain = t.option_chain(target_expiry)
        df = chain.calls if kind == "calls" else chain.puts

        cols = ["strike", "lastPrice", "bid", "ask", "volume", "openInterest",
                "impliedVolatility", "inTheMoney", "change", "percentChange"]
        available = [c for c in cols if c in df.columns]

        return {
            "symbol": symbol.upper(),
            "expiry": target_expiry,
            "kind": kind,
            "expirations": list(expirations),
            "count": len(df),
            "data": _df_to_records(df[available]),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Fundamentals ──────────────────────────────────────────────────────────────

@app.get("/api/fundamentals/{symbol}")
async def get_fundamentals(
    symbol: str,
    sheet: str = Query("info", enum=[
        "info", "financials", "balance_sheet", "cashflow",
        "quarterly_financials", "quarterly_balance_sheet", "quarterly_cashflow",
    ]),
):
    """Get fundamental data for a ticker."""
    try:
        t = _ticker(symbol)

        if sheet == "info":
            info = t.info
            keys = [
                "shortName", "sector", "industry", "fullTimeEmployees", "website",
                "marketCap", "enterpriseValue", "trailingPE", "forwardPE", "pegRatio",
                "priceToBook", "trailingEps", "forwardEps", "totalRevenue",
                "profitMargins", "operatingMargins", "grossMargins", "returnOnEquity",
                "dividendYield", "payoutRatio", "beta",
                "fiftyTwoWeekHigh", "fiftyTwoWeekLow", "fiftyDayAverage",
                "twoHundredDayAverage", "bookValue", "debtToEquity",
                "totalCash", "totalDebt", "revenueGrowth", "earningsGrowth",
            ]
            return {
                "symbol": symbol.upper(),
                "sheet": "info",
                "data": _safe_info(info, keys),
            }

        attr_map = {
            "financials": "financials",
            "balance_sheet": "balance_sheet",
            "cashflow": "cashflow",
            "quarterly_financials": "quarterly_financials",
            "quarterly_balance_sheet": "quarterly_balance_sheet",
            "quarterly_cashflow": "quarterly_cashflow",
        }

        df = getattr(t, attr_map[sheet])
        if df is None or df.empty:
            raise HTTPException(status_code=404, detail=f"No {sheet} data for {symbol}")

        # Transpose: rows = dates, columns = metrics
        df = df.T
        df.index.name = "date"
        df = df.reset_index()
        df["date"] = df["date"].astype(str)

        return {
            "symbol": symbol.upper(),
            "sheet": sheet,
            "count": len(df),
            "data": _df_to_records(df),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Intel ─────────────────────────────────────────────────────────────────────

@app.get("/api/intel/{symbol}")
async def get_intel(
    symbol: str,
    kind: str = Query("all", enum=[
        "all", "insider_transactions", "institutional_holders",
        "mutual_fund_holders", "recommendations", "news",
    ]),
):
    """Get market intelligence — insiders, institutions, analysts, news."""
    try:
        t = _ticker(symbol)
        result = {"symbol": symbol.upper()}

        sections_to_fetch = (
            ["insider_transactions", "institutional_holders", "mutual_fund_holders", "recommendations", "news"]
            if kind == "all"
            else [kind]
        )

        for section in sections_to_fetch:
            if section == "news":
                news_list = t.news or []
                items = []
                for item in news_list:
                    content = item.get("content", {})
                    items.append({
                        "title": content.get("title", ""),
                        "publisher": content.get("provider", {}).get("displayName", ""),
                        "publishedAt": content.get("pubDate", ""),
                        "summary": content.get("summary", ""),
                        "link": content.get("canonicalUrl", {}).get("url", ""),
                    })
                result["news"] = items

            elif section == "recommendations":
                df = t.recommendations
                if df is not None and not df.empty:
                    result["recommendations"] = _df_to_records(df)
                else:
                    result["recommendations"] = []

            elif section == "insider_transactions":
                df = t.insider_transactions
                if df is not None and not df.empty:
                    result["insider_transactions"] = _df_to_records(df)
                else:
                    result["insider_transactions"] = []

            elif section == "institutional_holders":
                df = t.institutional_holders
                if df is not None and not df.empty:
                    result["institutional_holders"] = _df_to_records(df)
                else:
                    result["institutional_holders"] = []

            elif section == "mutual_fund_holders":
                df = t.mutualfund_holders
                if df is not None and not df.empty:
                    result["mutual_fund_holders"] = _df_to_records(df)
                else:
                    result["mutual_fund_holders"] = []

        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Stock Universes ──────────────────────────────────────────────────────────

STOCK_UNIVERSE = {
    "us": [
        # Mega-cap Tech
        "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AVGO", "ORCL", "ADBE",
        "CRM", "AMD", "INTC", "CSCO", "QCOM", "TXN", "IBM", "NOW", "INTU", "AMAT",
        "NFLX", "PYPL", "MU", "LRCX", "KLAC", "SNPS", "CDNS", "MRVL", "PANW", "CRWD",
        # Financials
        "JPM", "V", "MA", "BAC", "WFC", "GS", "MS", "BLK", "SPGI", "AXP",
        "C", "SCHW", "CB", "MMC", "PGR", "ICE", "AON", "CME", "MCO", "MET",
        # Healthcare
        "UNH", "JNJ", "LLY", "PFE", "ABBV", "MRK", "TMO", "ABT", "DHR", "BMY",
        "AMGN", "GILD", "ISRG", "MDT", "SYK", "BSX", "VRTX", "REGN", "ELV", "ZTS",
        # Consumer Defensive
        "WMT", "PG", "KO", "PEP", "COST", "CL", "MDLZ", "GIS", "KHC", "HSY",
        "SYY", "KR", "WBA", "DG", "DLTR", "EL", "MKC", "CHD", "K", "CPB",
        # Industrials
        "UPS", "HON", "UNP", "CAT", "BA", "RTX", "GE", "DE", "LMT", "MMM",
        "ADP", "ITW", "EMR", "ETN", "ROK", "WM", "CSX", "NSC", "CTAS", "FAST",
        # Communication Services
        "DIS", "CMCSA", "T", "VZ", "TMUS", "CHTR", "NXPI", "EA", "TTWO", "WBD",
        # Energy
        "XOM", "CVX", "COP", "SLB", "EOG", "MPC", "PSX", "VLO", "OXY", "HES",
        # Consumer Cyclical
        "HD", "LOW", "TJX", "BKNG", "ABNB", "MAR", "GM", "F", "ORLY", "AZO",
        "NKE", "SBUX", "MCD", "TGT", "ROST", "YUM", "DHI", "LEN", "CMG", "LULU",
        # Utilities
        "NEE", "DUK", "SO", "D", "AEP", "SRE", "EXC", "XEL", "WEC", "ES",
        # Real Estate
        "PLD", "AMT", "CCI", "EQIX", "PSA", "SPG", "O", "WELL", "DLR", "VICI",
        # Basic Materials
        "LIN", "APD", "SHW", "ECL", "FCX", "NEM", "NUE", "DOW", "DD", "PPG",
    ],
    "india": [
        # Nifty 50 + key large-caps
        "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
        "HINDUNILVR.NS", "BHARTIARTL.NS", "ITC.NS", "SBIN.NS", "LT.NS",
        "BAJFINANCE.NS", "MARUTI.NS", "HCLTECH.NS", "AXISBANK.NS",
        "TATAMOTORS.NS", "SUNPHARMA.NS", "WIPRO.NS", "TITAN.NS", "NTPC.NS",
        "POWERGRID.NS", "KOTAKBANK.NS", "ASIANPAINT.NS", "ADANIPORTS.NS",
        "ULTRACEMCO.NS", "NESTLEIND.NS", "TECHM.NS", "TATASTEEL.NS",
        "JSWSTEEL.NS", "HINDALCO.NS", "DIVISLAB.NS", "DRREDDY.NS",
        "CIPLA.NS", "APOLLOHOSP.NS", "EICHERMOT.NS", "BAJAJ-AUTO.NS",
        "HEROMOTOCO.NS", "M&M.NS", "BPCL.NS", "ONGC.NS", "COALINDIA.NS",
        "GRASIM.NS", "INDUSINDBK.NS", "TATACONSUM.NS", "BRITANNIA.NS",
        "HDFCLIFE.NS", "SBILIFE.NS", "BAJAJFINSV.NS", "ADANIENT.NS",
        "ETERNAL.NS", "VEDL.NS",
    ],
}

# Module-level cache for screener
_screener_cache: dict = {}


# ── Technicals ───────────────────────────────────────────────────────────────

@app.get("/api/technicals/{symbol}")
async def get_technicals(
    symbol: str,
    period: str = Query("6mo"),
    interval: str = Query("1d"),
):
    """Compute technical indicators for a ticker."""
    try:
        t = _ticker(symbol)
        df = t.history(period=period, interval=interval)
        if df.empty:
            raise HTTPException(status_code=404, detail=f"No data for {symbol}")

        close = df["Close"]

        # RSI-14 (Wilder smoothing)
        delta = close.diff()
        gain = delta.clip(lower=0)
        loss = (-delta.clip(upper=0))
        avg_gain = gain.ewm(alpha=1 / 14, min_periods=14, adjust=False).mean()
        avg_loss = loss.ewm(alpha=1 / 14, min_periods=14, adjust=False).mean()
        rs = avg_gain / avg_loss
        rsi_14 = 100 - (100 / (1 + rs))

        # MACD
        ema_12 = close.ewm(span=12, adjust=False).mean()
        ema_26 = close.ewm(span=26, adjust=False).mean()
        macd = ema_12 - ema_26
        macd_signal = macd.ewm(span=9, adjust=False).mean()
        macd_histogram = macd - macd_signal

        # Bollinger Bands (SMA-20)
        sma_20 = close.rolling(window=20).mean()
        std_20 = close.rolling(window=20).std()
        bb_upper = sma_20 + 2 * std_20
        bb_lower = sma_20 - 2 * std_20

        # SMA-50
        sma_50 = close.rolling(window=50).mean()

        result_df = pd.DataFrame({
            "datetime": df.index.astype(str),
            "close": close.values,
            "rsi_14": rsi_14.values,
            "macd": macd.values,
            "macd_signal": macd_signal.values,
            "macd_histogram": macd_histogram.values,
            "bb_upper": bb_upper.values,
            "bb_middle": sma_20.values,
            "bb_lower": bb_lower.values,
            "sma_20": sma_20.values,
            "sma_50": sma_50.values,
            "ema_12": ema_12.values,
            "ema_26": ema_26.values,
        })

        return {
            "symbol": symbol.upper(),
            "interval": interval,
            "count": len(result_df),
            "data": _df_to_records(result_df),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Compare ──────────────────────────────────────────────────────────────────

@app.get("/api/compare")
async def compare_stocks(
    symbols: str = Query(..., description="Comma-separated symbols, max 5"),
    period: str = Query("6mo"),
    interval: str = Query("1d"),
):
    """Compare multiple stocks — normalized prices and fundamentals."""
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()][:5]
    if len(symbol_list) < 1:
        raise HTTPException(status_code=400, detail="At least one symbol required")

    info_keys = [
        "marketCap", "trailingPE", "forwardPE", "sector", "industry",
        "profitMargins", "operatingMargins", "dividendYield", "beta",
        "fiftyTwoWeekHigh", "fiftyTwoWeekLow",
    ]

    price_data: dict = {}
    fundamentals: dict = {}

    for sym in symbol_list:
        try:
            t = _ticker(sym)
            hist = t.history(period=period, interval=interval)
            if hist.empty:
                continue
            close = hist["Close"]
            first_val = close.iloc[0]
            normalized = (close / first_val * 100) if first_val else close

            pdf = pd.DataFrame({
                "datetime": hist.index.astype(str),
                "close": close.values,
                "normalized": normalized.values,
            })
            price_data[sym] = _df_to_records(pdf)

            info = t.info
            fund = {}
            for k in info_keys:
                fund[k] = _clean_value(info.get(k))
            fundamentals[sym] = fund
        except Exception:
            continue

    return {
        "symbols": symbol_list,
        "period": period,
        "price_data": price_data,
        "fundamentals": fundamentals,
    }


# ── Correlation ──────────────────────────────────────────────────────────────

@app.get("/api/correlation")
async def get_correlation(
    symbols: str = Query(..., description="Comma-separated symbols, 2-10"),
    period: str = Query("1y"),
    interval: str = Query("1d"),
):
    """Compute Pearson correlation matrix of daily returns."""
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()][:10]
    if len(symbol_list) < 2:
        raise HTTPException(status_code=400, detail="At least 2 symbols required")

    try:
        closes: dict = {}
        for sym in symbol_list:
            t = _ticker(sym)
            hist = t.history(period=period, interval=interval)
            if not hist.empty:
                closes[sym] = hist["Close"]

        if len(closes) < 2:
            raise HTTPException(status_code=404, detail="Not enough data to compute correlation")

        df = pd.DataFrame(closes)
        corr = df.pct_change().corr()

        # Clean matrix values
        matrix = []
        for row_sym in corr.index:
            row = []
            for col_sym in corr.columns:
                row.append(_clean_value(float(corr.loc[row_sym, col_sym])))
            matrix.append(row)

        return {
            "symbols": list(corr.index),
            "period": period,
            "matrix": matrix,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Heatmap ──────────────────────────────────────────────────────────────────

# Persistent caches
_stock_meta_cache: dict = {}   # sym -> {"name": ..., "sector": ...} — never expires
_heatmap_cache: dict = {}      # market -> {"data": ..., "timestamp": ...}

def _fetch_stock_meta(sym: str) -> dict | None:
    """Fetch and cache sector + name for a stock. Only calls .info once ever."""
    if sym in _stock_meta_cache:
        return _stock_meta_cache[sym]
    try:
        info = yf.Ticker(sym).info
        meta = {
            "name": info.get("shortName", sym),
            "sector": info.get("sector", "Other"),
        }
        _stock_meta_cache[sym] = meta
        return meta
    except Exception:
        _stock_meta_cache[sym] = {"name": sym, "sector": "Other"}
        return _stock_meta_cache[sym]


def _fetch_full_meta(sym: str) -> dict | None:
    """Fetch name, sector, AND marketCap. Cached forever (mcap is approximate for sizing)."""
    if sym in _stock_meta_cache and "marketCap" in _stock_meta_cache[sym]:
        return _stock_meta_cache[sym]
    try:
        info = yf.Ticker(sym).info
        meta = {
            "name": info.get("shortName", sym),
            "sector": info.get("sector", "Other"),
            "marketCap": info.get("marketCap", 0) or 0,
        }
        _stock_meta_cache[sym] = meta
        return meta
    except Exception:
        fallback = {"name": sym, "sector": "Other", "marketCap": 0}
        _stock_meta_cache[sym] = fallback
        return fallback


def _build_heatmap(market: str) -> dict:
    """Build heatmap: yf.download for prices (1 batch call), cached .info for meta."""
    cache_key = f"heatmap_{market}"
    now = time.time()
    cached = _heatmap_cache.get(cache_key)
    if cached and (now - cached["timestamp"]) < 300:
        return cached["data"]

    universe = STOCK_UNIVERSE.get(market, STOCK_UNIVERSE["us"])

    # Step 1: Fetch meta (sector, name, marketCap) — cached forever, only fetches missing
    missing = [s for s in universe if s not in _stock_meta_cache or "marketCap" not in _stock_meta_cache[s]]
    if missing:
        for i in range(0, len(missing), 20):
            batch = missing[i:i + 20]
            with ThreadPoolExecutor(max_workers=10) as executor:
                list(executor.map(_fetch_full_meta, batch))

    # Step 2: Batch download 2 days of prices — ONE API call for ALL tickers
    try:
        df = yf.download(universe, period="2d", interval="1d", group_by="ticker", progress=False, threads=True)
    except Exception:
        df = pd.DataFrame()

    # Step 3: Build stock list
    stocks = []
    for sym in universe:
        try:
            meta = _stock_meta_cache.get(sym, {})
            mcap = meta.get("marketCap", 0)
            if not mcap or mcap <= 0:
                continue

            # Extract close prices from batch download
            if len(universe) == 1:
                sym_df = df
            else:
                if sym not in df.columns.get_level_values(0):
                    continue
                sym_df = df[sym]

            closes = sym_df["Close"].dropna()
            if len(closes) < 2:
                continue

            price = float(closes.iloc[-1])
            prev_close = float(closes.iloc[-2])
            if prev_close <= 0 or price != price:  # NaN check
                continue
            change_pct = ((price - prev_close) / prev_close) * 100

            stocks.append({
                "symbol": sym,
                "name": meta.get("name", sym),
                "sector": meta.get("sector", "Other"),
                "marketCap": _clean_value(mcap),
                "changePercent": _clean_value(round(change_pct, 2)),
            })
        except Exception:
            continue

    # Group by sector
    sectors: dict = {}
    for s in stocks:
        sec = s["sector"]
        if sec not in sectors:
            sectors[sec] = {"sector": sec, "marketCap": 0, "changePercent": 0, "stocks": [], "_total_weight": 0}
        cap = s["marketCap"] or 0
        chg = s["changePercent"] or 0
        sectors[sec]["stocks"].append(s)
        sectors[sec]["marketCap"] += cap
        sectors[sec]["_total_weight"] += cap
        sectors[sec]["changePercent"] += chg * cap

    sector_list = []
    for sec_data in sectors.values():
        w = sec_data.pop("_total_weight")
        if w > 0:
            sec_data["changePercent"] = _clean_value(round(sec_data["changePercent"] / w, 2))
        else:
            sec_data["changePercent"] = _clean_value(0)
        sec_data["marketCap"] = _clean_value(sec_data["marketCap"])
        sector_list.append(sec_data)

    sector_list.sort(key=lambda x: x.get("marketCap") or 0, reverse=True)

    result = {"market": market, "data": sector_list}
    _heatmap_cache[cache_key] = {"data": result, "timestamp": now}
    return result


@app.get("/api/heatmap")
async def get_heatmap(
    market: str = Query("us", enum=["us", "india"]),
):
    """Get market heatmap data grouped by sector."""
    try:
        return _build_heatmap(market)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Screener ─────────────────────────────────────────────────────────────────

def _fetch_screener_stock(sym: str) -> dict | None:
    """Fetch screener data for a single stock. Returns None on failure."""
    try:
        t = yf.Ticker(sym)
        info = t.info
        fi = t.fast_info
        price = fi.last_price
        prev_close = fi.previous_close
        change_pct = ((price - prev_close) / prev_close * 100) if prev_close else 0
        return {
            "symbol": sym,
            "name": info.get("shortName", sym),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "price": _clean_value(price),
            "changePercent": _clean_value(round(change_pct, 2)),
            "marketCap": _clean_value(info.get("marketCap")),
            "trailingPE": _clean_value(info.get("trailingPE")),
            "forwardPE": _clean_value(info.get("forwardPE")),
            "dividendYield": _clean_value(info.get("dividendYield")),
            "beta": _clean_value(info.get("beta")),
        }
    except Exception:
        return None


@app.get("/api/screener")
async def stock_screener(
    market_cap_min: float | None = Query(None),
    market_cap_max: float | None = Query(None),
    pe_min: float | None = Query(None),
    pe_max: float | None = Query(None),
    dividend_yield_min: float | None = Query(None),
    sector: str | None = Query(None),
    sort_by: str = Query("marketCap"),
    sort_order: str = Query("desc"),
    limit: int = Query(50),
):
    """Screen stocks by fundamental filters."""
    global _screener_cache

    cache_key = "screener_all"
    now = time.time()

    # Serve from cache if < 10 minutes old
    if cache_key in _screener_cache and (now - _screener_cache[cache_key]["timestamp"]) < 600:
        all_stocks = _screener_cache[cache_key]["data"]
    else:
        all_symbols = STOCK_UNIVERSE["us"] + STOCK_UNIVERSE["india"]
        with ThreadPoolExecutor(max_workers=20) as executor:
            results = list(executor.map(_fetch_screener_stock, all_symbols))
        all_stocks = [r for r in results if r is not None]
        _screener_cache[cache_key] = {"data": all_stocks, "timestamp": now}

    # Apply filters
    filtered = all_stocks
    if market_cap_min is not None:
        filtered = [s for s in filtered if s.get("marketCap") is not None and s["marketCap"] >= market_cap_min]
    if market_cap_max is not None:
        filtered = [s for s in filtered if s.get("marketCap") is not None and s["marketCap"] <= market_cap_max]
    if pe_min is not None:
        filtered = [s for s in filtered if s.get("trailingPE") is not None and s["trailingPE"] >= pe_min]
    if pe_max is not None:
        filtered = [s for s in filtered if s.get("trailingPE") is not None and s["trailingPE"] <= pe_max]
    if dividend_yield_min is not None:
        filtered = [s for s in filtered if s.get("dividendYield") is not None and s["dividendYield"] >= dividend_yield_min]
    if sector is not None:
        filtered = [s for s in filtered if s.get("sector") and s["sector"].lower() == sector.lower()]

    # Sort
    reverse = sort_order == "desc"
    filtered.sort(key=lambda x: x.get(sort_by) or 0, reverse=reverse)

    # Limit
    filtered = filtered[:limit]

    return {
        "count": len(filtered),
        "data": filtered,
    }


# ── ML Predictions ────────────────────────────────────────────────────────────

@app.get("/api/predict/{symbol}")
async def get_prediction(
    symbol: str,
    portfolio_value: float = Query(100000),
    risk_tolerance: str = Query("medium", enum=["low", "medium", "high"]),
):
    """Get ML-powered stock prediction with signals, risk, and recommendation."""
    try:
        from galedge_ml.predictor import predict
        result = predict(symbol.upper(), portfolio_value, risk_tolerance)
        # Remove internal keys
        result.pop("_portfolio_value", None)
        result.pop("_risk_tolerance", None)
        return result
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/predict/batch")
async def get_predictions_batch(
    symbols: str = Query(..., description="Comma-separated symbols, max 10"),
    portfolio_value: float = Query(100000),
    risk_tolerance: str = Query("medium", enum=["low", "medium", "high"]),
):
    """Get predictions for multiple symbols."""
    try:
        from galedge_ml.predictor import predict_batch
        symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()][:10]
        results = predict_batch(symbol_list, portfolio_value, risk_tolerance)
        # Clean internal keys
        for r in results:
            r.pop("_portfolio_value", None)
            r.pop("_risk_tolerance", None)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/predict/backtest/{symbol}")
async def get_backtest(
    symbol: str,
    period: str = Query("1y"),
    timeframe: int = Query(10),
):
    """Run a walk-forward backtest on a symbol."""
    try:
        from galedge_ml.backtest import backtest
        return backtest(symbol.upper(), period, timeframe=timeframe)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Search ────────────────────────────────────────────────────────────────────

@app.get("/api/search")
async def search(q: str = Query(..., min_length=1)):
    """Search for tickers by name or symbol."""
    try:
        import yfinance as yf
        results = yf.Search(q)
        quotes = []
        for item in (results.quotes or [])[:10]:
            quotes.append({
                "symbol": item.get("symbol", ""),
                "name": item.get("shortname") or item.get("longname", ""),
                "exchange": _exchange_name(item.get("exchange", "")),
                "type": item.get("quoteType", ""),
            })
        return quotes
    except Exception:
        return []
