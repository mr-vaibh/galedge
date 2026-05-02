"""Strategy Builder CRUD endpoints."""

import logging
from datetime import date, datetime

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db, get_prices_db
from app.models.user import User
from app.models.market_data import StockPrice
from app.models.strategy import Strategy, StrategyConstraint, StrategyObjective, Backtest
from app.auth import require_user
from app.services.optimizer import PortfolioOptimizer
from app.services.data_ingestion import ALL_NSE_STOCKS

logger = logging.getLogger(__name__)

UNIVERSE_MAP = {
    "NIFTY 50": ALL_NSE_STOCKS[:50],
    "NIFTY 100": ALL_NSE_STOCKS[:100],
    "NIFTY NEXT 50": ALL_NSE_STOCKS[50:100],
    "NIFTY 500": ALL_NSE_STOCKS,
    "NIFTY": ALL_NSE_STOCKS[:50],
}

router = APIRouter(prefix="/api/strategies", tags=["strategies"])


class StrategyCreate(BaseModel):
    fund_name: str
    scheme_name: str = ""
    iteration_name: str = ""
    universe: str = "NIFTY 500"
    benchmark: str = "NIFTY 500"
    include_futures: bool = False

class ConstraintCreate(BaseModel):
    constraint_type: str
    name: str
    parameters: dict = {}

class ObjectiveCreate(BaseModel):
    objective_type: str
    name: str
    parameters: dict = {}

class BacktestCreate(BaseModel):
    start_date: str
    end_date: str
    rebalance_frequency: str = "Monthly"
    stop_loss_config: dict = {}
    chunking_config: dict = {}


@router.get("/")
def list_strategies(user: User = Depends(require_user), db: Session = Depends(get_db)):
    strategies = db.query(Strategy).filter(Strategy.user_id == user.id).order_by(Strategy.updated_at.desc()).all()
    return [{"id": s.id, "fund_name": s.fund_name, "scheme_name": s.scheme_name,
             "universe": s.universe, "status": s.status, "rebalance_status": s.rebalance_status,
             "analytics_status": s.analytics_status, "is_production": s.is_production,
             "created_at": str(s.created_at)} for s in strategies]


@router.post("/")
def create_strategy(data: StrategyCreate, user: User = Depends(require_user), db: Session = Depends(get_db)):
    strategy = Strategy(user_id=user.id, **data.model_dump())
    db.add(strategy)
    db.commit()
    db.refresh(strategy)
    return {"id": strategy.id, "fund_name": strategy.fund_name}


@router.post("/{strategy_id}/constraints")
def add_constraint(strategy_id: int, data: ConstraintCreate, user: User = Depends(require_user), db: Session = Depends(get_db)):
    strategy = db.query(Strategy).filter(Strategy.id == strategy_id, Strategy.user_id == user.id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    constraint = StrategyConstraint(strategy_id=strategy_id, **data.model_dump())
    db.add(constraint)
    db.commit()
    return {"id": constraint.id, "name": constraint.name}


@router.post("/{strategy_id}/objectives")
def add_objective(strategy_id: int, data: ObjectiveCreate, user: User = Depends(require_user), db: Session = Depends(get_db)):
    strategy = db.query(Strategy).filter(Strategy.id == strategy_id, Strategy.user_id == user.id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    objective = StrategyObjective(strategy_id=strategy_id, **data.model_dump())
    db.add(objective)
    db.commit()
    return {"id": objective.id, "name": objective.name}


@router.get("/{strategy_id}")
def get_strategy(strategy_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)):
    strategy = db.query(Strategy).filter(Strategy.id == strategy_id, Strategy.user_id == user.id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return {
        "id": strategy.id,
        "fund_name": strategy.fund_name,
        "scheme_name": strategy.scheme_name,
        "iteration_name": strategy.iteration_name,
        "universe": strategy.universe,
        "benchmark": strategy.benchmark,
        "include_futures": strategy.include_futures,
        "status": strategy.status,
        "created_at": str(strategy.created_at),
        "constraints": [{"id": c.id, "type": c.constraint_type, "name": c.name, "active": c.is_active, "params": c.parameters} for c in strategy.constraints],
        "objectives": [{"id": o.id, "type": o.objective_type, "name": o.name, "active": o.is_active, "params": o.parameters} for o in strategy.objectives],
        "backtests": [{"id": b.id, "start": str(b.start_date), "end": str(b.end_date), "status": b.status,
                       "frequency": b.rebalance_frequency, "results": b.results} for b in strategy.backtests],
    }


@router.put("/{strategy_id}")
def update_strategy(strategy_id: int, data: StrategyCreate, user: User = Depends(require_user), db: Session = Depends(get_db)):
    strategy = db.query(Strategy).filter(Strategy.id == strategy_id, Strategy.user_id == user.id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    strategy.fund_name = data.fund_name
    strategy.scheme_name = data.scheme_name
    strategy.iteration_name = data.iteration_name
    strategy.universe = data.universe
    strategy.benchmark = data.benchmark
    strategy.include_futures = data.include_futures

    # Replace constraints: delete old, add new will be done via separate calls
    db.commit()
    return {"id": strategy.id, "fund_name": strategy.fund_name}


@router.put("/{strategy_id}/constraints")
def replace_constraints(strategy_id: int, data: list[ConstraintCreate], user: User = Depends(require_user), db: Session = Depends(get_db)):
    strategy = db.query(Strategy).filter(Strategy.id == strategy_id, Strategy.user_id == user.id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    # Delete existing constraints
    for c in strategy.constraints:
        db.delete(c)
    # Add new ones
    for c in data:
        db.add(StrategyConstraint(strategy_id=strategy_id, constraint_type=c.constraint_type, name=c.name, parameters=c.parameters))
    db.commit()
    return {"updated": len(data)}


@router.put("/{strategy_id}/objectives")
def replace_objectives(strategy_id: int, data: list[ObjectiveCreate], user: User = Depends(require_user), db: Session = Depends(get_db)):
    strategy = db.query(Strategy).filter(Strategy.id == strategy_id, Strategy.user_id == user.id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    # Delete existing objectives
    for o in strategy.objectives:
        db.delete(o)
    # Add new ones
    for o in data:
        db.add(StrategyObjective(strategy_id=strategy_id, objective_type=o.objective_type, name=o.name, parameters=o.parameters))
    db.commit()
    return {"updated": len(data)}


@router.post("/{strategy_id}/promote")
def promote_strategy(strategy_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)):
    """Promote a strategy to production."""
    strategy = db.query(Strategy).filter(Strategy.id == strategy_id, Strategy.user_id == user.id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    if strategy.analytics_status != "AVAILABLE":
        raise HTTPException(status_code=400, detail="Run a backtest first before promoting to production")
    strategy.status = "production"
    strategy.is_production = True
    db.commit()
    return {"id": strategy.id, "status": "production"}


@router.post("/{strategy_id}/demote")
def demote_strategy(strategy_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)):
    """Demote a strategy from production back to draft."""
    strategy = db.query(Strategy).filter(Strategy.id == strategy_id, Strategy.user_id == user.id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    strategy.status = "draft"
    strategy.is_production = False
    db.commit()
    return {"id": strategy.id, "status": "draft"}


@router.post("/{strategy_id}/rebalance")
def generate_rebalance(strategy_id: int, user: User = Depends(require_user), db: Session = Depends(get_db), prices_db: Session = Depends(get_prices_db)):
    """Generate a live rebalance trade list using current market data."""
    strategy = db.query(Strategy).filter(Strategy.id == strategy_id, Strategy.user_id == user.id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    if not strategy.is_production:
        raise HTTPException(status_code=400, detail="Only production strategies can generate rebalance trades")

    # Get universe symbols
    symbols = UNIVERSE_MAP.get(strategy.universe, ALL_NSE_STOCKS[:50])

    # Fetch prices from prices DB
    prices = (
        prices_db.query(StockPrice.symbol, StockPrice.date, StockPrice.close)
        .filter(StockPrice.symbol.in_(symbols))
        .order_by(StockPrice.date)
        .all()
    )
    if not prices:
        raise HTTPException(status_code=404, detail="No price data available")

    # Build price matrix
    records: dict[str, dict] = {}
    for sym, dt, close in prices:
        d = dt.isoformat() if hasattr(dt, "isoformat") else str(dt)
        if d not in records:
            records[d] = {}
        records[d][sym] = close

    df = pd.DataFrame.from_dict(records, orient="index").sort_index()
    df = df.dropna(axis=1, thresh=int(len(df) * 0.8))
    valid_symbols = df.columns.tolist()

    if len(valid_symbols) < 3:
        raise HTTPException(status_code=422, detail="Not enough stocks with price data")

    returns = df.pct_change().dropna()
    mean_ret = returns.mean().values * 252
    cov_mat = returns.cov().values * 252

    # Compute betas
    mkt_ret = returns.mean(axis=1)
    mkt_var = mkt_ret.var()
    betas = [float(returns[s].cov(mkt_ret) / mkt_var) if mkt_var > 0 else 1.0 for s in valid_symbols]

    # Map constraints from strategy
    max_positions = None
    opt_constraints = []
    for c in strategy.constraints:
        if not c.is_active:
            continue
        params = c.parameters or {}
        ctype = c.constraint_type or c.name
        if "Position Size" in ctype or "position_size" in ctype:
            opt_constraints.append({"type": "position_size_bound", "min": float(params.get("min_weight", 0)), "max": float(params.get("max_weight", 1))})
        elif "Maximum Number" in ctype or "max_positions" in ctype:
            max_positions = int(params.get("max_positions", 50))
        elif "Maximum Capital" in ctype:
            opt_constraints.append({"type": "max_total_weight", "value": float(params.get("max_capital", 1))})
        elif "Beta" in ctype or "beta_exposure" in ctype:
            opt_constraints.append({"type": "beta_exposure", "lower": float(params.get("min_beta", 0)), "upper": float(params.get("max_beta", 2))})

    # Map objective
    objective = "maximize_sharpe"
    for o in strategy.objectives:
        if not o.is_active:
            continue
        otype = o.objective_type or o.name
        if "Risk Minimization" in otype:
            objective = "minimize_risk"
        elif "Return Maximization" in otype:
            objective = "maximize_return"
        elif "Tracking Error" in otype:
            objective = "minimize_tracking_error"

    # Run optimizer
    try:
        opt = PortfolioOptimizer(
            expected_returns=mean_ret.tolist(),
            covariance_matrix=cov_mat.tolist(),
            symbols=valid_symbols,
            risk_free_rate=0.05,
        )
        result = opt.optimize(
            objective=objective,
            constraints=opt_constraints,
            stock_betas=np.array(betas),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimizer failed: {e}")

    weights = result.get("weights", {})
    if not weights or result.get("status") == "infeasible":
        raise HTTPException(status_code=422, detail="Optimizer could not find a feasible portfolio")

    # Post-process max_positions
    if max_positions and len(weights) > max_positions:
        sorted_syms = sorted(weights.keys(), key=lambda s: weights[s], reverse=True)
        kept = sorted_syms[:max_positions]
        weights = {s: weights[s] for s in kept}
        total = sum(weights.values())
        if total > 0:
            weights = {s: w / total for s, w in weights.items()}

    # Get current holdings from user's portfolios as "current weights"
    from app.models.portfolio import Portfolio, PortfolioHolding
    current_weights: dict[str, float] = {}

    # Find user's portfolios and get the latest holdings
    user_portfolios = db.query(Portfolio).filter(Portfolio.user_id == user.id).all()
    for p in user_portfolios:
        latest_date_row = (
            db.query(PortfolioHolding.date)
            .filter(PortfolioHolding.portfolio_id == p.id)
            .order_by(PortfolioHolding.date.desc())
            .first()
        )
        if latest_date_row:
            holdings = (
                db.query(PortfolioHolding)
                .filter(PortfolioHolding.portfolio_id == p.id, PortfolioHolding.date == latest_date_row[0])
                .all()
            )
            for h in holdings:
                # Map bare symbol to .NS for matching
                sym_key = h.symbol if "." in h.symbol else f"{h.symbol}.NS"
                if sym_key in valid_symbols:
                    current_weights[sym_key] = current_weights.get(sym_key, 0) + h.weight

    # Compute total AUM from user's portfolios (in crores → rupees)
    total_aum = 0.0
    for p in user_portfolios:
        latest_date_row2 = (
            db.query(PortfolioHolding.date)
            .filter(PortfolioHolding.portfolio_id == p.id)
            .order_by(PortfolioHolding.date.desc())
            .first()
        )
        if latest_date_row2:
            semv_sum = sum(
                h.semv for h in db.query(PortfolioHolding)
                .filter(PortfolioHolding.portfolio_id == p.id, PortfolioHolding.date == latest_date_row2[0])
                .all()
            )
            total_aum += semv_sum
    portfolio_value = total_aum * 1e7  # Convert crores to rupees
    if portfolio_value == 0:
        portfolio_value = 1e8  # Default 10 Cr if no portfolio data

    # Build trade list — include both target positions and positions to exit
    trades = []
    latest_date = df.index[-1]
    all_symbols = set(weights.keys()) | set(current_weights.keys())

    total_buy_value = 0.0
    total_sell_value = 0.0

    for sym in sorted(all_symbols, key=lambda s: weights.get(s, 0), reverse=True):
        target_w = weights.get(sym, 0)
        current_w = current_weights.get(sym, 0)
        delta = target_w - current_w

        if abs(delta) < 0.001:
            action = "HOLD"
        elif target_w == 0 and current_w > 0:
            action = "EXIT"
        elif current_w == 0 and target_w > 0:
            action = "NEW BUY"
        elif delta > 0:
            action = "INCREASE"
        else:
            action = "REDUCE"

        latest_price = float(df.loc[latest_date, sym]) if sym in df.columns else 0

        # Calculate trade value and quantity
        trade_value = abs(delta) * portfolio_value
        trade_qty = int(trade_value / latest_price) if latest_price > 0 else 0

        if delta > 0:
            total_buy_value += trade_value
        elif delta < 0:
            total_sell_value += trade_value

        trades.append({
            "symbol": sym,
            "action": action,
            "target_weight": round(target_w * 100, 2),
            "current_weight": round(current_w * 100, 2),
            "delta_weight": round(delta * 100, 2),
            "latest_price": round(latest_price, 2),
            "trade_qty": trade_qty,
            "trade_value": round(trade_value, 2),
        })

    # Recompute metrics for the new portfolio
    idx = [valid_symbols.index(s) for s in weights if s in valid_symbols]
    w_arr = np.array([weights[s] for s in weights if s in valid_symbols])
    exp_ret = float(mean_ret[idx] @ w_arr)
    exp_risk = float(np.sqrt(w_arr @ cov_mat[np.ix_(idx, idx)] @ w_arr))
    sharpe = (exp_ret - 0.05) / max(exp_risk, 1e-10)

    return {
        "strategy_id": strategy_id,
        "strategy_name": strategy.fund_name,
        "rebalance_date": str(latest_date) if hasattr(latest_date, "isoformat") else str(latest_date)[:10],
        "positions": len(weights),
        "expected_return": round(exp_ret * 100, 2),
        "expected_risk": round(exp_risk * 100, 2),
        "sharpe_ratio": round(sharpe, 2),
        "portfolio_value": round(portfolio_value, 2),
        "total_buy_value": round(total_buy_value, 2),
        "total_sell_value": round(total_sell_value, 2),
        "net_investment": round(total_buy_value - total_sell_value, 2),
        "trades": trades,
    }


@router.delete("/{strategy_id}")
def delete_strategy(strategy_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)):
    strategy = db.query(Strategy).filter(Strategy.id == strategy_id, Strategy.user_id == user.id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    db.delete(strategy)
    db.commit()
    return {"deleted": True}
