import sys, os, json
sys.path.insert(0, '/opt/galedge/backend')
os.environ['PRICES_DATABASE_URL'] = 'sqlite:////opt/galedge/backend/galedge_prices.db'

from app.database import PricesSessionLocal, init_db
from app.models.market_data import StockNews, StockRecommendation, StockFinancials, StockOptions
from datetime import date, datetime

init_db()
db = PricesSessionLocal()

with open('/tmp/intel_export.json') as f:
    data = json.load(f)

today_str = data.get("date", str(date.today()))
today = datetime.strptime(today_str, "%Y-%m-%d").date()

def fix_date(item):
    """Convert fetched_at string to date object."""
    d = item.copy()
    if isinstance(d.get("fetched_at"), str):
        d["fetched_at"] = datetime.strptime(d["fetched_at"], "%Y-%m-%d").date()
    return d

# Clear today's data to avoid duplication on re-runs
db.query(StockNews).filter(StockNews.fetched_at == today).delete()
db.query(StockRecommendation).filter(StockRecommendation.fetched_at == today).delete()
db.query(StockFinancials).filter(StockFinancials.fetched_at == today).delete()
db.query(StockOptions).filter(StockOptions.fetched_at == today).delete()
db.commit()

# News
news_rows = [StockNews(**fix_date(item)) for item in data.get("news", [])]
if news_rows:
    db.bulk_save_objects(news_rows)

# Recommendations
rec_rows = [StockRecommendation(**fix_date(item)) for item in data.get("recommendations", [])]
if rec_rows:
    db.bulk_save_objects(rec_rows)

# Financial statements
fin_rows = [StockFinancials(**fix_date(item)) for item in data.get("financials", [])]
if fin_rows:
    db.bulk_save_objects(fin_rows)

# Options
opt_rows = [StockOptions(**fix_date(item)) for item in data.get("options", [])]
if opt_rows:
    db.bulk_save_objects(opt_rows)

db.commit()
print(f"Imported: {len(news_rows)} news, {len(rec_rows)} recs, {len(fin_rows)} financial sheets, {len(opt_rows)} options")
db.close()
