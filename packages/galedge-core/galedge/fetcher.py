"""Fetch stock market data using yfinance."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime

import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)

# yfinance interval → max period lookback
INTERVAL_MAX_PERIOD = {
    "1m": "7d",
    "2m": "60d",
    "5m": "60d",
    "15m": "60d",
    "30m": "60d",
    "1h": "730d",
    "1d": "max",
    "1wk": "max",
    "1mo": "max",
}

VALID_INTERVALS = list(INTERVAL_MAX_PERIOD.keys())


@dataclass
class FetchResult:
    ticker: str
    interval: str
    df: pd.DataFrame
    fetched_at: datetime


def fetch(
    ticker: str,
    interval: str = "1d",
    period: str | None = None,
    start: str | None = None,
    end: str | None = None,
) -> FetchResult:
    """Fetch OHLCV data for a single ticker.

    Args:
        ticker: Stock symbol (e.g. "AAPL", "RELIANCE.NS").
        interval: Candle interval — one of VALID_INTERVALS.
        period: Lookback period (e.g. "1mo", "1y"). Ignored if start is set.
        start: Start date string "YYYY-MM-DD".
        end: End date string "YYYY-MM-DD".

    Returns:
        FetchResult with the dataframe and metadata.
    """
    if interval not in VALID_INTERVALS:
        raise ValueError(f"Invalid interval {interval!r}. Choose from {VALID_INTERVALS}")

    if period is None and start is None:
        period = INTERVAL_MAX_PERIOD[interval]

    logger.info("Fetching %s interval=%s period=%s start=%s end=%s", ticker, interval, period, start, end)

    t = yf.Ticker(ticker)
    df: pd.DataFrame = t.history(interval=interval, period=period, start=start, end=end)

    if df.empty:
        raise RuntimeError(f"No data returned for {ticker!r}. Check the symbol or date range.")

    # Normalize: lowercase columns, reset datetime index
    df.columns = [c.lower().replace(" ", "_") for c in df.columns]
    df.index.name = "datetime"
    df = df.reset_index()

    # Add metadata columns
    df["ticker"] = ticker
    df["interval"] = interval

    logger.info("Fetched %d rows for %s", len(df), ticker)

    return FetchResult(
        ticker=ticker,
        interval=interval,
        df=df,
        fetched_at=datetime.now(),
    )


def fetch_multiple(
    tickers: list[str],
    interval: str = "1d",
    period: str | None = None,
    start: str | None = None,
    end: str | None = None,
) -> list[FetchResult]:
    """Fetch data for multiple tickers. Skips failures with a warning."""
    results = []
    for ticker in tickers:
        try:
            results.append(fetch(ticker, interval=interval, period=period, start=start, end=end))
        except Exception:
            logger.exception("Failed to fetch %s", ticker)
    return results
