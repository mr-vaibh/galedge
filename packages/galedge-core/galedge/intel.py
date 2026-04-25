"""Fetch and store market intelligence — insiders, institutions, analysts, news."""

from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path

import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)

DEFAULT_DATA_DIR = Path("data")


def fetch_intel(ticker: str) -> dict[str, pd.DataFrame]:
    """Fetch all market intelligence for a ticker.

    Returns dict with keys:
        insider_transactions, institutional_holders,
        mutual_fund_holders, recommendations, news
    """
    t = yf.Ticker(ticker)
    result = {}
    now = datetime.now()

    # Insider transactions
    df = t.insider_transactions
    if df is not None and not df.empty:
        df = df.copy()
        df["ticker"] = ticker
        df["fetched_at"] = now
        result["insider_transactions"] = df
        logger.info("Fetched %d insider transactions for %s", len(df), ticker)

    # Institutional holders
    df = t.institutional_holders
    if df is not None and not df.empty:
        df = df.copy()
        df["ticker"] = ticker
        df["fetched_at"] = now
        result["institutional_holders"] = df
        logger.info("Fetched %d institutional holders for %s", len(df), ticker)

    # Mutual fund holders
    df = t.mutualfund_holders
    if df is not None and not df.empty:
        df = df.copy()
        df["ticker"] = ticker
        df["fetched_at"] = now
        result["mutual_fund_holders"] = df
        logger.info("Fetched %d mutual fund holders for %s", len(df), ticker)

    # Analyst recommendations
    df = t.recommendations
    if df is not None and not df.empty:
        df = df.copy()
        df["ticker"] = ticker
        df["fetched_at"] = now
        result["recommendations"] = df
        logger.info("Fetched %d recommendation periods for %s", len(df), ticker)

    # News
    news_list = t.news
    if news_list:
        rows = []
        for item in news_list:
            content = item.get("content", {})
            rows.append({
                "id": item.get("id", ""),
                "title": content.get("title", ""),
                "publisher": content.get("provider", {}).get("displayName", ""),
                "published_at": content.get("pubDate", ""),
                "summary": content.get("summary", ""),
                "link": content.get("canonicalUrl", {}).get("url", ""),
            })
        if rows:
            df = pd.DataFrame(rows)
            df["ticker"] = ticker
            df["fetched_at"] = now
            result["news"] = df
            logger.info("Fetched %d news items for %s", len(df), ticker)

    return result


def save_intel(
    data: dict[str, pd.DataFrame],
    base_dir: Path = DEFAULT_DATA_DIR,
) -> list[Path]:
    """Save intel data as parquet.

    Layout: base_dir / TICKER / intel / {insider_transactions,...}.parquet
    """
    written = []
    if not data:
        return written

    sample_df = next(iter(data.values()))
    ticker = sample_df["ticker"].iloc[0]

    dir_path = base_dir / ticker / "intel"
    dir_path.mkdir(parents=True, exist_ok=True)

    for name, df in data.items():
        file_path = dir_path / f"{name}.parquet"
        df.to_parquet(file_path, engine="pyarrow", compression="snappy", index=False)
        logger.info("Wrote %d rows → %s", len(df), file_path)
        written.append(file_path)

    return written


def load_intel(
    ticker: str,
    kind: str = "insider_transactions",
    base_dir: Path = DEFAULT_DATA_DIR,
) -> pd.DataFrame:
    """Load stored intel data.

    kind: insider_transactions, institutional_holders, mutual_fund_holders,
          recommendations, news
    """
    path = base_dir / ticker / "intel" / f"{kind}.parquet"
    if not path.exists():
        raise FileNotFoundError(f"No {kind} data for {ticker!r}. Run: galedge intel {ticker}")
    return pd.read_parquet(path)
