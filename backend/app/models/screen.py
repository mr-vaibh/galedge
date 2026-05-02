"""Screen/Factor and Alpha Model definitions."""

from datetime import datetime, date

from sqlalchemy import String, Float, Date, DateTime, ForeignKey, Text, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Screen(Base):
    """User-created stock screener/factor."""
    __tablename__ = "screens"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    parent_universe: Mapped[str] = mapped_column(String(100), default="")
    sector: Mapped[str] = mapped_column(String(100), default="")
    industry: Mapped[str] = mapped_column(String(100), default="")
    portfolio_weight: Mapped[str] = mapped_column(String(50), default="Market Cap Weight")
    screener_query: Mapped[str] = mapped_column(Text, default="")  # e.g., "MarketCap > 500 AND PE < 15"
    score_equation: Mapped[str] = mapped_column(Text, default="")
    score_variable: Mapped[str] = mapped_column(String(100), default="")
    results: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # cached screen results
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    def __str__(self):
        return self.name

    user = relationship("User", back_populates="screens")


class AlphaModel(Base):
    """User or platform alpha model."""
    __tablename__ = "alpha_models"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)  # null = platform alpha
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    model_type: Mapped[str] = mapped_column(String(50), default="user")  # user, platform
    input_factors: Mapped[dict] = mapped_column(JSON, default=list)  # list of factor names
    control_factors: Mapped[dict] = mapped_column(JSON, default=list)
    return_type: Mapped[str] = mapped_column(String(50), default="Total")
    regression_weight: Mapped[str] = mapped_column(String(50), default="Market Cap")
    universe: Mapped[str] = mapped_column(String(100), default="")
    half_life: Mapped[int | None] = mapped_column(nullable=True)
    estimation_frequency: Mapped[str] = mapped_column(String(50), default="Quarterly")
    min_observations: Mapped[int | None] = mapped_column(nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="draft")  # draft, computing, available
    results: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    def __str__(self):
        return f"{self.name} ({self.model_type})"

    user = relationship("User", back_populates="alpha_models")


class CodeFile(Base):
    """User-saved code file from the Python editor."""
    __tablename__ = "code_files"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    code: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
