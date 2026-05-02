"""Strategy, constraints, objectives, and backtest models."""

from datetime import datetime, date

from sqlalchemy import String, Float, Integer, Date, DateTime, ForeignKey, Text, Boolean, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Strategy(Base):
    __tablename__ = "strategies"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    fund_name: Mapped[str] = mapped_column(String(255))
    scheme_name: Mapped[str] = mapped_column(String(255), default="")
    iteration_name: Mapped[str] = mapped_column(String(255), default="")
    universe: Mapped[str] = mapped_column(String(100), default="NIFTY 500")  # NIFTY, SENSEX, BSE 500, custom screen
    benchmark: Mapped[str] = mapped_column(String(100), default="NIFTY 500")
    include_futures: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(50), default="draft")  # draft, backtesting, completed, production
    rebalance_status: Mapped[str] = mapped_column(String(50), default="NOT AVAILABLE")
    analytics_status: Mapped[str] = mapped_column(String(50), default="NOT AVAILABLE")
    is_production: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    def __str__(self):
        return f"{self.fund_name} [{self.status}]"

    # Relationships
    user = relationship("User", back_populates="strategies")
    constraints = relationship("StrategyConstraint", back_populates="strategy", cascade="all, delete-orphan")
    objectives = relationship("StrategyObjective", back_populates="strategy", cascade="all, delete-orphan")
    backtests = relationship("Backtest", back_populates="strategy", cascade="all, delete-orphan")


class StrategyConstraint(Base):
    __tablename__ = "strategy_constraints"

    id: Mapped[int] = mapped_column(primary_key=True)
    strategy_id: Mapped[int] = mapped_column(ForeignKey("strategies.id"), index=True)
    constraint_type: Mapped[str] = mapped_column(String(100))  # maximum_capital, position_size_bound, etc.
    name: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    parameters: Mapped[dict] = mapped_column(JSON, default=dict)  # flexible JSON for constraint-specific params
    # e.g., {"max_capital": 1000000} or {"factor": "BETA", "lower_bound": -0.5, "upper_bound": 0.5}

    strategy = relationship("Strategy", back_populates="constraints")


class StrategyObjective(Base):
    __tablename__ = "strategy_objectives"

    id: Mapped[int] = mapped_column(primary_key=True)
    strategy_id: Mapped[int] = mapped_column(ForeignKey("strategies.id"), index=True)
    objective_type: Mapped[str] = mapped_column(String(100))  # risk_minimization, return_maximization, etc.
    name: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    parameters: Mapped[dict] = mapped_column(JSON, default=dict)  # {"risk_type": "total", "weight": 1.0}

    strategy = relationship("Strategy", back_populates="objectives")


class Backtest(Base):
    __tablename__ = "backtests"

    id: Mapped[int] = mapped_column(primary_key=True)
    strategy_id: Mapped[int] = mapped_column(ForeignKey("strategies.id"), index=True)
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    rebalance_frequency: Mapped[str] = mapped_column(String(50), default="Monthly")  # Monthly, Quarterly, Custom
    rebalance_dates: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # for custom dates
    stop_loss_config: Mapped[dict] = mapped_column(JSON, default=dict)
    chunking_config: Mapped[dict] = mapped_column(JSON, default=dict)  # {"max_chunks": 5, "min_per_chunk": 5, "burn_in": 2}
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending, running, completed, failed
    results: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # equity curve, trades, metrics
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    def __str__(self):
        return f"Backtest #{self.id} [{self.status}] {self.start_date}→{self.end_date}"

    strategy = relationship("Strategy", back_populates="backtests")
