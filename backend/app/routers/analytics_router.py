"""Analytics endpoints — Brinson attribution, performance, holdings, return decomposition."""

import logging
from datetime import date

logger = logging.getLogger(__name__)

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
    # Map symbols: portfolio may use "HDFCBANK" but prices use "HDFCBANK.NS" or "HDFCBANK.BO"
    # Try to find the actual symbol in the price database
    raw_symbols = [h.symbol for h in holdings]
    symbols = []
    symbol_map = {}  # mapped_symbol -> original_symbol
    for s in raw_symbols:
        if "." in s:
            # Already has exchange suffix
            symbols.append(s)
            symbol_map[s] = s
        else:
            # Try all common exchange suffixes
            matched = False
            for suffix in [".NS", ".BO", ""]:
                candidate = f"{s}{suffix}" if suffix else s
                exists = db.query(StockPrice.id).filter(StockPrice.symbol == candidate).first()
                if exists:
                    symbols.append(candidate)
                    symbol_map[candidate] = s
                    matched = True
                    break
            if not matched:
                # Fallback: try .NS (most common for Indian stocks)
                symbols.append(f"{s}.NS")
                symbol_map[f"{s}.NS"] = s

    # Fetch ALL available price data for holdings (not just portfolio date range)
    # This lets us compute returns even if portfolio was just uploaded today
    prices = (
        db.query(StockPrice)
        .filter(
            StockPrice.symbol.in_(symbols),
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
            # Look up weight using original symbol (without .NS)
            original_sym = symbol_map.get(sym, sym)
            weight = weight_map.get(original_sym, weight_map.get(sym, 0))
            total_return += weight * sym_return

    # Total AUM
    total_semv = sum(h.semv for h in holdings)

    # Build daily portfolio returns and equity curve
    import numpy as np
    import pandas as pd

    # Build price DataFrame: dates x symbols
    price_records: dict[str, dict] = {}  # date -> {sym: close}
    for p in prices:
        d = p.date.isoformat() if hasattr(p.date, 'isoformat') else str(p.date)
        if d not in price_records:
            price_records[d] = {}
        price_records[d][p.symbol] = p.close

    sorted_dates = sorted(price_records.keys())
    trading_days = len(sorted_dates)
    years = trading_days / 252 if trading_days > 0 else 1.0
    annualised_return = ((1 + total_return) ** (1 / years) - 1) if years > 0 else 0.0

    # Compute daily portfolio returns
    daily_returns = []
    equity_curve = []
    initial_value = total_semv * 1e7  # Convert crores to rupees
    portfolio_value = initial_value

    for i, d in enumerate(sorted_dates):
        if i == 0:
            equity_curve.append({"date": d, "value": round(portfolio_value, 2), "drawdown": 0})
            continue

        day_return = 0.0
        for sym in symbols:
            original_sym = symbol_map.get(sym, sym)
            weight = weight_map.get(original_sym, weight_map.get(sym, 0))
            prev_price = price_records.get(sorted_dates[i - 1], {}).get(sym)
            curr_price = price_records.get(d, {}).get(sym)
            if prev_price and curr_price and prev_price > 0:
                day_return += weight * (curr_price - prev_price) / prev_price

        daily_returns.append(day_return)
        portfolio_value *= (1 + day_return)
        equity_curve.append({"date": d, "value": round(portfolio_value, 2)})

    # Compute risk metrics
    daily_arr = np.array(daily_returns) if daily_returns else np.array([0.0])
    volatility = float(daily_arr.std() * np.sqrt(252)) if len(daily_arr) > 1 else 0
    sharpe = float((daily_arr.mean() / max(daily_arr.std(), 1e-10)) * np.sqrt(252)) if len(daily_arr) > 1 else 0

    # Max drawdown
    eq_values = [e["value"] for e in equity_curve]
    if eq_values:
        cummax = np.maximum.accumulate(eq_values)
        drawdowns = (np.array(eq_values) - cummax) / np.where(cummax > 0, cummax, 1)
        max_drawdown = float(drawdowns.min())
        # Add drawdown to equity curve
        for i, e in enumerate(equity_curve):
            e["drawdown"] = round(float(drawdowns[i]) * 100, 2) if i < len(drawdowns) else 0
    else:
        max_drawdown = 0

    # ── Benchmark computation ──────────────────────────────────────────────
    benchmark_metrics: dict = {}
    benchmark_name = portfolio.benchmark or ""
    if benchmark_name and sorted_dates:
        # Map common benchmark names to yfinance ticker symbols
        BENCHMARK_TICKERS = {
            "NIFTY 50": "^NSEI",
            "NIFTY50": "^NSEI",
            "NIFTY 500": "^CRSLDX",
            "NIFTY500": "^CRSLDX",
            "NIFTY BANK": "^NSEBANK",
            "NIFTYBANK": "^NSEBANK",
            "NIFTY MIDCAP 100": "^NSEMDCP100",
            "SENSEX": "^BSESN",
            "BSE 500": "BSE-500.BO",
        }
        bm_ticker = BENCHMARK_TICKERS.get(benchmark_name.upper().strip(), None)
        if bm_ticker:
            try:
                import yfinance as yf
                bm_data = yf.download(
                    bm_ticker,
                    start=sorted_dates[0],
                    end=sorted_dates[-1],
                    progress=False,
                    auto_adjust=True,
                )
                if bm_data is not None and len(bm_data) > 1:
                    # Handle multi-level columns from yf.download
                    close_col = bm_data["Close"]
                    if hasattr(close_col, "columns"):
                        close_col = close_col.iloc[:, 0]
                    bm_closes = close_col.dropna().values
                    if len(bm_closes) > 1:
                        bm_total = (bm_closes[-1] - bm_closes[0]) / bm_closes[0]
                        bm_daily = np.diff(bm_closes) / bm_closes[:-1]
                        bm_vol = float(np.std(bm_daily) * np.sqrt(252))
                        bm_sharpe = float(
                            (np.mean(bm_daily) / max(np.std(bm_daily), 1e-10)) * np.sqrt(252)
                        )
                        # Max drawdown
                        bm_cummax = np.maximum.accumulate(bm_closes)
                        bm_dd = (bm_closes - bm_cummax) / np.where(bm_cummax > 0, bm_cummax, 1)
                        bm_max_dd = float(np.min(bm_dd))
                        bm_years = len(bm_closes) / 252
                        bm_cagr = ((1 + bm_total) ** (1 / max(bm_years, 0.01)) - 1)

                        benchmark_metrics = {
                            "total_return": round(bm_total * 100, 2),
                            "annualised_return": round(bm_cagr * 100, 2),
                            "sharpe_ratio": round(bm_sharpe, 2),
                            "volatility": round(bm_vol * 100, 2),
                            "max_drawdown": round(bm_max_dd * 100, 2),
                        }
            except Exception as e:
                logger.warning(f"Failed to fetch benchmark data for {bm_ticker}: {e}")

    result = {
        "portfolio_id": portfolio_id,
        "fund_name": portfolio.fund_name,
        "benchmark": portfolio.benchmark,
        "as_of_date": sorted_dates[-1] if sorted_dates else None,
        "start_date": sorted_dates[0] if sorted_dates else None,
        "end_date": sorted_dates[-1] if sorted_dates else None,
        "total_aum_cr": round(total_semv, 2),
        "num_holdings": len(holdings),
        "total_return": round(total_return * 100, 2),
        "annualised_return": round(annualised_return * 100, 2),
        "sharpe_ratio": round(sharpe, 2),
        "volatility": round(volatility * 100, 2),
        "max_drawdown": round(max_drawdown * 100, 2),
        "trading_days": trading_days,
        "initial_capital": round(initial_value, 2),
        "final_value": round(portfolio_value, 2),
        "equity_curve": equity_curve[::max(1, len(equity_curve) // 60)],  # Sample to ~60 points
    }
    if benchmark_metrics:
        result["benchmark_metrics"] = benchmark_metrics
    return result


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
    # Map symbols: portfolio may use "HDFCBANK" but prices use "HDFCBANK.NS" or "HDFCBANK.BO"
    # Try to find the actual symbol in the price database
    raw_symbols = [h.symbol for h in holdings]
    symbols = []
    symbol_map = {}  # mapped_symbol -> original_symbol
    for s in raw_symbols:
        if "." in s:
            # Already has exchange suffix
            symbols.append(s)
            symbol_map[s] = s
        else:
            # Try all common exchange suffixes
            matched = False
            for suffix in [".NS", ".BO", ""]:
                candidate = f"{s}{suffix}" if suffix else s
                exists = db.query(StockPrice.id).filter(StockPrice.symbol == candidate).first()
                if exists:
                    symbols.append(candidate)
                    symbol_map[candidate] = s
                    matched = True
                    break
            if not matched:
                # Fallback: try .NS (most common for Indian stocks)
                symbols.append(f"{s}.NS")
                symbol_map[f"{s}.NS"] = s

    # Stock info (sector, industry, market_cap)
    info_rows = db.query(StockInfo).filter(StockInfo.symbol.in_(symbols)).all()
    info_map = {i.symbol: i for i in info_rows}

    # Factor exposures — find nearest available date (exposures may be stored for model end_date)
    nearest_exposure_date = (
        db.query(FactorExposure.date)
        .filter(FactorExposure.symbol.in_(symbols))
        .order_by(FactorExposure.date.desc())
        .first()
    )
    exposure_date = nearest_exposure_date[0] if nearest_exposure_date else target_date
    exposures = (
        db.query(FactorExposure)
        .filter(
            FactorExposure.symbol.in_(symbols),
            FactorExposure.date == exposure_date,
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
        # Try both raw symbol and mapped symbol for info lookup
        mapped_sym = next((k for k, v in symbol_map.items() if v == h.symbol), h.symbol)
        info = info_map.get(mapped_sym) or info_map.get(h.symbol)
        result.append({
            "symbol": h.symbol,
            "weight": round(h.weight, 6),
            "semv": round(h.semv, 2),
            "sector": info.sector if info else "",
            "industry": info.industry if info else "",
            "market_cap": round(info.market_cap / 1e7, 2) if info and info.market_cap else 0.0,  # Convert to crores
            "factor_exposures": exposure_map.get(mapped_sym, exposure_map.get(h.symbol, {})),
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
