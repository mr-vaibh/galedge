"""Walk-forward backtesting engine."""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd
import yfinance as yf

from galedge_ml.config import ALL_FEATURES, TIMEFRAMES, MODELS_DIR, TARGET_THRESHOLD
from galedge_ml.features import compute_features
from galedge_ml.predictor import _load_models, _models

logger = logging.getLogger(__name__)


def backtest(
    symbol: str,
    period: str = "1y",
    initial_capital: float = 100000,
    timeframe: int = 10,
) -> dict:
    """Run a walk-forward backtest on a single symbol.

    Returns equity curve, metrics, and trade history.
    """
    _load_models()
    if not _models:
        raise RuntimeError("Models not loaded")

    clf_key = f"clf_{timeframe}d"
    reg_key = f"reg_{timeframe}d"
    if clf_key not in _models:
        raise ValueError(f"No model for {timeframe}d timeframe")

    clf = _models[clf_key]
    reg = _models[reg_key]

    # Fetch data
    t = yf.Ticker(symbol)
    hist = t.history(period=period, interval="1d")
    if hist.empty or len(hist) < 60:
        raise ValueError(f"Insufficient data for {symbol}")

    features_df = compute_features(symbol, period)
    close = hist["Close"].reindex(features_df.index).dropna()
    features_df = features_df.reindex(close.index)

    # Simulate trading
    capital = initial_capital
    position = 0  # shares held
    entry_price = 0.0
    trades = []
    equity_curve = []
    holding_days = 0

    for i in range(len(features_df) - timeframe):
        date = features_df.index[i]
        current_price = float(close.iloc[i])
        X = features_df.iloc[i][ALL_FEATURES].values.reshape(1, -1)
        X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)

        prob = float(clf.predict_proba(X)[0][1])
        exp_ret = float(reg.predict(X)[0])

        portfolio_value = capital + position * current_price

        # Record equity
        equity_curve.append({
            "date": str(date)[:10],
            "value": round(portfolio_value, 2),
        })

        # Trading logic
        if position > 0:
            holding_days += 1
            # Exit conditions
            pnl_pct = (current_price - entry_price) / entry_price
            should_exit = (
                holding_days >= timeframe or  # time-based exit
                pnl_pct < -0.05 or  # stop loss (5%)
                (prob < 0.45 and holding_days >= 3)  # signal reversal
            )
            if should_exit:
                pnl = (current_price - entry_price) * position
                capital += position * current_price
                trades.append({
                    "entry_date": entry_date,
                    "exit_date": str(date)[:10],
                    "entry_price": round(entry_price, 2),
                    "exit_price": round(current_price, 2),
                    "shares": position,
                    "pnl": round(pnl, 2),
                    "pnl_pct": round(pnl_pct * 100, 2),
                    "holding_days": holding_days,
                })
                position = 0
                holding_days = 0
        else:
            # Entry conditions
            if prob > 0.55 and exp_ret > 0.005:
                # Invest 10% of capital
                invest = capital * 0.10
                shares = int(invest / current_price)
                if shares > 0:
                    position = shares
                    entry_price = current_price
                    entry_date = str(date)[:10]
                    capital -= shares * current_price
                    holding_days = 0

    # Close any open position
    if position > 0:
        final_price = float(close.iloc[-1])
        pnl = (final_price - entry_price) * position
        capital += position * final_price
        trades.append({
            "entry_date": entry_date,
            "exit_date": str(close.index[-1])[:10],
            "entry_price": round(entry_price, 2),
            "exit_price": round(final_price, 2),
            "shares": position,
            "pnl": round(pnl, 2),
            "pnl_pct": round((final_price - entry_price) / entry_price * 100, 2),
            "holding_days": holding_days,
        })

    # Add final equity point
    final_value = capital
    equity_curve.append({
        "date": str(close.index[-1])[:10],
        "value": round(final_value, 2),
    })

    # Compute metrics
    total_return = (final_value - initial_capital) / initial_capital
    winning_trades = [t for t in trades if t["pnl"] > 0]
    losing_trades = [t for t in trades if t["pnl"] <= 0]

    # Sharpe ratio from equity curve
    eq_values = pd.Series([e["value"] for e in equity_curve])
    eq_returns = eq_values.pct_change().dropna()
    sharpe = float(eq_returns.mean() / eq_returns.std() * np.sqrt(252)) if len(eq_returns) > 1 and eq_returns.std() > 0 else 0

    # Max drawdown
    cummax = eq_values.cummax()
    drawdowns = (eq_values - cummax) / cummax
    max_dd = float(drawdowns.min())

    # Profit factor
    gross_profit = sum(t["pnl"] for t in winning_trades)
    gross_loss = abs(sum(t["pnl"] for t in losing_trades))
    profit_factor = round(gross_profit / max(gross_loss, 1), 2)

    metrics = {
        "total_return": round(total_return * 100, 2),
        "total_return_dollar": round(final_value - initial_capital, 2),
        "total_trades": len(trades),
        "winning_trades": len(winning_trades),
        "losing_trades": len(losing_trades),
        "win_rate": round(len(winning_trades) / max(len(trades), 1) * 100, 2),
        "avg_win": round(np.mean([t["pnl_pct"] for t in winning_trades]), 2) if winning_trades else 0,
        "avg_loss": round(np.mean([t["pnl_pct"] for t in losing_trades]), 2) if losing_trades else 0,
        "profit_factor": profit_factor,
        "sharpe_ratio": round(sharpe, 2),
        "max_drawdown": round(max_dd * 100, 2),
        "initial_capital": initial_capital,
        "final_value": round(final_value, 2),
    }

    return {
        "symbol": symbol.upper(),
        "period": period,
        "timeframe": f"{timeframe}d",
        "metrics": metrics,
        "equity_curve": equity_curve,
        "trades": trades[-20:],  # last 20 trades
    }
