"""Tests for galedge.fetcher module."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pandas as pd
import pytest

from galedge.fetcher import VALID_INTERVALS, fetch, fetch_multiple


class TestFetch:
    def test_returns_fetch_result(self, sample_ohlcv_df):
        mock_ticker = MagicMock()
        mock_ticker.history.return_value = sample_ohlcv_df

        with patch("galedge.fetcher.yf.Ticker", return_value=mock_ticker):
            result = fetch("AAPL", interval="1d", period="1mo")

        assert result.ticker == "AAPL"
        assert result.interval == "1d"
        assert isinstance(result.df, pd.DataFrame)
        assert result.fetched_at is not None

    def test_normalizes_columns(self, sample_ohlcv_df):
        mock_ticker = MagicMock()
        mock_ticker.history.return_value = sample_ohlcv_df

        with patch("galedge.fetcher.yf.Ticker", return_value=mock_ticker):
            result = fetch("AAPL")

        cols = result.df.columns.tolist()
        assert "open" in cols
        assert "close" in cols
        assert "stock_splits" in cols
        # No uppercase
        assert all(c == c.lower() for c in cols)

    def test_adds_metadata_columns(self, sample_ohlcv_df):
        mock_ticker = MagicMock()
        mock_ticker.history.return_value = sample_ohlcv_df

        with patch("galedge.fetcher.yf.Ticker", return_value=mock_ticker):
            result = fetch("MSFT", interval="5m", period="5d")

        assert (result.df["ticker"] == "MSFT").all()
        assert (result.df["interval"] == "5m").all()

    def test_resets_datetime_index(self, sample_ohlcv_df):
        mock_ticker = MagicMock()
        mock_ticker.history.return_value = sample_ohlcv_df

        with patch("galedge.fetcher.yf.Ticker", return_value=mock_ticker):
            result = fetch("AAPL")

        assert "datetime" in result.df.columns
        assert result.df.index.name != "datetime"

    def test_invalid_interval_raises(self):
        with pytest.raises(ValueError, match="Invalid interval"):
            fetch("AAPL", interval="3m")

    def test_empty_data_raises(self):
        mock_ticker = MagicMock()
        mock_ticker.history.return_value = pd.DataFrame()

        with patch("galedge.fetcher.yf.Ticker", return_value=mock_ticker):
            with pytest.raises(RuntimeError, match="No data returned"):
                fetch("FAKESYMBOL123")

    def test_default_period_matches_interval(self, sample_ohlcv_df):
        mock_ticker = MagicMock()
        mock_ticker.history.return_value = sample_ohlcv_df

        with patch("galedge.fetcher.yf.Ticker", return_value=mock_ticker):
            fetch("AAPL", interval="1h")

        # Should have used period="730d" for 1h interval
        call_kwargs = mock_ticker.history.call_args
        assert call_kwargs.kwargs.get("period") == "730d" or call_kwargs[1].get("period") == "730d"

    def test_start_overrides_period(self, sample_ohlcv_df):
        mock_ticker = MagicMock()
        mock_ticker.history.return_value = sample_ohlcv_df

        with patch("galedge.fetcher.yf.Ticker", return_value=mock_ticker):
            fetch("AAPL", interval="1d", start="2025-01-01")

        call_kwargs = mock_ticker.history.call_args[1]
        assert call_kwargs["start"] == "2025-01-01"
        assert call_kwargs["period"] is None

    def test_row_count_matches(self, sample_ohlcv_df):
        mock_ticker = MagicMock()
        mock_ticker.history.return_value = sample_ohlcv_df

        with patch("galedge.fetcher.yf.Ticker", return_value=mock_ticker):
            result = fetch("AAPL")

        assert len(result.df) == len(sample_ohlcv_df)


class TestFetchMultiple:
    def test_fetches_multiple_tickers(self, sample_ohlcv_df):
        mock_ticker = MagicMock()
        mock_ticker.history.return_value = sample_ohlcv_df

        with patch("galedge.fetcher.yf.Ticker", return_value=mock_ticker):
            results = fetch_multiple(["AAPL", "MSFT"])

        assert len(results) == 2
        assert results[0].ticker == "AAPL"
        assert results[1].ticker == "MSFT"

    def test_skips_failed_tickers(self, sample_ohlcv_df):
        call_count = 0

        def mock_ticker_factory(symbol):
            nonlocal call_count
            call_count += 1
            mock = MagicMock()
            if symbol == "BAD":
                mock.history.return_value = pd.DataFrame()
            else:
                mock.history.return_value = sample_ohlcv_df
            return mock

        with patch("galedge.fetcher.yf.Ticker", side_effect=mock_ticker_factory):
            results = fetch_multiple(["AAPL", "BAD", "MSFT"])

        assert len(results) == 2
        tickers = [r.ticker for r in results]
        assert "AAPL" in tickers
        assert "MSFT" in tickers

    def test_empty_list_returns_empty(self):
        results = fetch_multiple([])
        assert results == []


class TestValidIntervals:
    def test_all_expected_intervals_present(self):
        expected = {"1m", "2m", "5m", "15m", "30m", "1h", "1d", "1wk", "1mo"}
        assert set(VALID_INTERVALS) == expected
