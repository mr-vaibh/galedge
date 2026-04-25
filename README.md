# Galedge -- Free Stock Market Data Platform

Free, open-source stock market data platform with real-time prices, interactive charts, options chains, fundamentals, insider trades, analyst ratings, and more. Supports US (170+ stocks) and Indian (NSE/BSE, 50+ stocks) markets. Built with Next.js, FastAPI, and yfinance.

## Features

- **Real-time stock quotes and OHLCV data** -- live prices with automatic polling, historical candlestick data at multiple intervals (1m to monthly)
- **Interactive candlestick charts with technical indicators** -- RSI, MACD, Bollinger Bands, SMA, EMA overlaid on lightweight-charts
- **Stock comparison** -- overlay normalized performance charts and view side-by-side fundamentals for multiple tickers
- **Stock screener** -- filter stocks by sector, P/E ratio, dividend yield, market cap, and more
- **Market heatmap** -- finviz-style treemap visualization sized by market cap, colored by daily change
- **Correlation matrix** -- Pearson correlation of daily returns across selected stocks
- **Portfolio tracker** -- track holdings with live P&L calculations (localStorage-based, no signup required)
- **Options chain viewer** -- calls and puts with implied volatility, open interest, and Greeks
- **Fundamentals** -- key stats, income statements, balance sheets, and cash flow (annual and quarterly)
- **Market intelligence** -- insider trades, institutional holders, analyst recommendations, and news
- **CSV export** -- export data from any table view
- **Indian stock support** -- NSE and BSE listed stocks with .NS and .BO suffixes
- **CLI tool** -- data pipeline for fetching, storing, and viewing market data as compressed Parquet files

## Screenshots

Screenshots coming soon.

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, lightweight-charts
- **Backend**: FastAPI, Python, yfinance, pandas, numpy
- **CLI**: Python, yfinance, pandas, pyarrow (compressed Parquet storage)
- **No database** -- all data fetched live from Yahoo Finance

## Project Structure

```
galedge/
  backend/           # FastAPI server -- REST API for market data
    main.py          # API routes and endpoints
    requirements.txt
  frontend/          # Next.js web application
    src/
    package.json
  packages/
    galedge-core/    # CLI tool and Python library
      galedge/       # Core modules (fetcher, storage, options, fundamentals, intel, live)
      tests/         # Test suite (80 tests)
      pyproject.toml
```

## Getting Started

```bash
# Clone
git clone https://github.com/yourusername/galedge.git
cd galedge

# Backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e packages/galedge-core
pip install -r backend/requirements.txt
cd backend && uvicorn main:app --port 8001 --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev

# Open http://localhost:3000
```

## CLI Usage

The `galedge` CLI lets you fetch and explore market data directly from the terminal:

```bash
# Fetch 6 months of daily data
galedge fetch AAPL MSFT RELIANCE.NS -i 1d -p 6mo

# View stored data as a colored table
galedge show AAPL -t -n 20

# Watch live prices (polls every 15 seconds)
galedge live AAPL MSFT GOOGL -s 15

# Options chain
galedge options AAPL -k puts

# Fundamentals (key stats, income statement, balance sheet, cash flow)
galedge fundamentals AAPL
galedge fundamentals AAPL -s balance_sheet

# Market intelligence (insider trades, analysts, news)
galedge intel AAPL
galedge intel AAPL -k news
```

See [packages/galedge-core/README.md](packages/galedge-core/README.md) for full CLI documentation.

## API Docs

When the backend is running, interactive Swagger documentation is available at:

http://localhost:8001/docs

## License

MIT License. See [LICENSE](LICENSE) for details.

## Disclaimer

This project is for educational and informational purposes only. It is not financial advice. Stock data is sourced from Yahoo Finance via yfinance and may be delayed or inaccurate. Use at your own risk.
