"""Advanced risk models — Monte Carlo, CVaR, Stress Testing, Drawdown Analysis."""

from __future__ import annotations

import numpy as np
import pandas as pd


def monte_carlo_simulation(
    daily_returns: pd.Series,
    holding_days: int = 10,
    n_simulations: int = 10000,
    initial_value: float = 100.0,
) -> dict:
    """Run Monte Carlo simulation for future portfolio value.

    Simulates n_simulations paths of holding_days length using
    bootstrapped daily returns.

    Returns:
        percentiles: {5, 25, 50, 75, 95} of final portfolio value
        expected_return: mean return across simulations
        prob_loss: probability of losing money
        prob_gain_5pct: probability of gaining >5%
        worst_case: 1st percentile return
        best_case: 99th percentile return
    """
    returns = daily_returns.dropna().values
    if len(returns) < 20:
        return {"error": "insufficient data"}

    # Bootstrap: randomly sample daily returns for each simulation
    sim_returns = np.random.choice(returns, size=(n_simulations, holding_days), replace=True)

    # Compound returns to get final values
    sim_paths = initial_value * np.cumprod(1 + sim_returns, axis=1)
    final_values = sim_paths[:, -1]
    final_returns = (final_values / initial_value) - 1

    return {
        "n_simulations": n_simulations,
        "holding_days": holding_days,
        "percentiles": {
            "p5": round(float(np.percentile(final_returns, 5)) * 100, 2),
            "p25": round(float(np.percentile(final_returns, 25)) * 100, 2),
            "p50": round(float(np.percentile(final_returns, 50)) * 100, 2),
            "p75": round(float(np.percentile(final_returns, 75)) * 100, 2),
            "p95": round(float(np.percentile(final_returns, 95)) * 100, 2),
        },
        "expected_return": round(float(np.mean(final_returns)) * 100, 2),
        "prob_loss": round(float(np.mean(final_returns < 0)) * 100, 2),
        "prob_gain_5pct": round(float(np.mean(final_returns > 0.05)) * 100, 2),
        "worst_case": round(float(np.percentile(final_returns, 1)) * 100, 2),
        "best_case": round(float(np.percentile(final_returns, 99)) * 100, 2),
    }


def compute_cvar(
    daily_returns: pd.Series,
    confidence: float = 0.95,
    holding_days: int = 10,
) -> dict:
    """Compute Conditional Value at Risk (Expected Shortfall).

    CVaR answers: "In the worst (1-confidence)% of cases, what's the average loss?"

    Returns:
        var: Value at Risk at given confidence
        cvar: Conditional VaR (Expected Shortfall)
        Both scaled to holding_days period.
    """
    returns = daily_returns.dropna().values
    if len(returns) < 20:
        return {"var": 0, "cvar": 0}

    # Scale to holding period
    period_returns = []
    for i in range(len(returns) - holding_days + 1):
        r = np.prod(1 + returns[i:i + holding_days]) - 1
        period_returns.append(r)
    period_returns = np.array(period_returns)

    # VaR: threshold below which (1-confidence)% of returns fall
    var_threshold = np.percentile(period_returns, (1 - confidence) * 100)

    # CVaR: average of returns below VaR threshold
    tail_returns = period_returns[period_returns <= var_threshold]
    cvar = float(np.mean(tail_returns)) if len(tail_returns) > 0 else float(var_threshold)

    return {
        "confidence": confidence,
        "holding_days": holding_days,
        "var": round(float(var_threshold) * 100, 2),
        "cvar": round(cvar * 100, 2),
    }


def stress_test(
    daily_returns: pd.Series,
    current_price: float,
) -> dict:
    """Simulate historical stress scenarios.

    Tests how the stock would perform under conditions similar to:
    - 2008 Financial Crisis (60-day severe bear)
    - 2020 COVID Crash (23-day rapid crash)
    - 2022 Rate Hike Selloff (slow 180-day grind down)
    - Flash Crash (1-day extreme drop)

    Uses the stock's own volatility to calibrate the scenarios.
    """
    returns = daily_returns.dropna()
    vol = float(returns.std())
    mean_ret = float(returns.mean())

    scenarios = {}

    # 2008-style: 60 days of returns from the worst 10% of daily returns
    worst_10pct = returns[returns < returns.quantile(0.1)].values
    if len(worst_10pct) > 0:
        sampled = np.random.choice(worst_10pct, size=60, replace=True)
        crash_return = float(np.prod(1 + sampled) - 1)
        scenarios["financial_crisis_60d"] = {
            "label": "2008-Style Crisis (60 days)",
            "estimated_return": round(crash_return * 100, 2),
            "estimated_price": round(current_price * (1 + crash_return), 2),
        }

    # COVID-style: 23 days of 2x normal volatility, negative bias
    covid_returns = np.random.normal(mean_ret - 2 * vol, vol * 2, 23)
    covid_return = float(np.prod(1 + covid_returns) - 1)
    scenarios["covid_crash_23d"] = {
        "label": "COVID-Style Crash (23 days)",
        "estimated_return": round(covid_return * 100, 2),
        "estimated_price": round(current_price * (1 + covid_return), 2),
    }

    # Rate hike: 180 days of slightly negative returns with normal vol
    rate_returns = np.random.normal(-0.001, vol, 180)
    rate_return = float(np.prod(1 + rate_returns) - 1)
    scenarios["rate_hike_180d"] = {
        "label": "Rate Hike Selloff (180 days)",
        "estimated_return": round(rate_return * 100, 2),
        "estimated_price": round(current_price * (1 + rate_return), 2),
    }

    # Flash crash: worst single day × 3
    worst_day = float(returns.min())
    scenarios["flash_crash_1d"] = {
        "label": "Flash Crash (1 day)",
        "estimated_return": round(worst_day * 3 * 100, 2),
        "estimated_price": round(current_price * (1 + worst_day * 3), 2),
    }

    return scenarios


def drawdown_analysis(close_prices: pd.Series) -> dict:
    """Comprehensive drawdown analysis.

    Returns:
        max_drawdown: worst peak-to-trough decline
        max_drawdown_duration: how many days the worst drawdown lasted
        current_drawdown: current drawdown from peak
        recovery_time_avg: average days to recover from drawdowns >5%
        drawdown_periods: list of significant drawdown events
    """
    cummax = close_prices.cummax()
    drawdown = (close_prices - cummax) / cummax

    # Max drawdown
    max_dd = float(drawdown.min())
    max_dd_idx = drawdown.idxmin()

    # Find peak before max drawdown
    peak_idx = close_prices.loc[:max_dd_idx].idxmax()
    max_dd_duration = len(close_prices.loc[peak_idx:max_dd_idx])

    # Current drawdown
    current_dd = float(drawdown.iloc[-1])

    # Find all drawdown periods > 5%
    in_drawdown = False
    periods = []
    peak_price = 0
    peak_date = None

    for date, dd in drawdown.items():
        if dd == 0:
            if in_drawdown and peak_date:
                trough_date = drawdown.loc[peak_date:date].idxmin()
                trough_dd = float(drawdown.loc[trough_date])
                if trough_dd < -0.05:
                    recovery_days = len(close_prices.loc[trough_date:date])
                    periods.append({
                        "peak_date": str(peak_date)[:10],
                        "trough_date": str(trough_date)[:10],
                        "recovery_date": str(date)[:10],
                        "drawdown_pct": round(trough_dd * 100, 2),
                        "recovery_days": recovery_days,
                    })
            in_drawdown = False
            peak_price = float(close_prices.loc[date])
            peak_date = date
        else:
            in_drawdown = True

    # Average recovery time
    recovery_times = [p["recovery_days"] for p in periods if p["recovery_days"] > 0]
    avg_recovery = round(np.mean(recovery_times)) if recovery_times else 0

    return {
        "max_drawdown": round(max_dd * 100, 2),
        "max_drawdown_duration_days": max_dd_duration,
        "current_drawdown": round(current_dd * 100, 2),
        "avg_recovery_days": avg_recovery,
        "significant_drawdowns": periods[-5:],  # last 5
    }


def compute_advanced_risk(
    close_prices: pd.Series,
    current_price: float,
    holding_days: int = 10,
) -> dict:
    """Compute all advanced risk metrics."""
    daily_returns = close_prices.pct_change().dropna()

    return {
        "monte_carlo": monte_carlo_simulation(daily_returns, holding_days),
        "cvar": compute_cvar(daily_returns, 0.95, holding_days),
        "stress_test": stress_test(daily_returns, current_price),
        "drawdown": drawdown_analysis(close_prices),
    }
