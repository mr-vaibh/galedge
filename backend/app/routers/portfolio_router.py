"""Portfolio CRUD endpoints."""

import csv
import io
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.portfolio import Portfolio, PortfolioHolding
from app.auth import require_user, get_current_user

router = APIRouter(prefix="/api/portfolios", tags=["portfolios"])


class PortfolioCreate(BaseModel):
    fund_name: str
    scheme_name: str = ""
    benchmark: str = "NIFTY 500"
    initial_aum: float = 500.0
    enable_transaction_cost: bool = False

class PortfolioResponse(BaseModel):
    id: int
    fund_name: str
    scheme_name: str
    benchmark: str
    portfolio_type: str
    iteration: str
    initial_aum: float
    start_date: date | None = None
    end_date: date | None = None
    analytics_status: str
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True

class HoldingResponse(BaseModel):
    symbol: str
    date: str
    weight: float
    semv: float

    class Config:
        from_attributes = True


@router.get("/")
def list_portfolios(
    portfolio_type: str | None = None,
    user: User | None = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List portfolios. If authenticated, returns user's portfolios."""
    query = db.query(Portfolio)
    if user:
        query = query.filter(Portfolio.user_id == user.id)
    if portfolio_type:
        query = query.filter(Portfolio.portfolio_type == portfolio_type)
    portfolios = query.order_by(Portfolio.updated_at.desc()).all()
    return [PortfolioResponse.model_validate(p) for p in portfolios]


@router.post("/", response_model=PortfolioResponse)
def create_portfolio(
    data: PortfolioCreate,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Create a new portfolio."""
    portfolio = Portfolio(
        user_id=user.id,
        fund_name=data.fund_name,
        scheme_name=data.scheme_name,
        benchmark=data.benchmark,
        initial_aum=data.initial_aum,
        enable_transaction_cost=data.enable_transaction_cost,
        portfolio_type="uploaded",
    )
    db.add(portfolio)
    db.commit()
    db.refresh(portfolio)
    return PortfolioResponse.model_validate(portfolio)


@router.post("/{portfolio_id}/upload-holdings")
async def upload_holdings(
    portfolio_id: int,
    file: UploadFile = File(...),
    holding_date: str = Form(...),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Upload portfolio holdings from CSV (ExchangeSymbol, SEMV)."""
    portfolio = db.query(Portfolio).filter(
        Portfolio.id == portfolio_id,
        Portfolio.user_id == user.id,
    ).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8")))

    holdings = []
    total_semv = 0.0
    for row in reader:
        symbol = row.get("ExchangeSymbol", "").strip()
        semv = float(row.get("SEMV", 0))
        if symbol and semv > 0:
            holdings.append(PortfolioHolding(
                portfolio_id=portfolio_id,
                date=date.fromisoformat(holding_date),
                symbol=symbol,
                semv=semv,
            ))
            total_semv += semv

    # Calculate weights
    for h in holdings:
        h.weight = h.semv / total_semv if total_semv > 0 else 0

    # Delete existing holdings for this date
    db.query(PortfolioHolding).filter(
        PortfolioHolding.portfolio_id == portfolio_id,
        PortfolioHolding.date == date.fromisoformat(holding_date),
    ).delete()

    db.add_all(holdings)
    portfolio.start_date = portfolio.start_date or date.fromisoformat(holding_date)
    portfolio.end_date = date.fromisoformat(holding_date)
    db.commit()

    return {"uploaded": len(holdings), "total_semv": total_semv}


@router.get("/{portfolio_id}/holdings")
def get_holdings(
    portfolio_id: int,
    holding_date: str | None = None,
    user: User | None = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get portfolio holdings."""
    query = db.query(PortfolioHolding).filter(PortfolioHolding.portfolio_id == portfolio_id)
    if holding_date:
        query = query.filter(PortfolioHolding.date == date.fromisoformat(holding_date))
    holdings = query.order_by(PortfolioHolding.weight.desc()).all()
    return [HoldingResponse.model_validate(h) for h in holdings]


@router.delete("/{portfolio_id}")
def delete_portfolio(
    portfolio_id: int,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Delete a portfolio."""
    portfolio = db.query(Portfolio).filter(
        Portfolio.id == portfolio_id,
        Portfolio.user_id == user.id,
    ).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    db.delete(portfolio)
    db.commit()
    return {"deleted": True}
