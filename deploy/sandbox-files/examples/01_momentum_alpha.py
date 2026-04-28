"""Momentum Alpha — compute 6-month momentum scores for all stocks."""
import sys
sys.path.insert(0, '/home/galedge-coder/workspace')
from galedge import get_prices, get_stock_info
import pandas as pd
import numpy as np

# Get prices for all stocks
prices = get_prices([
    'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
    'SBIN.NS', 'LT.NS', 'BHARTIARTL.NS', 'ITC.NS', 'MARUTI.NS',
    'COALINDIA.NS', 'NTPC.NS', 'ONGC.NS', 'TATASTEEL.NS', 'HINDALCO.NS',
])

# Compute 6-month momentum
momentum = prices.pct_change(126).iloc[-1].sort_values(ascending=False)

print('=== 6-Month Momentum Scores ===')
print()
for sym, ret in momentum.items():
    direction = '▲' if ret > 0 else '▼'
    print(f'  {direction} {sym:20s} {ret*100:>8.2f}%')

print(f'\nTop 3: {list(momentum.head(3).index)}')
print(f'Bottom 3: {list(momentum.tail(3).index)}')
