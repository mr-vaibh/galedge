"""Market regime detection using a simple Gaussian Mixture approach.

Detects 3 regimes: Bull (0), Sideways (1), Bear (2) based on
return and volatility characteristics.

Note: Uses sklearn GaussianMixture instead of HMM (hmmlearn) to avoid
an extra dependency. GMM captures the same return distributions.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.mixture import GaussianMixture


def detect_regime(
    close_prices: pd.Series,
    n_regimes: int = 3,
    lookback: int = 20,
) -> pd.Series:
    """Detect market regime for each day.

    Uses rolling return + volatility features clustered into regimes.

    Returns:
        Series with regime labels: 0=Bull, 1=Sideways, 2=Bear
        Aligned with the input index.
    """
    returns = np.log(close_prices / close_prices.shift(1))
    vol = returns.rolling(lookback).std()
    ret_avg = returns.rolling(lookback).mean()

    # Build feature matrix
    features = pd.DataFrame({
        "return": ret_avg,
        "volatility": vol,
    }).dropna()

    if len(features) < n_regimes * 10:
        # Not enough data, return all sideways
        return pd.Series(1, index=close_prices.index, name="regime")

    X = features.values

    # Fit Gaussian Mixture
    gmm = GaussianMixture(
        n_components=n_regimes,
        covariance_type="full",
        n_init=5,
        random_state=42,
    )
    gmm.fit(X)
    labels = gmm.predict(X)

    # Map clusters to bull/sideways/bear based on mean return
    cluster_returns = {}
    for i in range(n_regimes):
        mask = labels == i
        cluster_returns[i] = features["return"].values[mask].mean()

    # Sort by return: highest = bull (0), lowest = bear (2)
    sorted_clusters = sorted(cluster_returns, key=lambda k: cluster_returns[k], reverse=True)
    label_map = {}
    for new_label, old_label in enumerate(sorted_clusters):
        label_map[old_label] = new_label

    mapped_labels = np.array([label_map[l] for l in labels])

    # Create full series aligned to original index
    result = pd.Series(1, index=close_prices.index, name="regime", dtype=int)
    result.loc[features.index] = mapped_labels

    return result


def add_regime_features(df: pd.DataFrame, close_prices: pd.Series) -> None:
    """Add regime features to a DataFrame.

    Adds:
        regime: 0=Bull, 1=Sideways, 2=Bear
        regime_bull: 1 if bull, 0 otherwise
        regime_bear: 1 if bear, 0 otherwise
        regime_vol: rolling volatility regime (high/low)
    """
    regime = detect_regime(close_prices)
    aligned = regime.reindex(df.index).fillna(1).astype(int)

    df["regime"] = aligned
    df["regime_bull"] = (aligned == 0).astype(float)
    df["regime_bear"] = (aligned == 2).astype(float)

    # Volatility regime: compare current vol to median
    returns = np.log(close_prices / close_prices.shift(1))
    vol_20 = returns.rolling(20).std()
    vol_median = vol_20.rolling(252, min_periods=60).median()
    vol_regime = (vol_20 > vol_median).astype(float)
    df["regime_high_vol"] = vol_regime.reindex(df.index).fillna(0)
