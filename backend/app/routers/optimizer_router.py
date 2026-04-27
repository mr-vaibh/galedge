"""Portfolio optimisation endpoints."""

from __future__ import annotations

import logging
from typing import Any

import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.market_data import StockPrice
from app.services.optimizer import PortfolioOptimizer
from app.services.data_ingestion import ALL_NSE_STOCKS

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/optimize", tags=["optimizer"])

UNIVERSE_MAP = {
    "NIFTY 50": ALL_NSE_STOCKS[:50],
    "NIFTY 100": ALL_NSE_STOCKS[:100],
    "NIFTY NEXT 50": ALL_NSE_STOCKS[50:100],
    "NIFTY 500": ALL_NSE_STOCKS,
}


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

class ConstraintSpec(BaseModel):
    type: str
    value: float | None = None
    min: float | None = None
    max: float | None = None
    lower: float | None = None
    upper: float | None = None
    sector: str | None = None
    factor: str | None = None
    factor_index: int | None = None


class OptimizeRequest(BaseModel):
    """Payload for the ``POST /api/optimize`` endpoint."""

    symbols: list[str]
    expected_returns: list[float]
    covariance_matrix: list[list[float]]
    objective: str = Field(
        default="minimize_risk",
        description=(
            "One of: minimize_risk, maximize_return, "
            "maximize_sharpe, minimize_tracking_error"
        ),
    )
    constraints: list[ConstraintSpec] = Field(default_factory=list)
    risk_free_rate: float = 0.05
    benchmark_weights: list[float] | None = None
    current_weights: list[float] | None = None
    factor_exposures: list[list[float]] | None = None
    stock_betas: list[float] | None = None
    stock_sectors: dict[str, str] | None = None


class EfficientFrontierRequest(BaseModel):
    """Payload for the ``POST /api/optimize/efficient-frontier`` endpoint."""

    symbols: list[str]
    expected_returns: list[float]
    covariance_matrix: list[list[float]]
    constraints: list[ConstraintSpec] = Field(default_factory=list)
    risk_free_rate: float = 0.05
    n_points: int = Field(default=20, ge=2, le=100)
    benchmark_weights: list[float] | None = None
    current_weights: list[float] | None = None
    factor_exposures: list[list[float]] | None = None
    stock_betas: list[float] | None = None
    stock_sectors: dict[str, str] | None = None


class OptimizeResponse(BaseModel):
    weights: dict[str, float]
    expected_return: float
    expected_risk: float
    sharpe_ratio: float
    n_positions: int
    turnover: float
    sector_weights: dict[str, float]
    status: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_optimizer(body: OptimizeRequest | EfficientFrontierRequest) -> PortfolioOptimizer:
    return PortfolioOptimizer(
        expected_returns=body.expected_returns,
        covariance_matrix=body.covariance_matrix,
        symbols=body.symbols,
        risk_free_rate=body.risk_free_rate,
    )


def _common_kwargs(body: OptimizeRequest | EfficientFrontierRequest) -> dict[str, Any]:
    kwargs: dict[str, Any] = {}
    if body.benchmark_weights is not None:
        kwargs["benchmark_weights"] = np.array(body.benchmark_weights)
    if body.current_weights is not None:
        kwargs["current_weights"] = np.array(body.current_weights)
    if body.factor_exposures is not None:
        kwargs["factor_exposures"] = np.array(body.factor_exposures)
    if body.stock_betas is not None:
        kwargs["stock_betas"] = np.array(body.stock_betas)
    if body.stock_sectors is not None:
        kwargs["stock_sectors"] = body.stock_sectors
    return kwargs


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("", response_model=OptimizeResponse)
def run_optimization(body: OptimizeRequest) -> OptimizeResponse:
    """Run a single portfolio optimisation."""
    try:
        opt = _build_optimizer(body)
        result = opt.optimize(
            objective=body.objective,
            constraints=[c.model_dump(exclude_none=True) for c in body.constraints],
            **_common_kwargs(body),
        )
        return OptimizeResponse(**result)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Optimization failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/efficient-frontier", response_model=list[OptimizeResponse])
def efficient_frontier(body: EfficientFrontierRequest) -> list[OptimizeResponse]:
    """Compute points along the efficient frontier."""
    try:
        opt = _build_optimizer(body)
        points = opt.efficient_frontier(
            n_points=body.n_points,
            constraints=[c.model_dump(exclude_none=True) for c in body.constraints],
            **_common_kwargs(body),
        )
        return [OptimizeResponse(**p) for p in points]
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Efficient frontier computation failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# Smart optimize — auto-computes returns/cov from DB prices
# ---------------------------------------------------------------------------


class SmartOptimizeRequest(BaseModel):
    """Universe-based optimization — server computes returns & covariance."""
    universe: str = "NIFTY 50"
    symbols: list[str] | None = None  # Custom symbols override universe
    objective: str = "maximize_sharpe"
    constraints: list[ConstraintSpec] = Field(default_factory=list)
    risk_free_rate: float = 0.05


@router.post("/smart", response_model=OptimizeResponse)
def smart_optimize(body: SmartOptimizeRequest, db: Session = Depends(get_db)):
    """Run optimization using DB price data — no client-side matrix needed."""
    import pandas as pd

    # Use custom symbols if provided, otherwise use universe
    if body.symbols and len(body.symbols) >= 2:
        symbols = body.symbols
    else:
        symbols = UNIVERSE_MAP.get(body.universe, ALL_NSE_STOCKS[:50])

    # Fetch prices from DB
    prices = (
        db.query(StockPrice.symbol, StockPrice.date, StockPrice.close)
        .filter(StockPrice.symbol.in_(symbols))
        .order_by(StockPrice.date)
        .all()
    )
    if not prices:
        raise HTTPException(status_code=404, detail="No price data found for universe")

    # Build price matrix
    records: dict[str, dict] = {}
    for sym, dt, close in prices:
        d = dt.isoformat() if hasattr(dt, "isoformat") else str(dt)
        if d not in records:
            records[d] = {}
        records[d][sym] = close

    df = pd.DataFrame.from_dict(records, orient="index").sort_index()
    df = df.dropna(axis=1, thresh=int(len(df) * 0.8))  # Need 80% data coverage

    if df.shape[1] < 2:
        raise HTTPException(status_code=422, detail="Not enough stocks with price data")

    # Compute returns and covariance
    returns = df.pct_change().dropna()
    if len(returns) < 20:
        raise HTTPException(status_code=422, detail="Not enough trading days for optimization")

    mean_returns = returns.mean().values * 252  # Annualized
    cov_matrix = returns.cov().values * 252      # Annualized
    valid_symbols = df.columns.tolist()

    # Compute stock betas (regression of each stock vs equal-weighted market)
    market_returns = returns.mean(axis=1)
    market_var = market_returns.var()
    stock_betas = []
    for sym in valid_symbols:
        if market_var > 0:
            cov_with_market = returns[sym].cov(market_returns)
            stock_betas.append(float(cov_with_market / market_var))
        else:
            stock_betas.append(1.0)

    # Extract max_positions for post-processing (MIP solvers often unavailable)
    max_positions = None
    filtered_constraints = []
    for c in body.constraints:
        d = c.model_dump(exclude_none=True)
        if d.get("type") == "max_positions":
            max_positions = int(d.get("value", 50))
        else:
            filtered_constraints.append(d)

    try:
        opt = PortfolioOptimizer(
            expected_returns=mean_returns.tolist(),
            covariance_matrix=cov_matrix.tolist(),
            symbols=valid_symbols,
            risk_free_rate=body.risk_free_rate,
        )
        # Benchmark weights (equal-weight for the universe) — needed for tracking error
        benchmark_weights = np.ones(len(valid_symbols)) / len(valid_symbols)

        result = opt.optimize(
            objective=body.objective,
            constraints=filtered_constraints,
            stock_betas=np.array(stock_betas),
            benchmark_weights=benchmark_weights,
        )

        # Post-process: enforce max_positions by keeping only top-k weights
        if max_positions and result.get("weights"):
            weights = result["weights"]
            sorted_syms = sorted(weights.keys(), key=lambda s: weights[s], reverse=True)

            if len(sorted_syms) > max_positions:
                # Keep top-k, zero the rest
                kept = sorted_syms[:max_positions]
                new_weights = {s: weights[s] for s in kept}

                # Renormalize to sum to 1
                total = sum(new_weights.values())
                if total > 0:
                    new_weights = {s: w / total for s, w in new_weights.items()}

                # Recompute metrics
                idx = [valid_symbols.index(s) for s in kept]
                w_arr = np.array([new_weights[s] for s in kept])
                mu_sub = mean_returns[idx]
                cov_sub = cov_matrix[np.ix_(idx, idx)]

                exp_ret = float(mu_sub @ w_arr)
                exp_risk = float(np.sqrt(w_arr @ cov_sub @ w_arr))
                sharpe = (exp_ret - body.risk_free_rate) / max(exp_risk, 1e-10)

                result["weights"] = new_weights
                result["expected_return"] = exp_ret
                result["expected_risk"] = exp_risk
                result["sharpe_ratio"] = sharpe
                result["n_positions"] = len(new_weights)

        return OptimizeResponse(**result)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Smart optimization failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
