"""Galedge Admin Panel — powered by sqladmin.

Accessible at /admin. Protected by ADMIN_EMAIL + ADMIN_PASSWORD from .env.
Only the admin credentials work — regular user accounts cannot access this.
"""

import os
from sqladmin import Admin, ModelView, BaseView, expose
from sqladmin.authentication import AuthenticationBackend
from starlette.requests import Request
from starlette.responses import RedirectResponse, HTMLResponse

from app.database import engine, SessionLocal, PricesSessionLocal
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
    form_columns = ["email", "full_name", "organization", "hashed_password", "is_active", "is_admin", "portfolios", "strategies", "screens", "alpha_models"]
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
    form_columns = ["user", "fund_name", "scheme_name", "iteration", "benchmark", "portfolio_type",
                    "initial_aum", "enable_transaction_cost", "start_date", "end_date",
                    "analytics_status", "lite_analytics_status"]
    can_create = True
    page_size = 50


class TrackerHoldingAdmin(ModelView, model=TrackerHolding):
    name = "Tracker Holding"
    name_plural = "Tracker Holdings"
    icon = "fa-solid fa-chart-line"
    column_list = ["id", "user_id", "symbol", "shares", "buy_price", "buy_date", "created_at"]
    column_searchable_list = ["symbol"]
    column_sortable_list = ["id", "user_id", "symbol", "buy_date"]
    form_columns = ["user", "client_id", "symbol", "shares", "buy_price", "buy_date"]
    can_create = True
    page_size = 100


class StrategyAdmin(ModelView, model=Strategy):
    name = "Strategy"
    name_plural = "Strategies"
    icon = "fa-solid fa-chess"
    column_list = ["id", "user_id", "fund_name", "status", "universe", "benchmark", "created_at"]
    column_searchable_list = ["fund_name"]
    column_sortable_list = ["id", "created_at", "status"]
    form_columns = ["user", "fund_name", "scheme_name", "iteration_name", "universe", "benchmark",
                    "include_futures", "status", "is_production", "rebalance_status", "analytics_status"]
    can_create = True
    page_size = 50


class BacktestAdmin(ModelView, model=Backtest):
    name = "Backtest"
    name_plural = "Backtests"
    icon = "fa-solid fa-flask"
    column_list = ["id", "strategy_id", "status", "start_date", "end_date", "created_at"]
    column_sortable_list = ["id", "created_at", "status"]
    form_columns = ["strategy", "start_date", "end_date", "rebalance_frequency", "status"]
    can_create = True
    page_size = 50


class ScreenAdmin(ModelView, model=Screen):
    name = "Screen"
    name_plural = "Screens"
    icon = "fa-solid fa-filter"
    column_list = ["id", "user_id", "name", "created_at"]
    column_searchable_list = ["name"]
    form_columns = ["user", "name", "description", "parent_universe", "sector", "industry",
                    "portfolio_weight", "screener_query", "score_equation", "score_variable"]
    can_create = True
    page_size = 50



# ── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardView(BaseView):
    name = "Dashboard"
    icon = "fa-solid fa-gauge"

    @expose("/dashboard", methods=["GET"])
    async def dashboard(self, request: Request):
        if not request.session.get("admin"):
            return RedirectResponse("/admin/login", status_code=302)

        from app.models.portfolio import Portfolio, TrackerHolding
        from app.models.strategy import Strategy, Backtest
        from app.models.screen import Screen
        from app.models.market_data import StockPrice, StockInfo
        from sqlalchemy import func

        db = SessionLocal()
        pdb = PricesSessionLocal()
        try:
            users        = db.query(func.count(User.id)).scalar() or 0
            portfolios   = db.query(func.count(Portfolio.id)).scalar() or 0
            strategies   = db.query(func.count(Strategy.id)).scalar() or 0
            backtests    = db.query(func.count(Backtest.id)).scalar() or 0
            screens      = db.query(func.count(Screen.id)).scalar() or 0
            tracker      = db.query(func.count(TrackerHolding.id)).scalar() or 0
            active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
            prod_strats  = db.query(func.count(Strategy.id)).filter(Strategy.status == "production").scalar() or 0
            price_rows   = pdb.query(func.count(StockPrice.id)).scalar() or 0
            symbols      = pdb.query(func.count(func.distinct(StockPrice.symbol))).scalar() or 0
            latest_date  = pdb.query(func.max(StockPrice.date)).scalar()
            stock_info   = pdb.query(func.count(StockInfo.id)).scalar() or 0
        finally:
            db.close()
            pdb.close()

        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Galedge Admin Dashboard</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
            <style>
                body {{ background: #f8f9fa; font-family: system-ui, sans-serif; }}
                .stat-card {{ border-radius: 12px; border: none; box-shadow: 0 2px 8px rgba(0,0,0,.08); }}
                .stat-number {{ font-size: 2.5rem; font-weight: 700; }}
                .section-title {{ font-size: .7rem; text-transform: uppercase; letter-spacing: .1em; color: #6c757d; font-weight: 600; }}
                a.back {{ text-decoration: none; color: #0d6efd; font-size: .9rem; }}
            </style>
        </head>
        <body class="p-4">
            <div class="d-flex align-items-center gap-3 mb-4">
                <a href="/admin" class="back"><i class="fa fa-arrow-left"></i> Back to Admin</a>
                <h4 class="mb-0 ms-2"><i class="fa-solid fa-gauge me-2 text-primary"></i>Galedge Dashboard</h4>
            </div>

            <p class="section-title mb-3">Users</p>
            <div class="row g-3 mb-4">
                <div class="col-6 col-md-3"><div class="card stat-card p-3 text-center">
                    <div class="stat-number text-primary">{users}</div><div class="text-muted small">Total Users</div>
                </div></div>
                <div class="col-6 col-md-3"><div class="card stat-card p-3 text-center">
                    <div class="stat-number text-success">{active_users}</div><div class="text-muted small">Active Users</div>
                </div></div>
                <div class="col-6 col-md-3"><div class="card stat-card p-3 text-center">
                    <div class="stat-number text-info">{tracker}</div><div class="text-muted small">Tracker Holdings</div>
                </div></div>
                <div class="col-6 col-md-3"><div class="card stat-card p-3 text-center">
                    <div class="stat-number text-warning">{portfolios}</div><div class="text-muted small">Portfolios</div>
                </div></div>
            </div>

            <p class="section-title mb-3">Platform Activity</p>
            <div class="row g-3 mb-4">
                <div class="col-6 col-md-3"><div class="card stat-card p-3 text-center">
                    <div class="stat-number text-danger">{strategies}</div><div class="text-muted small">Strategies</div>
                </div></div>
                <div class="col-6 col-md-3"><div class="card stat-card p-3 text-center">
                    <div class="stat-number text-success">{prod_strats}</div><div class="text-muted small">In Production</div>
                </div></div>
                <div class="col-6 col-md-3"><div class="card stat-card p-3 text-center">
                    <div class="stat-number text-secondary">{backtests}</div><div class="text-muted small">Backtests Run</div>
                </div></div>
                <div class="col-6 col-md-3"><div class="card stat-card p-3 text-center">
                    <div class="stat-number text-dark">{screens}</div><div class="text-muted small">Screens Created</div>
                </div></div>
            </div>

            <p class="section-title mb-3">Market Data</p>
            <div class="row g-3">
                <div class="col-6 col-md-3"><div class="card stat-card p-3 text-center">
                    <div class="stat-number text-primary">{symbols}</div><div class="text-muted small">Symbols</div>
                </div></div>
                <div class="col-6 col-md-3"><div class="card stat-card p-3 text-center">
                    <div class="stat-number text-success" style="font-size:1.8rem">{price_rows:,}</div><div class="text-muted small">Price Rows</div>
                </div></div>
                <div class="col-6 col-md-3"><div class="card stat-card p-3 text-center">
                    <div class="stat-number text-info" style="font-size:1.8rem">{stock_info}</div><div class="text-muted small">Stock Info Records</div>
                </div></div>
                <div class="col-6 col-md-3"><div class="card stat-card p-3 text-center">
                    <div class="stat-number text-warning" style="font-size:1.5rem">{str(latest_date) if latest_date else "N/A"}</div><div class="text-muted small">Latest Price Date</div>
                </div></div>
            </div>
        </body>
        </html>
        """
        return HTMLResponse(html)


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

    admin.add_view(DashboardView)
    admin.add_view(UserAdmin)
    admin.add_view(PortfolioAdmin)
    admin.add_view(TrackerHoldingAdmin)
    admin.add_view(StrategyAdmin)
    admin.add_view(BacktestAdmin)
    admin.add_view(ScreenAdmin)

    return admin
