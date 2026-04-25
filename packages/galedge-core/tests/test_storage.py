"""Tests for galedge.storage module."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from unittest.mock import MagicMock, patch

import pandas as pd
import pytest

from galedge.fetcher import FetchResult
from galedge.storage import _partition_by_month, load, save


def _make_result(df: pd.DataFrame, ticker: str = "TEST", interval: str = "1d") -> FetchResult:
    """Helper to create a FetchResult from a raw yfinance-style DataFrame."""
    df = df.copy()
    df.columns = [c.lower().replace(" ", "_") for c in df.columns]
    df.index.name = "datetime"
    df = df.reset_index()
    df["ticker"] = ticker
    df["interval"] = interval
    return FetchResult(ticker=ticker, interval=interval, df=df, fetched_at=datetime.now())


class TestPartitionByMonth:
    def test_single_month(self, sample_ohlcv_df):
        result = _make_result(sample_ohlcv_df)
        partitions = _partition_by_month(result.df)

        assert len(partitions) == 1
        assert (2025, 11) in partitions

    def test_multi_month(self, sample_ohlcv_multimonth):
        result = _make_result(sample_ohlcv_multimonth)
        partitions = _partition_by_month(result.df)

        assert len(partitions) == 2
        assert (2025, 11) in partitions
        assert (2025, 12) in partitions

    def test_no_leftover_columns(self, sample_ohlcv_df):
        result = _make_result(sample_ohlcv_df)
        partitions = _partition_by_month(result.df)

        for df in partitions.values():
            assert "_year" not in df.columns
            assert "_month" not in df.columns


class TestSave:
    def test_creates_directory_structure(self, tmp_data_dir, sample_ohlcv_df):
        result = _make_result(sample_ohlcv_df, ticker="AAPL")
        written = save(result, base_dir=tmp_data_dir)

        assert len(written) == 1
        path = written[0]
        assert path.exists()
        assert "AAPL" in str(path)
        assert "2025" in str(path)
        assert "11" in str(path)

    def test_parquet_readable(self, tmp_data_dir, sample_ohlcv_df):
        result = _make_result(sample_ohlcv_df, ticker="AAPL")
        written = save(result, base_dir=tmp_data_dir)

        df = pd.read_parquet(written[0])
        assert len(df) == 5
        assert "open" in df.columns
        assert "ticker" in df.columns

    def test_multimonth_creates_multiple_files(self, tmp_data_dir, sample_ohlcv_multimonth):
        result = _make_result(sample_ohlcv_multimonth, ticker="AAPL")
        written = save(result, base_dir=tmp_data_dir)

        assert len(written) == 2

    def test_append_deduplicates(self, tmp_data_dir, sample_ohlcv_df):
        result = _make_result(sample_ohlcv_df, ticker="AAPL")

        save(result, base_dir=tmp_data_dir, append=True)
        save(result, base_dir=tmp_data_dir, append=True)

        df = pd.read_parquet(tmp_data_dir / "AAPL" / "2025" / "11" / "AAPL_1d.parquet")
        assert len(df) == 5  # not 10

    def test_append_adds_new_rows(self, tmp_data_dir):
        dates1 = pd.date_range("2025-11-03", periods=3, freq="B", tz="America/New_York")
        dates2 = pd.date_range("2025-11-06", periods=3, freq="B", tz="America/New_York")

        def make_df(dates):
            return pd.DataFrame(
                {
                    "Open": [150.0] * len(dates),
                    "High": [155.0] * len(dates),
                    "Low": [148.0] * len(dates),
                    "Close": [153.0] * len(dates),
                    "Volume": [1000000] * len(dates),
                    "Dividends": [0.0] * len(dates),
                    "Stock Splits": [0.0] * len(dates),
                },
                index=dates,
            )

        make_df(dates1).index.name = "Date"
        df1 = make_df(dates1)
        df1.index.name = "Date"
        df2 = make_df(dates2)
        df2.index.name = "Date"

        save(_make_result(df1, "AAPL"), base_dir=tmp_data_dir)
        save(_make_result(df2, "AAPL"), base_dir=tmp_data_dir)

        df = pd.read_parquet(tmp_data_dir / "AAPL" / "2025" / "11" / "AAPL_1d.parquet")
        assert len(df) == 6

    def test_no_append_overwrites(self, tmp_data_dir, sample_ohlcv_df):
        result = _make_result(sample_ohlcv_df, ticker="AAPL")

        save(result, base_dir=tmp_data_dir, append=True)
        save(result, base_dir=tmp_data_dir, append=False)

        df = pd.read_parquet(tmp_data_dir / "AAPL" / "2025" / "11" / "AAPL_1d.parquet")
        assert len(df) == 5

    def test_filename_includes_interval(self, tmp_data_dir, sample_ohlcv_df):
        result = _make_result(sample_ohlcv_df, ticker="AAPL", interval="5m")
        written = save(result, base_dir=tmp_data_dir)

        assert written[0].name == "AAPL_5m.parquet"

    def test_sorted_by_datetime(self, tmp_data_dir, sample_ohlcv_df):
        result = _make_result(sample_ohlcv_df, ticker="AAPL")
        # Shuffle the rows
        result.df = result.df.sample(frac=1, random_state=42)

        written = save(result, base_dir=tmp_data_dir)
        df = pd.read_parquet(written[0])
        datetimes = pd.to_datetime(df["datetime"])
        assert datetimes.is_monotonic_increasing


class TestLoad:
    def test_load_all(self, tmp_data_dir, sample_ohlcv_multimonth):
        result = _make_result(sample_ohlcv_multimonth, ticker="AAPL")
        save(result, base_dir=tmp_data_dir)

        df = load("AAPL", interval="1d", base_dir=tmp_data_dir)
        assert len(df) == 6

    def test_load_by_year(self, tmp_data_dir, sample_ohlcv_multimonth):
        result = _make_result(sample_ohlcv_multimonth, ticker="AAPL")
        save(result, base_dir=tmp_data_dir)

        df = load("AAPL", interval="1d", year=2025, base_dir=tmp_data_dir)
        assert len(df) == 6

    def test_load_by_year_month(self, tmp_data_dir, sample_ohlcv_multimonth):
        result = _make_result(sample_ohlcv_multimonth, ticker="AAPL")
        save(result, base_dir=tmp_data_dir)

        df = load("AAPL", interval="1d", year=2025, month=11, base_dir=tmp_data_dir)
        # Only Nov rows
        assert len(df) < 6
        assert len(df) > 0

    def test_load_nonexistent_ticker_raises(self, tmp_data_dir):
        with pytest.raises(FileNotFoundError, match="No data found"):
            load("NOPE", base_dir=tmp_data_dir)

    def test_load_nonexistent_interval_raises(self, tmp_data_dir, sample_ohlcv_df):
        result = _make_result(sample_ohlcv_df, ticker="AAPL")
        save(result, base_dir=tmp_data_dir)

        with pytest.raises(FileNotFoundError, match="No parquet files"):
            load("AAPL", interval="5m", base_dir=tmp_data_dir)

    def test_load_deduplicates(self, tmp_data_dir, sample_ohlcv_df):
        result = _make_result(sample_ohlcv_df, ticker="AAPL")
        save(result, base_dir=tmp_data_dir)

        df = load("AAPL", base_dir=tmp_data_dir)
        assert df["datetime"].is_unique

    def test_load_sorted(self, tmp_data_dir, sample_ohlcv_multimonth):
        result = _make_result(sample_ohlcv_multimonth, ticker="AAPL")
        save(result, base_dir=tmp_data_dir)

        df = load("AAPL", base_dir=tmp_data_dir)
        datetimes = pd.to_datetime(df["datetime"])
        assert datetimes.is_monotonic_increasing
