import sys, os, json
sys.path.insert(0, '/opt/galedge/backend')
os.environ['PRICES_DATABASE_URL'] = 'sqlite:////opt/galedge/backend/galedge_prices.db'

from app.database import PricesSessionLocal, init_db
from app.models.market_data import StockNews, StockRecommendation
from datetime import date

init_db()
db = PricesSessionLocal()

with open('/tmp/intel_export.json') as f:
    data = json.load(f)

today = data.get("date", str(date.today()))

# Clear today's data to avoid duplication on re-runs
db.query(StockNews).filter(StockNews.fetched_at == today).delete()
db.query(StockRecommendation).filter(StockRecommendation.fetched_at == today).delete()
db.commit()

news_rows = [StockNews(**item) for item in data.get("news", [])]
rec_rows = [StockRecommendation(**item) for item in data.get("recommendations", [])]

if news_rows:
    db.bulk_save_objects(news_rows)
if rec_rows:
    db.bulk_save_objects(rec_rows)
db.commit()

total_news = db.query(StockNews).count()
total_rec = db.query(StockRecommendation).count()
print(f"Imported: {len(news_rows)} news, {len(rec_rows)} recommendations")
print(f"DB totals: {total_news} news rows, {total_rec} recommendation rows")
db.close()
