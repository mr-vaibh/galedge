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

        stats = [
            ("Users", [
                ("Total Users", users, "text-primary"),
                ("Active Users", active_users, "text-success"),
                ("Tracker Holdings", tracker, "text-info"),
                ("Portfolios", portfolios, "text-warning"),
            ]),
            ("Platform Activity", [
                ("Strategies", strategies, "text-danger"),
                ("In Production", prod_strats, "text-success"),
                ("Backtests Run", backtests, "text-secondary"),
                ("Screens Created", screens, "text-dark"),
            ]),
            ("Market Data", [
                ("Symbols", symbols, "text-primary"),
                ("Price Rows", f"{price_rows:,}", "text-success"),
                ("Stock Info Records", stock_info, "text-info"),
                ("Latest Price Date", str(latest_date) if latest_date else "N/A", "text-warning"),
            ]),
        ]

        cards_html = ""
        for section, items in stats:
            cards_html += f'<h6 class="text-muted text-uppercase small fw-semibold mt-4 mb-3" style="letter-spacing:.08em">{section}</h6>'
            cards_html += '<div class="row g-3 mb-2">'
            for label, value, color in items:
                cards_html += f'''<div class="col-6 col-md-3">
                  <div class="card border-0 shadow-sm rounded-3 p-3 text-center">
                    <div class="fw-bold {color}" style="font-size:2rem">{value}</div>
                    <div class="text-muted small mt-1">{label}</div>
                  </div></div>'''
            cards_html += '</div>'

        return HTMLResponse(f"""<!DOCTYPE html>
<html><head><title>Galedge Admin</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<style>
  body{{margin:0;font-family:system-ui,sans-serif;background:#f8f9fa;}}
  .sidebar{{width:240px;min-height:100vh;background:#fff;border-right:1px solid #dee2e6;padding:1rem;position:fixed;top:0;left:0;}}
  .sidebar a{{display:block;padding:.5rem .75rem;border-radius:.375rem;color:#495057;text-decoration:none;margin-bottom:.25rem;}}
  .sidebar a:hover{{background:#e9ecef;}}
  .sidebar .brand{{font-weight:700;font-size:1.1rem;padding:.5rem .75rem 1rem;color:#212529;}}
  .main{{margin-left:240px;padding:2rem;}}
</style></head>
<body>
<div class="sidebar">
  <div class="brand"><i class="fa-solid fa-gauge me-2 text-primary"></i>Galedge Admin</div>
  <a href="/admin/dashboard"><i class="fa-solid fa-gauge me-2"></i>Dashboard</a>
  <a href="/admin/user/list"><i class="fa-solid fa-users me-2"></i>Users</a>
  <a href="/admin/portfolio/list"><i class="fa-solid fa-briefcase me-2"></i>Portfolios</a>
  <a href="/admin/trackerholding/list"><i class="fa-solid fa-chart-line me-2"></i>Tracker Holdings</a>
  <a href="/admin/strategy/list"><i class="fa-solid fa-chess me-2"></i>Strategies</a>
  <a href="/admin/backtest/list"><i class="fa-solid fa-flask me-2"></i>Backtests</a>
  <a href="/admin/screen/list"><i class="fa-solid fa-filter me-2"></i>Screens</a>
  <hr>
  <a href="/admin/logout" class="text-danger"><i class="fa-solid fa-right-from-bracket me-2"></i>Logout</a>
</div>
<div class="main">{cards_html}</div>
</body></html>""")


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
