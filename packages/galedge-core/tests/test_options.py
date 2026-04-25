"""Tests for galedge.options module."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pandas as pd
import pytest

from galedge.options import fetch_options, load_options, save_options


class TestFetchOptions:
    def test_returns_calls_puts_expirations(self, sample_options_calls, sample_options_puts):
        mock_ticker = MagicMock()
        mock_ticker.options = ("2026-01-01", "2026-02-01")
        mock_chain = MagicMock()
        mock_chain.calls = sample_options_calls
        mock_chain.puts = sample_options_puts
        mock_ticker.option_chain.return_value = mock_chain

        with patch("galedge.options.yf.Ticker", return_value=mock_ticker):
            result = fetch_options("AAPL")

        assert "calls" in result
        assert "puts" in result
        assert "expirations" in result

    def test_adds_metadata_columns(self, sample_options_calls, sample_options_puts):
        mock_ticker = MagicMock()
        mock_ticker.options = ("2026-01-01",)
        mock_chain = MagicMock()
        mock_chain.calls = sample_options_calls.copy()
        mock_chain.puts = sample_options_puts.copy()
        mock_ticker.option_chain.return_value = mock_chain

        with patch("galedge.options.yf.Ticker", return_value=mock_ticker):
            result = fetch_options("AAPL")

        assert (result["calls"]["ticker"] == "AAPL").all()
        assert (result["calls"]["expiry"] == "2026-01-01").all()
        assert "fetched_at" in result["calls"].columns

    def test_specific_expiry(self, sample_options_calls, sample_options_puts):
        mock_ticker = MagicMock()
        mock_ticker.options = ("2026-01-01", "2026-02-01")
        mock_chain = MagicMock()
        mock_chain.calls = sample_options_calls.copy()
        mock_chain.puts = sample_options_puts.copy()
        mock_ticker.option_chain.return_value = mock_chain

        with patch("galedge.options.yf.Ticker", return_value=mock_ticker):
            result = fetch_options("AAPL", expiry="2026-02-01")

        mock_ticker.option_chain.assert_called_with("2026-02-01")

    def test_invalid_expiry_raises(self):
        mock_ticker = MagicMock()
        mock_ticker.options = ("2026-01-01",)

        with patch("galedge.options.yf.Ticker", return_value=mock_ticker):
            with pytest.raises(ValueError, match="not available"):
                fetch_options("AAPL", expiry="2099-01-01")

    def test_no_options_raises(self):
        mock_ticker = MagicMock()
        mock_ticker.options = ()

        with patch("galedge.options.yf.Ticker", return_value=mock_ticker):
            with pytest.raises(RuntimeError, match="No options data"):
                fetch_options("FAKESYMBOL")

    def test_expirations_dataframe(self, sample_options_calls, sample_options_puts):
        mock_ticker = MagicMock()
        mock_ticker.options = ("2026-01-01", "2026-02-01", "2026-03-01")
        mock_chain = MagicMock()
        mock_chain.calls = sample_options_calls.copy()
        mock_chain.puts = sample_options_puts.copy()
        mock_ticker.option_chain.return_value = mock_chain

        with patch("galedge.options.yf.Ticker", return_value=mock_ticker):
            result = fetch_options("AAPL")

        assert len(result["expirations"]) == 3


class TestSaveOptions:
    def test_creates_files(self, tmp_data_dir, sample_options_calls, sample_options_puts):
        data = {
            "calls": sample_options_calls.copy(),
            "puts": sample_options_puts.copy(),
            "expirations": pd.DataFrame({"ticker": ["AAPL"], "expiry": ["2026-01-01"]}),
        }
        data["calls"]["ticker"] = "AAPL"
        data["calls"]["expiry"] = "2026-01-01"
        data["calls"]["fetched_at"] = pd.Timestamp.now()
        data["puts"]["ticker"] = "AAPL"
        data["puts"]["expiry"] = "2026-01-01"
        data["puts"]["fetched_at"] = pd.Timestamp.now()

        written = save_options(data, base_dir=tmp_data_dir)

        assert len(written) == 3  # calls, puts, expirations
        assert all(p.exists() for p in written)

    def test_directory_structure(self, tmp_data_dir, sample_options_calls, sample_options_puts):
        data = {
            "calls": sample_options_calls.copy(),
            "puts": sample_options_puts.copy(),
            "expirations": pd.DataFrame({"ticker": ["AAPL"], "expiry": ["2026-01-01"]}),
        }
        data["calls"]["ticker"] = "AAPL"
        data["calls"]["expiry"] = "2026-01-01"
        data["calls"]["fetched_at"] = pd.Timestamp.now()
        data["puts"]["ticker"] = "AAPL"
        data["puts"]["expiry"] = "2026-01-01"
        data["puts"]["fetched_at"] = pd.Timestamp.now()

        written = save_options(data, base_dir=tmp_data_dir)

        calls_path = [p for p in written if "calls" in p.name][0]
        assert "options" in str(calls_path)
        assert "2026" in str(calls_path)
        assert "01" in str(calls_path)


class TestLoadOptions:
    def test_load_calls(self, tmp_data_dir, sample_options_calls, sample_options_puts):
        data = {
            "calls": sample_options_calls.copy(),
            "puts": sample_options_puts.copy(),
            "expirations": pd.DataFrame({"ticker": ["AAPL"], "expiry": ["2026-01-01"]}),
        }
        data["calls"]["ticker"] = "AAPL"
        data["calls"]["expiry"] = "2026-01-01"
        data["calls"]["fetched_at"] = pd.Timestamp.now()
        data["puts"]["ticker"] = "AAPL"
        data["puts"]["expiry"] = "2026-01-01"
        data["puts"]["fetched_at"] = pd.Timestamp.now()

        save_options(data, base_dir=tmp_data_dir)

        df = load_options("AAPL", expiry="2026-01-01", kind="calls", base_dir=tmp_data_dir)
        assert len(df) == 2
        assert "strike" in df.columns

    def test_load_puts(self, tmp_data_dir, sample_options_calls, sample_options_puts):
        data = {
            "calls": sample_options_calls.copy(),
            "puts": sample_options_puts.copy(),
            "expirations": pd.DataFrame({"ticker": ["AAPL"], "expiry": ["2026-01-01"]}),
        }
        for kind in ("calls", "puts"):
            data[kind]["ticker"] = "AAPL"
            data[kind]["expiry"] = "2026-01-01"
            data[kind]["fetched_at"] = pd.Timestamp.now()

        save_options(data, base_dir=tmp_data_dir)

        df = load_options("AAPL", expiry="2026-01-01", kind="puts", base_dir=tmp_data_dir)
        assert len(df) == 2

    def test_load_nonexistent_raises(self, tmp_data_dir):
        with pytest.raises(FileNotFoundError):
            load_options("NOPE", base_dir=tmp_data_dir)

    def test_load_all_expiries(self, tmp_data_dir, sample_options_calls, sample_options_puts):
        data = {
            "calls": sample_options_calls.copy(),
            "puts": sample_options_puts.copy(),
            "expirations": pd.DataFrame({"ticker": ["AAPL"], "expiry": ["2026-01-01"]}),
        }
        for kind in ("calls", "puts"):
            data[kind]["ticker"] = "AAPL"
            data[kind]["expiry"] = "2026-01-01"
            data[kind]["fetched_at"] = pd.Timestamp.now()

        save_options(data, base_dir=tmp_data_dir)

        # Load without specifying expiry
        df = load_options("AAPL", kind="calls", base_dir=tmp_data_dir)
        assert len(df) == 2
