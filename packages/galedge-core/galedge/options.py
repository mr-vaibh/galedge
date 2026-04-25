"""Fetch and store options chain data."""

from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path

import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)

DEFAULT_DATA_DIR = Path("data")


def fetch_options(
    ticker: str,
    expiry: str | None = None,
) -> dict[str, pd.DataFrame]:
    """Fetch options chain for a ticker.

    Args:
        ticker: Stock symbol.
        expiry: Specific expiration date (YYYY-MM-DD). If None, fetches nearest expiry.

    Returns:
        Dict with keys "calls", "puts", "expirations".
    """
    t = yf.Ticker(ticker)
    expirations = t.options

    if not expirations:
        raise RuntimeError(f"No options data available for {ticker!r}")

    if expiry is None:
        expiry = expirations[0]
    elif expiry not in expirations:
        raise ValueError(f"Expiry {expiry!r} not available. Choose from: {list(expirations)}")

    logger.info("Fetching options chain for %s expiry=%s", ticker, expiry)
    chain = t.option_chain(expiry)

    calls = chain.calls.copy()
    puts = chain.puts.copy()

    for df in (calls, puts):
        df["ticker"] = ticker
        df["expiry"] = expiry
        df["fetched_at"] = datetime.now()

    logger.info("Fetched %d calls, %d puts for %s", len(calls), len(puts), ticker)

    exp_df = pd.DataFrame({"ticker": ticker, "expiry": list(expirations)})

    return {"calls": calls, "puts": puts, "expirations": exp_df}


def save_options(
    data: dict[str, pd.DataFrame],
    base_dir: Path = DEFAULT_DATA_DIR,
) -> list[Path]:
    """Save options data as parquet files.

    Layout: base_dir / TICKER / options / YYYY / MM / {calls,puts}_EXPIRY.parquet
    """
    written = []
    ticker = data["calls"]["ticker"].iloc[0]
    expiry = data["calls"]["expiry"].iloc[0]
    exp_dt = pd.to_datetime(expiry)

    dir_path = base_dir / ticker / "options" / f"{exp_dt.year:04d}" / f"{exp_dt.month:02d}"
    dir_path.mkdir(parents=True, exist_ok=True)

    for kind in ("calls", "puts"):
        df = data[kind]
        file_path = dir_path / f"{kind}_{expiry}.parquet"
        df.to_parquet(file_path, engine="pyarrow", compression="snappy", index=False)
        logger.info("Wrote %d rows → %s", len(df), file_path)
        written.append(file_path)

    # Save expirations list
    exp_path = base_dir / ticker / "options" / "expirations.parquet"
    data["expirations"].to_parquet(exp_path, engine="pyarrow", compression="snappy", index=False)
    written.append(exp_path)

    return written


def load_options(
    ticker: str,
    expiry: str | None = None,
    kind: str = "calls",
    base_dir: Path = DEFAULT_DATA_DIR,
) -> pd.DataFrame:
    """Load stored options data."""
    opts_dir = base_dir / ticker / "options"
    if not opts_dir.exists():
        raise FileNotFoundError(f"No options data for {ticker!r}")

    if expiry:
        exp_dt = pd.to_datetime(expiry)
        path = opts_dir / f"{exp_dt.year:04d}" / f"{exp_dt.month:02d}" / f"{kind}_{expiry}.parquet"
        if not path.exists():
            raise FileNotFoundError(f"No {kind} data for {ticker} expiry {expiry}")
        return pd.read_parquet(path)

    # Load all available
    files = sorted(opts_dir.glob(f"**/{kind}_*.parquet"))
    if not files:
        raise FileNotFoundError(f"No {kind} data found for {ticker}")
    return pd.concat([pd.read_parquet(f) for f in files], ignore_index=True)
