"""Portfolio optimisation endpoints."""

from __future__ import annotations

import logging
from typing import Any

import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.optimizer import PortfolioOptimizer

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/optimize", tags=["optimizer"])


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
