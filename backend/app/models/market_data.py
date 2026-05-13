"""Market data models — stock prices, info, index constituents."""

from datetime import date

from sqlalchemy import String, Float, Integer, Date, BigInteger, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class StockPrice(Base):
    """Daily OHLCV price data."""
    __tablename__ = "stock_prices"

    id: Mapped[int] = mapped_column(primary_key=True)
    symbol: Mapped[str] = mapped_column(String(50), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    open: Mapped[float] = mapped_column(Float)
    high: Mapped[float] = mapped_column(Float)
    low: Mapped[float] = mapped_column(Float)
    close: Mapped[float] = mapped_column(Float)
    adj_close: Mapped[float] = mapped_column(Float)
    volume: Mapped[int] = mapped_column(BigInteger)
    # Composite index on (symbol, date)


class StockInfo(Base):
    """Static stock information — updated periodically."""
    __tablename__ = "stock_info"

    id: Mapped[int] = mapped_column(primary_key=True)
    symbol: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    isin: Mapped[str] = mapped_column(String(20), default="")
    sector: Mapped[str] = mapped_column(String(100), default="")
    industry: Mapped[str] = mapped_column(String(100), default="")
    market_cap: Mapped[float] = mapped_column(Float, default=0.0)
    exchange: Mapped[str] = mapped_column(String(10), default="NSE")  # NSE, BSE
    listing_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    face_value: Mapped[float] = mapped_column(Float, default=10.0)

    # Fundamentals — updated via nightly ingestion
    pe: Mapped[float | None] = mapped_column(Float, nullable=True)
    forward_pe: Mapped[float | None] = mapped_column(Float, nullable=True)
    pb: Mapped[float | None] = mapped_column(Float, nullable=True)
    ps: Mapped[float | None] = mapped_column(Float, nullable=True)
    peg: Mapped[float | None] = mapped_column(Float, nullable=True)
    ev_ebitda: Mapped[float | None] = mapped_column(Float, nullable=True)
    dividend_yield: Mapped[float | None] = mapped_column(Float, nullable=True)
    roe: Mapped[float | None] = mapped_column(Float, nullable=True)
    roa: Mapped[float | None] = mapped_column(Float, nullable=True)
    profit_margin: Mapped[float | None] = mapped_column(Float, nullable=True)
    operating_margin: Mapped[float | None] = mapped_column(Float, nullable=True)
    gross_margin: Mapped[float | None] = mapped_column(Float, nullable=True)
    revenue_growth: Mapped[float | None] = mapped_column(Float, nullable=True)
    earnings_growth: Mapped[float | None] = mapped_column(Float, nullable=True)
    eps: Mapped[float | None] = mapped_column(Float, nullable=True)
    debt_to_equity: Mapped[float | None] = mapped_column(Float, nullable=True)
    current_ratio: Mapped[float | None] = mapped_column(Float, nullable=True)
    free_cash_flow: Mapped[float | None] = mapped_column(Float, nullable=True)
    book_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    beta: Mapped[float | None] = mapped_column(Float, nullable=True)
    revenue: Mapped[float | None] = mapped_column(Float, nullable=True)
    net_income: Mapped[float | None] = mapped_column(Float, nullable=True)
    high_52w: Mapped[float | None] = mapped_column(Float, nullable=True)
    low_52w: Mapped[float | None] = mapped_column(Float, nullable=True)


class StockNews(Base):
    """Latest news headlines per stock — populated by nightly GitHub Actions job."""
    __tablename__ = "stock_news"
    id: Mapped[int] = mapped_column(primary_key=True)
    symbol: Mapped[str] = mapped_column(String(50), index=True)
    fetched_at: Mapped[date] = mapped_column(Date, index=True)
    title: Mapped[str] = mapped_column(String(500), default="")
    publisher: Mapped[str] = mapped_column(String(100), default="")
    link: Mapped[str] = mapped_column(String(1000), default="")
    published_at: Mapped[str] = mapped_column(String(50), default="")


class StockRecommendation(Base):
    """Analyst recommendations per stock — populated by nightly GitHub Actions job."""
    __tablename__ = "stock_recommendations"
    id: Mapped[int] = mapped_column(primary_key=True)
    symbol: Mapped[str] = mapped_column(String(50), index=True)
    fetched_at: Mapped[date] = mapped_column(Date, index=True)
    period: Mapped[str] = mapped_column(String(20), default="")
    strong_buy: Mapped[int] = mapped_column(Integer, default=0)
    buy: Mapped[int] = mapped_column(Integer, default=0)
    hold: Mapped[int] = mapped_column(Integer, default=0)
    sell: Mapped[int] = mapped_column(Integer, default=0)
    strong_sell: Mapped[int] = mapped_column(Integer, default=0)


class StockFinancials(Base):
    """Annual + quarterly financial statements — populated nightly via GitHub Actions."""
    __tablename__ = "stock_financials"
    id: Mapped[int] = mapped_column(primary_key=True)
    symbol: Mapped[str] = mapped_column(String(50), index=True)
    sheet: Mapped[str] = mapped_column(String(50), index=True)  # income_statement, balance_sheet, cashflow, quarterly_*
    fetched_at: Mapped[date] = mapped_column(Date, index=True)
    data: Mapped[str] = mapped_column(Text, default="[]")  # JSON array of period rows


class StockOptions(Base):
    """Daily options snapshot (nearest expiry) — populated nightly via GitHub Actions."""
    __tablename__ = "stock_options"
    id: Mapped[int] = mapped_column(primary_key=True)
    symbol: Mapped[str] = mapped_column(String(50), index=True)
    fetched_at: Mapped[date] = mapped_column(Date, index=True)
    expiry: Mapped[str] = mapped_column(String(20), default="")
    expirations: Mapped[str] = mapped_column(Text, default="[]")  # JSON list
    calls: Mapped[str] = mapped_column(Text, default="[]")        # JSON array
    puts: Mapped[str] = mapped_column(Text, default="[]")         # JSON array


class IndexConstituent(Base):
    """Index membership over time (point-in-time)."""
    __tablename__ = "index_constituents"

    id: Mapped[int] = mapped_column(primary_key=True)
    index_name: Mapped[str] = mapped_column(String(100), index=True)  # NIFTY 50, NIFTY 500, etc.
    symbol: Mapped[str] = mapped_column(String(50), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)  # effective date
    weight: Mapped[float] = mapped_column(Float, default=0.0)  # index weight
