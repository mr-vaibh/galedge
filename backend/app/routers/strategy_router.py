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
        "universe": strategy.universe,
        "benchmark": strategy.benchmark,
        "constraints": [{"id": c.id, "type": c.constraint_type, "name": c.name, "active": c.is_active, "params": c.parameters} for c in strategy.constraints],
        "objectives": [{"id": o.id, "type": o.objective_type, "name": o.name, "active": o.is_active, "params": o.parameters} for o in strategy.objectives],
        "backtests": [{"id": b.id, "start": str(b.start_date), "end": str(b.end_date), "status": b.status} for b in strategy.backtests],
    }


@router.delete("/{strategy_id}")
def delete_strategy(strategy_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)):
    strategy = db.query(Strategy).filter(Strategy.id == strategy_id, Strategy.user_id == user.id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    db.delete(strategy)
    db.commit()
    return {"deleted": True}
