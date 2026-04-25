"""Tests for galedge.fundamentals module."""

from __future__ import annotations

from unittest.mock import MagicMock, PropertyMock, patch

import pandas as pd
import pytest

from galedge.fundamentals import fetch_fundamentals, load_fundamentals, save_fundamentals


def _mock_ticker():
    """Create a mock yfinance Ticker with fundamental data."""
    mock = MagicMock()

    mock.info = {
        "marketCap": 3000000000000,
        "trailingPE": 30.0,
        "forwardPE": 25.0,
        "trailingEps": 6.5,
        "sector": "Technology",
        "industry": "Consumer Electronics",
    }

    dates = pd.DatetimeIndex([pd.Timestamp("2025-09-30"), pd.Timestamp("2024-09-30")])
    mock.financials = pd.DataFrame(
        {"Total Revenue": [400e9, 380e9], "Net Income": [100e9, 95e9]},
        index=dates,
    ).T

    mock.balance_sheet = pd.DataFrame(
        {"Total Assets": [350e9, 340e9], "Total Debt": [120e9, 110e9]},
        index=dates,
    ).T

    mock.cashflow = pd.DataFrame(
        {"Free Cash Flow": [110e9, 105e9], "Capital Expenditure": [-10e9, -11e9]},
        index=dates,
    ).T

    mock.quarterly_financials = pd.DataFrame(
        {"Total Revenue": [100e9, 95e9]},
        index=dates,
    ).T

    mock.quarterly_balance_sheet = pd.DataFrame(
        {"Total Assets": [350e9, 340e9]},
        index=dates,
    ).T

    mock.quarterly_cashflow = pd.DataFrame(
        {"Free Cash Flow": [28e9, 26e9]},
        index=dates,
    ).T

    return mock


class TestFetchFundamentals:
    def test_returns_all_sheets(self):
        with patch("galedge.fundamentals.yf.Ticker", return_value=_mock_ticker()):
            result = fetch_fundamentals("AAPL")

        expected_keys = {
            "info", "financials", "balance_sheet", "cashflow",
            "quarterly_financials", "quarterly_balance_sheet", "quarterly_cashflow",
        }
        assert set(result.keys()) == expected_keys

    def test_info_has_metadata(self):
        with patch("galedge.fundamentals.yf.Ticker", return_value=_mock_ticker()):
            result = fetch_fundamentals("AAPL")

        info = result["info"]
        assert (info["ticker"] == "AAPL").all()
        assert "fetched_at" in info.columns
        assert "marketCap" in info.columns

    def test_financials_transposed(self):
        with patch("galedge.fundamentals.yf.Ticker", return_value=_mock_ticker()):
            result = fetch_fundamentals("AAPL")

        fin = result["financials"]
        # Should have dates as rows, not columns
        assert "date" in fin.columns
        assert len(fin) == 2

    def test_adds_ticker_column(self):
        with patch("galedge.fundamentals.yf.Ticker", return_value=_mock_ticker()):
            result = fetch_fundamentals("MSFT")

        for name, df in result.items():
            assert (df["ticker"] == "MSFT").all(), f"{name} missing ticker column"

    def test_handles_missing_data(self):
        mock = MagicMock()
        mock.info = {"marketCap": 1e9}
        mock.financials = pd.DataFrame()
        mock.balance_sheet = pd.DataFrame()
        mock.cashflow = pd.DataFrame()
        mock.quarterly_financials = pd.DataFrame()
        mock.quarterly_balance_sheet = pd.DataFrame()
        mock.quarterly_cashflow = pd.DataFrame()

        with patch("galedge.fundamentals.yf.Ticker", return_value=mock):
            result = fetch_fundamentals("SMALL")

        assert "info" in result
        # Other sheets should be absent since they were empty
        assert "financials" not in result


class TestSaveFundamentals:
    def test_saves_all_sheets(self, tmp_data_dir):
        with patch("galedge.fundamentals.yf.Ticker", return_value=_mock_ticker()):
            data = fetch_fundamentals("AAPL")

        written = save_fundamentals(data, base_dir=tmp_data_dir)
        assert len(written) == 7
        assert all(p.exists() for p in written)

    def test_directory_structure(self, tmp_data_dir):
        with patch("galedge.fundamentals.yf.Ticker", return_value=_mock_ticker()):
            data = fetch_fundamentals("AAPL")

        written = save_fundamentals(data, base_dir=tmp_data_dir)

        for p in written:
            assert "AAPL" in str(p)
            assert "fundamentals" in str(p)
            assert p.suffix == ".parquet"

    def test_parquet_readable(self, tmp_data_dir):
        with patch("galedge.fundamentals.yf.Ticker", return_value=_mock_ticker()):
            data = fetch_fundamentals("AAPL")

        save_fundamentals(data, base_dir=tmp_data_dir)

        df = pd.read_parquet(tmp_data_dir / "AAPL" / "fundamentals" / "info.parquet")
        assert "marketCap" in df.columns


class TestLoadFundamentals:
    def test_load_info(self, tmp_data_dir):
        with patch("galedge.fundamentals.yf.Ticker", return_value=_mock_ticker()):
            data = fetch_fundamentals("AAPL")
        save_fundamentals(data, base_dir=tmp_data_dir)

        df = load_fundamentals("AAPL", sheet="info", base_dir=tmp_data_dir)
        assert "marketCap" in df.columns

    def test_load_financials(self, tmp_data_dir):
        with patch("galedge.fundamentals.yf.Ticker", return_value=_mock_ticker()):
            data = fetch_fundamentals("AAPL")
        save_fundamentals(data, base_dir=tmp_data_dir)

        df = load_fundamentals("AAPL", sheet="financials", base_dir=tmp_data_dir)
        assert "date" in df.columns
        assert len(df) == 2

    def test_load_nonexistent_raises(self, tmp_data_dir):
        with pytest.raises(FileNotFoundError):
            load_fundamentals("NOPE", base_dir=tmp_data_dir)

    def test_load_missing_sheet_raises(self, tmp_data_dir):
        with patch("galedge.fundamentals.yf.Ticker", return_value=_mock_ticker()):
            data = fetch_fundamentals("AAPL")
        save_fundamentals(data, base_dir=tmp_data_dir)

        # This sheet exists, just testing a bad name
        with pytest.raises(FileNotFoundError):
            load_fundamentals("AAPL", sheet="nonexistent_sheet", base_dir=tmp_data_dir)
