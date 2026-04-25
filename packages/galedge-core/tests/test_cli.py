"""Tests for galedge.cli module."""

from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path
from unittest.mock import MagicMock, patch

import pandas as pd
import pytest

from galedge.cli import main
from galedge.fetcher import FetchResult


def _make_fetch_result(ticker="AAPL"):
    """Create a minimal FetchResult for CLI testing."""
    dates = pd.date_range("2025-11-01", periods=5, freq="B", tz="America/New_York")
    df = pd.DataFrame({
        "datetime": dates,
        "open": [150.0, 151.0, 149.0, 152.0, 153.0],
        "high": [155.0, 156.0, 154.0, 157.0, 158.0],
        "low": [148.0, 149.0, 147.0, 150.0, 151.0],
        "close": [153.0, 154.0, 152.0, 155.0, 156.0],
        "volume": [1000000, 1100000, 900000, 1200000, 1050000],
        "dividends": [0.0] * 5,
        "stock_splits": [0.0] * 5,
        "ticker": [ticker] * 5,
        "interval": ["1d"] * 5,
    })
    return FetchResult(ticker=ticker, interval="1d", df=df, fetched_at=datetime.now())


class TestCLINoArgs:
    def test_no_command_shows_help(self, capsys):
        with pytest.raises(SystemExit) as exc_info:
            main([])
        assert exc_info.value.code == 1


class TestCLIFetch:
    def test_fetch_saves_files(self, tmp_path, capsys):
        result = _make_fetch_result()
        with patch("galedge.cli.fetch_multiple", return_value=[result]):
            with patch("galedge.cli.save_multiple", return_value=[tmp_path / "test.parquet"]) as mock_save:
                main(["fetch", "AAPL", "-p", "1mo", "-o", str(tmp_path)])

        mock_save.assert_called_once()
        captured = capsys.readouterr()
        assert "Done!" in captured.out

    def test_fetch_no_data_exits(self, capsys):
        with patch("galedge.cli.fetch_multiple", return_value=[]):
            with pytest.raises(SystemExit) as exc_info:
                main(["fetch", "FAKESYM", "-o", "/tmp/test"])
            assert exc_info.value.code == 1

    def test_fetch_uppercases_tickers(self, tmp_path):
        result = _make_fetch_result()
        with patch("galedge.cli.fetch_multiple", return_value=[result]) as mock_fetch:
            with patch("galedge.cli.save_multiple", return_value=[]):
                main(["fetch", "aapl", "msft", "-o", str(tmp_path)])

        call_args = mock_fetch.call_args
        assert call_args.kwargs["tickers"] == ["AAPL", "MSFT"]


class TestCLIShow:
    def test_show_displays_data(self, tmp_path, capsys):
        result = _make_fetch_result()

        # Save real data first
        from galedge.storage import save
        save(result, base_dir=tmp_path)

        main(["show", "AAPL", "-o", str(tmp_path)])

        captured = capsys.readouterr()
        assert "AAPL" in captured.out
        assert "rows" in captured.out

    def test_show_tail(self, tmp_path, capsys):
        result = _make_fetch_result()
        from galedge.storage import save
        save(result, base_dir=tmp_path)

        main(["show", "AAPL", "-t", "-n", "2", "-o", str(tmp_path)])

        captured = capsys.readouterr()
        assert "2 rows" in captured.out

    def test_show_missing_data_exits(self, tmp_path, capsys):
        with pytest.raises(SystemExit) as exc_info:
            main(["show", "NOPE", "-o", str(tmp_path)])
        assert exc_info.value.code == 1

        captured = capsys.readouterr()
        assert "No 1d data found" in captured.err

    def test_show_missing_interval_exits(self, tmp_path, capsys):
        result = _make_fetch_result()
        from galedge.storage import save
        save(result, base_dir=tmp_path)

        with pytest.raises(SystemExit) as exc_info:
            main(["show", "AAPL", "-i", "5m", "-o", str(tmp_path)])
        assert exc_info.value.code == 1


class TestCLIOptions:
    def test_options_fetch_and_display(self, tmp_path, capsys):
        calls_df = pd.DataFrame({
            "contractSymbol": ["AAPL260101C00150000"],
            "strike": [150.0],
            "lastPrice": [10.0],
            "bid": [9.5],
            "ask": [10.5],
            "volume": [500],
            "openInterest": [2000],
            "impliedVolatility": [0.35],
            "inTheMoney": [True],
        })
        puts_df = calls_df.copy()
        exp_df = pd.DataFrame({"ticker": ["AAPL"], "expiry": ["2026-01-01"]})

        mock_data = {"calls": calls_df, "puts": puts_df, "expirations": exp_df}

        # Add metadata so save works
        for kind in ("calls", "puts"):
            mock_data[kind]["ticker"] = "AAPL"
            mock_data[kind]["expiry"] = "2026-01-01"
            mock_data[kind]["fetched_at"] = pd.Timestamp.now()

        with patch("galedge.options.fetch_options", return_value=mock_data):
            with patch("galedge.options.save_options", return_value=[]):
                with patch("galedge.options.load_options", return_value=calls_df):
                    main(["options", "AAPL", "-o", str(tmp_path)])

        captured = capsys.readouterr()
        assert "AAPL" in captured.out


class TestCLIFundamentals:
    def test_fundamentals_info(self, tmp_path, capsys):
        info_df = pd.DataFrame([{
            "marketCap": 3e12,
            "trailingPE": 30.0,
            "forwardPE": 25.0,
            "trailingEps": 6.5,
            "sector": "Technology",
            "industry": "Consumer Electronics",
            "ticker": "AAPL",
            "fetched_at": pd.Timestamp.now(),
        }])

        mock_data = {"info": info_df}

        with patch("galedge.fundamentals.fetch_fundamentals", return_value=mock_data):
            with patch("galedge.fundamentals.save_fundamentals", return_value=[]):
                with patch("galedge.fundamentals.load_fundamentals", return_value=info_df):
                    main(["fundamentals", "AAPL", "-o", str(tmp_path)])

        captured = capsys.readouterr()
        assert "AAPL" in captured.out
        assert "Valuation" in captured.out


class TestCLIIntel:
    def test_intel_all(self, tmp_path, capsys):
        rec_df = pd.DataFrame({
            "period": ["0m"],
            "strongBuy": [7],
            "buy": [24],
            "hold": [14],
            "sell": [1],
            "strongSell": [1],
            "ticker": ["AAPL"],
            "fetched_at": [pd.Timestamp.now()],
        })

        mock_data = {"recommendations": rec_df}

        with patch("galedge.intel.fetch_intel", return_value=mock_data):
            with patch("galedge.intel.save_intel", return_value=[]):
                with patch("galedge.intel.load_intel", return_value=rec_df):
                    main(["intel", "AAPL", "-k", "recommendations", "-o", str(tmp_path)])

        captured = capsys.readouterr()
        assert "Recommendations" in captured.out
