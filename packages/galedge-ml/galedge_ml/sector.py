"""Sector momentum features — how is this stock's sector performing?"""

from __future__ import annotations

import logging
from functools import lru_cache

import numpy as np
import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)

# Sector ETF proxies — one yf.download call per sector
SECTOR_ETFS = {
    "Technology": "XLK",
    "Financial Services": "XLF",
    "Healthcare": "XLV",
    "Consumer Cyclical": "XLY",
    "Consumer Defensive": "XLP",
    "Industrials": "XLI",
    "Energy": "XLE",
    "Utilities": "XLU",
    "Real Estate": "XLRE",
    "Communication Services": "XLC",
    "Basic Materials": "XLB",
}


@lru_cache(maxsize=20)
def _get_sector_returns(etf: str, period: str = "2y") -> pd.Series | None:
    """Fetch and cache sector ETF close prices."""
    try:
        df = yf.Ticker(etf).history(period=period, interval="1d")
        if df.empty:
            return None
        return df["Close"]
    except Exception:
        return None


def get_sector_features(
    symbol: str,
    close_prices: pd.Series,
    sector: str | None = None,
) -> dict[str, pd.Series]:
    """Compute sector momentum features.

    Returns dict of feature_name -> Series aligned to close_prices index.
    """
    features = {}

    # Get sector
    if not sector:
        try:
            sector = yf.Ticker(symbol).info.get("sector", "")
        except Exception:
            sector = ""

    etf = SECTOR_ETFS.get(sector, "SPY")  # fallback to SPY (market)
    sector_close = _get_sector_returns(etf)

    if sector_close is None:
        # Return zero features
        idx = close_prices.index
        for col in ["sector_return_5d", "sector_return_10d", "sector_return_20d",
                     "relative_strength_5d", "relative_strength_10d", "relative_strength_20d",
                     "sector_momentum"]:
            features[col] = pd.Series(0.0, index=idx)
        return features

    # Align sector prices to stock's trading days
    sector_aligned = sector_close.reindex(close_prices.index, method="ffill")

    # Sector returns
    for n in [5, 10, 20]:
        sector_ret = np.log(sector_aligned / sector_aligned.shift(n))
        stock_ret = np.log(close_prices / close_prices.shift(n))
        features[f"sector_return_{n}d"] = sector_ret.fillna(0)
        # Relative strength: stock return minus sector return
        features[f"relative_strength_{n}d"] = (stock_ret - sector_ret).fillna(0)

    # Sector momentum: slope of sector's 20d returns
    sector_ret_20 = np.log(sector_aligned / sector_aligned.shift(20))
    features["sector_momentum"] = sector_ret_20.rolling(5).mean().fillna(0)

    return features
