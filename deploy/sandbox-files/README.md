# Galedge Alpha Research Workspace

Write Python code here to build custom alpha factors, analyze stocks, and test strategies.

## Quick Start

```python
from galedge import get_prices, get_holdings, get_factors

# Get stock prices
prices = get_prices(['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS'])

# Get your portfolio holdings
holdings = get_holdings()

# Get factor exposures
factors = get_factors('INEC1')
```

## Available Libraries
pandas, numpy, scipy, matplotlib, seaborn, sklearn, statsmodels, yfinance

## Install more
Open Terminal (Ctrl+`) and run: pip install <package>
