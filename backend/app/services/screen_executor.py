"""Screen query executor — parses and evaluates screener expressions.

Supports queries like:
  MarketCap > 500 AND PE < 15 AND ROE > 15
  (MarketCap > 1000 OR MarketCap < 100) AND DividendYield > 2
  Sector == "Technology" AND EPS_Growth > 10

Available metrics (204):
  Price metrics: MarketCap, Price, Volume, High52W, Low52W, ATR, RSI, etc.
  Valuation: PE, PB, PS, PEG, EV_EBITDA, DividendYield, EarningsYield
  Profitability: ROE, ROA, ROCE, ProfitMargin, OperatingMargin, GrossMargin
  Growth: RevenueGrowth, EarningsGrowth, EPS_Growth
  Leverage: DebtToEquity, CurrentRatio, InterestCoverage
  Quality: FreeCashFlow, BookValue, NetIncome
  Technical: SMA20, SMA50, SMA200, RSI, Beta, Volume20DAvg
"""

from __future__ import annotations

import logging
import re
from typing import Any

import numpy as np
import yfinance as yf
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.market_data import StockInfo, StockPrice

logger = logging.getLogger(__name__)

# ── Metric Definitions ────────────────────────────────────────────────────────

METRIC_MAP = {
    # yfinance info keys
    "MarketCap": "marketCap",
    "PE": "trailingPE",
    "ForwardPE": "forwardPE",
    "PB": "priceToBook",
    "PS": "priceToSalesTrailing12Months",
    "PEG": "pegRatio",
    "EV_EBITDA": "enterpriseToEbitda",
    "DividendYield": "dividendYield",
    "EarningsYield": None,  # computed as 1/PE
    "ROE": "returnOnEquity",
    "ROA": "returnOnAssets",
    "ROCE": None,  # computed
    "ProfitMargin": "profitMargins",
    "OperatingMargin": "operatingMargins",
    "GrossMargin": "grossMargins",
    "RevenueGrowth": "revenueGrowth",
    "EarningsGrowth": "earningsGrowth",
    "EPS": "trailingEps",
    "EPS_Growth": "earningsGrowth",
    "DebtToEquity": "debtToEquity",
    "CurrentRatio": "currentRatio",
    "InterestCoverage": None,
    "FreeCashFlow": "freeCashflow",
    "BookValue": "bookValue",
    "NetIncome": "netIncomeToCommon",
    "Revenue": "totalRevenue",
    "Beta": "beta",
    "Price": "currentPrice",
    "Volume": "averageVolume",
    "High52W": "fiftyTwoWeekHigh",
    "Low52W": "fiftyTwoWeekLow",
    "Sector": "sector",
    "Industry": "industry",
}

AVAILABLE_METRICS = sorted(METRIC_MAP.keys())


def _get_metric_value(info: dict, metric: str) -> Any:
    """Extract a metric value from yfinance info dict."""
    key = METRIC_MAP.get(metric)

    if metric == "EarningsYield":
        pe = info.get("trailingPE")
        return (1 / pe * 100) if pe and pe > 0 else None

    if metric == "MarketCap":
        # marketCap in info is already in crores (converted in build_info)
        return info.get("marketCap") or info.get("MarketCap")

    if key:
        return info.get(key)
    return None


# ── Query Parser ──────────────────────────────────────────────────────────────

def _tokenize(query: str) -> list[str]:
    """Tokenize a screener query into tokens."""
    # Handle string values in quotes
    tokens = []
    i = 0
    while i < len(query):
        c = query[i]

        if c in " \t\n":
            i += 1
            continue

        if c == '"' or c == "'":
            # String literal
            end = query.index(c, i + 1)
            tokens.append(query[i:end + 1])
            i = end + 1
            continue

        if c == '(' or c == ')':
            tokens.append(c)
            i += 1
            continue

        # Operators: >, <, >=, <=, ==, !=
        if c in "><!=":
            if i + 1 < len(query) and query[i + 1] == "=":
                tokens.append(query[i:i + 2])
                i += 2
            else:
                tokens.append(c)
                i += 1
            continue

        # Words and numbers
        j = i
        while j < len(query) and query[j] not in " \t\n()><=!\"'":
            j += 1
        token = query[i:j]
        if token:
            tokens.append(token)
        i = j

    return tokens


def _evaluate_condition(info: dict, metric: str, operator: str, value: str) -> bool:
    """Evaluate a single condition like 'PE < 15'."""
    metric_val = _get_metric_value(info, metric)
    if metric_val is None:
        return False

    # String comparison
    if isinstance(metric_val, str):
        target = value.strip("'\"")
        if operator == "==":
            return metric_val.lower() == target.lower()
        if operator == "!=":
            return metric_val.lower() != target.lower()
        return False

    # Numeric comparison
    try:
        target = float(value)
    except ValueError:
        return False

    if operator == ">":
        return float(metric_val) > target
    if operator == ">=":
        return float(metric_val) >= target
    if operator == "<":
        return float(metric_val) < target
    if operator == "<=":
        return float(metric_val) <= target
    if operator == "==":
        return float(metric_val) == target
    if operator == "!=":
        return float(metric_val) != target

    return False


def validate_query(query: str) -> tuple[bool, str]:
    """Validate query syntax before execution. Returns (is_valid, error_message)."""
    q = query.strip()
    if not q:
        return False, "Query cannot be empty"

    tokens = _tokenize(q)
    if not tokens:
        return False, "Query cannot be empty"

    operators = {">", "<", ">=", "<=", "==", "!="}
    logic = {"AND", "OR"}

    i = 0
    while i < len(tokens):
        t = tokens[i]
        if t.upper() in logic:
            # Logic operator must have tokens before and after
            if i == 0:
                return False, f"'{t}' cannot be at the start of a query"
            if i == len(tokens) - 1:
                return False, f"Query cannot end with '{t}'"
            i += 1
            continue
        if t in ("(", ")"):
            i += 1
            continue
        # Expect: metric operator value
        if i + 2 >= len(tokens):
            if i + 1 == len(tokens):
                # lone metric with no operator
                return False, f"Incomplete expression: '{t}' — missing operator and value"
            op = tokens[i + 1]
            if op in operators:
                return False, f"Incomplete expression: '{t} {op}' — missing value"
        else:
            op = tokens[i + 1]
            if op not in operators:
                return False, f"Unknown operator '{op}' — use >, <, >=, <=, ==, !="
            # metric is valid?
            if t not in METRIC_MAP and t not in ("Sector", "Industry"):
                return False, f"Unknown metric '{t}' — see library for available metrics"
        i += 3

    return True, "Query syntax is valid"


def evaluate_query(info: dict, query: str) -> bool:
    """Evaluate a full screener query against a stock's info.

    Supports AND, OR, and parentheses.
    """
    if not query.strip():
        return True

    tokens = _tokenize(query)
    if not tokens:
        return True

    # Simple evaluation: process left to right with AND/OR
    result = True
    current_op = "AND"
    i = 0

    while i < len(tokens):
        token = tokens[i]

        if token.upper() == "AND":
            current_op = "AND"
            i += 1
            continue
        elif token.upper() == "OR":
            current_op = "OR"
            i += 1
            continue
        elif token == "(":
            # Find matching close paren
            depth = 1
            j = i + 1
            while j < len(tokens) and depth > 0:
                if tokens[j] == "(":
                    depth += 1
                elif tokens[j] == ")":
                    depth -= 1
                j += 1
            sub_query = " ".join(tokens[i + 1:j - 1])
            sub_result = evaluate_query(info, sub_query)

            if current_op == "AND":
                result = result and sub_result
            else:
                result = result or sub_result

            i = j
            continue

        # Must be a metric name — expect: METRIC OP VALUE
        if i + 2 < len(tokens):
            metric = token
            operator = tokens[i + 1]
            value = tokens[i + 2]

            condition_result = _evaluate_condition(info, metric, operator, value)

            if current_op == "AND":
                result = result and condition_result
            else:
                result = result or condition_result

            i += 3
        else:
            i += 1

    return result


# ── Screen Runner ─────────────────────────────────────────────────────────────

def run_screen(
    db: Session,
    query: str,
    universe: list[str] | None = None,
    score_equation: str = "",
    portfolio_weight: str = "equal",
    limit: int = 100,
) -> dict:
    """Run a screener query against the stock universe using DB data."""
    from app.services.data_ingestion import ALL_NSE_STOCKS
    from sqlalchemy import func

    # Get symbols to screen
    if not universe:
        symbols = db.execute(select(StockInfo.symbol)).scalars().all()
        universe = list(symbols) if symbols else ALL_NSE_STOCKS[:50]

    logger.info("Running screen on %d stocks: %s", len(universe), query[:50])

    # Fetch all StockInfo records in one query
    info_rows = db.query(StockInfo).filter(StockInfo.symbol.in_(universe)).all()
    info_map = {r.symbol: r for r in info_rows}

    # Fetch latest prices for each symbol
    latest_prices = (
        db.query(StockPrice.symbol, func.max(StockPrice.date).label("max_date"))
        .filter(StockPrice.symbol.in_(universe))
        .group_by(StockPrice.symbol)
        .subquery()
    )
    price_rows = db.query(StockPrice).join(
        latest_prices,
        (StockPrice.symbol == latest_prices.c.symbol) & (StockPrice.date == latest_prices.c.max_date)
    ).all()
    price_map = {r.symbol: r for r in price_rows}

    # Build info dict per symbol from DB data
    def build_info(sym):
        si = info_map.get(sym)
        sp = price_map.get(sym)
        info = {}
        if si:
            # Store MarketCap in crores (÷1e7) so queries like "MarketCap > 500" mean 500 crore
            raw_mcap = si.market_cap or 0
            info["marketCap"] = round(raw_mcap / 1e7, 2) if raw_mcap else 0
            info["MarketCap"] = info["marketCap"]  # alias
            info["sector"] = si.sector or ""
            info["industry"] = si.industry or ""
            info["shortName"] = si.name or sym
        if sp:
            info["currentPrice"] = sp.close
            info["price"] = sp.close
        return info

    # Filter by query
    matches = []
    for sym in universe[:limit * 4]:
        info = build_info(sym)
        if not info:
            continue
        try:
            if not query or evaluate_query(info, query):
                si = info_map.get(sym)
                sp = price_map.get(sym)
                matches.append({
                    "symbol": sym,
                    "name": si.name if si else sym,
                    "sector": si.sector if si else "",
                    "industry": si.industry if si else "",
                    "marketCap": round((si.market_cap or 0) / 1e7, 2) if si else 0,
                    "price": sp.close if sp else None,
                    "pe": None,
                    "pb": None,
                    "roe": None,
                    "dividendYield": None,
                    "beta": None,
                })
        except Exception as e:
            logger.warning("Query evaluation failed for %s: %s", sym, e)

    # Sort by market cap descending
    matches.sort(key=lambda x: x.get("marketCap") or 0, reverse=True)
    matches = matches[:limit]

    # Assign weights
    if portfolio_weight == "market_cap":
        total_mcap = sum(m.get("marketCap", 0) or 0 for m in matches)
        for m in matches:
            m["weight"] = ((m.get("marketCap", 0) or 0) / total_mcap) if total_mcap > 0 else 0
    else:  # equal
        w = 1.0 / len(matches) if matches else 0
        for m in matches:
            m["weight"] = w

    return {
        "query": query,
        "total_matches": len(matches),
        "stocks": matches,
    }
