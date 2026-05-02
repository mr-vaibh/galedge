"""Application configuration — loads from environment or defaults."""

import os
from pathlib import Path

# ── Database ──────────────────────────────────────────────────────────────────

# User data (users, portfolios, strategies) — never touched by import scripts
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "sqlite:///./galedge_alpha.db"
)

# Price data (OHLCV, stock info, index constituents) — safe to replace/reimport
PRICES_DATABASE_URL = os.environ.get(
    "PRICES_DATABASE_URL",
    "sqlite:///./galedge_prices.db"
)

# For async (if using asyncpg):
# postgresql+asyncpg://user:pass@localhost:5432/galedge_alpha
# For sync (psycopg2):
# postgresql://user:pass@localhost:5432/galedge_alpha

# ── Auth ──────────────────────────────────────────────────────────────────────

SECRET_KEY = os.environ.get("SECRET_KEY", "galedge-dev-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# ── Paths ─────────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR.parent / "data"
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

# ── CORS ──────────────────────────────────────────────────────────────────────

CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "https://galedge.byvaibhav.com",
]
