"""Strategy Builder CRUD endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.strategy import Strategy, StrategyConstraint, StrategyObjective, Backtest
from app.auth import require_user

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


@router.delete("/{strategy_id}")
def delete_strategy(strategy_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)):
    strategy = db.query(Strategy).filter(Strategy.id == strategy_id, Strategy.user_id == user.id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    db.delete(strategy)
    db.commit()
    return {"deleted": True}
