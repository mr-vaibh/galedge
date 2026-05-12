import sys, os
sys.path.insert(0, '/opt/galedge/backend')
os.environ['PRICES_DATABASE_URL'] = 'sqlite:////opt/galedge/backend/galedge_prices.db'

from app.database import PricesSessionLocal, prices_engine, Base, init_db
from app.models.market_data import StockPrice
from sqlalchemy import func
import pandas as pd
from datetime import date

init_db()
db = PricesSessionLocal()

print('Loading CSV...', flush=True)
df = pd.read_csv('/tmp/prices_export.csv')
df['date'] = pd.to_datetime(df['date']).dt.date
print(f'CSV: {len(df)} rows, {df["symbol"].nunique()} symbols', flush=True)

existing = set((r.symbol, r.date) for r in db.query(StockPrice.symbol, StockPrice.date).all())
print(f'Existing: {len(existing)} rows', flush=True)

BATCH = 5000
rows = []
skipped = 0
total = 0
for _, r in df.iterrows():
    if (r['symbol'], r['date']) in existing:
        skipped += 1
        continue
    rows.append(StockPrice(
        symbol=r['symbol'], date=r['date'],
        open=float(r['open']), high=float(r['high']),
        low=float(r['low']), close=float(r['close']),
        adj_close=float(r['adj_close']), volume=int(r['volume']),
    ))
    if len(rows) >= BATCH:
        db.bulk_save_objects(rows)
        db.commit()
        total += len(rows)
        print(f'Inserted {total} rows...', flush=True)
        rows = []

if rows:
    db.bulk_save_objects(rows)
    db.commit()
    total += len(rows)

count = db.query(func.count(StockPrice.id)).scalar()
syms = db.query(func.count(func.distinct(StockPrice.symbol))).scalar()
print(f'Done. Inserted: {total}, Skipped: {skipped}. Prices DB: {count} rows, {syms} symbols', flush=True)
db.close()
