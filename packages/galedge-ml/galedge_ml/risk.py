"""Risk engine — position sizing, stop loss, targets, VaR."""

from __future__ import annotations

import numpy as np
import pandas as pd

from galedge_ml.config import (
    MAX_POSITION_PCT, KELLY_FRACTION,
    STOP_LOSS_ATR_MULT, RISK_TOLERANCE_SCALE,
)


def compute_risk(
    close_prices: pd.Series,
    current_price: float,
    direction_prob: float,
    expected_returns: dict[str, float],
    atr: float,
    beta: float,
    portfolio_value: float,
    risk_tolerance: str = "medium",
) -> dict:
    """Compute full risk analysis and recommendation.

    Args:
        close_prices: Recent close prices (at least 252 days).
        current_price: Current stock price.
        direction_prob: Probability of up move from classifier.
        expected_returns: Dict of {"5d": 0.02, "10d": 0.04, ...}.
        atr: Current ATR-14 value (as ratio of price).
        beta: Stock beta.
        portfolio_value: Total portfolio value.
        risk_tolerance: "low", "medium", or "high".
    """
    daily_returns = np.log(close_prices / close_prices.shift(1)).dropna()

    # ── Direction ─────────────────────────────────────────────────────────
    if direction_prob > 0.55:
        direction = "bullish"
        action = "BUY"
    elif direction_prob < 0.45:
        direction = "bearish"
        action = "SELL"
    else:
        direction = "neutral"
        action = "HOLD"

    # ── Kelly Position Sizing ─────────────────────────────────────────────
    # Win/loss ratio from historical data
    positive_rets = daily_returns[daily_returns > 0]
    negative_rets = daily_returns[daily_returns < 0]
    avg_win = positive_rets.mean() if len(positive_rets) > 0 else 0.01
    avg_loss = abs(negative_rets.mean()) if len(negative_rets) > 0 else 0.01
    b = avg_win / avg_loss  # win/loss ratio

    p = direction_prob
    q = 1 - p
    kelly = max(0, (p * b - q) / b) * KELLY_FRACTION  # half-Kelly

    # Scale by risk tolerance
    scale = RISK_TOLERANCE_SCALE.get(risk_tolerance, 1.0)
    position_pct = min(kelly * scale, MAX_POSITION_PCT)
    position_size = round(portfolio_value * position_pct, 2)

    # ── Stop Loss ─────────────────────────────────────────────────────────
    atr_price = atr * current_price
    if action == "BUY":
        stop_loss = round(current_price - STOP_LOSS_ATR_MULT * atr_price, 2)
    elif action == "SELL":
        stop_loss = round(current_price + STOP_LOSS_ATR_MULT * atr_price, 2)
    else:
        stop_loss = round(current_price - STOP_LOSS_ATR_MULT * atr_price, 2)

    stop_loss_pct = round((stop_loss - current_price) / current_price * 100, 2)

    # ── Take Profit Targets ───────────────────────────────────────────────
    # Based on historical return distribution
    if action == "BUY":
        pos_returns = daily_returns[daily_returns > 0]
        if len(pos_returns) > 10:
            # Compound daily returns over holding periods
            target1_ret = float(np.percentile(pos_returns, 60)) * 10  # conservative
            target2_ret = float(np.percentile(pos_returns, 80)) * 10  # aggressive
        else:
            target1_ret = 0.03
            target2_ret = 0.06
    else:
        neg_returns = daily_returns[daily_returns < 0]
        if len(neg_returns) > 10:
            target1_ret = float(np.percentile(neg_returns, 40)) * 10
            target2_ret = float(np.percentile(neg_returns, 20)) * 10
        else:
            target1_ret = -0.03
            target2_ret = -0.06

    target1_price = round(current_price * (1 + target1_ret), 2)
    target2_price = round(current_price * (1 + target2_ret), 2)

    # Estimate probabilities of reaching targets
    hist_returns_10d = (close_prices / close_prices.shift(10) - 1).dropna()
    target1_prob = round(float((hist_returns_10d > target1_ret).mean()), 2) if action == "BUY" else round(float((hist_returns_10d < target1_ret).mean()), 2)
    target2_prob = round(float((hist_returns_10d > target2_ret).mean()), 2) if action == "BUY" else round(float((hist_returns_10d < target2_ret).mean()), 2)

    targets = [
        {
            "price": target1_price,
            "probability": min(max(target1_prob, 0.1), 0.9),
            "return_pct": round(target1_ret * 100, 2),
        },
        {
            "price": target2_price,
            "probability": min(max(target2_prob, 0.1), 0.9),
            "return_pct": round(target2_ret * 100, 2),
        },
    ]

    # ── Risk Metrics ──────────────────────────────────────────────────────
    # VaR 95% (10-day)
    var_95_daily = float(np.percentile(daily_returns, 5))
    var_95_10d = round(var_95_daily * np.sqrt(10), 4)

    # Max drawdown (historical)
    cumulative = (1 + daily_returns).cumprod()
    rolling_max = cumulative.cummax()
    drawdowns = (cumulative - rolling_max) / rolling_max
    max_drawdown = round(float(drawdowns.min()), 4)

    # Volatility
    vol_20d = round(float(daily_returns.tail(20).std()), 6)
    vol_annualized = round(vol_20d * np.sqrt(252), 4)

    # Risk/reward ratio
    stop_distance = abs(current_price - stop_loss)
    target_distance = abs(target1_price - current_price)
    risk_reward = round(target_distance / max(stop_distance, 0.01), 2)

    # Hold duration based on best timeframe
    best_tf = max(expected_returns, key=lambda k: abs(expected_returns[k]))
    hold_days = int(best_tf.replace("d", ""))

    return {
        "direction": direction,
        "action": action,
        "entry_price": current_price,
        "stop_loss": stop_loss,
        "stop_loss_pct": stop_loss_pct,
        "targets": targets,
        "position_size": position_size,
        "position_pct": round(position_pct * 100, 2),
        "hold_duration_days": {"min": max(3, hold_days - 3), "max": hold_days + 5},
        "risk_reward_ratio": risk_reward,
        "risk": {
            "var_95_10d": var_95_10d,
            "max_drawdown": max_drawdown,
            "volatility_20d": vol_20d,
            "volatility_annualized": vol_annualized,
            "beta": round(beta, 3),
        },
    }
