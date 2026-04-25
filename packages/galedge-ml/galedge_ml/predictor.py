"""Inference engine — loads models, computes predictions, caches results."""

from __future__ import annotations

import json
import logging
import time
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import yfinance as yf

from galedge_ml.config import (
    ALL_FEATURES, TIMEFRAMES, MODELS_DIR,
    PREDICTION_CACHE_TTL, DEFAULT_PORTFOLIO_VALUE,
)
from galedge_ml.features import compute_features
from galedge_ml.signals import compute_signals
from galedge_ml.risk import compute_risk

logger = logging.getLogger(__name__)

# ── Model Cache ───────────────────────────────────────────────────────────────

_models: dict = {}
_metadata: dict = {}
_prediction_cache: dict = {}


def _load_models(models_dir: Path | None = None) -> None:
    """Load all models into memory (called once)."""
    global _models, _metadata
    if _models:
        return

    models_dir = models_dir or MODELS_DIR
    logger.info("Loading models from %s", models_dir)

    for tf in TIMEFRAMES:
        clf_path = models_dir / f"classifier_{tf}d.joblib"
        reg_path = models_dir / f"regressor_{tf}d.joblib"
        meta_path = models_dir / f"metadata_{tf}d.json"

        if not clf_path.exists():
            logger.warning("Model not found: %s", clf_path)
            continue

        _models[f"clf_{tf}d"] = joblib.load(clf_path)
        _models[f"reg_{tf}d"] = joblib.load(reg_path)

        if meta_path.exists():
            with open(meta_path) as f:
                _metadata[f"{tf}d"] = json.load(f)

        logger.info("Loaded %dd models", tf)


def models_loaded() -> bool:
    return len(_models) >= 2  # at least one clf + reg pair


# ── Prediction ────────────────────────────────────────────────────────────────

def predict(
    symbol: str,
    portfolio_value: float = DEFAULT_PORTFOLIO_VALUE,
    risk_tolerance: str = "medium",
    models_dir: Path | None = None,
) -> dict:
    """Generate a full prediction for a symbol.

    Returns the complete prediction response dict.
    """
    # Check cache
    cache_key = f"{symbol}_{int(time.time() // PREDICTION_CACHE_TTL)}"
    if cache_key in _prediction_cache:
        cached = _prediction_cache[cache_key].copy()
        # Update position sizing for different portfolio values
        if cached.get("_portfolio_value") != portfolio_value or cached.get("_risk_tolerance") != risk_tolerance:
            pass  # Recompute below
        else:
            return cached

    # Load models
    _load_models(models_dir)
    if not models_loaded():
        raise RuntimeError("Models not loaded. Train models first.")

    # Fetch data and compute features
    t = yf.Ticker(symbol)
    hist = t.history(period="1y", interval="1d")
    if hist.empty or len(hist) < 60:
        raise ValueError(f"Insufficient data for {symbol}")

    features_df = compute_features(symbol, period="1y")
    if features_df.empty:
        raise ValueError(f"Could not compute features for {symbol}")

    # Get latest feature row
    latest_features = features_df.iloc[-1]
    X = latest_features[ALL_FEATURES].values.reshape(1, -1)

    # Replace NaN/inf
    X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)

    # Run predictions for each timeframe
    predictions = {}
    expected_returns = {}
    direction_probs = []

    for tf in TIMEFRAMES:
        clf_key = f"clf_{tf}d"
        reg_key = f"reg_{tf}d"

        if clf_key not in _models or reg_key not in _models:
            continue

        clf = _models[clf_key]
        reg = _models[reg_key]

        prob = float(clf.predict_proba(X)[0][1])
        exp_ret = float(reg.predict(X)[0])

        predictions[f"{tf}d"] = {
            "probability_up": round(prob, 4),
            "expected_return": round(exp_ret, 6),
        }
        expected_returns[f"{tf}d"] = exp_ret
        direction_probs.append(prob)

    if not direction_probs:
        raise RuntimeError("No model predictions available")

    # Aggregate direction
    avg_prob = np.mean(direction_probs)
    confidence = round(abs(avg_prob - 0.5) * 2, 4)  # 0-1 scale

    # Compute signals
    feature_importances = {}
    for tf_key, meta in _metadata.items():
        for fi in meta.get("feature_importances", []):
            name = fi["name"]
            feature_importances[name] = feature_importances.get(name, 0) + fi["importance"]

    signals = compute_signals(latest_features, feature_importances)

    # Compute risk and recommendation
    close_prices = hist["Close"]
    current_price = float(close_prices.iloc[-1])
    atr_val = float(latest_features.get("atr_14", 0.02))
    beta_val = float(latest_features.get("beta", 1.0))

    risk_rec = compute_risk(
        close_prices=close_prices,
        current_price=current_price,
        direction_prob=avg_prob,
        expected_returns=expected_returns,
        atr=atr_val,
        beta=beta_val,
        portfolio_value=portfolio_value,
        risk_tolerance=risk_tolerance,
    )

    # Get top features
    top_features = []
    if _metadata:
        first_meta = next(iter(_metadata.values()))
        top_features = first_meta.get("feature_importances", [])[:10]

    # Get training metrics
    training_metrics = {}
    for tf_key, meta in _metadata.items():
        training_metrics[tf_key] = {
            "accuracy": meta.get("classifier", {}).get("accuracy"),
            "f1": meta.get("classifier", {}).get("f1"),
        }

    # Build response
    result = {
        "symbol": symbol.upper(),
        "generated_at": pd.Timestamp.now().isoformat(),
        "prediction": {
            "direction": risk_rec["direction"],
            "confidence": confidence,
            "composite_score": signals["composite"],
            **{f"expected_return_{k}": v for k, v in expected_returns.items()},
            "timeframes": predictions,
        },
        "signals": signals,
        "recommendation": {
            "action": risk_rec["action"],
            "entry_price": risk_rec["entry_price"],
            "stop_loss": risk_rec["stop_loss"],
            "stop_loss_pct": risk_rec["stop_loss_pct"],
            "targets": risk_rec["targets"],
            "position_size": risk_rec["position_size"],
            "position_pct": risk_rec["position_pct"],
            "hold_duration_days": risk_rec["hold_duration_days"],
            "risk_reward_ratio": risk_rec["risk_reward_ratio"],
        },
        "risk": risk_rec["risk"],
        "model_info": {
            "features_used": len(ALL_FEATURES),
            "top_features": top_features,
            "training_metrics": training_metrics,
        },
        "_portfolio_value": portfolio_value,
        "_risk_tolerance": risk_tolerance,
    }

    # Cache
    _prediction_cache[cache_key] = result
    # Evict old cache entries
    now = time.time()
    stale = [k for k, v in _prediction_cache.items()
             if isinstance(v, dict) and now - v.get("_cached_at", now) > PREDICTION_CACHE_TTL * 3]
    for k in stale:
        del _prediction_cache[k]

    return result


def predict_batch(
    symbols: list[str],
    portfolio_value: float = DEFAULT_PORTFOLIO_VALUE,
    risk_tolerance: str = "medium",
) -> list[dict]:
    """Generate predictions for multiple symbols."""
    results = []
    for sym in symbols[:10]:  # cap at 10
        try:
            results.append(predict(sym, portfolio_value, risk_tolerance))
        except Exception as e:
            logger.warning("Prediction failed for %s: %s", sym, e)
    return results
