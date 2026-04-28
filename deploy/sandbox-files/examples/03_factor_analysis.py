"""Factor Analysis — explore factor exposures and returns."""
import sys
sys.path.insert(0, '/home/galedge-coder/workspace')
from galedge import get_factors, get_factor_returns
import pandas as pd

# Get factor exposures
exposures = get_factors('INEC1')
if exposures.empty:
    print('No factor data. Build the risk model first.')
else:
    print('=== Factor Exposures (top 10 stocks) ===')
    print(exposures.head(10).round(2).to_string())
    print()
    
    # Average exposures
    print('=== Average Factor Exposures ===')
    avg = exposures.mean().sort_values(ascending=False)
    for factor, val in avg.items():
        bar = '█' * int(abs(val) * 5)
        sign = '+' if val > 0 else '-'
        print(f'  {factor:12s} {sign}{abs(val):.2f} {bar}')

# Factor returns
fret = get_factor_returns('INEC1')
if not fret.empty:
    print('\n=== Factor Return Summary ===')
    last = fret.iloc[-1]
    for factor in last.sort_values(ascending=False).index:
        ret = last[factor]
        print(f'  {factor:12s} Cum: {ret:.2f}%')
