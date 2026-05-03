"""Analytics engine — computes all portfolio/strategy analytics on-the-fly.

No caching or DB storage. All metrics are derived from raw price data and
factor model data at query time. Designed to be called from the analytics router.

Usage:
    result = get_full_analytics(
        source="portfolio",
        source_id=42,
        backtest_id=None,
        db=alpha_db_session,
        prices_db=prices_db_session,
        benchmark_name="NIFTY 500",
    )
"""

from __future__ import annotations

import logging
from collections import defaultdict
from datetime import date, timedelta
from typing import Literal

import numpy as np
import pandas as pd
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.factor import Factor, FactorExposure, FactorModel, FactorReturn
from app.models.market_data import StockInfo, StockPrice
from app.models.portfolio import Portfolio, PortfolioHolding
from app.models.strategy import Backtest, Strategy
from app.services.data_ingestion import ALL_NSE_STOCKS, NIFTY_50, NIFTY_NEXT_50

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

LARGE_CAP_THRESHOLD = 20_000 * 1e7   # market_cap > 20000 crore in raw rupees
MID_CAP_THRESHOLD   =  5_000 * 1e7   # market_cap >  5000 crore in raw rupees

EVENTS = [
    {"name": "COVID Crash",         "start": "2020-03-06", "end": "2020-03-24"},
    {"name": "Vaccine Rally",        "start": "2020-11-01", "end": "2021-02-28"},
    {"name": "2019 Election",        "start": "2019-03-01", "end": "2019-05-23"},
    {"name": "2024 Pre-election",    "start": "2023-11-03", "end": "2024-01-31"},
    {"name": "2024 Election Whipsaw","start": "2024-06-05", "end": "2024-08-03"},
    {"name": "2025 Trump Tariffs",   "start": "2025-04-02", "end": "2025-04-15"},
    {"name": "IL&FS Crisis",         "start": "2018-09-01", "end": "2019-03-31"},
    {"name": "Russia-Ukraine",       "start": "2022-02-24", "end": "2022-03-16"},
    {"name": "Modi Wave 2014",       "start": "2014-04-07", "end": "2014-05-26"},
    {"name": "GST Launch",           "start": "2017-07-01", "end": "2017-07-31"},
    {"name": "Taper Tantrum",        "start": "2013-05-22", "end": "2013-09-18"},
    {"name": "Demonetization",       "start": "2016-11-08", "end": "2016-12-30"},
]

# Benchmark name → symbol universe
_BENCHMARK_SYMBOLS: dict[str, list[str]] = {
    "NIFTY 50":      NIFTY_50,
    "NIFTY NEXT 50": NIFTY_NEXT_50,
    "NIFTY 500":     ALL_NSE_STOCKS,
}


# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------

def _to_date(val) -> date:
    """Coerce str / datetime / date to date."""
    if isinstance(val, date):
        return val
    if isinstance(val, str):
        return date.fromisoformat(val[:10])
    return pd.Timestamp(val).date()


def _strip_suffix(symbol: str) -> str:
    """Remove .NS / .BO suffix."""
    for suffix in (".NS", ".BO"):
        if symbol.endswith(suffix):
            return symbol[: -len(suffix)]
    return symbol


def _resolve_symbol(symbol: str, available: set[str]) -> str | None:
    """Return the version of *symbol* that exists in *available*, else None."""
    if symbol in available:
        return symbol
    bare = _strip_suffix(symbol)
    for candidate in (bare, f"{bare}.NS", f"{bare}.BO"):
        if candidate in available:
            return candidate
    return None


def _nearest_before(dates_sorted: list[date], target: date) -> date | None:
    """Return the latest date in *dates_sorted* that is <= *target*."""
    result = None
    for d in dates_sorted:
        if d <= target:
            result = d
        else:
            break
    return result


# ---------------------------------------------------------------------------
# 1. build_holdings_df
# ---------------------------------------------------------------------------

def build_holdings_df(
    source: Literal["portfolio", "strategy"],
    source_id: int,
    backtest_id: int | None,
    db: Session,
    prices_db: Session,
) -> tuple[pd.DataFrame, date, date]:
    """Build a holdings weight matrix from portfolio or strategy backtest.

    Returns
    -------
    (holdings_df, start_date, end_date)
        holdings_df: DatetimeIndex rows, symbol columns, weight values (0-1).
        Dates forward-filled between rebalances.
    """
    rebalances: list[tuple[date, dict[str, float]]] = []

    if source == "portfolio":
        holdings_rows = (
            db.execute(
                select(PortfolioHolding)
                .where(PortfolioHolding.portfolio_id == source_id)
                .order_by(PortfolioHolding.date)
            )
            .scalars()
            .all()
        )
        if not holdings_rows:
            raise ValueError(f"No holdings found for portfolio_id={source_id}")

        # Group by date
        by_date: dict[date, dict[str, float]] = defaultdict(dict)
        for h in holdings_rows:
            by_date[h.date][h.symbol] = h.weight

        for d in sorted(by_date):
            rebalances.append((d, by_date[d]))

    elif source == "strategy":
        bt_query = select(Backtest).where(Backtest.strategy_id == source_id)
        if backtest_id is not None:
            bt_query = bt_query.where(Backtest.id == backtest_id)
        else:
            bt_query = bt_query.order_by(Backtest.id.desc())

        bt = db.execute(bt_query).scalars().first()
        if bt is None:
            raise ValueError(
                f"No backtest found for strategy_id={source_id}, backtest_id={backtest_id}"
            )
        results = bt.results or {}
        raw_rebalances = results.get("rebalances", [])
        if not raw_rebalances:
            raise ValueError(f"Backtest {bt.id} has no rebalances in results")

        for r in raw_rebalances:
            d = _to_date(r["date"])
            weights: dict[str, float] = r.get("weights", {})
            rebalances.append((d, weights))

        rebalances.sort(key=lambda x: x[0])
    else:
        raise ValueError(f"Unknown source: {source!r}")

    # Collect all symbols
    all_syms_raw: set[str] = set()
    for _, w in rebalances:
        all_syms_raw.update(w.keys())

    # Resolve symbols against price DB
    available_syms = set(
        row[0]
        for row in prices_db.execute(
            select(StockPrice.symbol).distinct()
        ).all()
    )
    sym_map: dict[str, str] = {}
    for sym in all_syms_raw:
        resolved = _resolve_symbol(sym, available_syms)
        sym_map[sym] = resolved if resolved is not None else sym

    # Build sparse weight dict keyed by resolved symbol
    rebalances_resolved: list[tuple[date, dict[str, float]]] = []
    for d, weights in rebalances:
        resolved_weights: dict[str, float] = {}
        for sym, w in weights.items():
            resolved_weights[sym_map.get(sym, sym)] = w
        rebalances_resolved.append((d, resolved_weights))

    # Create DataFrame
    all_resolved_syms = sorted({s for _, w in rebalances_resolved for s in w})
    rebalance_dates = [d for d, _ in rebalances_resolved]

    raw_df = pd.DataFrame(index=rebalance_dates, columns=all_resolved_syms, dtype=float)
    raw_df.index = pd.to_datetime(raw_df.index)
    raw_df[:] = 0.0

    for d, weights in rebalances_resolved:
        ts = pd.Timestamp(d)
        for sym, w in weights.items():
            if sym in raw_df.columns:
                raw_df.at[ts, sym] = w

    start_date = rebalance_dates[0]
    end_date = rebalance_dates[-1]

    # Determine the real end date from prices
    max_price_date_row = prices_db.execute(
        select(func.max(StockPrice.date))
    ).scalar()
    if max_price_date_row:
        end_date = max(end_date, max_price_date_row)  # expand to latest price date

    # Build a full date range and forward-fill
    full_idx = pd.date_range(start=start_date, end=end_date, freq="D")
    holdings_df = raw_df.reindex(full_idx).ffill()
    holdings_df = holdings_df.fillna(0.0)

    return holdings_df, start_date, end_date


# ---------------------------------------------------------------------------
# 2. build_price_matrix
# ---------------------------------------------------------------------------

def build_price_matrix(
    symbols: list[str],
    start_date: date,
    end_date: date,
    prices_db: Session,
) -> pd.DataFrame:
    """Query StockPrice and return a date × symbol close-price DataFrame."""
    if not symbols:
        return pd.DataFrame()

    rows = prices_db.execute(
        select(StockPrice.date, StockPrice.symbol, StockPrice.close)
        .where(
            StockPrice.symbol.in_(symbols),
            StockPrice.date >= start_date,
            StockPrice.date <= end_date,
        )
        .order_by(StockPrice.date)
    ).all()

    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows, columns=["date", "symbol", "close"])
    matrix = df.pivot(index="date", columns="symbol", values="close")
    matrix.index = pd.to_datetime(matrix.index)
    matrix = matrix.sort_index()

    # Forward-fill sparse prices (non-trading days / missing data)
    matrix = matrix.ffill()
    return matrix


# ---------------------------------------------------------------------------
# 3. compute_daily_returns
# ---------------------------------------------------------------------------

def compute_daily_returns(
    holdings_df: pd.DataFrame,
    price_matrix: pd.DataFrame,
) -> pd.Series:
    """Compute daily portfolio returns weighted by holdings.

    Returns
    -------
    pd.Series indexed by date, values in decimal (0.01 = 1%).
    """
    if holdings_df.empty or price_matrix.empty:
        return pd.Series(dtype=float)

    # Only keep symbols present in both
    common_syms = list(set(holdings_df.columns) & set(price_matrix.columns))
    if not common_syms:
        return pd.Series(dtype=float)

    price_sub = price_matrix[common_syms].sort_index()
    daily_stock_returns = price_sub.pct_change()

    # Align holdings to price dates via forward-fill
    holdings_aligned = (
        holdings_df[common_syms]
        .reindex(price_sub.index, method="ffill")
        .fillna(0.0)
    )

    portfolio_daily = (holdings_aligned * daily_stock_returns).sum(axis=1)
    portfolio_daily = portfolio_daily.dropna()
    # Remove the first row if it's exactly 0 from pct_change NaN
    portfolio_daily = portfolio_daily[portfolio_daily.index >= price_sub.index[1]]
    return portfolio_daily


# ---------------------------------------------------------------------------
# 4. compute_benchmark_returns
# ---------------------------------------------------------------------------

def compute_benchmark_returns(
    benchmark_name: str,
    start_date: date,
    end_date: date,
    prices_db: Session,
) -> pd.Series:
    """Equal-weight daily returns for the benchmark universe."""
    symbols = _BENCHMARK_SYMBOLS.get(benchmark_name, NIFTY_50)
    price_matrix = build_price_matrix(symbols, start_date, end_date, prices_db)
    if price_matrix.empty:
        return pd.Series(dtype=float)

    daily_returns = price_matrix.pct_change().dropna(how="all")
    # Equal-weight: fill NaN per stock with 0 on that day, then mean
    bench_returns = daily_returns.mean(axis=1)
    bench_returns = bench_returns.dropna()
    return bench_returns


# ---------------------------------------------------------------------------
# 5. compute_pnl_metrics
# ---------------------------------------------------------------------------

def compute_pnl_metrics(
    daily_returns: pd.Series,
    benchmark_returns: pd.Series | None = None,
) -> dict:
    """Compute comprehensive PnL metrics from daily return series."""
    empty = {
        "total_return": 0.0,
        "cagr": 0.0,
        "sharpe": 0.0,
        "sortino": 0.0,
        "volatility": 0.0,
        "max_drawdown": 0.0,
        "beta": 0.0,
        "treynor": 0.0,
        "benchmark_total_return": None,
        "alpha": None,
    }

    if daily_returns is None or daily_returns.empty:
        return empty

    r = daily_returns.dropna()
    n = len(r)
    if n < 2:
        return empty

    # Total return
    total_return_dec = (1 + r).prod() - 1
    total_return_pct = total_return_dec * 100

    # CAGR
    cagr_dec = (1 + total_return_dec) ** (252.0 / n) - 1
    cagr_pct = cagr_dec * 100

    # Volatility (annualised)
    vol_dec = r.std() * np.sqrt(252)
    vol_pct = vol_dec * 100

    # Sharpe (risk-free ≈ 0)
    sharpe = (r.mean() / r.std() * np.sqrt(252)) if r.std() > 1e-10 else 0.0

    # Sortino
    downside = r[r < 0]
    sortino = (
        (r.mean() / downside.std() * np.sqrt(252))
        if len(downside) > 1 and downside.std() > 1e-10
        else 0.0
    )

    # Max drawdown
    cum = (1 + r).cumprod()
    rolling_max = cum.cummax()
    drawdown = (cum - rolling_max) / rolling_max
    max_drawdown_pct = drawdown.min() * 100  # negative

    # Beta & Treynor vs benchmark
    beta = 0.0
    treynor = 0.0
    bench_total_return: float | None = None
    alpha: float | None = None

    if benchmark_returns is not None and not benchmark_returns.empty:
        b = benchmark_returns.dropna()
        common_idx = r.index.intersection(b.index)
        if len(common_idx) > 10:
            r_aligned = r.loc[common_idx]
            b_aligned = b.loc[common_idx]
            b_var = b_aligned.var()
            if b_var > 1e-12:
                cov = np.cov(r_aligned.values, b_aligned.values)
                beta = float(cov[0, 1] / b_var)

            bench_total_return_dec = (1 + b_aligned).prod() - 1
            bench_total_return = bench_total_return_dec * 100

            # Jensen's alpha (annualised, rf=0)
            alpha_dec = cagr_dec - beta * ((1 + bench_total_return_dec) ** (252 / len(b_aligned)) - 1)
            alpha = alpha_dec * 100

        treynor = (total_return_dec / beta) if abs(beta) > 0.01 else 0.0

    return {
        "total_return": round(total_return_pct, 4),
        "cagr": round(cagr_pct, 4),
        "sharpe": round(sharpe, 4),
        "sortino": round(sortino, 4),
        "volatility": round(vol_pct, 4),
        "max_drawdown": round(max_drawdown_pct, 4),
        "beta": round(beta, 4),
        "treynor": round(treynor, 4),
        "benchmark_total_return": round(bench_total_return, 4) if bench_total_return is not None else None,
        "alpha": round(alpha, 4) if alpha is not None else None,
    }


# ---------------------------------------------------------------------------
# 6. compute_equity_curve
# ---------------------------------------------------------------------------

def compute_equity_curve(
    daily_returns: pd.Series,
    initial_capital: float = 10_000_000,
) -> list[dict]:
    """Full equity curve — one entry per date, no downsampling."""
    if daily_returns is None or daily_returns.empty:
        return []

    r = daily_returns.dropna()
    cum = (1 + r).cumprod()
    values = cum * initial_capital

    rolling_max = values.cummax()
    drawdown_pct = ((values - rolling_max) / rolling_max * 100).round(4)
    cumulative_return_pct = ((values / initial_capital - 1) * 100).round(4)

    result = []
    for ts, val in values.items():
        d = ts if isinstance(ts, str) else ts.strftime("%Y-%m-%d")
        result.append(
            {
                "date": d,
                "value": round(float(val), 2),
                "drawdown_pct": float(drawdown_pct.loc[ts]),
                "cumulative_return_pct": float(cumulative_return_pct.loc[ts]),
            }
        )
    return result


# ---------------------------------------------------------------------------
# 7. compute_rolling_metrics
# ---------------------------------------------------------------------------

def compute_rolling_metrics(
    daily_returns: pd.Series,
    benchmark_returns: pd.Series | None = None,
    window: int = 252,
) -> list[dict]:
    """Rolling Sharpe, volatility, and beta over *window* trading days."""
    if daily_returns is None or daily_returns.empty or len(daily_returns) < window:
        return []

    r = daily_returns.dropna()

    rolling_mean = r.rolling(window).mean()
    rolling_std  = r.rolling(window).std()
    rolling_sharpe = (rolling_mean / rolling_std * np.sqrt(252)).fillna(0.0)
    rolling_vol    = (rolling_std * np.sqrt(252) * 100).fillna(0.0)

    # Rolling beta
    rolling_beta = pd.Series(np.nan, index=r.index)
    if benchmark_returns is not None and not benchmark_returns.empty:
        b = benchmark_returns.dropna()
        common_idx = r.index.intersection(b.index)
        r_c = r.loc[common_idx]
        b_c = b.loc[common_idx]

        # Use rolling covariance / variance
        rb_cov = r_c.rolling(window).cov(b_c)
        bb_var = b_c.rolling(window).var()
        rolling_beta_c = (rb_cov / bb_var).replace([np.inf, -np.inf], np.nan)
        rolling_beta = rolling_beta_c.reindex(r.index)

    rolling_beta = rolling_beta.fillna(0.0)

    result = []
    for ts in r.index[window - 1:]:
        result.append(
            {
                "date": ts.strftime("%Y-%m-%d"),
                "rolling_sharpe": round(float(rolling_sharpe.loc[ts]), 4),
                "rolling_vol": round(float(rolling_vol.loc[ts]), 4),
                "rolling_beta": round(float(rolling_beta.loc[ts]), 4),
            }
        )
    return result


# ---------------------------------------------------------------------------
# 8. compute_drawdowns
# ---------------------------------------------------------------------------

def compute_drawdowns(
    daily_returns: pd.Series,
    initial_capital: float = 10_000_000,
) -> list[dict]:
    """Identify and rank the top-10 drawdown periods."""
    if daily_returns is None or daily_returns.empty:
        return []

    r = daily_returns.dropna()
    cum = (1 + r).cumprod() * initial_capital
    rolling_max = cum.cummax()
    dd_series = (cum - rolling_max) / rolling_max  # negative values

    dates = dd_series.index
    drawdowns: list[dict] = []
    in_drawdown = False
    dd_start: pd.Timestamp | None = None
    dd_bottom_idx: int | None = None
    dd_bottom_val: float = 0.0

    dd_id = 0
    values_arr = dd_series.values

    for i, (ts, val) in enumerate(zip(dates, values_arr)):
        if not in_drawdown:
            if val < -1e-6:
                in_drawdown = True
                # Start is the last peak before this drop
                dd_start = dates[i - 1] if i > 0 else ts
                dd_bottom_idx = i
                dd_bottom_val = val
        else:
            if val < dd_bottom_val:
                dd_bottom_val = val
                dd_bottom_idx = i
            if val >= -1e-6:
                # Recovered
                dd_id += 1
                bottom_ts = dates[dd_bottom_idx]
                recovery_days = (ts - bottom_ts).days
                drawdowns.append(
                    {
                        "id": dd_id,
                        "start_date": dd_start.strftime("%Y-%m-%d"),
                        "bottom_date": bottom_ts.strftime("%Y-%m-%d"),
                        "end_date": ts.strftime("%Y-%m-%d"),
                        "loss_pct": round(dd_bottom_val * 100, 4),
                        "recovery_days": recovery_days,
                        "is_recovered": True,
                    }
                )
                in_drawdown = False
                dd_start = None
                dd_bottom_idx = None
                dd_bottom_val = 0.0

    # Still in drawdown at end of series
    if in_drawdown and dd_bottom_idx is not None:
        dd_id += 1
        bottom_ts = dates[dd_bottom_idx]
        end_ts = dates[-1]
        recovery_days = (end_ts - bottom_ts).days
        drawdowns.append(
            {
                "id": dd_id,
                "start_date": dd_start.strftime("%Y-%m-%d"),
                "bottom_date": bottom_ts.strftime("%Y-%m-%d"),
                "end_date": end_ts.strftime("%Y-%m-%d"),
                "loss_pct": round(dd_bottom_val * 100, 4),
                "recovery_days": recovery_days,
                "is_recovered": False,
            }
        )

    # Sort by severity (most negative first) and return top 10
    drawdowns.sort(key=lambda d: d["loss_pct"])
    return drawdowns[:10]


# ---------------------------------------------------------------------------
# Factor model helpers
# ---------------------------------------------------------------------------

def _load_factor_model(
    prices_db: Session,
    model_name: str,
) -> tuple[dict[int, Factor], list[int]]:
    """Return (factor_id→Factor, [factor_ids]) for given model."""
    fm = prices_db.execute(
        select(FactorModel).where(FactorModel.name == model_name)
    ).scalars().first()
    if fm is None:
        return {}, []

    factors = prices_db.execute(
        select(Factor).where(Factor.model_id == fm.id)
    ).scalars().all()

    factor_map = {f.id: f for f in factors}
    factor_ids = list(factor_map.keys())
    return factor_map, factor_ids


def _load_factor_returns_df(
    prices_db: Session,
    factor_ids: list[int],
    start_date: date,
    end_date: date,
) -> pd.DataFrame:
    """Return DataFrame: index=date, columns=factor_id, values=daily_return."""
    if not factor_ids:
        return pd.DataFrame()

    rows = prices_db.execute(
        select(FactorReturn.date, FactorReturn.factor_id, FactorReturn.daily_return)
        .where(
            FactorReturn.factor_id.in_(factor_ids),
            FactorReturn.date >= start_date,
            FactorReturn.date <= end_date,
        )
        .order_by(FactorReturn.date)
    ).all()

    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows, columns=["date", "factor_id", "daily_return"])
    matrix = df.groupby(["date","factor_id"])["daily_return"].mean().reset_index().pivot(index="date", columns="factor_id", values="daily_return")
    matrix.index = pd.to_datetime(matrix.index)
    return matrix.sort_index()


def _load_exposure_snapshots(
    prices_db: Session,
    factor_ids: list[int],
    symbols: list[str],
) -> dict[date, dict[str, dict[int, float]]]:
    """Return {snapshot_date: {symbol: {factor_id: exposure}}}."""
    if not factor_ids or not symbols:
        return {}

    rows = prices_db.execute(
        select(FactorExposure.date, FactorExposure.symbol, FactorExposure.factor_id, FactorExposure.exposure)
        .where(
            FactorExposure.factor_id.in_(factor_ids),
            FactorExposure.symbol.in_(symbols),
        )
        .order_by(FactorExposure.date)
    ).all()

    snapshots: dict[date, dict[str, dict[int, float]]] = defaultdict(
        lambda: defaultdict(dict)
    )
    for d, sym, fid, exp in rows:
        snapshots[d][sym][fid] = exp

    return dict(snapshots)


def _get_exposure_for_date(
    snapshots: dict[date, dict[str, dict[int, float]]],
    target_date: date,
) -> dict[str, dict[int, float]]:
    """Return the exposure snapshot closest to (and not after) *target_date*."""
    sorted_dates = sorted(snapshots.keys())
    nearest = _nearest_before(sorted_dates, target_date)
    if nearest is None and sorted_dates:
        nearest = sorted_dates[0]
    if nearest is None:
        return {}
    return snapshots[nearest]


# ---------------------------------------------------------------------------
# 9. compute_factor_decomp_ts
# ---------------------------------------------------------------------------

def compute_factor_decomp_ts(
    holdings_df: pd.DataFrame,
    prices_db: Session,
    model_name: str = "INEC1",
) -> list[dict]:
    """Daily factor decomposition of portfolio returns."""
    try:
        if holdings_df.empty:
            return []

        factor_map, factor_ids = _load_factor_model(prices_db, model_name)
        if not factor_ids:
            return []

        symbols = list(holdings_df.columns)
        start_date = holdings_df.index[0].date()
        end_date   = holdings_df.index[-1].date()

        factor_returns_df = _load_factor_returns_df(
            prices_db, factor_ids, start_date, end_date
        )
        if factor_returns_df.empty:
            return []

        exposure_snapshots = _load_exposure_snapshots(prices_db, factor_ids, symbols)

        price_matrix = build_price_matrix(symbols, start_date, end_date, prices_db)
        daily_stock_returns = price_matrix.pct_change()

        # Align holdings to trading days
        holdings_aligned = (
            holdings_df.reindex(price_matrix.index, method="ffill").fillna(0.0)
        )
        portfolio_daily = (holdings_aligned * daily_stock_returns).sum(axis=1).dropna()

        result = []
        for ts in factor_returns_df.index:
            if ts not in portfolio_daily.index:
                continue

            d = ts.date()
            exposures_today = _get_exposure_for_date(exposure_snapshots, d)
            weights_today = holdings_aligned.loc[ts] if ts in holdings_aligned.index else pd.Series(dtype=float)

            market_r = 0.0
            style_r  = 0.0
            industry_r = 0.0

            for sym in symbols:
                w = float(weights_today.get(sym, 0.0))
                if w == 0.0:
                    continue
                sym_exps = exposures_today.get(sym, {})
                for fid, exp in sym_exps.items():
                    factor = factor_map.get(fid)
                    if factor is None:
                        continue
                    fr = float(factor_returns_df.loc[ts, fid]) if fid in factor_returns_df.columns else 0.0
                    contrib = w * exp * fr
                    if factor.factor_type == "Market":
                        market_r += contrib
                    elif factor.factor_type == "Style":
                        style_r += contrib
                    elif factor.factor_type == "Industry":
                        industry_r += contrib

            factor_total = market_r + style_r + industry_r
            total_r = float(portfolio_daily.loc[ts])
            idio_r  = total_r - factor_total

            result.append(
                {
                    "date":         ts.strftime("%Y-%m-%d"),
                    "market":       round(market_r, 8),
                    "style":        round(style_r, 8),
                    "industry":     round(industry_r, 8),
                    "factor_total": round(factor_total, 8),
                    "idio":         round(idio_r, 8),
                    "total":        round(total_r, 8),
                }
            )

        return result

    except Exception:
        logger.exception("compute_factor_decomp_ts failed")
        return []


# ---------------------------------------------------------------------------
# 10. compute_period_stats
# ---------------------------------------------------------------------------

def _period_label(ts: pd.Timestamp, granularity: str) -> str:
    if granularity == "monthly":
        return ts.strftime("%Y-%m")
    elif granularity == "quarterly":
        q = (ts.month - 1) // 3 + 1
        return f"{ts.year}-Q{q}"
    else:  # annual
        return str(ts.year)


def compute_period_stats(
    daily_returns: pd.Series,
    factor_decomp_ts: list[dict],
    granularity: str = "monthly",
) -> list[dict]:
    """Aggregate returns and factor decomposition into periods."""
    try:
        if daily_returns is None or daily_returns.empty:
            return []

        r = daily_returns.dropna()

        # Build factor decomp lookup: date→dict
        factor_by_date: dict[str, dict] = {row["date"]: row for row in factor_decomp_ts}

        # Assign period labels
        labels = r.index.map(lambda ts: _period_label(ts, granularity))
        unique_labels = list(dict.fromkeys(labels))  # preserve order

        result = []
        for label in unique_labels:
            mask = labels == label
            period_r = r[mask]
            if period_r.empty:
                continue

            period_dates = [ts.strftime("%Y-%m-%d") for ts in period_r.index]
            period_factor_rows = [factor_by_date[d] for d in period_dates if d in factor_by_date]

            metrics = compute_pnl_metrics(period_r)

            market_ret   = sum(row["market"]   for row in period_factor_rows)
            style_ret    = sum(row["style"]    for row in period_factor_rows)
            industry_ret = sum(row["industry"] for row in period_factor_rows)
            idio_ret     = sum(row["idio"]     for row in period_factor_rows)

            result.append(
                {
                    "label":           label,
                    "total_return":    metrics["total_return"],
                    "cagr":            metrics["cagr"],
                    "sharpe":          metrics["sharpe"],
                    "sortino":         metrics["sortino"],
                    "vol":             metrics["volatility"],
                    "beta":            metrics["beta"],
                    "market_return":   round(market_ret * 100, 4),
                    "style_return":    round(style_ret * 100, 4),
                    "industry_return": round(industry_ret * 100, 4),
                    "idio_return":     round(idio_ret * 100, 4),
                }
            )

        return sorted(result, key=lambda x: x["label"])

    except Exception:
        logger.exception("compute_period_stats failed")
        return []


# ---------------------------------------------------------------------------
# 11. compute_holdings_detail
# ---------------------------------------------------------------------------

def compute_holdings_detail(
    holdings_df: pd.DataFrame,
    price_matrix: pd.DataFrame,
    prices_db: Session,
    model_name: str = "INEC1",
) -> list[dict]:
    """Per-stock analytics: return, factor attribution, risk contribution."""
    try:
        if holdings_df.empty or price_matrix.empty:
            return []

        common_syms = list(set(holdings_df.columns) & set(price_matrix.columns))
        if not common_syms:
            return []

        factor_map, factor_ids = _load_factor_model(prices_db, model_name)

        start_date = holdings_df.index[0].date()
        end_date   = holdings_df.index[-1].date()

        exposure_snapshots = _load_exposure_snapshots(prices_db, factor_ids, common_syms)

        factor_returns_df = _load_factor_returns_df(
            prices_db, factor_ids, start_date, end_date
        )

        # Time-weighted average weight per symbol
        avg_weights = (
            holdings_df[common_syms]
            .reindex(price_matrix.index, method="ffill")
            .fillna(0.0)
            .mean()
        )

        # Raw return per symbol over the full period
        price_sub = price_matrix[common_syms].ffill()
        if price_sub.empty:
            return []

        first_prices = price_sub.iloc[0]
        last_prices  = price_sub.iloc[-1]
        raw_returns  = (last_prices - first_prices) / first_prices * 100  # %

        # Cumulative factor returns per factor_id
        cum_factor_returns: dict[int, float] = {}
        if not factor_returns_df.empty:
            for fid in factor_ids:
                if fid in factor_returns_df.columns:
                    col = factor_returns_df[fid].dropna()
                    cum_factor_returns[fid] = float((1 + col).prod() - 1)

        # Nearest exposure snapshot to mid-period
        mid_date = start_date + (end_date - start_date) / 2
        exposures_mid = _get_exposure_for_date(exposure_snapshots, mid_date)

        # Portfolio volatility for risk contribution normalisation
        daily_stock_r = price_sub.pct_change().dropna(how="all")
        holdings_aligned = (
            holdings_df[common_syms]
            .reindex(price_sub.index, method="ffill")
            .fillna(0.0)
        )
        port_daily = (holdings_aligned * daily_stock_r).sum(axis=1).dropna()
        port_vol = float(port_daily.std() * np.sqrt(252)) if len(port_daily) > 1 else 1.0

        # Total abs weighted beta exposure for normalisation
        total_abs_beta_exp = 0.0
        for sym in common_syms:
            w = float(avg_weights.get(sym, 0.0))
            sym_exps = exposures_mid.get(sym, {})
            for fid, exp in sym_exps.items():
                factor = factor_map.get(fid)
                if factor and factor.factor_type == "Market":
                    total_abs_beta_exp += w * abs(exp)

        if total_abs_beta_exp < 1e-10:
            total_abs_beta_exp = 1.0

        result = []
        for sym in common_syms:
            avg_w  = float(avg_weights.get(sym, 0.0))
            raw_r  = float(raw_returns.get(sym, 0.0))
            sym_exps = exposures_mid.get(sym, {})

            # Factor return for stock = sum(exp * cum_factor_return)
            factor_return_dec = 0.0
            beta_exp = 0.0
            for fid, exp in sym_exps.items():
                cum_fr = cum_factor_returns.get(fid, 0.0)
                factor_return_dec += exp * cum_fr
                factor = factor_map.get(fid)
                if factor and factor.factor_type == "Market":
                    beta_exp += exp

            factor_return_pct = factor_return_dec * 100
            idio_return_pct   = raw_r - factor_return_pct
            risk_contribution = avg_w * abs(beta_exp) / total_abs_beta_exp * 100

            result.append(
                {
                    "symbol":                        sym,
                    "avg_weight":                    round(avg_w * 100, 4),
                    "raw_return_pct":                round(raw_r, 4),
                    "total_return_contribution_pct": round(avg_w * raw_r, 4),
                    "factor_return_pct":             round(factor_return_pct, 4),
                    "idio_return_pct":               round(idio_return_pct, 4),
                    "risk_contribution_pct":         round(risk_contribution, 4),
                }
            )

        result.sort(key=lambda x: abs(x["total_return_contribution_pct"]), reverse=True)
        return result

    except Exception:
        logger.exception("compute_holdings_detail failed")
        return []


# ---------------------------------------------------------------------------
# 12. compute_factor_detail
# ---------------------------------------------------------------------------

def compute_factor_detail(
    holdings_df: pd.DataFrame,
    prices_db: Session,
    model_name: str = "INEC1",
) -> list[dict]:
    """Per-factor analytics: exposure, return, and risk contribution."""
    try:
        if holdings_df.empty:
            return []

        factor_map, factor_ids = _load_factor_model(prices_db, model_name)
        if not factor_ids:
            return []

        symbols = list(holdings_df.columns)
        start_date = holdings_df.index[0].date()
        end_date   = holdings_df.index[-1].date()

        exposure_snapshots = _load_exposure_snapshots(prices_db, factor_ids, symbols)

        factor_returns_df = _load_factor_returns_df(
            prices_db, factor_ids, start_date, end_date
        )

        # Average portfolio weights
        avg_weights = holdings_df.mean()

        # Nearest mid-period exposure
        mid_date = start_date + (end_date - start_date) / 2
        exposures_mid = _get_exposure_for_date(exposure_snapshots, mid_date)

        # Portfolio-level exposure per factor
        portfolio_exposure: dict[int, float] = defaultdict(float)
        for sym in symbols:
            w = float(avg_weights.get(sym, 0.0))
            for fid, exp in exposures_mid.get(sym, {}).items():
                portfolio_exposure[fid] += w * exp

        # Cumulative factor returns
        cum_factor_returns: dict[int, float] = {}
        if not factor_returns_df.empty:
            for fid in factor_ids:
                if fid in factor_returns_df.columns:
                    col = factor_returns_df[fid].dropna()
                    cum_factor_returns[fid] = float((1 + col).prod() - 1)

        # Total |exposure| for risk normalisation
        total_abs_exp = sum(abs(v) for v in portfolio_exposure.values()) or 1.0

        result = []
        for fid, factor in factor_map.items():
            exp   = portfolio_exposure.get(fid, 0.0)
            cum_r = cum_factor_returns.get(fid, 0.0)
            ret_contrib = exp * cum_r * 100  # %
            risk_contrib = abs(exp) / total_abs_exp * 100

            result.append(
                {
                    "factor_type":              factor.factor_type,
                    "factor_name":              factor.name,
                    "exposure_pct":             round(exp * 100, 4),
                    "raw_return_pct":           round(cum_r * 100, 4),
                    "return_contribution_pct":  round(ret_contrib, 4),
                    "risk_contribution_pct":    round(risk_contrib, 4),
                }
            )

        result.sort(key=lambda x: abs(x["return_contribution_pct"]), reverse=True)
        return result

    except Exception:
        logger.exception("compute_factor_detail failed")
        return []


# ---------------------------------------------------------------------------
# 13. compute_brinson
# ---------------------------------------------------------------------------

def _get_sector_info(
    symbols: list[str],
    prices_db: Session,
) -> dict[str, dict]:
    """Return {symbol: {sector, industry, market_cap, pe, pb}} for symbols."""
    rows = prices_db.execute(
        select(
            StockInfo.symbol,
            StockInfo.sector,
            StockInfo.industry,
            StockInfo.market_cap,
            StockInfo.pe,
            StockInfo.pb,
        ).where(StockInfo.symbol.in_(symbols))
    ).all()

    info: dict[str, dict] = {}
    for sym, sector, industry, mc, pe, pb in rows:
        info[sym] = {
            "sector":     sector or "Unknown",
            "industry":   industry or "Unknown",
            "market_cap": mc or 0.0,
            "pe":         pe or 0.0,
            "pb":         pb or 0.0,
        }
    # Fallback for missing symbols
    for sym in symbols:
        if sym not in info:
            info[sym] = {"sector": "Unknown", "industry": "Unknown", "market_cap": 0.0, "pe": 0.0, "pb": 0.0}
    return info


def _mcap_bucket(market_cap: float) -> str:
    if market_cap > LARGE_CAP_THRESHOLD:
        return "Large Cap"
    elif market_cap > MID_CAP_THRESHOLD:
        return "Mid Cap"
    else:
        return "Small Cap"


def _brinson_by_group(
    portfolio_weights: dict[str, float],
    benchmark_weights: dict[str, float],
    stock_returns: dict[str, float],
    group_key: dict[str, str],  # symbol → group label
) -> tuple[float, float, float, list[dict]]:
    """Core Brinson-Fachler calculation for any grouping dimension."""
    all_syms = set(portfolio_weights) | set(benchmark_weights)
    groups: set[str] = {group_key.get(s, "Unknown") for s in all_syms}

    # Benchmark total return for reference
    total_bench_r = sum(benchmark_weights.get(s, 0.0) * stock_returns.get(s, 0.0) for s in all_syms)

    alloc_total   = 0.0
    select_total  = 0.0
    interact_total = 0.0
    breakdown     = []

    for grp in sorted(groups):
        grp_syms = [s for s in all_syms if group_key.get(s, "Unknown") == grp]

        pw = sum(portfolio_weights.get(s, 0.0) for s in grp_syms)
        bw = sum(benchmark_weights.get(s, 0.0) for s in grp_syms)

        pr_num = sum(portfolio_weights.get(s, 0.0) * stock_returns.get(s, 0.0) for s in grp_syms)
        br_num = sum(benchmark_weights.get(s, 0.0) * stock_returns.get(s, 0.0) for s in grp_syms)

        pr = pr_num / pw if pw > 1e-8 else 0.0
        br = br_num / bw if bw > 1e-8 else 0.0

        alloc    = (pw - bw) * (br - total_bench_r)
        select   = bw * (pr - br)
        interact = (pw - bw) * (pr - br)

        alloc_total    += alloc
        select_total   += select
        interact_total += interact

        breakdown.append(
            {
                "group":             grp,
                "portfolio_weight":  round(pw * 100, 4),
                "benchmark_weight":  round(bw * 100, 4),
                "portfolio_return":  round(pr * 100, 4),
                "benchmark_return":  round(br * 100, 4),
                "allocation":        round(alloc * 100, 4),
                "selection":         round(select * 100, 4),
                "interaction":       round(interact * 100, 4),
            }
        )

    return alloc_total, select_total, interact_total, breakdown


def compute_brinson(
    holdings_df: pd.DataFrame,
    price_matrix: pd.DataFrame,
    prices_db: Session,
    benchmark_name: str,
) -> dict:
    """Overall Brinson attribution split by sector and market-cap bucket."""
    try:
        if holdings_df.empty or price_matrix.empty:
            return {}

        common_syms = list(set(holdings_df.columns) & set(price_matrix.columns))
        if not common_syms:
            return {}

        # Time-weighted average portfolio weights
        holdings_aligned = (
            holdings_df[common_syms]
            .reindex(price_matrix.index, method="ffill")
            .fillna(0.0)
        )
        avg_port_weights = {sym: float(holdings_aligned[sym].mean()) for sym in common_syms}

        # Stock returns (full period)
        price_sub  = price_matrix[common_syms].ffill()
        raw_returns = {}
        if len(price_sub) >= 2:
            raw_returns = {
                sym: float((price_sub[sym].iloc[-1] - price_sub[sym].iloc[0]) / price_sub[sym].iloc[0])
                if price_sub[sym].iloc[0] != 0 else 0.0
                for sym in common_syms
            }

        # Benchmark universe: equal weight across all benchmark symbols that have prices
        bench_syms_all = _BENCHMARK_SYMBOLS.get(benchmark_name, NIFTY_50)
        start_date = holdings_df.index[0].date()
        end_date   = holdings_df.index[-1].date()
        bench_price = build_price_matrix(bench_syms_all, start_date, end_date, prices_db)
        bench_syms  = list(bench_price.columns)
        n_bench     = len(bench_syms)
        avg_bench_weights = {sym: 1.0 / n_bench for sym in bench_syms} if n_bench > 0 else {}

        if len(bench_price) >= 2:
            for sym in bench_syms:
                col = bench_price[sym].ffill()
                raw_returns[sym] = raw_returns.get(
                    sym,
                    float((col.iloc[-1] - col.iloc[0]) / col.iloc[0]) if col.iloc[0] != 0 else 0.0,
                )

        # Stock info
        all_syms_for_info = list(set(common_syms) | set(bench_syms))
        stock_info = _get_sector_info(all_syms_for_info, prices_db)

        sector_key = {s: stock_info[s]["sector"] for s in all_syms_for_info}
        mcap_key   = {s: _mcap_bucket(stock_info[s]["market_cap"]) for s in all_syms_for_info}

        a_s, s_s, i_s, by_sector = _brinson_by_group(
            avg_port_weights, avg_bench_weights, raw_returns, sector_key
        )
        a_m, s_m, i_m, by_mcap = _brinson_by_group(
            avg_port_weights, avg_bench_weights, raw_returns, mcap_key
        )

        return {
            "allocation_total":   round(a_s * 100, 4),
            "selection_total":    round(s_s * 100, 4),
            "interaction_total":  round(i_s * 100, 4),
            "by_sector":          by_sector,
            "by_mcap":            by_mcap,
        }

    except Exception:
        logger.exception("compute_brinson failed")
        return {}


# ---------------------------------------------------------------------------
# 14. compute_slicing
# ---------------------------------------------------------------------------

def compute_slicing(
    holdings_df: pd.DataFrame,
    price_matrix: pd.DataFrame,
    prices_db: Session,
    benchmark_name: str,
    dimension: str = "market_cap",
) -> list[dict]:
    """Holdings analysis sliced by dimension (market_cap / sector / industry)."""
    try:
        if holdings_df.empty or price_matrix.empty:
            return []

        common_syms = list(set(holdings_df.columns) & set(price_matrix.columns))
        if not common_syms:
            return []

        stock_info  = _get_sector_info(common_syms, prices_db)
        price_sub   = price_matrix[common_syms].ffill()
        holdings_al = (
            holdings_df[common_syms]
            .reindex(price_sub.index, method="ffill")
            .fillna(0.0)
        )
        avg_weights = {sym: float(holdings_al[sym].mean()) for sym in common_syms}

        # Stock returns
        raw_returns: dict[str, float] = {}
        if len(price_sub) >= 2:
            raw_returns = {
                sym: float((price_sub[sym].iloc[-1] - price_sub[sym].iloc[0]) / price_sub[sym].iloc[0])
                if price_sub[sym].iloc[0] != 0 else 0.0
                for sym in common_syms
            }

        # Daily returns per stock for vol
        daily_r = price_sub.pct_change().dropna(how="all")

        # Group by dimension
        def _bucket(sym: str) -> str:
            info = stock_info[sym]
            if dimension == "market_cap":
                return _mcap_bucket(info["market_cap"])
            elif dimension == "sector":
                return info["sector"] or "Unknown"
            elif dimension == "industry":
                return info["industry"] or "Unknown"
            return "Unknown"

        groups: dict[str, list[str]] = defaultdict(list)
        for sym in common_syms:
            groups[_bucket(sym)].append(sym)

        # Benchmark weights for Brinson effects
        bench_syms_all = _BENCHMARK_SYMBOLS.get(benchmark_name, NIFTY_50)
        start_date = holdings_df.index[0].date()
        end_date   = holdings_df.index[-1].date()
        bench_price = build_price_matrix(bench_syms_all, start_date, end_date, prices_db)
        bench_syms  = list(bench_price.columns)
        n_bench     = len(bench_syms) or 1
        bench_info  = _get_sector_info(bench_syms, prices_db)
        all_returns = dict(raw_returns)
        if len(bench_price) >= 2:
            for sym in bench_syms:
                col = bench_price[sym].ffill()
                all_returns[sym] = float(
                    (col.iloc[-1] - col.iloc[0]) / col.iloc[0]
                ) if col.iloc[0] != 0 else 0.0

        avg_bench_weights = {sym: 1.0 / n_bench for sym in bench_syms}
        bench_bucket: dict[str, str] = {}
        for sym in bench_syms:
            info = bench_info[sym]
            if dimension == "market_cap":
                bench_bucket[sym] = _mcap_bucket(info["market_cap"])
            elif dimension == "sector":
                bench_bucket[sym] = info["sector"] or "Unknown"
            elif dimension == "industry":
                bench_bucket[sym] = info["industry"] or "Unknown"
            else:
                bench_bucket[sym] = "Unknown"

        bench_group_weights: dict[str, float] = defaultdict(float)
        for sym, bkt in bench_bucket.items():
            bench_group_weights[bkt] += 1.0 / n_bench

        total_bench_r = sum(avg_bench_weights.get(s, 0) * all_returns.get(s, 0) for s in bench_syms)

        result = []
        for bucket, syms in groups.items():
            pw = sum(avg_weights.get(s, 0.0) for s in syms)
            bw = bench_group_weights.get(bucket, 0.0)

            pr_num = sum(avg_weights.get(s, 0.0) * raw_returns.get(s, 0.0) for s in syms)
            pr = pr_num / pw if pw > 1e-8 else 0.0

            br_num = sum(avg_bench_weights.get(s, 0) * all_returns.get(s, 0) for s in bench_syms if bench_bucket.get(s) == bucket)
            br = br_num / bw if bw > 1e-8 else 0.0

            alloc    = (pw - bw) * (br - total_bench_r)
            select   = bw * (pr - br)
            interact = (pw - bw) * (pr - br)

            # Realised vol of bucket (equal-weight stocks in bucket)
            bucket_daily = daily_r[syms].mean(axis=1).dropna() if syms else pd.Series(dtype=float)
            vol_pct = float(bucket_daily.std() * np.sqrt(252) * 100) if len(bucket_daily) > 1 else 0.0

            # Weighted PE
            pe_sum = sum(avg_weights.get(s, 0.0) * stock_info[s]["pe"] for s in syms)
            pe = pe_sum / pw if pw > 1e-8 else 0.0

            result.append(
                {
                    "bucket":               bucket,
                    "weight_pct":           round(pw * 100, 4),
                    "return_pct":           round(pr * 100, 4),
                    "vol_pct":              round(vol_pct, 4),
                    "pe":                   round(pe, 2),
                    "allocation_effect":    round(alloc * 100, 4),
                    "selection_effect":     round(select * 100, 4),
                    "interaction_effect":   round(interact * 100, 4),
                }
            )

        result.sort(key=lambda x: x["weight_pct"], reverse=True)
        return result

    except Exception:
        logger.exception("compute_slicing failed (dimension=%s)", dimension)
        return []


# ---------------------------------------------------------------------------
# 15. compute_event_returns
# ---------------------------------------------------------------------------

def compute_event_returns(
    daily_returns: pd.Series,
    benchmark_returns: pd.Series,
) -> list[dict]:
    """Compound portfolio and benchmark returns over each predefined event window."""
    if daily_returns is None or daily_returns.empty:
        return []

    result = []
    for event in EVENTS:
        try:
            es = pd.Timestamp(event["start"])
            ee = pd.Timestamp(event["end"])

            port_slice = daily_returns.loc[es:ee].dropna()
            if port_slice.empty:
                continue

            port_r = float((1 + port_slice).prod() - 1) * 100

            bench_r: float | None = None
            if benchmark_returns is not None and not benchmark_returns.empty:
                bench_slice = benchmark_returns.loc[es:ee].dropna()
                if not bench_slice.empty:
                    bench_r = float((1 + bench_slice).prod() - 1) * 100

            excess = (port_r - bench_r) if bench_r is not None else None

            result.append(
                {
                    "name":                   event["name"],
                    "start":                  event["start"],
                    "end":                    event["end"],
                    "portfolio_return_pct":   round(port_r, 4),
                    "benchmark_return_pct":   round(bench_r, 4) if bench_r is not None else None,
                    "excess_pct":             round(excess, 4) if excess is not None else None,
                }
            )
        except Exception:
            logger.debug("Skipping event %s due to error", event["name"], exc_info=True)

    return result


# ---------------------------------------------------------------------------
# Valuation time series (bonus helper)
# ---------------------------------------------------------------------------

def _compute_valuation_ts(
    holdings_df: pd.DataFrame,
    prices_db: Session,
) -> list[dict]:
    """Weighted-average PE and PB across holdings at each date."""
    try:
        if holdings_df.empty:
            return []

        symbols = list(holdings_df.columns)
        stock_info = _get_sector_info(symbols, prices_db)

        # Static PE/PB (current fundamentals — no time-series in DB)
        pe_series = pd.Series({sym: stock_info[sym]["pe"] for sym in symbols})
        pb_series = pd.Series({sym: stock_info[sym]["pb"] for sym in symbols})

        result = []
        # Sample monthly to keep response small
        monthly_idx = holdings_df.resample("ME").last().index
        for ts in monthly_idx:
            if ts not in holdings_df.index:
                ts = holdings_df.index[holdings_df.index <= ts][-1] if any(holdings_df.index <= ts) else None
                if ts is None:
                    continue

            weights = holdings_df.loc[ts]
            total_w = weights.sum()
            if total_w < 1e-8:
                continue

            w_norm = weights / total_w
            port_pe = float((w_norm * pe_series).sum())
            port_pb = float((w_norm * pb_series).sum())

            result.append(
                {
                    "date":         ts.strftime("%Y-%m-%d"),
                    "portfolio_pe": round(port_pe, 2),
                    "portfolio_pb": round(port_pb, 2),
                }
            )

        return result

    except Exception:
        logger.exception("_compute_valuation_ts failed")
        return []


# ---------------------------------------------------------------------------
# 16. get_full_analytics — main entry point
# ---------------------------------------------------------------------------

def get_full_analytics(
    source: Literal["portfolio", "strategy"],
    source_id: int,
    backtest_id: int | None,
    db: Session,
    prices_db: Session,
    benchmark_name: str = "NIFTY 500",
) -> dict:
    """Compute and return the full analytics payload.

    This is the single public entry point for the analytics router.
    Every sub-computation is wrapped in try/except so a failure in one
    dimension does not prevent the others from being returned.
    """
    logger.info(
        "get_full_analytics: source=%s source_id=%d backtest_id=%s benchmark=%s",
        source,
        source_id,
        backtest_id,
        benchmark_name,
    )

    # ── Step 1: Build holdings DataFrame ────────────────────────────────────
    try:
        holdings_df, start_date, end_date = build_holdings_df(
            source, source_id, backtest_id, db, prices_db
        )
    except Exception:
        logger.exception("build_holdings_df failed — cannot proceed")
        return {
            "source":    source,
            "source_id": source_id,
            "error":     "Failed to build holdings",
        }

    symbols = list(holdings_df.columns)

    # ── Step 2: Price matrix ─────────────────────────────────────────────────
    try:
        price_matrix = build_price_matrix(symbols, start_date, end_date, prices_db)
    except Exception:
        logger.exception("build_price_matrix failed")
        price_matrix = pd.DataFrame()

    # ── Step 3: Daily returns ────────────────────────────────────────────────
    try:
        daily_returns = compute_daily_returns(holdings_df, price_matrix)
    except Exception:
        logger.exception("compute_daily_returns failed")
        daily_returns = pd.Series(dtype=float)

    # ── Step 4: Benchmark returns ────────────────────────────────────────────
    try:
        benchmark_returns = compute_benchmark_returns(
            benchmark_name, start_date, end_date, prices_db
        )
    except Exception:
        logger.exception("compute_benchmark_returns failed")
        benchmark_returns = pd.Series(dtype=float)

    # ── Step 5: Core PnL metrics ─────────────────────────────────────────────
    try:
        pnl_metrics = compute_pnl_metrics(daily_returns, benchmark_returns)
    except Exception:
        logger.exception("compute_pnl_metrics failed")
        pnl_metrics = {}

    # ── Step 6: Equity curve ─────────────────────────────────────────────────
    try:
        equity_curve = compute_equity_curve(daily_returns)
    except Exception:
        logger.exception("compute_equity_curve failed")
        equity_curve = []

    # ── Step 7: Rolling metrics ──────────────────────────────────────────────
    try:
        rolling_metrics = compute_rolling_metrics(daily_returns, benchmark_returns)
    except Exception:
        logger.exception("compute_rolling_metrics failed")
        rolling_metrics = []

    # ── Step 8: Drawdowns ────────────────────────────────────────────────────
    try:
        drawdowns = compute_drawdowns(daily_returns)
    except Exception:
        logger.exception("compute_drawdowns failed")
        drawdowns = []

    # ── Step 9: Factor decomposition time series ─────────────────────────────
    try:
        factor_decomp_ts = compute_factor_decomp_ts(holdings_df, prices_db)
    except Exception:
        logger.exception("compute_factor_decomp_ts failed")
        factor_decomp_ts = []

    # ── Step 10: Period stats ────────────────────────────────────────────────
    try:
        period_stats_monthly = compute_period_stats(
            daily_returns, factor_decomp_ts, granularity="monthly"
        )
    except Exception:
        logger.exception("compute_period_stats monthly failed")
        period_stats_monthly = []

    try:
        period_stats_quarterly = compute_period_stats(
            daily_returns, factor_decomp_ts, granularity="quarterly"
        )
    except Exception:
        logger.exception("compute_period_stats quarterly failed")
        period_stats_quarterly = []

    try:
        period_stats_annual = compute_period_stats(
            daily_returns, factor_decomp_ts, granularity="annual"
        )
    except Exception:
        logger.exception("compute_period_stats annual failed")
        period_stats_annual = []

    # ── Step 11: Holdings detail ─────────────────────────────────────────────
    try:
        holdings_detail = compute_holdings_detail(
            holdings_df, price_matrix, prices_db
        )
    except Exception:
        logger.exception("compute_holdings_detail failed")
        holdings_detail = []

    # ── Step 12: Factor detail ───────────────────────────────────────────────
    try:
        factor_detail = compute_factor_detail(holdings_df, prices_db)
    except Exception:
        logger.exception("compute_factor_detail failed")
        factor_detail = []

    # ── Step 13: Brinson attribution ─────────────────────────────────────────
    try:
        brinson = compute_brinson(holdings_df, price_matrix, prices_db, benchmark_name)
    except Exception:
        logger.exception("compute_brinson failed")
        brinson = {}

    # ── Step 14: Slicing ─────────────────────────────────────────────────────
    try:
        mcap_slicing = compute_slicing(
            holdings_df, price_matrix, prices_db, benchmark_name, dimension="market_cap"
        )
    except Exception:
        logger.exception("compute_slicing market_cap failed")
        mcap_slicing = []

    try:
        sector_slicing = compute_slicing(
            holdings_df, price_matrix, prices_db, benchmark_name, dimension="sector"
        )
    except Exception:
        logger.exception("compute_slicing sector failed")
        sector_slicing = []

    try:
        industry_slicing = compute_slicing(
            holdings_df, price_matrix, prices_db, benchmark_name, dimension="industry"
        )
    except Exception:
        logger.exception("compute_slicing industry failed")
        industry_slicing = []

    # ── Step 15: Event returns ───────────────────────────────────────────────
    try:
        event_returns = compute_event_returns(daily_returns, benchmark_returns)
    except Exception:
        logger.exception("compute_event_returns failed")
        event_returns = []

    # ── Valuation time series ────────────────────────────────────────────────
    try:
        valuation_ts = _compute_valuation_ts(holdings_df, prices_db)
    except Exception:
        logger.exception("_compute_valuation_ts failed")
        valuation_ts = []

    import math

    def _clean(obj):
        """Recursively replace nan/inf with None for JSON compliance."""
        if isinstance(obj, dict):
            return {k: _clean(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [_clean(v) for v in obj]
        if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
            return None
        return obj

    result = {
        "source":                source,
        "source_id":             source_id,
        "start_date":            start_date.isoformat(),
        "end_date":              end_date.isoformat(),
        "benchmark":             benchmark_name,
        "pnl_metrics":           pnl_metrics,
        "equity_curve":          equity_curve,
        "rolling_metrics":       rolling_metrics,
        "drawdowns":             drawdowns,
        "factor_decomp_ts":      factor_decomp_ts,
        "period_stats_monthly":  period_stats_monthly,
        "period_stats_quarterly": period_stats_quarterly,
        "period_stats_annual":   period_stats_annual,
        "holdings_detail":       holdings_detail,
        "factor_detail":         factor_detail,
        "brinson":               brinson,
        "mcap_slicing":          mcap_slicing,
        "sector_slicing":        sector_slicing,
        "industry_slicing":      industry_slicing,
        "event_returns":         event_returns,
        "valuation_ts":          valuation_ts,
    }
    return _clean(result)
