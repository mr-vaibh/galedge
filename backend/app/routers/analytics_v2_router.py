"""Analytics v2 router — on-the-fly analytics using analytics_engine.py"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db, get_prices_db
from app.auth import get_current_user
from app.models.user import User
from app.models.portfolio import Portfolio
from app.models.strategy import Strategy, Backtest
from app.services.analytics_engine import get_full_analytics, EVENTS

router = APIRouter(prefix="/api/analytics/v2", tags=["analytics-v2"])


@router.get("/selector")
def get_selector(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return portfolios and strategies for the current user."""
    portfolios = (
        db.query(Portfolio)
        .filter(
            Portfolio.user_id == current_user.id,
            Portfolio.portfolio_type == "uploaded",
        )
        .all()
    )

    strategies = (
        db.query(Strategy)
        .filter(Strategy.user_id == current_user.id)
        .all()
    )

    portfolio_list = [
        {
            "id": p.id,
            "fund_name": p.fund_name,
            "scheme_name": p.scheme_name,
            "type": "uploaded",
            "benchmark": p.benchmark,
        }
        for p in portfolios
    ]

    strategy_list = [
        {
            "id": s.id,
            "fund_name": s.fund_name,
            "scheme_name": s.scheme_name,
            "iteration_name": s.iteration_name,
            "backtests": [
                {
                    "id": bt.id,
                    "start_date": str(bt.start_date),
                    "end_date": str(bt.end_date),
                    "status": bt.status,
                }
                for bt in s.backtests
            ],
        }
        for s in strategies
    ]

    return {"portfolios": portfolio_list, "strategies": strategy_list}


@router.get("/compute")
def compute_analytics(
    source: str = Query(..., description="portfolio or strategy"),
    source_id: int = Query(..., description="Portfolio or Strategy ID"),
    backtest_id: int = Query(None, description="Required if source=strategy"),
    benchmark: str = Query("NIFTY 500", description="Benchmark name"),
    db: Session = Depends(get_db),
    prices_db: Session = Depends(get_prices_db),
    current_user: User = Depends(get_current_user),
):
    """Compute full analytics for a portfolio or strategy backtest."""
    if source not in ("portfolio", "strategy"):
        raise HTTPException(status_code=400, detail="source must be 'portfolio' or 'strategy'")

    if source == "strategy" and backtest_id is None:
        raise HTTPException(status_code=400, detail="backtest_id is required when source=strategy")

    # Ownership check
    if source == "portfolio":
        portfolio = db.query(Portfolio).filter(
            Portfolio.id == source_id,
            Portfolio.user_id == current_user.id,
        ).first()
        if not portfolio:
            raise HTTPException(status_code=404, detail="Portfolio not found")
    else:
        strategy = db.query(Strategy).filter(
            Strategy.id == source_id,
            Strategy.user_id == current_user.id,
        ).first()
        if not strategy:
            raise HTTPException(status_code=404, detail="Strategy not found")

    try:
        result = get_full_analytics(
            source=source,
            source_id=source_id,
            backtest_id=backtest_id,
            db=db,
            prices_db=prices_db,
            benchmark_name=benchmark,
        )
        return result
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/events")
def get_events():
    """Return the list of market events for event sensitivity analysis."""
    return EVENTS
