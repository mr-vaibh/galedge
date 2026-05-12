import sys, os
sys.path.insert(0, '/opt/galedge/backend')
os.environ['DATABASE_URL'] = 'sqlite:////opt/galedge/backend/galedge_alpha.db'
os.environ['PRICES_DATABASE_URL'] = 'sqlite:////opt/galedge/backend/galedge_prices.db'

from app.database import PricesSessionLocal, init_db
from app.models.market_data import StockInfo
import pandas as pd

init_db()
db = PricesSessionLocal()

print('Loading fundamentals CSV...', flush=True)
df = pd.read_csv('/tmp/fundamentals_export.csv')
print(f'CSV: {len(df)} symbols', flush=True)

updated = 0
for _, r in df.iterrows():
    sym = r['symbol']
    si = db.query(StockInfo).filter(StockInfo.symbol == sym).first()
    if not si:
        si = StockInfo(symbol=sym)
        db.add(si)

    def v(col):
        val = r.get(col)
        return float(val) if pd.notna(val) and val is not None else None
    def s(col):
        val = r.get(col)
        return str(val) if pd.notna(val) and val is not None else ''

    if s('name'): si.name = s('name')
    if s('sector'): si.sector = s('sector')
    if s('industry'): si.industry = s('industry')
    if v('market_cap'): si.market_cap = v('market_cap')
    si.pe = v('pe'); si.forward_pe = v('forward_pe'); si.pb = v('pb')
    si.ps = v('ps'); si.peg = v('peg'); si.ev_ebitda = v('ev_ebitda')
    si.dividend_yield = v('dividend_yield'); si.roe = v('roe'); si.roa = v('roa')
    si.profit_margin = v('profit_margin'); si.operating_margin = v('operating_margin')
    si.gross_margin = v('gross_margin'); si.revenue_growth = v('revenue_growth')
    si.earnings_growth = v('earnings_growth'); si.eps = v('eps')
    si.debt_to_equity = v('debt_to_equity'); si.current_ratio = v('current_ratio')
    si.free_cash_flow = v('free_cash_flow'); si.book_value = v('book_value')
    si.beta = v('beta'); si.revenue = v('revenue'); si.net_income = v('net_income')
    si.high_52w = v('high_52w'); si.low_52w = v('low_52w')
    updated += 1

db.commit()
print(f'Done: {updated} symbols updated', flush=True)
db.close()
