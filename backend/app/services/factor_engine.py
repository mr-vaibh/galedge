"""Factor computation engine — computes style and industry factor returns and exposures.

India-centric multi-factor risk model with:
- 1 Market factor
- 10 Style factors (Beta, Size, Momentum, Value, Growth, etc.)
- Industry factors (auto-detected from stock sectors)

Uses cross-sectional regression (Fama-MacBeth style) to compute factor returns.
"""

from __future__ import annotations

import logging
from datetime import date, timedelta

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.market_data import StockPrice, StockInfo
from app.models.factor import FactorModel, Factor, FactorReturn, FactorExposure

logger = logging.getLogger(__name__)

# ── Style Factor Definitions ─────────────────────────────────────────────────

STYLE_FACTORS = {
    "BETA": "Market sensitivity — rolling 252-day beta vs market",
    "SIZE": "Market capitalization — log(market_cap)",
    "LTMOM": "Long-term momentum — 12-month return minus 1-month return",
    "EARNYILD": "Earnings yield — inverse of trailing P/E",
    "VALUE": "Book value to price ratio",
    "GROWTH": "Revenue growth rate",
    "DIVYILD": "Dividend yield",
    "PROFIT": "Profitability — ROE",
    "FINLVG": "Financial leverage — debt to equity",
    "LIQUIDITY": "Trading liquidity — average daily volume / shares outstanding",
}


def _get_price_matrix(db: Session, symbols: list[str], start: date, end: date) -> pd.DataFrame:
    """Get a pivot table of close prices: dates x symbols."""
    rows = db.execute(
        select(StockPrice.symbol, StockPrice.date, StockPrice.close, StockPrice.volume)
        .where(StockPrice.symbol.in_(symbols))
        .where(StockPrice.date >= start)
        .where(StockPrice.date <= end)
        .order_by(StockPrice.date)
    ).all()

    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows, columns=["symbol", "date", "close", "volume"])
    price_matrix = df.pivot(index="date", columns="symbol", values="close")
    volume_matrix = df.pivot(index="date", columns="symbol", values="volume")

    return price_matrix, volume_matrix


def _get_stock_info_map(db: Session, symbols: list[str]) -> dict[str, dict]:
    """Get stock info as a dict: symbol -> {sector, industry, market_cap, fundamentals...}."""
    infos = db.query(StockInfo).filter(StockInfo.symbol.in_(symbols)).all()
    return {i.symbol: {
        "sector": i.sector,
        "industry": i.industry,
        "market_cap": i.market_cap,
        "pe": i.pe,
        "pb": i.pb,
        "roe": i.roe,
        "dividend_yield": i.dividend_yield,
        "debt_to_equity": i.debt_to_equity,
        "profit_margin": i.profit_margin,
        "earnings_growth": i.earnings_growth,
        "revenue_growth": i.revenue_growth,
    } for i in infos}


def compute_style_exposures(
    price_matrix: pd.DataFrame,
    volume_matrix: pd.DataFrame,
    info_map: dict[str, dict],
    as_of_date: date,
) -> pd.DataFrame:
    """Compute style factor exposures for each stock on a given date.

    Returns DataFrame: rows=symbols, columns=factor names, values=z-scored exposures.
    """
    symbols = price_matrix.columns.tolist()
    returns = price_matrix.pct_change()

    # Market return (equal-weighted for simplicity)
    market_return = returns.mean(axis=1)

    exposures = pd.DataFrame(index=symbols)

    # BETA: rolling 252-day beta vs market
    beta_window = min(252, len(returns) - 1)
    if beta_window > 20:
        betas = {}
        for sym in symbols:
            try:
                cov = returns[sym].rolling(beta_window).cov(market_return)
                var = market_return.rolling(beta_window).var()
                beta = (cov / var).iloc[-1]
                betas[sym] = beta if np.isfinite(beta) else 1.0
            except Exception:
                betas[sym] = 1.0
        exposures["BETA"] = pd.Series(betas)

    # SIZE: log market cap
    sizes = {sym: np.log(max(info_map.get(sym, {}).get("market_cap", 1e6), 1)) for sym in symbols}
    exposures["SIZE"] = pd.Series(sizes)

    # LTMOM: 12-month return minus 1-month return — computed per symbol to handle sparse data
    ltmom_dict: dict[str, float] = {}
    for sym in symbols:
        col = price_matrix[sym].dropna() if sym in price_matrix.columns else pd.Series(dtype=float)
        if len(col) >= 252:
            r12 = col.iloc[-1] / col.iloc[-252] - 1
            r1 = col.iloc[-1] / col.iloc[-21] - 1 if len(col) >= 21 else 0.0
            ltmom_dict[sym] = float(r12 - r1) if np.isfinite(r12) else np.nan
        else:
            ltmom_dict[sym] = np.nan  # insufficient history — excluded from z-score
    exposures["LTMOM"] = pd.Series(ltmom_dict)

    # Fundamentals from StockInfo — real data, no placeholders
    earnyild, value, growth, divyild, profit, finlvg = {}, {}, {}, {}, {}, {}
    for sym in symbols:
        info = info_map.get(sym, {})
        pe  = info.get("pe")
        pb  = info.get("pb")
        roe = info.get("roe")
        dy  = info.get("dividend_yield")
        de  = info.get("debt_to_equity")
        pm  = info.get("profit_margin")
        eg  = info.get("earnings_growth")
        rg  = info.get("revenue_growth")

        earnyild[sym] = (1.0 / pe)  if (pe  and pe  > 0)  else np.nan
        value[sym]    = (1.0 / pb)  if (pb  and pb  > 0)  else np.nan
        profit[sym]   = float(roe)  if (roe is not None)  else (float(pm) if pm is not None else np.nan)
        divyild[sym]  = float(dy)   if (dy  is not None)  else np.nan
        finlvg[sym]   = float(de)   if (de  is not None)  else np.nan
        # GROWTH: prefer earnings growth, fallback to revenue growth
        growth[sym]   = float(eg)   if (eg  is not None)  else (float(rg) if rg is not None else np.nan)

    exposures["EARNYILD"] = pd.Series(earnyild)
    exposures["VALUE"]    = pd.Series(value)
    exposures["GROWTH"]   = pd.Series(growth)
    exposures["DIVYILD"]  = pd.Series(divyild)
    exposures["PROFIT"]   = pd.Series(profit)
    exposures["FINLVG"]   = pd.Series(finlvg)

    # LIQUIDITY: average daily volume ratio
    if not volume_matrix.empty:
        avg_vol = volume_matrix.tail(20).mean()
        total_avg = avg_vol.mean()
        exposures["LIQUIDITY"] = avg_vol / max(total_avg, 1)
    else:
        exposures["LIQUIDITY"] = pd.Series(1.0, index=symbols)

    # Z-score all exposures cross-sectionally; NaN stocks get 0 (neutral) after standardisation
    for col in exposures.columns:
        valid = exposures[col].dropna()
        if len(valid) > 1:
            mean = valid.mean()
            std  = valid.std()
            if std > 0:
                exposures[col] = (exposures[col] - mean) / std
            # else: all same value → leave as-is, fillna(0) handles it
        # stocks with NaN get neutral exposure = 0
    exposures = exposures.replace([np.inf, -np.inf], np.nan).fillna(0)
    return exposures


def compute_factor_returns(
    returns: pd.DataFrame,
    exposures: pd.DataFrame,
) -> pd.Series:
    """Compute factor returns using cross-sectional regression.

    For each date, regress stock returns on factor exposures:
    r_i = sum(f_k * X_ik) + epsilon_i

    Returns: Series of factor returns for that date.
    """
    # Only use stocks present in both returns and exposures
    common = returns.index.intersection(exposures.index)
    if len(common) < 5:
        return pd.Series(0, index=exposures.columns)

    y = returns.loc[common].values
    X = exposures.loc[common].values

    # Add market factor (intercept)
    X_with_intercept = np.column_stack([np.ones(len(common)), X])

    # OLS: beta = (X'X)^-1 X'y
    try:
        XtX = X_with_intercept.T @ X_with_intercept
        Xty = X_with_intercept.T @ y
        betas = np.linalg.solve(XtX + np.eye(len(XtX)) * 1e-6, Xty)  # ridge regularization

        # First beta is market, rest are style factors
        factor_names = ["MARKET"] + exposures.columns.tolist()
        return pd.Series(betas, index=factor_names)
    except Exception:
        return pd.Series(0, index=["MARKET"] + exposures.columns.tolist())


def build_factor_model(
    db: Session,
    model_name: str = "INEC1",
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict:
    """Build/update the factor risk model.

    1. Get all stock prices and info
    2. Compute style exposures
    3. Run cross-sectional regressions for factor returns
    4. Store results in database
    """
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=365 * 2)

    logger.info("Building factor model %s: %s to %s", model_name, start_date, end_date)

    # Get symbols with price data
    symbols = db.execute(
        select(StockPrice.symbol).distinct()
        .where(StockPrice.date >= start_date)
    ).scalars().all()

    if not symbols:
        return {"error": "No price data available"}

    symbols = list(symbols)  # use all available symbols
    logger.info("Using %d symbols", len(symbols))

    # Get price and volume matrices
    price_matrix, volume_matrix = _get_price_matrix(db, symbols, start_date, end_date)
    if price_matrix.empty:
        return {"error": "No price data"}

    info_map = _get_stock_info_map(db, symbols)

    # Create or get factor model
    fm = db.query(FactorModel).filter(FactorModel.name == model_name).first()
    if not fm:
        fm = FactorModel(name=model_name, description="India equity factor model", start_date=start_date)
        db.add(fm)
        db.commit()
        db.refresh(fm)

    # Create factor entries
    all_factor_names = ["MARKET"] + list(STYLE_FACTORS.keys())
    factor_map = {}
    for fname in all_factor_names:
        f = db.query(Factor).filter(Factor.model_id == fm.id, Factor.name == fname).first()
        if not f:
            ftype = "Market" if fname == "MARKET" else "Style"
            f = Factor(model_id=fm.id, name=fname, factor_type=ftype,
                      description=STYLE_FACTORS.get(fname, "Market return factor"))
            db.add(f)
            db.commit()
            db.refresh(f)
        factor_map[fname] = f

    # Add industry factors from stock sectors
    sectors = set(info_map.get(s, {}).get("sector", "") for s in symbols)
    sectors.discard("")
    for sector in sectors:
        sector_code = sector.upper().replace(" ", "")[:10]
        if sector_code not in factor_map:
            f = db.query(Factor).filter(Factor.model_id == fm.id, Factor.name == sector_code).first()
            if not f:
                f = Factor(model_id=fm.id, name=sector_code, factor_type="Industry",
                          description=f"Industry factor: {sector}")
                db.add(f)
                db.commit()
                db.refresh(f)
            factor_map[sector_code] = f

    # Compute exposures (latest date)
    exposures = compute_style_exposures(price_matrix, volume_matrix, info_map, end_date)

    # Store style exposures
    for sym in exposures.index:
        for fname in exposures.columns:
            if fname in factor_map:
                db.add(FactorExposure(
                    factor_id=factor_map[fname].id,
                    date=end_date,
                    symbol=sym,
                    exposure=float(exposures.loc[sym, fname]),
                ))

    # Store MARKET exposure (= 1.0 for all stocks by definition)
    if "MARKET" in factor_map:
        for sym in exposures.index:
            db.add(FactorExposure(
                factor_id=factor_map["MARKET"].id,
                date=end_date,
                symbol=sym,
                exposure=1.0,
            ))

    # Store industry exposures (1.0 if stock belongs to sector, 0.0 otherwise)
    for sym in exposures.index:
        sym_sector = info_map.get(sym, {}).get("sector", "")
        sym_sector_code = sym_sector.upper().replace(" ", "")[:10] if sym_sector else ""
        for sector_code, factor in factor_map.items():
            if factor.factor_type == "Industry":
                exposure_val = 1.0 if sector_code == sym_sector_code else 0.0
                db.add(FactorExposure(
                    factor_id=factor.id,
                    date=end_date,
                    symbol=sym,
                    exposure=exposure_val,
                ))

    # Compute daily factor returns via cross-sectional regression
    returns_matrix = price_matrix.pct_change().dropna()
    cumulative = {}

    # Build sector mapping for industry factor returns
    sym_to_sector_code: dict[str, str] = {}
    for sym in symbols:
        sector = info_map.get(sym, {}).get("sector", "")
        if sector:
            sym_to_sector_code[sym] = sector.upper().replace(" ", "")[:10]

    dates = returns_matrix.index.tolist()
    batch_size = 50
    for i in range(0, len(dates), batch_size):
        batch_dates = dates[i:i + batch_size]
        for dt in batch_dates:
            daily_returns = returns_matrix.loc[dt]
            factor_rets = compute_factor_returns(daily_returns, exposures)

            for fname, ret in factor_rets.items():
                if fname in factor_map and np.isfinite(ret):
                    cumulative[fname] = cumulative.get(fname, 0) + ret
                    db.add(FactorReturn(
                        factor_id=factor_map[fname].id,
                        date=dt.date() if hasattr(dt, "date") else dt,
                        daily_return=float(ret),
                        cumulative_return=float(cumulative[fname]),
                    ))

            # Compute industry factor returns (equal-weighted average return per sector)
            for sector_code, factor in factor_map.items():
                if factor.factor_type != "Industry":
                    continue
                sector_syms = [s for s in daily_returns.index if sym_to_sector_code.get(s) == sector_code]
                if sector_syms:
                    ind_ret = float(daily_returns.loc[sector_syms].mean())
                    if np.isfinite(ind_ret):
                        cumulative[sector_code] = cumulative.get(sector_code, 0) + ind_ret
                        db.add(FactorReturn(
                            factor_id=factor.id,
                            date=dt.date() if hasattr(dt, "date") else dt,
                            daily_return=ind_ret,
                            cumulative_return=float(cumulative[sector_code]),
                        ))

    db.commit()
    fm.end_date = end_date
    db.commit()

    logger.info("Factor model built: %d factors, %d dates", len(factor_map), len(dates))
    return {
        "model": model_name,
        "factors": len(factor_map),
        "dates": len(dates),
        "symbols": len(symbols),
    }
