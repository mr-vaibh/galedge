"""Portfolio Analysis — analyze your uploaded portfolio."""
import sys
sys.path.insert(0, '/home/galedge-coder/workspace')
from galedge import get_holdings, get_prices, list_portfolios
import pandas as pd
import numpy as np

# List portfolios
portfolios = list_portfolios()
print('=== Your Portfolios ===')
print(portfolios.to_string(index=False))
print()

# Get first portfolio holdings
holdings = get_holdings()
if holdings.empty:
    print('No holdings found. Upload a portfolio first.')
else:
    print(f'=== Holdings ({len(holdings)} stocks) ===')
    for _, row in holdings.iterrows():
        print(f'  {row["symbol"]:15s}  Weight: {row["weight"]*100:.2f}%')
    
    # Concentration metrics
    top5_weight = holdings.head(5)['weight'].sum()
    hhi = (holdings['weight'] ** 2).sum()
    print(f'\nTop 5 concentration: {top5_weight*100:.1f}%')
    print(f'HHI (Herfindahl): {hhi:.4f} ({"Concentrated" if hhi > 0.1 else "Diversified"})')
