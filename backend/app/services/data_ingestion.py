"""Data ingestion pipeline — populates StockPrice, StockInfo, IndexConstituent tables.

Uses yfinance for price data and stock info. Designed to run as a daily job
or initial bulk load.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from concurrent.futures import ThreadPoolExecutor

import pandas as pd
import yfinance as yf
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.models.market_data import StockPrice, StockInfo, IndexConstituent

logger = logging.getLogger(__name__)

# ── Indian Market Universe ────────────────────────────────────────────────────

NIFTY_50 = [
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
]

NIFTY_NEXT_50 = [
    "SHRIRAMFIN.NS", "HAVELLS.NS", "PIDILITIND.NS", "GODREJCP.NS",
    "DABUR.NS", "AMBUJACEM.NS", "ACC.NS", "BANDHANBNK.NS", "COLPAL.NS",
    "NAUKRI.NS", "MUTHOOTFIN.NS", "BERGEPAINT.NS", "JUBLFOOD.NS",
    "LUPIN.NS", "BIOCON.NS", "TVSMOTOR.NS", "PAGEIND.NS", "AUROPHARMA.NS",
    "ALKEM.NS", "TORNTPHARM.NS", "BALKRISIND.NS", "MFSL.NS",
    "CANBK.NS", "PNB.NS", "BANKBARODA.NS", "IDFCFIRSTB.NS",
    "FEDERALBNK.NS", "SAIL.NS", "NATIONALUM.NS", "NMDC.NS",
    "PETRONET.NS", "IOC.NS", "GAIL.NS", "IRCTC.NS", "TRENT.NS",
    "DMART.NS", "PIIND.NS", "SIEMENS.NS", "ABB.NS", "HAL.NS",
    "BEL.NS", "BHEL.NS", "CONCOR.NS", "IRFC.NS", "PFC.NS",
    "RECLTD.NS", "NHPC.NS", "SJVN.NS", "POLYCAB.NS", "VOLTAS.NS",
]

ALL_NSE_STOCKS = NIFTY_50 + NIFTY_NEXT_50

US_STOCKS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AVGO",
    "JPM", "V", "MA", "BAC", "UNH", "JNJ", "LLY", "PFE", "ABBV", "MRK",
    "WMT", "PG", "KO", "PEP", "COST", "HD", "LOW", "NKE", "MCD",
    "XOM", "CVX", "COP", "DIS", "CMCSA", "T", "VZ",
    "UPS", "HON", "CAT", "BA", "GE", "DE",
]


# ── Price Ingestion ───────────────────────────────────────────────────────────

def _fetch_prices_batch(symbols: list[str], period: str = "max") -> pd.DataFrame:
    """Fetch prices for multiple symbols using yf.download (single batch call)."""
    try:
        df = yf.download(
            symbols,
            period=period,
            interval="1d",
            group_by="ticker",
            progress=False,
            threads=True,
            auto_adjust=False,
        )
        return df
    except Exception as e:
        logger.error("Batch download failed: %s", e)
        return pd.DataFrame()


def ingest_prices(
    db: Session,
    symbols: list[str] | None = None,
    period: str = "2y",
) -> dict:
    """Ingest daily OHLCV prices into the database.

    Uses yf.download for batch efficiency, then upserts into stock_prices table.
    """
    symbols = symbols or ALL_NSE_STOCKS
    logger.info("Ingesting prices for %d symbols, period=%s", len(symbols), period)

    # Find latest date per symbol already in DB
    latest_dates = {}
    for sym in symbols:
        result = db.execute(
            select(func.max(StockPrice.date)).where(StockPrice.symbol == sym)
        ).scalar()
        if result:
            latest_dates[sym] = result

    # Batch download
    df = _fetch_prices_batch(symbols, period)
    if df.empty:
        return {"ingested": 0, "errors": len(symbols)}

    total_rows = 0
    errors = 0

    for sym in symbols:
        try:
            if len(symbols) == 1:
                sym_df = df
            else:
                if sym not in df.columns.get_level_values(0):
                    continue
                sym_df = df[sym]

            sym_df = sym_df.dropna(subset=["Close"])
            if sym_df.empty:
                continue

            # Filter to only new dates
            latest = latest_dates.get(sym)
            if latest:
                sym_df = sym_df[sym_df.index.date > latest]

            if sym_df.empty:
                continue

            # Bulk insert
            rows = []
            for idx, row in sym_df.iterrows():
                rows.append(StockPrice(
                    symbol=sym,
                    date=idx.date() if hasattr(idx, "date") else idx,
                    open=float(row.get("Open", 0)),
                    high=float(row.get("High", 0)),
                    low=float(row.get("Low", 0)),
                    close=float(row.get("Close", 0)),
                    adj_close=float(row.get("Adj Close", row.get("Close", 0))),
                    volume=int(row.get("Volume", 0)),
                ))

            db.bulk_save_objects(rows)
            total_rows += len(rows)
            logger.info("Ingested %d rows for %s", len(rows), sym)

        except Exception as e:
            logger.warning("Failed to ingest %s: %s", sym, e)
            errors += 1

    db.commit()
    logger.info("Price ingestion complete: %d rows, %d errors", total_rows, errors)
    return {"ingested": total_rows, "errors": errors}


# ── Stock Info Ingestion ──────────────────────────────────────────────────────

def _fetch_stock_info(sym: str) -> dict | None:
    """Fetch stock info for a single symbol."""
    try:
        info = yf.Ticker(sym).info
        return {
            "symbol": sym,
            "name": info.get("shortName", sym),
            "sector": info.get("sector", ""),
            "industry": info.get("industry", ""),
            "market_cap": info.get("marketCap", 0) or 0,
            "exchange": "NSE" if sym.endswith(".NS") else "BSE" if sym.endswith(".BO") else "US",
        }
    except Exception:
        return None


def ingest_stock_info(
    db: Session,
    symbols: list[str] | None = None,
) -> dict:
    """Ingest/update stock info (name, sector, industry, market cap)."""
    symbols = symbols or ALL_NSE_STOCKS
    logger.info("Ingesting stock info for %d symbols", len(symbols))

    # Parallel fetch
    with ThreadPoolExecutor(max_workers=10) as executor:
        results = list(executor.map(_fetch_stock_info, symbols))

    updated = 0
    for info in results:
        if not info:
            continue

        existing = db.query(StockInfo).filter(StockInfo.symbol == info["symbol"]).first()
        if existing:
            existing.name = info["name"]
            existing.sector = info["sector"]
            existing.industry = info["industry"]
            existing.market_cap = info["market_cap"]
        else:
            db.add(StockInfo(
                symbol=info["symbol"],
                name=info["name"],
                sector=info["sector"],
                industry=info["industry"],
                market_cap=info["market_cap"],
                exchange=info["exchange"],
            ))
        updated += 1

    db.commit()
    logger.info("Stock info updated: %d symbols", updated)
    return {"updated": updated}


# ── Index Constituents ────────────────────────────────────────────────────────

def ingest_index_constituents(db: Session) -> dict:
    """Populate index constituent table with current memberships."""
    indices = {
        "NIFTY 50": NIFTY_50,
        "NIFTY NEXT 50": NIFTY_NEXT_50,
        "NIFTY 100": NIFTY_50 + NIFTY_NEXT_50,
    }

    today = date.today()
    count = 0

    for index_name, symbols in indices.items():
        equal_weight = 1.0 / len(symbols)
        for sym in symbols:
            existing = db.query(IndexConstituent).filter(
                IndexConstituent.index_name == index_name,
                IndexConstituent.symbol == sym,
                IndexConstituent.date == today,
            ).first()
            if not existing:
                db.add(IndexConstituent(
                    index_name=index_name,
                    symbol=sym,
                    date=today,
                    weight=equal_weight,
                ))
                count += 1

    db.commit()
    logger.info("Index constituents updated: %d entries", count)
    return {"updated": count}


# ── Full Ingestion ────────────────────────────────────────────────────────────

def run_full_ingestion(db: Session, period: str = "2y") -> dict:
    """Run complete data ingestion pipeline."""
    logger.info("=== Starting full data ingestion ===")

    info_result = ingest_stock_info(db, ALL_NSE_STOCKS + US_STOCKS[:20])
    price_result = ingest_prices(db, ALL_NSE_STOCKS + US_STOCKS[:20], period)
    index_result = ingest_index_constituents(db)

    result = {
        "stock_info": info_result,
        "prices": price_result,
        "index_constituents": index_result,
    }
    logger.info("=== Full ingestion complete: %s ===", result)
    return result
