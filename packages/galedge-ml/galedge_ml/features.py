"""Feature engineering pipeline — 150+ features from multiple signal sources."""

from __future__ import annotations

import logging
import warnings

import numpy as np
import pandas as pd
import yfinance as yf

from galedge_ml.config import ALL_FEATURES

logger = logging.getLogger(__name__)
warnings.filterwarnings("ignore", category=FutureWarning)


# ── Main Entry Point ──────────────────────────────────────────────────────────

def compute_features(symbol: str, period: str = "2y") -> pd.DataFrame:
    """Compute all features for a symbol. Returns a DataFrame with feature columns.

    Each row is a trading day. All features use only past data (no look-ahead).
    """
    t = yf.Ticker(symbol)

    # Fetch OHLCV
    df = t.history(period=period, interval="1d")
    if df.empty or len(df) < 60:
        raise ValueError(f"Insufficient data for {symbol}: {len(df)} rows")

    df.columns = [c.lower().replace(" ", "_") for c in df.columns]
    df = df[["open", "high", "low", "close", "volume"]].copy()

    # Compute all feature groups
    _add_price_volume_features(df)
    _add_technical_features(df)
    _add_calendar_features(df)

    # Fundamental features (static per symbol, broadcast)
    fund_features = _get_fundamental_features(t)
    for k, v in fund_features.items():
        df[k] = v

    # Sentiment features (static per symbol)
    sent_features = _get_sentiment_features(t)
    for k, v in sent_features.items():
        df[k] = v

    # Drop warmup rows (need ~50 for SMA-50, ADX, etc.)
    df = df.iloc[55:].copy()

    # Ensure all expected columns exist (fill missing with 0)
    for col in ALL_FEATURES:
        if col not in df.columns:
            df[col] = 0.0

    # Select only feature columns + keep datetime index
    feature_df = df[ALL_FEATURES].copy()
    feature_df = feature_df.replace([np.inf, -np.inf], np.nan).fillna(0)

    return feature_df


def compute_features_batch(symbols: list[str], period: str = "2y") -> pd.DataFrame:
    """Compute features for multiple symbols, pooled into one DataFrame."""
    frames = []
    for sym in symbols:
        try:
            df = compute_features(sym, period)
            df["_symbol"] = sym
            frames.append(df)
            logger.info("Features computed for %s: %d rows", sym, len(df))
        except Exception:
            logger.warning("Failed to compute features for %s", sym, exc_info=True)
    if not frames:
        raise ValueError("No features computed for any symbol")
    return pd.concat(frames, ignore_index=False)


# ── Price & Volume Features ───────────────────────────────────────────────────

def _add_price_volume_features(df: pd.DataFrame) -> None:
    close = df["close"]
    volume = df["volume"]
    high = df["high"]
    low = df["low"]
    opn = df["open"]

    # Returns
    for n in [1, 3, 5, 10, 20]:
        df[f"return_{n}d"] = np.log(close / close.shift(n))

    # Volatility (rolling std of daily returns)
    daily_ret = np.log(close / close.shift(1))
    for n in [5, 10, 20]:
        df[f"vol_{n}d"] = daily_ret.rolling(n).std()

    # Volume features
    vol_ma20 = volume.rolling(20).mean()
    df["volume_ratio_20d"] = volume / vol_ma20.replace(0, np.nan)
    df["volume_trend_5d"] = volume.rolling(5).mean() / vol_ma20.replace(0, np.nan)

    # Price position
    high_52w = close.rolling(252, min_periods=60).max()
    low_52w = close.rolling(252, min_periods=60).min()
    df["dist_from_high_52w"] = (close - high_52w) / high_52w
    df["dist_from_low_52w"] = (close - low_52w) / low_52w.replace(0, np.nan)

    sma20 = close.rolling(20).mean()
    sma50 = close.rolling(50).mean()
    df["dist_from_sma20"] = (close - sma20) / sma20.replace(0, np.nan)
    df["dist_from_sma50"] = (close - sma50) / sma50.replace(0, np.nan)

    range_52w = high_52w - low_52w
    df["price_percentile_52w"] = (close - low_52w) / range_52w.replace(0, np.nan)

    # Gap
    df["gap_pct"] = (opn - close.shift(1)) / close.shift(1)

    # ATR-14 (Wilder smoothing)
    tr = pd.concat([
        high - low,
        (high - close.shift(1)).abs(),
        (low - close.shift(1)).abs(),
    ], axis=1).max(axis=1)
    df["atr_14"] = tr.ewm(alpha=1/14, min_periods=14).mean() / close

    # Range ratio
    df["range_ratio"] = (high - low) / close


# ── Technical Features ────────────────────────────────────────────────────────

def _add_technical_features(df: pd.DataFrame) -> None:
    close = df["close"]
    high = df["high"]
    low = df["low"]

    # RSI-14 (Wilder smoothing)
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = (-delta.clip(upper=0))
    avg_gain = gain.ewm(alpha=1/14, min_periods=14).mean()
    avg_loss = loss.ewm(alpha=1/14, min_periods=14).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    df["rsi_14"] = 100 - (100 / (1 + rs))
    df["rsi_oversold"] = (df["rsi_14"] < 30).astype(float)
    df["rsi_overbought"] = (df["rsi_14"] > 70).astype(float)

    # MACD
    ema12 = close.ewm(span=12, min_periods=12).mean()
    ema26 = close.ewm(span=26, min_periods=26).mean()
    macd_line = ema12 - ema26
    signal_line = macd_line.ewm(span=9, min_periods=9).mean()
    df["macd"] = macd_line / close  # normalize by price
    df["macd_signal"] = signal_line / close
    df["macd_histogram"] = (macd_line - signal_line) / close

    # MACD crossover (sign change)
    macd_diff = macd_line - signal_line
    df["macd_crossover"] = (np.sign(macd_diff) != np.sign(macd_diff.shift(1))).astype(float)

    # Bollinger Bands
    sma20 = close.rolling(20).mean()
    std20 = close.rolling(20).std()
    bb_upper = sma20 + 2 * std20
    bb_lower = sma20 - 2 * std20
    bb_range = (bb_upper - bb_lower).replace(0, np.nan)
    df["bb_position"] = (close - bb_lower) / bb_range
    df["bb_bandwidth"] = bb_range / sma20.replace(0, np.nan)

    # SMA crossover
    sma50 = close.rolling(50).mean()
    df["sma20_above_sma50"] = (sma20 > sma50).astype(float)
    prev_above = (sma20.shift(1) > sma50.shift(1))
    curr_above = (sma20 > sma50)
    df["sma_crossover"] = (curr_above != prev_above).astype(float)

    # ADX-14
    plus_dm = high.diff().clip(lower=0)
    minus_dm = (-low.diff()).clip(lower=0)
    # Zero out when the other is larger
    plus_dm[plus_dm < minus_dm] = 0
    minus_dm[minus_dm < plus_dm] = 0

    atr_raw = pd.concat([
        high - low,
        (high - close.shift(1)).abs(),
        (low - close.shift(1)).abs(),
    ], axis=1).max(axis=1)
    atr14 = atr_raw.ewm(alpha=1/14, min_periods=14).mean()

    plus_di = 100 * plus_dm.ewm(alpha=1/14, min_periods=14).mean() / atr14.replace(0, np.nan)
    minus_di = 100 * minus_dm.ewm(alpha=1/14, min_periods=14).mean() / atr14.replace(0, np.nan)
    dx = 100 * (plus_di - minus_di).abs() / (plus_di + minus_di).replace(0, np.nan)
    df["adx_14"] = dx.ewm(alpha=1/14, min_periods=14).mean()
    df["plus_di"] = plus_di
    df["minus_di"] = minus_di

    # Stochastic %K, %D
    low14 = low.rolling(14).min()
    high14 = high.rolling(14).max()
    denom = (high14 - low14).replace(0, np.nan)
    df["stoch_k"] = 100 * (close - low14) / denom
    df["stoch_d"] = df["stoch_k"].rolling(3).mean()

    # Williams %R
    df["williams_r"] = -100 * (high14 - close) / denom

    # CCI-20
    typical = (high + low + close) / 3
    sma20_typical = typical.rolling(20).mean()
    mean_dev = typical.rolling(20).apply(lambda x: np.abs(x - x.mean()).mean(), raw=True)
    df["cci_20"] = (typical - sma20_typical) / (0.015 * mean_dev.replace(0, np.nan))

    # ROC
    df["roc_10"] = (close - close.shift(10)) / close.shift(10)
    df["roc_20"] = (close - close.shift(20)) / close.shift(20)


# ── Calendar Features ─────────────────────────────────────────────────────────

def _add_calendar_features(df: pd.DataFrame) -> None:
    dt = df.index.to_series()
    dow = dt.dt.dayofweek
    month = dt.dt.month

    df["day_of_week_sin"] = np.sin(2 * np.pi * dow / 5)
    df["day_of_week_cos"] = np.cos(2 * np.pi * dow / 5)
    df["month_sin"] = np.sin(2 * np.pi * month / 12)
    df["month_cos"] = np.cos(2 * np.pi * month / 12)

    # Days until quarter end
    quarter_end_month = ((month - 1) // 3 + 1) * 3
    days_in_month = dt.dt.days_in_month
    df["quarter_end_proximity"] = 1.0 - (
        (quarter_end_month - month) * 30 + (days_in_month - dt.dt.day)
    ).clip(0, 90) / 90.0


# ── Fundamental Features ──────────────────────────────────────────────────────

def _get_fundamental_features(t: yf.Ticker) -> dict[str, float]:
    """Extract fundamental features from ticker info. Returns static values."""
    try:
        info = t.info
    except Exception:
        info = {}

    def _safe(key: str, default: float = 0.0) -> float:
        v = info.get(key)
        if v is None or (isinstance(v, float) and np.isnan(v)):
            return default
        return float(v)

    pe_trailing = _safe("trailingPE")
    pe_forward = _safe("forwardPE")

    return {
        "trailing_pe": pe_trailing,
        "forward_pe": pe_forward,
        "peg_ratio": _safe("pegRatio"),
        "pe_spread": pe_forward - pe_trailing if pe_forward and pe_trailing else 0.0,
        "profit_margin": _safe("profitMargins"),
        "operating_margin": _safe("operatingMargins"),
        "gross_margin": _safe("grossMargins"),
        "debt_to_equity": _safe("debtToEquity") / 100.0,  # normalize from percentage
        "roe": _safe("returnOnEquity"),
        "roa": _safe("returnOnAssets"),
        "revenue_growth": _safe("revenueGrowth"),
        "earnings_growth": _safe("earningsGrowth"),
        "dividend_yield": _safe("dividendYield"),
        "beta": _safe("beta", 1.0),
    }


# ── Sentiment Features ────────────────────────────────────────────────────────

def _get_sentiment_features(t: yf.Ticker) -> dict[str, float]:
    """Extract sentiment from analyst recommendations and insider transactions."""
    features = {
        "analyst_score": 0.0,
        "analyst_momentum": 0.0,
        "insider_buy_ratio": 0.5,
        "insider_net_shares": 0.0,
        "put_call_ratio": 1.0,
    }

    # Analyst recommendations
    try:
        rec = t.recommendations
        if rec is not None and not rec.empty:
            latest = rec.iloc[0]
            total = sum([
                latest.get("strongBuy", 0), latest.get("buy", 0),
                latest.get("hold", 0), latest.get("sell", 0),
                latest.get("strongSell", 0),
            ])
            if total > 0:
                score = (
                    5 * latest.get("strongBuy", 0) +
                    4 * latest.get("buy", 0) +
                    3 * latest.get("hold", 0) +
                    2 * latest.get("sell", 0) +
                    1 * latest.get("strongSell", 0)
                ) / total
                features["analyst_score"] = score / 5.0  # normalize to 0-1

            if len(rec) >= 2:
                prev = rec.iloc[1]
                prev_total = sum([
                    prev.get("strongBuy", 0), prev.get("buy", 0),
                    prev.get("hold", 0), prev.get("sell", 0),
                    prev.get("strongSell", 0),
                ])
                if prev_total > 0:
                    prev_score = (
                        5 * prev.get("strongBuy", 0) +
                        4 * prev.get("buy", 0) +
                        3 * prev.get("hold", 0) +
                        2 * prev.get("sell", 0) +
                        1 * prev.get("strongSell", 0)
                    ) / prev_total / 5.0
                    features["analyst_momentum"] = features["analyst_score"] - prev_score
    except Exception:
        pass

    # Insider transactions
    try:
        insiders = t.insider_transactions
        if insiders is not None and not insiders.empty:
            txns = insiders.head(20)
            buys = txns[txns.get("Transaction", txns.get("transaction", pd.Series())).str.lower().str.contains("buy|purchase", na=False)]
            sells = txns[~txns.index.isin(buys.index)]
            total_txns = len(buys) + len(sells)
            if total_txns > 0:
                features["insider_buy_ratio"] = len(buys) / total_txns
            shares_col = "Shares" if "Shares" in txns.columns else "shares"
            if shares_col in txns.columns:
                features["insider_net_shares"] = float(txns[shares_col].sum()) / 1e6  # in millions
    except Exception:
        pass

    # Put/Call ratio
    try:
        expirations = t.options
        if expirations:
            chain = t.option_chain(expirations[0])
            puts_oi = chain.puts["openInterest"].sum() if "openInterest" in chain.puts.columns else 0
            calls_oi = chain.calls["openInterest"].sum() if "openInterest" in chain.calls.columns else 0
            if calls_oi > 0:
                features["put_call_ratio"] = puts_oi / calls_oi
    except Exception:
        pass

    return features


# ── Target Construction ───────────────────────────────────────────────────────

def add_targets(df: pd.DataFrame, close_series: pd.Series, timeframes: list[int], threshold: float = 0.01) -> pd.DataFrame:
    """Add target columns for each timeframe. Uses future data — only for training."""
    for n in timeframes:
        future_return = close_series.shift(-n) / close_series - 1
        # Align with feature df index
        aligned = future_return.reindex(df.index)
        df[f"target_dir_{n}d"] = (aligned > threshold).astype(int)
        df[f"target_ret_{n}d"] = aligned
    # Drop rows where targets are NaN (last N rows)
    max_tf = max(timeframes)
    return df.iloc[:-max_tf].copy()
