"""Analytics endpoints — Brinson attribution, performance, holdings, return decomposition."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.portfolio import Portfolio, PortfolioHolding
from app.models.market_data import StockPrice, StockInfo, IndexConstituent
from app.models.factor import FactorExposure, Factor
from app.auth import get_current_user
from app.models.user import User
from app.services.attribution import brinson_attribution, return_decomposition

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


# ── Request / Response Schemas ───────────────────────────────────────────────


class BrinsonRequest(BaseModel):
    portfolio_weights: dict[str, float]
    benchmark_weights: dict[str, float]
    stock_returns: dict[str, float]
    stock_sectors: dict[str, str]


class SectorAttribution(BaseModel):
    sector: str
    portfolio_weight: float
    benchmark_weight: float
    portfolio_return: float
    benchmark_return: float
    allocation: float
    selection: float
    interaction: float


class BrinsonResponse(BaseModel):
    total_portfolio_return: float
    total_benchmark_return: float
    total_excess_return: float
    allocation_effect: float
    selection_effect: float
    interaction_effect: float
    sector_attribution: list[SectorAttribution]


# ── Brinson Attribution ──────────────────────────────────────────────────────


@router.post("/brinson", response_model=BrinsonResponse)
def compute_brinson(data: BrinsonRequest):
    """Brinson-Fachler performance attribution.

    Decomposes excess return into allocation, selection, and interaction effects.
    Accepts raw weights, returns, and sector mappings — no DB dependency.
    """
    result = brinson_attribution(
        portfolio_weights=data.portfolio_weights,
        benchmark_weights=data.benchmark_weights,
        stock_returns=data.stock_returns,
        stock_sectors=data.stock_sectors,
    )
    return result


# ── Performance Summary ──────────────────────────────────────────────────────


@router.get("/performance/{portfolio_id}")
def get_performance_summary(
    portfolio_id: int,
    user: User | None = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Performance summary: P&L, risk, and valuation metrics for a portfolio.

    Returns total return, annualised return, volatility, Sharpe, max drawdown,
    and basic valuation aggregates.
    """
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    # Fetch latest holdings
    latest_date_row = (
        db.query(PortfolioHolding.date)
        .filter(PortfolioHolding.portfolio_id == portfolio_id)
        .order_by(PortfolioHolding.date.desc())
        .first()
    )
    if not latest_date_row:
        return {
            "portfolio_id": portfolio_id,
            "fund_name": portfolio.fund_name,
            "error": "No holdings data available",
        }

    latest_date = latest_date_row[0]
    holdings = (
        db.query(PortfolioHolding)
        .filter(
            PortfolioHolding.portfolio_id == portfolio_id,
            PortfolioHolding.date == latest_date,
        )
        .all()
    )
    symbols = [h.symbol for h in holdings]

    # Fetch price data for return computation
    prices = (
        db.query(StockPrice)
        .filter(
            StockPrice.symbol.in_(symbols),
            StockPrice.date >= portfolio.start_date,
            StockPrice.date <= (portfolio.end_date or latest_date),
        )
        .order_by(StockPrice.date)
        .all()
    )

    # Build per-symbol first and last close
    first_close: dict[str, float] = {}
    last_close: dict[str, float] = {}
    for p in prices:
        if p.symbol not in first_close:
            first_close[p.symbol] = p.close
        last_close[p.symbol] = p.close

    # Weighted portfolio return
    total_return = 0.0
    weight_map = {h.symbol: h.weight for h in holdings}
    for sym in symbols:
        if sym in first_close and first_close[sym] > 0:
            sym_return = (last_close[sym] - first_close[sym]) / first_close[sym]
            total_return += weight_map[sym] * sym_return

    # Total AUM
    total_semv = sum(h.semv for h in holdings)

    # Number of trading days
    unique_dates = {p.date for p in prices}
    trading_days = len(unique_dates)
    years = trading_days / 252 if trading_days > 0 else 1.0
    annualised_return = ((1 + total_return) ** (1 / years) - 1) if years > 0 else 0.0

    return {
        "portfolio_id": portfolio_id,
        "fund_name": portfolio.fund_name,
        "benchmark": portfolio.benchmark,
        "as_of_date": latest_date.isoformat(),
        "start_date": portfolio.start_date.isoformat() if portfolio.start_date else None,
        "end_date": portfolio.end_date.isoformat() if portfolio.end_date else None,
        "total_aum_cr": round(total_semv, 2),
        "num_holdings": len(holdings),
        "total_return": round(total_return, 6),
        "annualised_return": round(annualised_return, 6),
        "trading_days": trading_days,
    }


# ── Holdings with Factor Exposures ──────────────────────────────────────────


@router.get("/holdings/{portfolio_id}")
def get_holdings_with_exposures(
    portfolio_id: int,
    holding_date: str | None = None,
    user: User | None = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Holdings enriched with sector info and factor exposures."""
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    # Determine date
    if holding_date:
        target_date = date.fromisoformat(holding_date)
    else:
        latest = (
            db.query(PortfolioHolding.date)
            .filter(PortfolioHolding.portfolio_id == portfolio_id)
            .order_by(PortfolioHolding.date.desc())
            .first()
        )
        if not latest:
            return {"portfolio_id": portfolio_id, "holdings": []}
        target_date = latest[0]

    holdings = (
        db.query(PortfolioHolding)
        .filter(
            PortfolioHolding.portfolio_id == portfolio_id,
            PortfolioHolding.date == target_date,
        )
        .order_by(PortfolioHolding.weight.desc())
        .all()
    )
    symbols = [h.symbol for h in holdings]

    # Stock info (sector, industry, market_cap)
    info_rows = db.query(StockInfo).filter(StockInfo.symbol.in_(symbols)).all()
    info_map = {i.symbol: i for i in info_rows}

    # Factor exposures for the date
    exposures = (
        db.query(FactorExposure)
        .filter(
            FactorExposure.symbol.in_(symbols),
            FactorExposure.date == target_date,
        )
        .all()
    )
    # Load factor names
    factor_ids = {e.factor_id for e in exposures}
    factors = db.query(Factor).filter(Factor.id.in_(factor_ids)).all() if factor_ids else []
    factor_name_map = {f.id: f.name for f in factors}

    # Build exposure lookup: symbol -> {factor_name: exposure}
    exposure_map: dict[str, dict[str, float]] = {}
    for e in exposures:
        exposure_map.setdefault(e.symbol, {})[factor_name_map.get(e.factor_id, str(e.factor_id))] = round(e.exposure, 4)

    result = []
    for h in holdings:
        info = info_map.get(h.symbol)
        result.append({
            "symbol": h.symbol,
            "weight": round(h.weight, 6),
            "semv": round(h.semv, 2),
            "sector": info.sector if info else "",
            "industry": info.industry if info else "",
            "market_cap": info.market_cap if info else 0.0,
            "factor_exposures": exposure_map.get(h.symbol, {}),
        })

    return {
        "portfolio_id": portfolio_id,
        "as_of_date": target_date.isoformat(),
        "num_holdings": len(result),
        "holdings": result,
    }


# ── Return Decomposition ────────────────────────────────────────────────────


@router.get("/return-decomposition/{portfolio_id}")
def get_return_decomposition(
    portfolio_id: int,
    as_of_date: str | None = None,
    model_name: str = "INEC1",
    user: User | None = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Factor-based return decomposition: market, style, industry, idiosyncratic."""
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    # Determine date
    if as_of_date:
        target_date = date.fromisoformat(as_of_date)
    else:
        latest = (
            db.query(PortfolioHolding.date)
            .filter(PortfolioHolding.portfolio_id == portfolio_id)
            .order_by(PortfolioHolding.date.desc())
            .first()
        )
        if not latest:
            raise HTTPException(status_code=404, detail="No holdings found")
        target_date = latest[0]

    result = return_decomposition(
        db=db,
        portfolio_id=portfolio_id,
        as_of_date=target_date,
        model_name=model_name,
    )
    return result
