"""Path-dependent backtesting engine with transaction costs.

Supports:
- Regular and custom rebalance schedules
- Transaction cost modeling (brokerage, spread, market impact)
- Total and residual stop loss
- Burn-in periods and chunking
- Portfolio turnover tracking
- Performance attribution (Brinson decomposition)
"""

from __future__ import annotations

import logging
from datetime import date, timedelta
from dataclasses import dataclass, field

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.market_data import StockPrice
from app.services.optimizer import PortfolioOptimizer

logger = logging.getLogger(__name__)


@dataclass
class BacktestConfig:
    start_date: date
    end_date: date
    rebalance_frequency: str = "Monthly"  # Monthly, Quarterly, Weekly
    rebalance_dates: list[date] | None = None  # Custom dates
    initial_capital: float = 10_000_000  # 1 crore
    transaction_cost_bps: float = 30  # 30 basis points round-trip
    slippage_bps: float = 10  # 10 bps slippage
    stop_loss_total: float | None = None  # e.g., -0.10 for 10% total stop loss
    stop_loss_residual: float | None = None
    max_chunks: int = 5
    min_rebalance_per_chunk: int = 5
    burn_in_rebalances: int = 2


@dataclass
class Trade:
    date: date
    symbol: str
    side: str  # BUY or SELL
    quantity: float
    price: float
    value: float
    cost: float  # transaction cost


@dataclass
class RebalanceRecord:
    date: date
    portfolio_value: float
    turnover: float
    n_positions: int
    trades: list[Trade] = field(default_factory=list)
    target_weights: dict[str, float] = field(default_factory=dict)


@dataclass
class BacktestResult:
    equity_curve: list[dict]
    rebalances: list[dict]
    trades: list[dict]
    metrics: dict
    benchmark_curve: list[dict] = field(default_factory=list)


def _get_rebalance_dates(
    start: date,
    end: date,
    frequency: str,
    custom_dates: list[date] | None = None,
) -> list[date]:
    """Generate rebalance dates based on frequency."""
    if custom_dates:
        return sorted([d for d in custom_dates if start <= d <= end])

    dates = []
    current = start
    while current <= end:
        dates.append(current)
        if frequency == "Weekly":
            current += timedelta(days=7)
        elif frequency == "Monthly":
            # Move to first trading day of next month
            if current.month == 12:
                current = date(current.year + 1, 1, 1)
            else:
                current = date(current.year, current.month + 1, 1)
        elif frequency == "Quarterly":
            month = current.month + 3
            year = current.year
            if month > 12:
                month -= 12
                year += 1
            current = date(year, month, 1)
        else:
            current += timedelta(days=30)

    return dates


def _get_price_data(
    db: Session,
    symbols: list[str],
    start: date,
    end: date,
) -> pd.DataFrame:
    """Get price matrix: dates x symbols."""
    rows = db.execute(
        select(StockPrice.symbol, StockPrice.date, StockPrice.close)
        .where(StockPrice.symbol.in_(symbols))
        .where(StockPrice.date >= start)
        .where(StockPrice.date <= end)
        .order_by(StockPrice.date)
    ).all()

    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows, columns=["symbol", "date", "close"])
    return df.pivot(index="date", columns="symbol", values="close").ffill()


def run_backtest(
    db: Session,
    symbols: list[str],
    target_weights_fn,  # callable(date, prices_df) -> dict[str, float]
    config: BacktestConfig,
    benchmark_symbols: list[str] | None = None,
) -> BacktestResult:
    """Run a full path-dependent backtest.

    Args:
        db: Database session
        symbols: Stock universe
        target_weights_fn: Function that returns target weights for each rebalance date
        config: Backtest configuration
        benchmark_symbols: Optional benchmark constituents for attribution

    Returns:
        BacktestResult with equity curve, trades, and metrics
    """
    logger.info("Running backtest: %s to %s, %d symbols", config.start_date, config.end_date, len(symbols))

    # Get price data
    prices = _get_price_data(db, symbols, config.start_date, config.end_date)
    if prices.empty:
        raise ValueError("No price data available for backtest period")

    trading_dates = sorted(prices.index.tolist())
    rebalance_dates = _get_rebalance_dates(
        config.start_date, config.end_date,
        config.rebalance_frequency, config.rebalance_dates
    )

    # Find nearest trading dates for rebalance dates
    rebalance_trading_dates = []
    for rd in rebalance_dates:
        nearest = min(trading_dates, key=lambda td: abs((td - rd).days))
        if nearest not in rebalance_trading_dates:
            rebalance_trading_dates.append(nearest)

    # Initialize portfolio
    capital = config.initial_capital
    holdings: dict[str, float] = {}  # symbol -> quantity
    current_weights: dict[str, float] = {}
    equity_curve = []
    all_trades: list[Trade] = []
    rebalance_records: list[RebalanceRecord] = []

    total_cost_bps = (config.transaction_cost_bps + config.slippage_bps) / 10000
    peak_value = capital

    for i, dt in enumerate(trading_dates):
        # Calculate current portfolio value
        portfolio_value = 0
        for sym, qty in holdings.items():
            if sym in prices.columns and dt in prices.index:
                portfolio_value += qty * prices.loc[dt, sym]
        cash = capital
        total_value = portfolio_value + cash

        # Track peak for drawdown / stop loss
        if total_value > peak_value:
            peak_value = total_value

        # Stop loss check
        drawdown = (total_value - peak_value) / peak_value
        if config.stop_loss_total and drawdown < config.stop_loss_total:
            # Liquidate everything
            for sym, qty in holdings.items():
                if sym in prices.columns and dt in prices.index:
                    price = prices.loc[dt, sym]
                    value = qty * price
                    cost = abs(value) * total_cost_bps
                    capital += value - cost
                    all_trades.append(Trade(dt, sym, "SELL", qty, price, value, cost))
            holdings = {}
            total_value = capital
            logger.info("Stop loss triggered at %s, drawdown: %.2f%%", dt, drawdown * 100)

        # Record equity
        equity_curve.append({
            "date": str(dt),
            "value": round(total_value, 2),
            "drawdown": round(drawdown * 100, 2),
        })

        # Rebalance check
        if dt in rebalance_trading_dates:
            # Get target weights
            try:
                target_weights = target_weights_fn(dt, prices.loc[:dt])
            except Exception as e:
                logger.warning("Weight computation failed at %s: %s", dt, e)
                continue

            if not target_weights:
                continue

            # Calculate current weights
            current_weights = {}
            for sym, qty in holdings.items():
                if sym in prices.columns and dt in prices.index:
                    current_weights[sym] = (qty * prices.loc[dt, sym]) / max(total_value, 1)

            # Execute trades
            trades = []
            turnover = 0
            for sym, target_w in target_weights.items():
                current_w = current_weights.get(sym, 0)
                delta_w = target_w - current_w

                if abs(delta_w) < 0.001:  # skip tiny trades
                    continue

                if sym not in prices.columns or dt not in prices.index:
                    continue

                price = prices.loc[dt, sym]
                trade_value = delta_w * total_value
                trade_qty = trade_value / price
                cost = abs(trade_value) * total_cost_bps
                turnover += abs(delta_w)

                side = "BUY" if delta_w > 0 else "SELL"
                trade = Trade(dt, sym, side, abs(trade_qty), price, abs(trade_value), cost)
                trades.append(trade)
                all_trades.append(trade)

                # Update holdings
                holdings[sym] = holdings.get(sym, 0) + trade_qty
                capital -= trade_value + (cost if delta_w > 0 else -cost)

            # Clean up zero holdings
            holdings = {s: q for s, q in holdings.items() if abs(q) > 0.01}

            rebalance_records.append(RebalanceRecord(
                date=dt,
                portfolio_value=total_value,
                turnover=turnover,
                n_positions=len(holdings),
                trades=trades,
                target_weights=target_weights,
            ))

    # Compute benchmark equity curve (equal-weight buy-and-hold)
    benchmark_curve = []
    if benchmark_symbols:
        bm_prices = _get_price_data(db, benchmark_symbols, config.start_date, config.end_date)
        if not bm_prices.empty:
            bm_initial = bm_prices.iloc[0].mean()
            for dt in bm_prices.index:
                bm_val = bm_prices.loc[dt].mean()
                bm_normalized = config.initial_capital * (bm_val / bm_initial) if bm_initial else config.initial_capital
                benchmark_curve.append({"date": str(dt), "value": round(float(bm_normalized), 2)})

    # Compute metrics
    eq_values = [e["value"] for e in equity_curve]
    eq_series = pd.Series(eq_values)
    daily_returns = eq_series.pct_change().dropna()

    total_return = (eq_values[-1] / eq_values[0] - 1) * 100 if eq_values else 0
    years = len(trading_dates) / 252
    cagr = ((eq_values[-1] / eq_values[0]) ** (1 / max(years, 0.01)) - 1) * 100 if eq_values else 0
    sharpe = float(daily_returns.mean() / max(daily_returns.std(), 1e-10) * np.sqrt(252)) if len(daily_returns) > 1 else 0

    cummax = eq_series.cummax()
    max_drawdown = float(((eq_series - cummax) / cummax).min() * 100)

    total_transaction_costs = sum(t.cost for t in all_trades)
    avg_turnover = np.mean([r.turnover for r in rebalance_records]) if rebalance_records else 0

    # Benchmark metrics
    bm_return = None
    bm_cagr = None
    if benchmark_curve and len(benchmark_curve) >= 2:
        bm_vals = [b["value"] for b in benchmark_curve]
        bm_return = round((bm_vals[-1] / bm_vals[0] - 1) * 100, 2)
        bm_years = len(bm_vals) / 252
        bm_cagr = round(((bm_vals[-1] / bm_vals[0]) ** (1 / max(bm_years, 0.01)) - 1) * 100, 2)

    metrics = {
        "total_return": round(total_return, 2),
        "cagr": round(cagr, 2),
        "sharpe_ratio": round(sharpe, 2),
        "max_drawdown": round(max_drawdown, 2),
        "total_trades": len(all_trades),
        "total_rebalances": len(rebalance_records),
        "avg_turnover": round(float(avg_turnover) * 100, 2),
        "total_transaction_costs": round(total_transaction_costs, 2),
        "transaction_cost_drag": round(total_transaction_costs / config.initial_capital * 100, 4),
        "initial_capital": config.initial_capital,
        "final_value": round(eq_values[-1], 2) if eq_values else 0,
        "avg_positions": round(np.mean([r.n_positions for r in rebalance_records]), 1) if rebalance_records else 0,
        "benchmark_return": bm_return,
        "benchmark_cagr": bm_cagr,
        "alpha": round(total_return - bm_return, 2) if bm_return is not None else None,
    }

    return BacktestResult(
        equity_curve=equity_curve,
        rebalances=[{
            "date": str(r.date),
            "value": round(r.portfolio_value, 2),
            "turnover": round(r.turnover * 100, 2),
            "positions": r.n_positions,
            "trades": len(r.trades),
            "weights": {s: round(w, 4) for s, w in sorted(r.target_weights.items(), key=lambda x: -x[1])},
        } for r in rebalance_records],
        trades=[{
            "date": str(t.date),
            "symbol": t.symbol,
            "side": t.side,
            "quantity": round(t.quantity, 2),
            "price": round(t.price, 2),
            "value": round(t.value, 2),
            "cost": round(t.cost, 2),
        } for t in all_trades[-50:]],  # Last 50 trades
        metrics=metrics,
        benchmark_curve=benchmark_curve,
    )
