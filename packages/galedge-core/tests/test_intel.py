"""Tests for galedge.intel module."""

from __future__ import annotations

from datetime import datetime
from unittest.mock import MagicMock, patch

import pandas as pd
import pytest

from galedge.intel import fetch_intel, load_intel, save_intel


def _mock_ticker():
    """Create a mock yfinance Ticker with intel data."""
    mock = MagicMock()

    mock.insider_transactions = pd.DataFrame({
        "Shares": [10000, 5000],
        "URL": ["", ""],
        "Text": ["", ""],
        "Insider": ["Tim Cook", "Jeff Williams"],
        "Position": ["CEO", "COO"],
        "Transaction": ["Sale", "Purchase"],
        "Start Date": [datetime(2025, 12, 1), datetime(2025, 11, 15)],
        "Ownership": ["D", "D"],
        "Value": [2500000.0, 1200000.0],
    })

    mock.institutional_holders = pd.DataFrame({
        "Date Reported": [datetime(2025, 12, 31)],
        "Holder": ["Vanguard Group Inc"],
        "pctHeld": [0.08],
        "Shares": [1400000000],
        "Value": [350000000000],
        "pctChange": [0.02],
    })

    mock.mutualfund_holders = pd.DataFrame({
        "Date Reported": [datetime(2025, 12, 31)],
        "Holder": ["Vanguard Total Stock Mkt Idx"],
        "pctHeld": [0.03],
        "Shares": [500000000],
        "Value": [125000000000],
    })

    mock.recommendations = pd.DataFrame({
        "period": ["0m", "-1m"],
        "strongBuy": [7, 6],
        "buy": [24, 25],
        "hold": [14, 15],
        "sell": [1, 1],
        "strongSell": [1, 1],
    })

    mock.news = [
        {
            "id": "1",
            "content": {
                "title": "Apple Reports Record Quarter",
                "provider": {"displayName": "Reuters"},
                "pubDate": "2025-12-20T10:00:00Z",
                "summary": "Apple exceeded expectations.",
                "canonicalUrl": {"url": "https://example.com/article1"},
            },
        },
        {
            "id": "2",
            "content": {
                "title": "Tech Stocks Rally",
                "provider": {"displayName": "Bloomberg"},
                "pubDate": "2025-12-19T15:00:00Z",
                "summary": "Markets surge.",
                "canonicalUrl": {"url": "https://example.com/article2"},
            },
        },
    ]

    return mock


class TestFetchIntel:
    def test_returns_all_sections(self):
        with patch("galedge.intel.yf.Ticker", return_value=_mock_ticker()):
            result = fetch_intel("AAPL")

        expected = {
            "insider_transactions", "institutional_holders",
            "mutual_fund_holders", "recommendations", "news",
        }
        assert set(result.keys()) == expected

    def test_adds_ticker_column(self):
        with patch("galedge.intel.yf.Ticker", return_value=_mock_ticker()):
            result = fetch_intel("AAPL")

        for name, df in result.items():
            assert (df["ticker"] == "AAPL").all(), f"{name} missing ticker"

    def test_adds_fetched_at(self):
        with patch("galedge.intel.yf.Ticker", return_value=_mock_ticker()):
            result = fetch_intel("AAPL")

        for name, df in result.items():
            assert "fetched_at" in df.columns, f"{name} missing fetched_at"

    def test_news_parsed_correctly(self):
        with patch("galedge.intel.yf.Ticker", return_value=_mock_ticker()):
            result = fetch_intel("AAPL")

        news = result["news"]
        assert len(news) == 2
        assert "title" in news.columns
        assert "publisher" in news.columns
        assert "link" in news.columns
        assert news.iloc[0]["title"] == "Apple Reports Record Quarter"

    def test_handles_empty_data(self):
        mock = MagicMock()
        mock.insider_transactions = pd.DataFrame()
        mock.institutional_holders = pd.DataFrame()
        mock.mutualfund_holders = pd.DataFrame()
        mock.recommendations = pd.DataFrame()
        mock.news = []

        with patch("galedge.intel.yf.Ticker", return_value=mock):
            result = fetch_intel("SMALL")

        assert result == {}

    def test_handles_partial_data(self):
        mock = MagicMock()
        mock.insider_transactions = pd.DataFrame()
        mock.institutional_holders = pd.DataFrame()
        mock.mutualfund_holders = pd.DataFrame()
        mock.recommendations = pd.DataFrame({
            "period": ["0m"],
            "strongBuy": [3],
            "buy": [10],
            "hold": [5],
            "sell": [1],
            "strongSell": [0],
        })
        mock.news = []

        with patch("galedge.intel.yf.Ticker", return_value=mock):
            result = fetch_intel("PARTIAL")

        assert "recommendations" in result
        assert len(result) == 1


class TestSaveIntel:
    def test_saves_all_sections(self, tmp_data_dir):
        with patch("galedge.intel.yf.Ticker", return_value=_mock_ticker()):
            data = fetch_intel("AAPL")

        written = save_intel(data, base_dir=tmp_data_dir)
        assert len(written) == 5
        assert all(p.exists() for p in written)

    def test_directory_structure(self, tmp_data_dir):
        with patch("galedge.intel.yf.Ticker", return_value=_mock_ticker()):
            data = fetch_intel("AAPL")

        written = save_intel(data, base_dir=tmp_data_dir)

        for p in written:
            assert "AAPL" in str(p)
            assert "intel" in str(p)

    def test_empty_data_returns_empty(self, tmp_data_dir):
        written = save_intel({}, base_dir=tmp_data_dir)
        assert written == []


class TestLoadIntel:
    def test_load_insider_transactions(self, tmp_data_dir):
        with patch("galedge.intel.yf.Ticker", return_value=_mock_ticker()):
            data = fetch_intel("AAPL")
        save_intel(data, base_dir=tmp_data_dir)

        df = load_intel("AAPL", kind="insider_transactions", base_dir=tmp_data_dir)
        assert len(df) == 2
        assert "Insider" in df.columns

    def test_load_recommendations(self, tmp_data_dir):
        with patch("galedge.intel.yf.Ticker", return_value=_mock_ticker()):
            data = fetch_intel("AAPL")
        save_intel(data, base_dir=tmp_data_dir)

        df = load_intel("AAPL", kind="recommendations", base_dir=tmp_data_dir)
        assert "strongBuy" in df.columns

    def test_load_news(self, tmp_data_dir):
        with patch("galedge.intel.yf.Ticker", return_value=_mock_ticker()):
            data = fetch_intel("AAPL")
        save_intel(data, base_dir=tmp_data_dir)

        df = load_intel("AAPL", kind="news", base_dir=tmp_data_dir)
        assert len(df) == 2

    def test_load_nonexistent_raises(self, tmp_data_dir):
        with pytest.raises(FileNotFoundError):
            load_intel("NOPE", base_dir=tmp_data_dir)

    def test_load_missing_kind_raises(self, tmp_data_dir):
        with patch("galedge.intel.yf.Ticker", return_value=_mock_ticker()):
            data = fetch_intel("AAPL")
        save_intel(data, base_dir=tmp_data_dir)

        # This kind exists, but let's try one that might not
        with pytest.raises(FileNotFoundError):
            load_intel("AAPL", kind="nonexistent", base_dir=tmp_data_dir)
