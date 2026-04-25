"""Shared fixtures for galedge tests."""

from __future__ import annotations

from datetime import datetime
from unittest.mock import MagicMock

import pandas as pd
import pytest


@pytest.fixture
def tmp_data_dir(tmp_path):
    """Provide a temporary data directory."""
    return tmp_path / "data"


@pytest.fixture
def sample_ohlcv_df():
    """A realistic OHLCV DataFrame as returned by yfinance .history()."""
    dates = pd.date_range("2025-11-01", periods=5, freq="B", tz="America/New_York")
    df = pd.DataFrame(
        {
            "Open": [150.0, 151.0, 149.0, 152.0, 153.0],
            "High": [155.0, 156.0, 154.0, 157.0, 158.0],
            "Low": [148.0, 149.0, 147.0, 150.0, 151.0],
            "Close": [153.0, 154.0, 152.0, 155.0, 156.0],
            "Volume": [1000000, 1100000, 900000, 1200000, 1050000],
            "Dividends": [0.0, 0.0, 0.0, 0.0, 0.0],
            "Stock Splits": [0.0, 0.0, 0.0, 0.0, 0.0],
        },
        index=dates,
    )
    df.index.name = "Date"
    return df


@pytest.fixture
def sample_ohlcv_multimonth():
    """OHLCV DataFrame spanning two months for partition testing."""
    dates = pd.date_range("2025-11-28", periods=6, freq="B", tz="America/New_York")
    df = pd.DataFrame(
        {
            "Open": [150.0, 151.0, 152.0, 153.0, 154.0, 155.0],
            "High": [155.0, 156.0, 157.0, 158.0, 159.0, 160.0],
            "Low": [148.0, 149.0, 150.0, 151.0, 152.0, 153.0],
            "Close": [153.0, 154.0, 155.0, 156.0, 157.0, 158.0],
            "Volume": [1000000] * 6,
            "Dividends": [0.0] * 6,
            "Stock Splits": [0.0] * 6,
        },
        index=dates,
    )
    df.index.name = "Date"
    return df


@pytest.fixture
def sample_options_calls():
    """Sample options calls DataFrame as returned by yfinance."""
    return pd.DataFrame(
        {
            "contractSymbol": ["AAPL260101C00150000", "AAPL260101C00160000"],
            "lastTradeDate": [datetime(2025, 12, 20), datetime(2025, 12, 20)],
            "strike": [150.0, 160.0],
            "lastPrice": [10.0, 5.0],
            "bid": [9.5, 4.5],
            "ask": [10.5, 5.5],
            "change": [0.5, -0.2],
            "percentChange": [5.0, -3.8],
            "volume": [500, 300],
            "openInterest": [2000, 1500],
            "impliedVolatility": [0.35, 0.40],
            "inTheMoney": [True, False],
            "contractSize": ["REGULAR", "REGULAR"],
            "currency": ["USD", "USD"],
        }
    )


@pytest.fixture
def sample_options_puts():
    """Sample options puts DataFrame."""
    return pd.DataFrame(
        {
            "contractSymbol": ["AAPL260101P00150000", "AAPL260101P00160000"],
            "lastTradeDate": [datetime(2025, 12, 20), datetime(2025, 12, 20)],
            "strike": [150.0, 160.0],
            "lastPrice": [2.0, 8.0],
            "bid": [1.8, 7.5],
            "ask": [2.2, 8.5],
            "change": [-0.1, 0.3],
            "percentChange": [-4.8, 3.9],
            "volume": [200, 400],
            "openInterest": [1000, 1800],
            "impliedVolatility": [0.32, 0.38],
            "inTheMoney": [False, True],
            "contractSize": ["REGULAR", "REGULAR"],
            "currency": ["USD", "USD"],
        }
    )


@pytest.fixture
def mock_yf_ticker(sample_ohlcv_df):
    """A mock yfinance Ticker object."""
    mock = MagicMock()
    mock.history.return_value = sample_ohlcv_df
    return mock
