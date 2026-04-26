"""Backtest API endpoints."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.strategy import Strategy, Backtest
from app.auth import require_user
from app.services.backtester import BacktestConfig, run_backtest
from app.services.data_ingestion import ALL_NSE_STOCKS

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
    weight_method: str = "equal"  # equal, market_cap, minimum_variance


UNIVERSE_MAP = {
    "NIFTY 50": ALL_NSE_STOCKS[:50],
    "NIFTY 100": ALL_NSE_STOCKS[:100],
    "NIFTY NEXT 50": ALL_NSE_STOCKS[50:100],
    "CUSTOM": [],
}


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


@router.post("/run")
def run_strategy_backtest(
    req: BacktestRequest,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Run a backtest with given parameters."""
    # Determine symbols
    if req.symbols:
        symbols = req.symbols
    else:
        symbols = UNIVERSE_MAP.get(req.universe, ALL_NSE_STOCKS[:50])

    if not symbols:
        raise HTTPException(status_code=400, detail="No symbols specified")

    # Determine weight function
    if req.weight_method == "equal":
        weight_fn = _equal_weight_fn(symbols)
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

    try:
        result = run_backtest(db, symbols, weight_fn, config)
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
    db: Session = Depends(get_db),
):
    """Quick backtest without auth — for demo/testing."""
    symbols = UNIVERSE_MAP.get(universe, ALL_NSE_STOCKS[:50])

    weight_fn = _momentum_weight_fn(symbols) if method == "momentum" else _equal_weight_fn(symbols)

    config = BacktestConfig(
        start_date=date.fromisoformat(start),
        end_date=date.fromisoformat(end),
        rebalance_frequency=frequency,
        initial_capital=10_000_000,
    )

    try:
        result = run_backtest(db, symbols, weight_fn, config)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "metrics": result.metrics,
        "equity_curve": result.equity_curve[-60:],  # Last 60 data points
        "rebalances": result.rebalances,
    }
