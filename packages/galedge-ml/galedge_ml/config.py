"""Constants, hyperparameters, and feature configuration."""

import os
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────────────

MODELS_DIR = Path(os.environ.get("GALEDGE_MODELS_DIR", Path(__file__).parent.parent / "models"))

# ── Prediction ────────────────────────────────────────────────────────────────

TIMEFRAMES = [5, 10, 20]  # prediction horizons in trading days
TARGET_THRESHOLD = 0.01   # 1% move threshold for binary classification
PREDICTION_CACHE_TTL = 300  # 5 minutes

# ── Training ──────────────────────────────────────────────────────────────────

TRAIN_PERIOD = "2y"
TRAIN_RATIO = 0.75    # 75% train
VAL_RATIO = 0.125     # 12.5% validation
TEST_RATIO = 0.125    # 12.5% test

TRAINING_SYMBOLS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AVGO",
    "JPM", "V", "MA", "BAC", "WFC", "GS",
    "UNH", "JNJ", "LLY", "PFE", "ABBV", "MRK",
    "WMT", "PG", "KO", "PEP", "COST",
    "XOM", "CVX", "COP",
    "HD", "LOW", "NKE", "MCD",
    "DIS", "CMCSA", "T", "VZ",
    "UPS", "HON", "CAT", "BA", "GE", "DE",
    "NEE", "DUK",
    "LIN", "APD", "SHW",
    "CRM", "AMD", "INTC", "QCOM",
]

# ── XGBoost Hyperparameters ───────────────────────────────────────────────────

XGB_CLASSIFIER_PARAMS = {
    "max_depth": 6,
    "n_estimators": 200,
    "learning_rate": 0.05,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "min_child_weight": 5,
    "reg_alpha": 0.1,
    "reg_lambda": 1.0,
    "eval_metric": "logloss",
    "random_state": 42,
    "n_jobs": -1,
    "verbosity": 0,
}

XGB_REGRESSOR_PARAMS = {
    "max_depth": 6,
    "n_estimators": 200,
    "learning_rate": 0.05,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "min_child_weight": 5,
    "reg_alpha": 0.1,
    "reg_lambda": 1.0,
    "eval_metric": "rmse",
    "random_state": 42,
    "n_jobs": -1,
    "verbosity": 0,
}

# ── Risk ──────────────────────────────────────────────────────────────────────

MAX_POSITION_PCT = 0.25      # max 25% of portfolio per position
KELLY_FRACTION = 0.5         # half-Kelly (conservative)
STOP_LOSS_ATR_MULT = 2.0     # stop loss at 2x ATR below entry
DEFAULT_PORTFOLIO_VALUE = 100000

RISK_TOLERANCE_SCALE = {
    "low": 0.5,
    "medium": 1.0,
    "high": 1.5,
}

# ── Feature Groups ────────────────────────────────────────────────────────────

FEATURE_GROUPS = {
    "price_volume": [
        "return_1d", "return_3d", "return_5d", "return_10d", "return_20d",
        "vol_5d", "vol_10d", "vol_20d",
        "volume_ratio_20d", "volume_trend_5d",
        "dist_from_high_52w", "dist_from_low_52w",
        "dist_from_sma20", "dist_from_sma50",
        "price_percentile_52w",
        "gap_pct",
        "atr_14", "range_ratio",
    ],
    "technical": [
        "rsi_14", "rsi_oversold", "rsi_overbought",
        "macd", "macd_signal", "macd_histogram", "macd_crossover",
        "bb_position", "bb_bandwidth",
        "sma20_above_sma50", "sma_crossover",
        "adx_14", "plus_di", "minus_di",
        "stoch_k", "stoch_d",
        "williams_r",
        "cci_20",
        "roc_10", "roc_20",
    ],
    "fundamental": [
        "trailing_pe", "forward_pe", "peg_ratio", "pe_spread",
        "profit_margin", "operating_margin", "gross_margin",
        "debt_to_equity", "roe", "roa",
        "revenue_growth", "earnings_growth",
        "dividend_yield", "beta",
    ],
    "sentiment": [
        "analyst_score", "analyst_momentum",
        "insider_buy_ratio", "insider_net_shares",
        "put_call_ratio",
        "news_sentiment_avg", "news_sentiment_pos_ratio",
        "news_sentiment_neg_ratio", "news_count",
    ],
    "calendar": [
        "day_of_week_sin", "day_of_week_cos",
        "month_sin", "month_cos",
        "quarter_end_proximity",
    ],
    "regime": [
        "regime", "regime_bull", "regime_bear", "regime_high_vol",
    ],
    "sector_momentum": [
        "sector_return_5d", "sector_return_10d", "sector_return_20d",
        "relative_strength_5d", "relative_strength_10d", "relative_strength_20d",
        "sector_momentum",
    ],
    "interactions": [
        "rsi_oversold_x_insider_buy",
        "macd_bull_x_volume_surge",
        "bb_squeeze_x_adx_strong",
        "golden_cross_x_momentum",
        "rsi_obought_x_neg_sentiment",
        "high_vol_x_bear_regime",
        "sector_strong_x_fund_quality",
    ],
}

ALL_FEATURES = []
for group_features in FEATURE_GROUPS.values():
    ALL_FEATURES.extend(group_features)
