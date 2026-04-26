"""Factor risk model — factors, exposures, returns, covariance."""

from datetime import datetime, date

from sqlalchemy import String, Float, Date, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class FactorModel(Base):
    """A risk model universe (e.g., INEC1, INEC2)."""
    __tablename__ = "factor_models"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)  # INEC1
    description: Mapped[str] = mapped_column(Text, default="")
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    factors = relationship("Factor", back_populates="model")


class Factor(Base):
    """Individual risk factor (e.g., MARKET, BETA, SIZE, EARNYILD, AUTOCOMP)."""
    __tablename__ = "factors"

    id: Mapped[int] = mapped_column(primary_key=True)
    model_id: Mapped[int] = mapped_column(ForeignKey("factor_models.id"), index=True)
    name: Mapped[str] = mapped_column(String(50), index=True)  # BETA, SIZE, LTMOM, AUTOCOMP
    factor_type: Mapped[str] = mapped_column(String(50))  # Market, Style, Industry
    description: Mapped[str] = mapped_column(Text, default="")

    model = relationship("FactorModel", back_populates="factors")
    returns = relationship("FactorReturn", back_populates="factor")


class FactorReturn(Base):
    """Daily factor returns time series."""
    __tablename__ = "factor_returns"

    id: Mapped[int] = mapped_column(primary_key=True)
    factor_id: Mapped[int] = mapped_column(ForeignKey("factors.id"), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    daily_return: Mapped[float] = mapped_column(Float)
    cumulative_return: Mapped[float] = mapped_column(Float, default=0.0)

    factor = relationship("Factor", back_populates="returns")


class FactorExposure(Base):
    """Per-stock factor exposure on a given date."""
    __tablename__ = "factor_exposures"

    id: Mapped[int] = mapped_column(primary_key=True)
    factor_id: Mapped[int] = mapped_column(ForeignKey("factors.id"), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    symbol: Mapped[str] = mapped_column(String(50), index=True)
    exposure: Mapped[float] = mapped_column(Float)
    # Composite index on (factor_id, date, symbol) for fast lookups
