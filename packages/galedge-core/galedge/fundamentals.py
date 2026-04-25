"""Fetch and store fundamental data — financials, balance sheet, cash flow, key stats."""

from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path

import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)

DEFAULT_DATA_DIR = Path("data")


def fetch_fundamentals(ticker: str) -> dict[str, pd.DataFrame]:
    """Fetch all fundamental data for a ticker.

    Returns dict with keys:
        info, financials, balance_sheet, cashflow, quarterly_financials,
        quarterly_balance_sheet, quarterly_cashflow
    """
    t = yf.Ticker(ticker)
    result = {}
    now = datetime.now()

    # Key stats from .info
    info = t.info
    if info:
        info_df = pd.DataFrame([info])
        info_df["ticker"] = ticker
        info_df["fetched_at"] = now
        result["info"] = info_df
        logger.info("Fetched info (%d fields) for %s", len(info), ticker)

    # Annual statements
    for name, attr in [
        ("financials", "financials"),
        ("balance_sheet", "balance_sheet"),
        ("cashflow", "cashflow"),
    ]:
        df = getattr(t, attr)
        if df is not None and not df.empty:
            df = df.T.reset_index().rename(columns={"index": "date"})
            df["ticker"] = ticker
            df["fetched_at"] = now
            result[name] = df
            logger.info("Fetched %s (%d periods) for %s", name, len(df), ticker)

    # Quarterly statements
    for name, attr in [
        ("quarterly_financials", "quarterly_financials"),
        ("quarterly_balance_sheet", "quarterly_balance_sheet"),
        ("quarterly_cashflow", "quarterly_cashflow"),
    ]:
        df = getattr(t, attr)
        if df is not None and not df.empty:
            df = df.T.reset_index().rename(columns={"index": "date"})
            df["ticker"] = ticker
            df["fetched_at"] = now
            result[name] = df
            logger.info("Fetched %s (%d periods) for %s", name, len(df), ticker)

    return result


def save_fundamentals(
    data: dict[str, pd.DataFrame],
    base_dir: Path = DEFAULT_DATA_DIR,
) -> list[Path]:
    """Save fundamental data as parquet.

    Layout: base_dir / TICKER / fundamentals / {info,financials,...}.parquet
    """
    written = []

    # Get ticker from any available df
    sample_df = next(iter(data.values()))
    ticker = sample_df["ticker"].iloc[0]

    dir_path = base_dir / ticker / "fundamentals"
    dir_path.mkdir(parents=True, exist_ok=True)

    for name, df in data.items():
        file_path = dir_path / f"{name}.parquet"
        df.to_parquet(file_path, engine="pyarrow", compression="snappy", index=False)
        logger.info("Wrote %d rows → %s", len(df), file_path)
        written.append(file_path)

    return written


def load_fundamentals(
    ticker: str,
    sheet: str = "info",
    base_dir: Path = DEFAULT_DATA_DIR,
) -> pd.DataFrame:
    """Load stored fundamental data.

    sheet: one of info, financials, balance_sheet, cashflow,
           quarterly_financials, quarterly_balance_sheet, quarterly_cashflow
    """
    path = base_dir / ticker / "fundamentals" / f"{sheet}.parquet"
    if not path.exists():
        raise FileNotFoundError(f"No {sheet} data for {ticker!r}. Run: galedge fundamentals {ticker}")
    return pd.read_parquet(path)
