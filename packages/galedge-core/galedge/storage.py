"""Save fetched data as compressed parquet files in YYYY/MM folder structure."""

from __future__ import annotations

import logging
from pathlib import Path

import pandas as pd

from galedge.fetcher import FetchResult

logger = logging.getLogger(__name__)

DEFAULT_DATA_DIR = Path("data")


def _partition_by_month(df: pd.DataFrame) -> dict[tuple[int, int], pd.DataFrame]:
    """Split a dataframe into (year, month) groups based on the datetime column."""
    df = df.copy()
    dt = pd.to_datetime(df["datetime"])
    df["_year"] = dt.dt.year
    df["_month"] = dt.dt.month

    partitions = {}
    for (year, month), group in df.groupby(["_year", "_month"]):
        partitions[(int(year), int(month))] = group.drop(columns=["_year", "_month"])

    return partitions


def save(
    result: FetchResult,
    base_dir: Path = DEFAULT_DATA_DIR,
    append: bool = True,
) -> list[Path]:
    """Save a FetchResult as compressed parquet files partitioned by YYYY/MM.

    File layout:
        base_dir / TICKER / YYYY / MM / TICKER_INTERVAL.parquet

    Args:
        result: The fetched data.
        base_dir: Root directory for stored data.
        append: If True and a file already exists, merge new rows (deduplicated).

    Returns:
        List of file paths written.
    """
    written: list[Path] = []
    partitions = _partition_by_month(result.df)

    for (year, month), df in partitions.items():
        dir_path = base_dir / result.ticker / f"{year:04d}" / f"{month:02d}"
        dir_path.mkdir(parents=True, exist_ok=True)

        filename = f"{result.ticker}_{result.interval}.parquet"
        file_path = dir_path / filename

        if append and file_path.exists():
            existing = pd.read_parquet(file_path)
            df = pd.concat([existing, df], ignore_index=True)
            df = df.drop_duplicates(subset=["datetime", "ticker"], keep="last")

        df = df.sort_values("datetime").reset_index(drop=True)
        df.to_parquet(file_path, engine="pyarrow", compression="snappy", index=False)
        logger.info("Wrote %d rows → %s", len(df), file_path)
        written.append(file_path)

    return written


def save_multiple(
    results: list[FetchResult],
    base_dir: Path = DEFAULT_DATA_DIR,
    append: bool = True,
) -> list[Path]:
    """Save multiple FetchResults."""
    written: list[Path] = []
    for result in results:
        written.extend(save(result, base_dir=base_dir, append=append))
    return written


def load(
    ticker: str,
    interval: str = "1d",
    year: int | None = None,
    month: int | None = None,
    base_dir: Path = DEFAULT_DATA_DIR,
) -> pd.DataFrame:
    """Load stored parquet data back into a DataFrame.

    Args:
        ticker: Stock symbol.
        interval: The interval that was fetched.
        year: Optional — filter to a specific year.
        month: Optional — filter to a specific month (requires year).
        base_dir: Root data directory.

    Returns:
        Combined DataFrame from all matching parquet files.
    """
    ticker_dir = base_dir / ticker
    if not ticker_dir.exists():
        raise FileNotFoundError(f"No data found for {ticker!r} in {base_dir}")

    filename = f"{ticker}_{interval}.parquet"

    if year and month:
        pattern = f"{year:04d}/{month:02d}/{filename}"
    elif year:
        pattern = f"{year:04d}/**/{filename}"
    else:
        pattern = f"**/{filename}"

    files = sorted(ticker_dir.glob(pattern))
    if not files:
        raise FileNotFoundError(f"No parquet files matching {pattern} in {ticker_dir}")

    dfs = [pd.read_parquet(f) for f in files]
    combined = pd.concat(dfs, ignore_index=True)
    combined = combined.drop_duplicates(subset=["datetime", "ticker"], keep="last")
    return combined.sort_values("datetime").reset_index(drop=True)
