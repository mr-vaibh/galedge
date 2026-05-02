"""Portfolio and holdings models."""

from datetime import datetime, date

from sqlalchemy import String, Float, Integer, Date, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Portfolio(Base):
    __tablename__ = "portfolios"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    fund_name: Mapped[str] = mapped_column(String(255))
    scheme_name: Mapped[str] = mapped_column(String(255), default="")
    benchmark: Mapped[str] = mapped_column(String(100), default="NIFTY 500")
    iteration: Mapped[str] = mapped_column(String(50), default="1.0")
    portfolio_type: Mapped[str] = mapped_column(String(50), default="uploaded")  # uploaded, backtested, production
    initial_aum: Mapped[float] = mapped_column(Float, default=500.0)  # in crores
    enable_transaction_cost: Mapped[bool] = mapped_column(default=False)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    analytics_status: Mapped[str] = mapped_column(String(50), default="NOT AVAILABLE")
    lite_analytics_status: Mapped[str] = mapped_column(String(50), default="NOT AVAILABLE")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="portfolios")
    holdings = relationship("PortfolioHolding", back_populates="portfolio", cascade="all, delete-orphan")


class PortfolioHolding(Base):
    __tablename__ = "portfolio_holdings"

    id: Mapped[int] = mapped_column(primary_key=True)
    portfolio_id: Mapped[int] = mapped_column(ForeignKey("portfolios.id"), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    symbol: Mapped[str] = mapped_column(String(50), index=True)
    weight: Mapped[float] = mapped_column(Float, default=0.0)  # portfolio weight (0-1)
    semv: Mapped[float] = mapped_column(Float, default=0.0)  # Stock Equivalent Market Value (crores)
    quantity: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    portfolio = relationship("Portfolio", back_populates="holdings")


class TrackerHolding(Base):
    """Simple per-user portfolio tracker holding — buy price, shares, date."""
    __tablename__ = "tracker_holdings"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    client_id: Mapped[str] = mapped_column(String(64), index=True)  # UUID from client
    symbol: Mapped[str] = mapped_column(String(50), index=True)
    shares: Mapped[float] = mapped_column(Float)
    buy_price: Mapped[float] = mapped_column(Float)
    buy_date: Mapped[str] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user = relationship("User")
