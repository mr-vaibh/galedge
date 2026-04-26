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


class IndexConstituent(Base):
    """Index membership over time (point-in-time)."""
    __tablename__ = "index_constituents"

    id: Mapped[int] = mapped_column(primary_key=True)
    index_name: Mapped[str] = mapped_column(String(100), index=True)  # NIFTY 50, NIFTY 500, etc.
    symbol: Mapped[str] = mapped_column(String(50), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)  # effective date
    weight: Mapped[float] = mapped_column(Float, default=0.0)  # index weight
