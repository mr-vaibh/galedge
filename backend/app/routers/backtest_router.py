"""Backtest API endpoints."""

import logging
from datetime import date

import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db, get_prices_db
from app.models.user import User
from app.models.strategy import Strategy, Backtest
from app.auth import require_user
from app.services.backtester import BacktestConfig, run_backtest
from app.services.optimizer import PortfolioOptimizer
from app.services.data_ingestion import ALL_NSE_STOCKS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/backtest", tags=["backtest"])


class BacktestRequest(BaseModel):
    strategy_id: int | None = None
    symbols: list[str] | None = None  # If no strategy, use these symbols
    universe: str = "NIFTY 50"
    start_date: str = "2025-01-01"
    end_date: str = "2026-04-24"
    rebalance_frequency: str = "Monthly"
    initial_capital: float = 10_000_000  # 1 crore
    transaction_cost_bps: float = 30
    slippage_bps: float = 10
    stop_loss_total: float | None = None
    benchmark: str = "NIFTY 50"
    weight_method: str = "equal"  # equal, momentum, optimizer, alpha_score
    optimizer_objective: str = "maximize_sharpe"
    optimizer_constraints: list[dict] = []
    alpha_scores: dict[str, float] | None = None  # symbol → z_score for alpha_score weighting


_UNIVERSE_MAP_RAW = {
    "NIFTY 50": ALL_NSE_STOCKS[:50],
    "NIFTY 100": ALL_NSE_STOCKS[:100],
    "NIFTY NEXT 50": ALL_NSE_STOCKS[50:100],
    "NIFTY 200": ALL_NSE_STOCKS[:200],
    "NIFTY 500": ALL_NSE_STOCKS[:500],
    "NIFTY MIDCAP 150": ALL_NSE_STOCKS[100:250],
    "NIFTY SMALLCAP 250": ALL_NSE_STOCKS[250:500],
    "CUSTOM": [],
}
# Case-insensitive lookup map
UNIVERSE_MAP = {k.upper(): v for k, v in _UNIVERSE_MAP_RAW.items()}


def _get_universe(name: str) -> list[str]:
    """Case-insensitive universe lookup with fallback."""
    return UNIVERSE_MAP.get((name or "").upper(), ALL_NSE_STOCKS[:50])


def _equal_weight_fn(symbols: list[str]):
    """Equal weight allocation."""
    w = 1.0 / len(symbols)
    def fn(dt, prices_df):
        available = [s for s in symbols if s in prices_df.columns]
        return {s: 1.0 / len(available) for s in available} if available else {}
    return fn


def _momentum_weight_fn(symbols: list[str]):
    """Momentum-based weight: overweight stocks with positive 1-month return."""
    def fn(dt, prices_df):
        available = [s for s in symbols if s in prices_df.columns and len(prices_df[s].dropna()) > 21]
        if not available:
            return {}

        # 1-month momentum
        returns = {}
        for s in available:
            closes = prices_df[s].dropna()
            if len(closes) > 21:
                ret = closes.iloc[-1] / closes.iloc[-22] - 1
                returns[s] = ret

        if not returns:
            return {s: 1.0 / len(available) for s in available}

        # Rank and weight: top half gets 2x weight
        sorted_stocks = sorted(returns.items(), key=lambda x: x[1], reverse=True)
        n = len(sorted_stocks)
        top_half = sorted_stocks[:n // 2]
        bottom_half = sorted_stocks[n // 2:]

        weights = {}
        top_w = 1.5 / max(len(top_half), 1)
        bot_w = 0.5 / max(len(bottom_half), 1)
        for s, _ in top_half:
            weights[s] = top_w / n
        for s, _ in bottom_half:
            weights[s] = bot_w / n

        # Normalize
        total = sum(weights.values())
        if total > 0:
            weights = {s: w / total for s, w in weights.items()}
        return weights
    return fn


def _optimizer_weight_fn(symbols: list[str], objective: str, constraints: list[dict], risk_free_rate: float = 0.05):
    """Optimizer-based weight function: runs portfolio optimization at each rebalance."""
    def fn(dt, prices_df):
        available = [s for s in symbols if s in prices_df.columns]
        if len(available) < 3:
            return {s: 1.0 / len(available) for s in available} if available else {}

        try:
            # Use last 60 trading days of data up to current date for optimization
            sub_df = prices_df[available].dropna(axis=1, thresh=int(len(prices_df) * 0.5))
            valid = sub_df.columns.tolist()
            if len(valid) < 3:
                return {s: 1.0 / len(available) for s in available}

            returns = sub_df.pct_change().dropna()
            if len(returns) < 20:
                return {s: 1.0 / len(valid) for s in valid}

            mean_ret = returns.mean().values * 252
            cov_mat = returns.cov().values * 252

            # Compute betas for beta constraints
            mkt_ret = returns.mean(axis=1)
            mkt_var = mkt_ret.var()
            betas = []
            for sym in valid:
                if mkt_var > 0:
                    betas.append(float(returns[sym].cov(mkt_ret) / mkt_var))
                else:
                    betas.append(1.0)

            # Extract max_positions — pre-select top stocks by Sharpe contribution
            max_pos = None
            pos_min = None
            pos_max = None
            filtered = []
            for c in constraints:
                if c.get("type") == "max_positions":
                    max_pos = int(c.get("value", 50))
                elif c.get("type") == "position_size_bound":
                    pos_min = c.get("min", 0.0)
                    pos_max = c.get("max", 1.0)
                else:
                    filtered.append(c)

            # Pre-select: if max_positions < available stocks, pick top by expected return/risk ratio
            pre_valid = valid
            if max_pos and len(valid) > max_pos:
                # Score = expected_return / std_dev (simple Sharpe proxy)
                stds = np.sqrt(np.diag(cov_mat))
                scores = mean_ret / np.where(stds > 0, stds, 1e-10)
                top_idx = np.argsort(scores)[-max_pos:]
                pre_valid = [valid[i] for i in sorted(top_idx)]
                # Rebuild returns/cov for pre-selected subset
                sub_idx = [valid.index(s) for s in pre_valid]
                mean_ret = mean_ret[sub_idx]
                cov_mat = cov_mat[np.ix_(sub_idx, sub_idx)]
                betas = [betas[i] for i in sub_idx]

            # Add position size bound on the pre-selected smaller universe
            if pos_min is not None or pos_max is not None:
                filtered.append({
                    "type": "position_size_bound",
                    "min": pos_min or 0.0,
                    "max": pos_max or 1.0,
                })

            opt = PortfolioOptimizer(
                expected_returns=mean_ret.tolist(),
                covariance_matrix=cov_mat.tolist(),
                symbols=pre_valid,
                risk_free_rate=risk_free_rate,
            )
            result = opt.optimize(
                objective=objective,
                constraints=filtered,
                stock_betas=np.array(betas),
            )

            weights = result.get("weights", {})
            if not weights or result.get("status") == "infeasible":
                # Equal weight on pre-selected
                return {s: 1.0 / len(pre_valid) for s in pre_valid}

            return weights
        except Exception as e:
            logger.warning("Optimizer failed at %s: %s — falling back to equal weight", dt, e)
            return {s: 1.0 / len(available) for s in available}

    return fn


@router.post("/run")
def run_strategy_backtest(
    req: BacktestRequest,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    prices_db: Session = Depends(get_prices_db),
):
    """Run a backtest with given parameters."""
    # Determine symbols
    if req.symbols:
        symbols = req.symbols
    else:
        symbols = _get_universe(req.universe)

    if not symbols:
        raise HTTPException(status_code=400, detail="No symbols specified")

    # Determine weight function
    if req.weight_method == "alpha_score" and req.alpha_scores:
        _scores = req.alpha_scores
        def _alpha_weight_fn(symbols: list[str]):
            # Softmax of z-scores → stable positive weights summing to 1
            import math
            raw = [math.exp(max(_scores.get(s, 0.0), -3.0)) for s in symbols]
            total = sum(raw)
            weights = {s: raw[i] / total for i, s in enumerate(symbols)}
            def fn(dt, prices_df):
                available = [s for s in symbols if s in prices_df.columns]
                if not available:
                    return {}
                t = sum(weights.get(s, 0.0) for s in available)
                return {s: weights.get(s, 0.0) / t for s in available} if t > 0 else {}
            return fn
        weight_fn = _alpha_weight_fn(symbols)
    elif req.weight_method == "optimizer":
        weight_fn = _optimizer_weight_fn(symbols, req.optimizer_objective, req.optimizer_constraints)
    elif req.weight_method == "momentum":
        weight_fn = _momentum_weight_fn(symbols)
    else:
        weight_fn = _equal_weight_fn(symbols)

    config = BacktestConfig(
        start_date=date.fromisoformat(req.start_date),
        end_date=date.fromisoformat(req.end_date),
        rebalance_frequency=req.rebalance_frequency,
        initial_capital=req.initial_capital,
        transaction_cost_bps=req.transaction_cost_bps,
        slippage_bps=req.slippage_bps,
        stop_loss_total=req.stop_loss_total,
    )

    # Use benchmark symbols for comparison curve
    benchmark_syms = _get_universe(req.benchmark or "NIFTY 50")

    try:
        result = run_backtest(prices_db, symbols, weight_fn, config, benchmark_symbols=benchmark_syms)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Save backtest to DB if strategy provided
    if req.strategy_id:
        strategy = db.query(Strategy).filter(
            Strategy.id == req.strategy_id,
            Strategy.user_id == user.id,
        ).first()
        if strategy:
            bt = Backtest(
                strategy_id=strategy.id,
                start_date=config.start_date,
                end_date=config.end_date,
                rebalance_frequency=config.rebalance_frequency,
                status="completed",
                results={
                    "metrics": result.metrics,
                    "equity_curve_length": len(result.equity_curve),
                    "trades_count": len(result.trades),
                },
            )
            db.add(bt)
            strategy.analytics_status = "AVAILABLE"
            strategy.rebalance_status = "AVAILABLE"
            db.commit()

    return {
        "metrics": result.metrics,
        "equity_curve": result.equity_curve,
        "benchmark_curve": result.benchmark_curve,
        "rebalances": result.rebalances,
        "trades": result.trades,
    }


@router.post("/quick")
def quick_backtest(
    universe: str = Query("NIFTY 50"),
    start: str = Query("2025-06-01"),
    end: str = Query("2026-04-24"),
    frequency: str = Query("Monthly"),
    method: str = Query("equal", enum=["equal", "momentum"]),
    prices_db: Session = Depends(get_prices_db),
):
    """Quick backtest without auth — for demo/testing."""
    symbols = _get_universe(universe)

    weight_fn = _momentum_weight_fn(symbols) if method == "momentum" else _equal_weight_fn(symbols)

    config = BacktestConfig(
        start_date=date.fromisoformat(start),
        end_date=date.fromisoformat(end),
        rebalance_frequency=frequency,
        initial_capital=10_000_000,
    )

    try:
        result = run_backtest(prices_db, symbols, weight_fn, config)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "metrics": result.metrics,
        "equity_curve": result.equity_curve[-60:],  # Last 60 data points
        "rebalances": result.rebalances,
    }
