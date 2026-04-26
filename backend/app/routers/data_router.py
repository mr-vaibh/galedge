"""Data ingestion and risk model API endpoints."""

from datetime import date

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.database import get_db
from app.models.user import User
from app.models.market_data import StockPrice, StockInfo, IndexConstituent
from app.models.factor import FactorModel, Factor, FactorReturn, FactorExposure
from app.auth import require_user, require_admin
from app.services.data_ingestion import (
    ingest_prices, ingest_stock_info, ingest_index_constituents,
    run_full_ingestion, ALL_NSE_STOCKS, US_STOCKS,
)
from app.services.factor_engine import build_factor_model

router = APIRouter(prefix="/api/data", tags=["data"])


# ── Ingestion endpoints (admin only in production, open for dev) ──────────────

@router.post("/ingest/prices")
def trigger_price_ingestion(
    period: str = Query("2y"),
    market: str = Query("india", enum=["india", "us", "all"]),
    db: Session = Depends(get_db),
):
    """Trigger price data ingestion."""
    symbols = {
        "india": ALL_NSE_STOCKS,
        "us": US_STOCKS,
        "all": ALL_NSE_STOCKS + US_STOCKS,
    }[market]

    result = ingest_prices(db, symbols, period)
    return result


@router.post("/ingest/info")
def trigger_info_ingestion(
    market: str = Query("india", enum=["india", "us", "all"]),
    db: Session = Depends(get_db),
):
    """Trigger stock info ingestion."""
    symbols = {
        "india": ALL_NSE_STOCKS,
        "us": US_STOCKS,
        "all": ALL_NSE_STOCKS + US_STOCKS,
    }[market]

    result = ingest_stock_info(db, symbols)
    return result


@router.post("/ingest/full")
def trigger_full_ingestion(
    period: str = Query("2y"),
    db: Session = Depends(get_db),
):
    """Run full data ingestion pipeline (prices + info + index constituents)."""
    result = run_full_ingestion(db, period)
    return result


# ── Risk Model endpoints ─────────────────────────────────────────────────────

@router.post("/risk-model/build")
def trigger_factor_model_build(
    model_name: str = Query("INEC1"),
    db: Session = Depends(get_db),
):
    """Build/rebuild the factor risk model."""
    result = build_factor_model(db, model_name)
    return result


@router.get("/risk-model/factors")
def get_factor_summary(
    model_name: str = Query("INEC1"),
    db: Session = Depends(get_db),
):
    """Get factor performance summary for the risk model."""
    fm = db.query(FactorModel).filter(FactorModel.name == model_name).first()
    if not fm:
        raise HTTPException(status_code=404, detail=f"Factor model '{model_name}' not found")

    factors = db.query(Factor).filter(Factor.model_id == fm.id).all()

    result = []
    for f in factors:
        # Get factor returns
        returns = db.query(FactorReturn).filter(
            FactorReturn.factor_id == f.id
        ).order_by(FactorReturn.date).all()

        if not returns:
            continue

        daily_rets = [r.daily_return for r in returns]
        cum_return = returns[-1].cumulative_return if returns else 0

        # Compute metrics
        import numpy as np
        daily_arr = np.array(daily_rets)
        trading_days = len(daily_arr)
        years = trading_days / 252

        cagr = ((1 + cum_return) ** (1 / max(years, 0.01)) - 1) * 100 if cum_return > -1 else 0
        sharpe = (daily_arr.mean() / max(daily_arr.std(), 1e-10)) * np.sqrt(252) if len(daily_arr) > 1 else 0

        # Max drawdown
        cumulative = np.cumprod(1 + daily_arr)
        peak = np.maximum.accumulate(cumulative)
        drawdown = (cumulative - peak) / peak
        max_dd = float(drawdown.min()) * 100

        result.append({
            "factor_type": f.factor_type,
            "factor": f.name,
            "cagr": round(cagr, 2),
            "cumulative_return": round(cum_return * 100, 2),
            "sharpe": round(sharpe, 2),
            "daily_return": round(float(daily_arr.mean()) * 100, 4),
            "max_drawdown": round(max_dd, 2),
            "start_date": str(returns[0].date),
            "end_date": str(returns[-1].date),
        })

    return {"model": model_name, "factors": result}


@router.get("/risk-model/factor-returns/{factor_name}")
def get_factor_returns(
    factor_name: str,
    model_name: str = Query("INEC1"),
    db: Session = Depends(get_db),
):
    """Get daily factor return time series."""
    fm = db.query(FactorModel).filter(FactorModel.name == model_name).first()
    if not fm:
        raise HTTPException(status_code=404, detail="Model not found")

    factor = db.query(Factor).filter(Factor.model_id == fm.id, Factor.name == factor_name).first()
    if not factor:
        raise HTTPException(status_code=404, detail=f"Factor '{factor_name}' not found")

    returns = db.query(FactorReturn).filter(
        FactorReturn.factor_id == factor.id
    ).order_by(FactorReturn.date).all()

    return {
        "factor": factor_name,
        "data": [{"date": str(r.date), "return": r.daily_return, "cumulative": r.cumulative_return} for r in returns],
    }


@router.get("/risk-model/correlation")
def get_factor_correlation(
    model_name: str = Query("INEC1"),
    db: Session = Depends(get_db),
):
    """Get factor correlation matrix."""
    import numpy as np

    fm = db.query(FactorModel).filter(FactorModel.name == model_name).first()
    if not fm:
        raise HTTPException(status_code=404, detail="Model not found")

    factors = db.query(Factor).filter(Factor.model_id == fm.id).all()

    # Build return series per factor
    factor_series = {}
    for f in factors:
        returns = db.query(FactorReturn.daily_return).filter(
            FactorReturn.factor_id == f.id
        ).order_by(FactorReturn.date).all()
        if returns:
            factor_series[f.name] = [r[0] for r in returns]

    if not factor_series:
        return {"factors": [], "matrix": []}

    # Align to same length
    min_len = min(len(v) for v in factor_series.values())
    aligned = {k: v[-min_len:] for k, v in factor_series.items()}

    df = pd.DataFrame(aligned)
    corr = df.corr()

    factor_names = list(corr.columns)
    matrix = [[round(float(corr.loc[r, c]), 4) for c in factor_names] for r in factor_names]

    return {"factors": factor_names, "matrix": matrix}


@router.get("/risk-model/stock-exposures")
def get_stock_exposures(
    symbols: str = Query(..., description="Comma-separated symbols"),
    model_name: str = Query("INEC1"),
    db: Session = Depends(get_db),
):
    """Get factor exposures for specific stocks."""
    symbol_list = [s.strip() for s in symbols.split(",")]

    fm = db.query(FactorModel).filter(FactorModel.name == model_name).first()
    if not fm:
        raise HTTPException(status_code=404, detail="Model not found")

    factors = db.query(Factor).filter(Factor.model_id == fm.id).all()
    factor_ids = {f.id: f.name for f in factors}

    result = {}
    for sym in symbol_list:
        exposures = db.query(FactorExposure).filter(
            FactorExposure.symbol == sym,
            FactorExposure.factor_id.in_(factor_ids.keys()),
        ).all()

        result[sym] = {factor_ids[e.factor_id]: round(e.exposure, 4) for e in exposures}

    return {"symbols": symbol_list, "exposures": result}


# ── Data stats ────────────────────────────────────────────────────────────────

@router.get("/stats")
def get_data_stats(db: Session = Depends(get_db)):
    """Get database statistics."""
    import pandas as pd

    price_count = db.query(func.count(StockPrice.id)).scalar()
    symbol_count = db.query(func.count(func.distinct(StockPrice.symbol))).scalar()
    info_count = db.query(func.count(StockInfo.id)).scalar()
    factor_count = db.query(func.count(Factor.id)).scalar()

    latest_price = db.query(func.max(StockPrice.date)).scalar()
    earliest_price = db.query(func.min(StockPrice.date)).scalar()

    return {
        "prices": {"rows": price_count, "symbols": symbol_count, "earliest": str(earliest_price), "latest": str(latest_price)},
        "stock_info": {"count": info_count},
        "factors": {"count": factor_count},
    }
