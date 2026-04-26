"""Ensemble stacking — combines XGBoost, Random Forest, and Logistic Regression
with a meta-learner that learns which model to trust in which situation.
"""

from __future__ import annotations

import logging

import numpy as np
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier, XGBRegressor

from galedge_ml.config import XGB_CLASSIFIER_PARAMS, XGB_REGRESSOR_PARAMS

logger = logging.getLogger(__name__)


class StackedClassifier:
    """Stacked ensemble: XGBoost + Random Forest + Logistic Regression → meta-learner."""

    def __init__(self, scale_pos_weight: float = 1.0):
        self.base_models = [
            ("xgb", XGBClassifier(**{**XGB_CLASSIFIER_PARAMS, "scale_pos_weight": scale_pos_weight})),
            ("rf", RandomForestClassifier(
                n_estimators=150, max_depth=8, min_samples_leaf=10,
                random_state=42, n_jobs=-1,
            )),
            ("lr", LogisticRegression(
                max_iter=1000, C=0.1, random_state=42,
            )),
        ]
        self.meta_model = LogisticRegression(max_iter=500, random_state=42)
        self.scaler = StandardScaler()
        self._fitted = False

    def fit(self, X_train, y_train, X_val=None, y_val=None, **kwargs):
        """Fit base models on training data, meta-model on validation predictions."""
        # Fit base models
        for name, model in self.base_models:
            if name == "xgb" and X_val is not None:
                model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)
            elif name == "lr":
                X_scaled = self.scaler.fit_transform(X_train)
                model.fit(X_scaled, y_train)
            else:
                model.fit(X_train, y_train)
            logger.info("  Base model '%s' fitted", name)

        # Generate meta-features from validation set (or training set if no val)
        meta_X = X_val if X_val is not None else X_train
        meta_y = y_val if y_val is not None else y_train

        meta_features = self._get_meta_features(meta_X)
        self.meta_model.fit(meta_features, meta_y)
        logger.info("  Meta-model fitted on %d samples", len(meta_y))
        self._fitted = True

    def predict_proba(self, X):
        meta_features = self._get_meta_features(X)
        return self.meta_model.predict_proba(meta_features)

    def predict(self, X):
        meta_features = self._get_meta_features(X)
        return self.meta_model.predict(meta_features)

    @property
    def feature_importances_(self):
        """Return XGBoost's feature importances (the most interpretable base model)."""
        return self.base_models[0][1].feature_importances_

    def _get_meta_features(self, X):
        """Get probability predictions from each base model as meta-features."""
        meta = []
        for name, model in self.base_models:
            if name == "lr":
                X_scaled = self.scaler.transform(X)
                probs = model.predict_proba(X_scaled)[:, 1]
            else:
                probs = model.predict_proba(X)[:, 1]
            meta.append(probs)
        return np.column_stack(meta)


class StackedRegressor:
    """Stacked ensemble for return prediction."""

    def __init__(self):
        self.base_models = [
            ("xgb", XGBRegressor(**XGB_REGRESSOR_PARAMS)),
            ("rf", RandomForestRegressor(
                n_estimators=150, max_depth=8, min_samples_leaf=10,
                random_state=42, n_jobs=-1,
            )),
            ("ridge", Ridge(alpha=1.0)),
        ]
        self.meta_model = Ridge(alpha=0.5)
        self.scaler = StandardScaler()
        self._fitted = False

    def fit(self, X_train, y_train, X_val=None, y_val=None, **kwargs):
        for name, model in self.base_models:
            if name == "xgb" and X_val is not None:
                model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)
            elif name == "ridge":
                X_scaled = self.scaler.fit_transform(X_train)
                model.fit(X_scaled, y_train)
            else:
                model.fit(X_train, y_train)

        meta_X = X_val if X_val is not None else X_train
        meta_y = y_val if y_val is not None else y_train
        meta_features = self._get_meta_features(meta_X)
        self.meta_model.fit(meta_features, meta_y)
        self._fitted = True

    def predict(self, X):
        meta_features = self._get_meta_features(X)
        return self.meta_model.predict(meta_features)

    def _get_meta_features(self, X):
        meta = []
        for name, model in self.base_models:
            if name == "ridge":
                X_scaled = self.scaler.transform(X)
                preds = model.predict(X_scaled)
            else:
                preds = model.predict(X)
            meta.append(preds)
        return np.column_stack(meta)
