"""Galedge Alpha — FastAPI application with modular routers.

This is the new structured entry point. The legacy main.py is preserved
and mounted alongside the new routers.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.database import init_db
from app.routers import auth_router, portfolio_router, strategy_router, screen_router, data_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    init_db()
    yield


app = FastAPI(
    title="Galedge Alpha API",
    description="Institutional-grade systematic investment platform API",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── New structured routers ────────────────────────────────────────────────────

app.include_router(auth_router.router)
app.include_router(portfolio_router.router)
app.include_router(strategy_router.router)
app.include_router(screen_router.router)
app.include_router(data_router.router)

# ── Import legacy route functions directly ────────────────────────────────────
# Instead of mounting the old app, import the route handlers and re-register them

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from main import app as legacy_app  # noqa: E402

# Copy all API routes from legacy app (skip middleware/lifespan)
for route in legacy_app.routes:
    if hasattr(route, "path") and route.path.startswith("/api/"):
        # Check if this route already exists in new app
        existing_paths = {r.path for r in app.routes if hasattr(r, "path")}
        if route.path not in existing_paths:
            app.router.routes.append(route)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "2.0.0", "platform": "Galedge Alpha"}
