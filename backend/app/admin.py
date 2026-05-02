"""Galedge Admin Panel — powered by sqladmin.

Accessible at /admin. Protected by ADMIN_EMAIL + ADMIN_PASSWORD from .env.
Only the admin credentials work — regular user accounts cannot access this.
"""

import os
from sqladmin import Admin, ModelView
from sqladmin.authentication import AuthenticationBackend
from starlette.requests import Request
from starlette.responses import RedirectResponse

from app.database import engine
from app.models.user import User
from app.models.portfolio import Portfolio, PortfolioHolding, TrackerHolding
from app.models.strategy import Strategy, Backtest
from app.models.screen import Screen, AlphaModel, CodeFile


ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@galedge.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "changeme")
ADMIN_SECRET = os.environ.get("ADMIN_SECRET_KEY", "galedge-admin-secret-2024")


# ── Auth ──────────────────────────────────────────────────────────────────────

class AdminAuth(AuthenticationBackend):
    async def login(self, request: Request) -> bool:
        form = await request.form()
        if form.get("username") == ADMIN_EMAIL and form.get("password") == ADMIN_PASSWORD:
            request.session.update({"admin": True})
            return True
        return False

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        return request.session.get("admin", False)


# ── Model Views ───────────────────────────────────────────────────────────────

class UserAdmin(ModelView, model=User):
    name = "User"
    name_plural = "Users"
    icon = "fa-solid fa-users"
    column_list = ["id", "email", "full_name", "is_active", "is_admin", "created_at"]
    column_searchable_list = ["email", "full_name"]
    column_sortable_list = ["id", "email", "created_at"]
    form_columns = ["email", "full_name", "organization", "hashed_password", "is_active", "is_admin"]
    can_create = True
    can_delete = True
    can_edit = True
    page_size = 50


class PortfolioAdmin(ModelView, model=Portfolio):
    name = "Portfolio"
    name_plural = "Portfolios"
    icon = "fa-solid fa-briefcase"
    column_list = ["id", "user_id", "fund_name", "scheme_name", "portfolio_type", "benchmark", "created_at"]
    column_searchable_list = ["fund_name", "scheme_name"]
    column_sortable_list = ["id", "created_at", "portfolio_type"]
    form_columns = ["user", "fund_name", "scheme_name", "benchmark", "portfolio_type", "initial_aum"]
    can_create = True
    page_size = 50


class TrackerHoldingAdmin(ModelView, model=TrackerHolding):
    name = "Tracker Holding"
    name_plural = "Tracker Holdings"
    icon = "fa-solid fa-chart-line"
    column_list = ["id", "user_id", "symbol", "shares", "buy_price", "buy_date", "created_at"]
    column_searchable_list = ["symbol"]
    column_sortable_list = ["id", "user_id", "symbol", "buy_date"]
    can_create = True
    page_size = 100


class StrategyAdmin(ModelView, model=Strategy):
    name = "Strategy"
    name_plural = "Strategies"
    icon = "fa-solid fa-chess"
    column_list = ["id", "user_id", "fund_name", "status", "universe", "benchmark", "created_at"]
    column_searchable_list = ["fund_name"]
    column_sortable_list = ["id", "created_at", "status"]
    form_columns = ["user", "fund_name", "scheme_name", "universe", "benchmark", "status"]
    can_create = True
    page_size = 50


class BacktestAdmin(ModelView, model=Backtest):
    name = "Backtest"
    name_plural = "Backtests"
    icon = "fa-solid fa-flask"
    column_list = ["id", "strategy_id", "status", "start_date", "end_date", "created_at"]
    column_sortable_list = ["id", "created_at", "status"]
    can_create = True
    page_size = 50


class ScreenAdmin(ModelView, model=Screen):
    name = "Screen"
    name_plural = "Screens"
    icon = "fa-solid fa-filter"
    column_list = ["id", "user_id", "name", "created_at"]
    column_searchable_list = ["name"]
    form_columns = ["user", "name"]
    can_create = True
    page_size = 50



# ── Factory ───────────────────────────────────────────────────────────────────

def create_admin(app) -> Admin:
    authentication_backend = AdminAuth(secret_key=ADMIN_SECRET)
    admin = Admin(
        app,
        engine,
        title="Galedge Admin",
        authentication_backend=authentication_backend,
        base_url="/admin",
    )

    admin.add_view(UserAdmin)
    admin.add_view(PortfolioAdmin)
    admin.add_view(TrackerHoldingAdmin)
    admin.add_view(StrategyAdmin)
    admin.add_view(BacktestAdmin)
    admin.add_view(ScreenAdmin)

    return admin
