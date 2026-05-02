"""Database engines and sessions.

Two separate databases:
- galedge_alpha.db  → user data (users, portfolios, strategies). Never overwritten by imports.
- galedge_prices.db → market data (prices, stock info, index constituents). Replaceable.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import DATABASE_URL, PRICES_DATABASE_URL


# ── User data engine ──────────────────────────────────────────────────────────

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False, "timeout": 10} if "sqlite" in DATABASE_URL else {},
    echo=False,
    pool_size=5,
    max_overflow=10,
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


# ── Price data engine ─────────────────────────────────────────────────────────

prices_engine = create_engine(
    PRICES_DATABASE_URL,
    connect_args={"check_same_thread": False, "timeout": 10} if "sqlite" in PRICES_DATABASE_URL else {},
    echo=False,
    pool_size=5,
    max_overflow=10,
)

PricesSessionLocal = sessionmaker(bind=prices_engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency — yields a user data session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_prices_db():
    """FastAPI dependency — yields a price data session."""
    db = PricesSessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables on both databases."""
    Base.metadata.create_all(bind=engine)
    Base.metadata.create_all(bind=prices_engine)
