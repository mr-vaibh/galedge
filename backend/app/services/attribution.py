"""Brinson performance attribution and return decomposition engine.

Implements:
- Brinson-Fachler attribution: allocation, selection, interaction effects
- Factor-based return decomposition: market, style, industry, idiosyncratic
"""

from __future__ import annotations

import logging
from collections import defaultdict
from datetime import date

from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.factor import Factor, FactorReturn, FactorExposure
from app.models.market_data import StockInfo
from app.models.portfolio import PortfolioHolding

logger = logging.getLogger(__name__)


# ── Brinson Attribution ──────────────────────────────────────────────────────


def brinson_attribution(
    portfolio_weights: dict[str, float],
    benchmark_weights: dict[str, float],
    stock_returns: dict[str, float],
    stock_sectors: dict[str, str],
) -> dict:
    """Brinson-Fachler performance attribution.

    Decomposes the excess return of a portfolio vs its benchmark into:
    - Allocation Effect: over/underweight in sectors vs benchmark
    - Selection Effect: stock picking within sectors vs benchmark
    - Interaction Effect: combined allocation and selection

    Parameters
    ----------
    portfolio_weights : dict[str, float]
        symbol -> portfolio weight (should sum to ~1.0)
    benchmark_weights : dict[str, float]
        symbol -> benchmark weight (should sum to ~1.0)
    stock_returns : dict[str, float]
        symbol -> period return (e.g. 0.05 for 5%)
    stock_sectors : dict[str, str]
        symbol -> sector name

    Returns
    -------
    dict with total returns, effects, and per-sector attribution breakdown.
    """

    # Collect all sectors from both portfolio and benchmark
    all_symbols = set(portfolio_weights) | set(benchmark_weights)
    sectors: set[str] = set()
    for sym in all_symbols:
        sector = stock_sectors.get(sym, "Unknown")
        sectors.add(sector)

    # Group symbols by sector
    sector_symbols: dict[str, list[str]] = defaultdict(list)
    for sym in all_symbols:
        sector = stock_sectors.get(sym, "Unknown")
        sector_symbols[sector].append(sym)

    # Compute sector-level aggregates
    sector_attribution = []
    total_allocation = 0.0
    total_selection = 0.0
    total_interaction = 0.0

    for sector in sorted(sectors):
        syms = sector_symbols[sector]

        # Portfolio sector weight and return
        p_weight = sum(portfolio_weights.get(s, 0.0) for s in syms)
        p_weighted_return_sum = sum(
            portfolio_weights.get(s, 0.0) * stock_returns.get(s, 0.0)
            for s in syms
        )
        p_return = p_weighted_return_sum / p_weight if p_weight > 0 else 0.0

        # Benchmark sector weight and return
        b_weight = sum(benchmark_weights.get(s, 0.0) for s in syms)
        b_weighted_return_sum = sum(
            benchmark_weights.get(s, 0.0) * stock_returns.get(s, 0.0)
            for s in syms
        )
        b_return = b_weighted_return_sum / b_weight if b_weight > 0 else 0.0

        # Brinson decomposition
        allocation = (p_weight - b_weight) * b_return
        selection = b_weight * (p_return - b_return)
        interaction = (p_weight - b_weight) * (p_return - b_return)

        total_allocation += allocation
        total_selection += selection
        total_interaction += interaction

        sector_attribution.append({
            "sector": sector,
            "portfolio_weight": round(p_weight, 6),
            "benchmark_weight": round(b_weight, 6),
            "portfolio_return": round(p_return, 6),
            "benchmark_return": round(b_return, 6),
            "allocation": round(allocation, 6),
            "selection": round(selection, 6),
            "interaction": round(interaction, 6),
        })

    # Total portfolio and benchmark returns
    total_portfolio_return = sum(
        portfolio_weights.get(s, 0.0) * stock_returns.get(s, 0.0)
        for s in all_symbols
    )
    total_benchmark_return = sum(
        benchmark_weights.get(s, 0.0) * stock_returns.get(s, 0.0)
        for s in all_symbols
    )
    total_excess_return = total_portfolio_return - total_benchmark_return

    return {
        "total_portfolio_return": round(total_portfolio_return, 6),
        "total_benchmark_return": round(total_benchmark_return, 6),
        "total_excess_return": round(total_excess_return, 6),
        "allocation_effect": round(total_allocation, 6),
        "selection_effect": round(total_selection, 6),
        "interaction_effect": round(total_interaction, 6),
        "sector_attribution": sector_attribution,
    }


# ── Factor Return Decomposition ─────────────────────────────────────────────


def return_decomposition(
    db: Session,
    portfolio_id: int,
    as_of_date: date,
    model_name: str = "INEC1",
) -> dict:
    """Decompose portfolio return into factor and idiosyncratic components.

    Uses the factor model to break total return into:
    - market_return: contribution from the market factor
    - style_return: contribution from style factors (BETA, SIZE, LTMOM, etc.)
    - industry_return: contribution from industry factors
    - factor_return: total systematic return (market + style + industry)
    - idiosyncratic_return: residual not explained by factors

    Parameters
    ----------
    db : Session
        Database session.
    portfolio_id : int
        Portfolio to decompose.
    as_of_date : date
        Date for the decomposition snapshot.
    model_name : str
        Factor model name (default INEC1).

    Returns
    -------
    dict with return components and per-holding details.
    """

    # Load portfolio holdings for the given date
    holdings = (
        db.query(PortfolioHolding)
        .filter(
            PortfolioHolding.portfolio_id == portfolio_id,
            PortfolioHolding.date == as_of_date,
        )
        .all()
    )
    if not holdings:
        return {
            "portfolio_id": portfolio_id,
            "as_of_date": as_of_date.isoformat(),
            "error": "No holdings found for the given date",
        }

    symbols = [h.symbol for h in holdings]
    weight_map = {h.symbol: h.weight for h in holdings}

    # Load factors for the model
    factors = (
        db.query(Factor)
        .join(Factor.model)
        .filter(Factor.model.has(name=model_name))
        .all()
    )
    if not factors:
        return {
            "portfolio_id": portfolio_id,
            "as_of_date": as_of_date.isoformat(),
            "error": f"Factor model '{model_name}' not found",
        }

    factor_map = {f.id: f for f in factors}

    # Load factor exposures for each holding on the given date
    exposures = (
        db.query(FactorExposure)
        .filter(
            FactorExposure.symbol.in_(symbols),
            FactorExposure.date == as_of_date,
            FactorExposure.factor_id.in_([f.id for f in factors]),
        )
        .all()
    )

    # Build exposure lookup: symbol -> factor_id -> exposure
    exposure_map: dict[str, dict[int, float]] = defaultdict(dict)
    for exp in exposures:
        exposure_map[exp.symbol][exp.factor_id] = exp.exposure

    # Load factor returns for the date
    factor_returns_rows = (
        db.query(FactorReturn)
        .filter(
            FactorReturn.factor_id.in_([f.id for f in factors]),
            FactorReturn.date == as_of_date,
        )
        .all()
    )
    factor_return_map = {fr.factor_id: fr.daily_return for fr in factor_returns_rows}

    # Compute return components per holding
    total_market_return = 0.0
    total_style_return = 0.0
    total_industry_return = 0.0
    total_factor_return = 0.0
    holding_details = []

    for symbol in symbols:
        w = weight_map[symbol]
        sym_exposures = exposure_map.get(symbol, {})

        market_contrib = 0.0
        style_contrib = 0.0
        industry_contrib = 0.0

        for fid, exposure in sym_exposures.items():
            factor = factor_map.get(fid)
            if factor is None:
                continue
            f_ret = factor_return_map.get(fid, 0.0)
            contrib = exposure * f_ret

            if factor.factor_type == "Market":
                market_contrib += contrib
            elif factor.factor_type == "Style":
                style_contrib += contrib
            elif factor.factor_type == "Industry":
                industry_contrib += contrib

        factor_total = market_contrib + style_contrib + industry_contrib

        total_market_return += w * market_contrib
        total_style_return += w * style_contrib
        total_industry_return += w * industry_contrib
        total_factor_return += w * factor_total

        holding_details.append({
            "symbol": symbol,
            "weight": round(w, 6),
            "market_return": round(market_contrib, 6),
            "style_return": round(style_contrib, 6),
            "industry_return": round(industry_contrib, 6),
            "factor_return": round(factor_total, 6),
        })

    # Idiosyncratic = total actual - factor (computed externally if actual return available)
    # For now, we report factor contributions; idiosyncratic needs actual stock returns
    idiosyncratic_return = 0.0  # placeholder — caller can subtract factor from actual

    return {
        "portfolio_id": portfolio_id,
        "as_of_date": as_of_date.isoformat(),
        "model": model_name,
        "market_return": round(total_market_return, 6),
        "style_return": round(total_style_return, 6),
        "industry_return": round(total_industry_return, 6),
        "factor_return": round(total_factor_return, 6),
        "idiosyncratic_return": round(idiosyncratic_return, 6),
        "holding_details": holding_details,
    }
