"""Model training pipeline with walk-forward validation."""

from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
import joblib
import yfinance as yf
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

from galedge_ml.ensemble import StackedClassifier, StackedRegressor

from galedge_ml.config import (
    ALL_FEATURES, TIMEFRAMES, TARGET_THRESHOLD,
    TRAIN_RATIO, VAL_RATIO,
    XGB_CLASSIFIER_PARAMS, XGB_REGRESSOR_PARAMS,
    MODELS_DIR, TRAINING_SYMBOLS,
)
from galedge_ml.features import compute_features, add_targets

logger = logging.getLogger(__name__)


def train_models(
    symbols: list[str] | None = None,
    output_dir: Path | None = None,
    period: str = "2y",
) -> dict:
    """Train all models (classifier + regressor per timeframe).

    Returns dict of training metrics.
    """
    symbols = symbols or TRAINING_SYMBOLS
    output_dir = output_dir or MODELS_DIR
    output_dir.mkdir(parents=True, exist_ok=True)

    logger.info("Training on %d symbols, period=%s", len(symbols), period)

    # Step 1: Compute features and targets for all symbols
    all_data = []
    for i, sym in enumerate(symbols):
        try:
            logger.info("[%d/%d] Computing features for %s...", i + 1, len(symbols), sym)
            t = yf.Ticker(sym)
            hist = t.history(period=period, interval="1d")
            if hist.empty or len(hist) < 100:
                logger.warning("Skipping %s: insufficient data (%d rows)", sym, len(hist))
                continue

            features_df = compute_features(sym, period)
            close = hist["Close"].reindex(features_df.index)
            features_df = add_targets(features_df, close, TIMEFRAMES, TARGET_THRESHOLD)
            features_df["_symbol"] = sym
            all_data.append(features_df)
        except Exception:
            logger.warning("Failed on %s", sym, exc_info=True)

    if not all_data:
        raise ValueError("No training data could be prepared")

    combined = pd.concat(all_data)
    combined = combined.sort_index()  # temporal order
    logger.info("Total training samples: %d", len(combined))

    # Step 2: Walk-forward split (temporal, no shuffling)
    n = len(combined)
    train_end = int(n * TRAIN_RATIO)
    val_end = int(n * (TRAIN_RATIO + VAL_RATIO))

    train_df = combined.iloc[:train_end]
    val_df = combined.iloc[train_end:val_end]
    test_df = combined.iloc[val_end:]

    logger.info("Split: train=%d, val=%d, test=%d", len(train_df), len(val_df), len(test_df))

    X_train = train_df[ALL_FEATURES].values
    X_val = val_df[ALL_FEATURES].values
    X_test = test_df[ALL_FEATURES].values

    all_metrics = {}

    # Step 3: Train models for each timeframe
    for tf in TIMEFRAMES:
        logger.info("=== Training %d-day models ===", tf)

        # --- Classifier ---
        y_train_cls = train_df[f"target_dir_{tf}d"].values
        y_val_cls = val_df[f"target_dir_{tf}d"].values
        y_test_cls = test_df[f"target_dir_{tf}d"].values

        # Handle class imbalance
        pos_count = y_train_cls.sum()
        neg_count = len(y_train_cls) - pos_count
        scale = neg_count / max(pos_count, 1)

        # Stacked Ensemble: XGBoost + Random Forest + Logistic Regression
        logger.info("  Training stacked classifier ensemble...")
        clf = StackedClassifier(scale_pos_weight=scale)
        clf.fit(X_train, y_train_cls, X_val=X_val, y_val=y_val_cls)

        # Evaluate
        y_pred_cls = clf.predict(X_test)
        y_prob_cls = clf.predict_proba(X_test)[:, 1]

        cls_metrics = {
            "accuracy": round(accuracy_score(y_test_cls, y_pred_cls), 4),
            "precision": round(precision_score(y_test_cls, y_pred_cls, zero_division=0), 4),
            "recall": round(recall_score(y_test_cls, y_pred_cls, zero_division=0), 4),
            "f1": round(f1_score(y_test_cls, y_pred_cls, zero_division=0), 4),
            "pos_rate_train": round(float(y_train_cls.mean()), 4),
            "pos_rate_test": round(float(y_test_cls.mean()), 4),
        }
        logger.info("Classifier %dd: %s", tf, cls_metrics)

        # Save classifier
        clf_path = output_dir / f"classifier_{tf}d.joblib"
        joblib.dump(clf, clf_path, compress=3)

        # --- Regressor ---
        y_train_reg = train_df[f"target_ret_{tf}d"].values
        y_val_reg = val_df[f"target_ret_{tf}d"].values
        y_test_reg = test_df[f"target_ret_{tf}d"].values

        logger.info("  Training stacked regressor ensemble...")
        reg = StackedRegressor()
        reg.fit(X_train, y_train_reg, X_val=X_val, y_val=y_val_reg)

        y_pred_reg = reg.predict(X_test)
        reg_metrics = {
            "rmse": round(float(np.sqrt(np.mean((y_test_reg - y_pred_reg) ** 2))), 6),
            "mae": round(float(np.mean(np.abs(y_test_reg - y_pred_reg))), 6),
            "directional_accuracy": round(
                float(np.mean(np.sign(y_pred_reg) == np.sign(y_test_reg))), 4
            ),
        }
        logger.info("Regressor %dd: %s", tf, reg_metrics)

        # Save regressor
        reg_path = output_dir / f"regressor_{tf}d.joblib"
        joblib.dump(reg, reg_path, compress=3)

        # Feature importances
        importances = clf.feature_importances_
        feature_imp = sorted(
            zip(ALL_FEATURES, importances.tolist()),
            key=lambda x: x[1],
            reverse=True,
        )[:30]

        # Save metadata
        metadata = {
            "timeframe": tf,
            "trained_at": datetime.now().isoformat(),
            "symbols_count": len(symbols),
            "total_samples": len(combined),
            "train_samples": len(train_df),
            "test_samples": len(test_df),
            "classifier": cls_metrics,
            "regressor": reg_metrics,
            "feature_importances": [{"name": n, "importance": round(v, 5)} for n, v in feature_imp],
            "feature_columns": ALL_FEATURES,
        }

        meta_path = output_dir / f"metadata_{tf}d.json"
        with open(meta_path, "w") as f:
            json.dump(metadata, f, indent=2)

        all_metrics[f"{tf}d"] = {
            "classifier": cls_metrics,
            "regressor": reg_metrics,
        }

    logger.info("All models saved to %s", output_dir)
    return all_metrics
