# Galedge

Stock market data pipeline — fetch, store, and view market data from the terminal.

Fetches real-time and historical data for US and Indian (NSE/BSE) stocks, stores everything as compressed Parquet files in an organized directory structure.

## Installation

```bash
# Clone and set up
cd galedge
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

## Quick Start

```bash
# Fetch 6 months of daily data
galedge fetch AAPL MSFT RELIANCE.NS -i 1d -p 6mo

# View it as a colored table
galedge show AAPL -t -n 20

# Watch live prices
galedge live AAPL MSFT GOOGL -s 15

# Get fundamentals, options, news — everything
galedge fundamentals AAPL
galedge options AAPL
galedge intel AAPL
```

## Commands

### `galedge fetch` — Download OHLCV Data

Fetches historical price and volume data and stores as compressed Parquet files.

```bash
galedge fetch AAPL MSFT TCS.NS -i 1d -p 6mo
galedge fetch AAPL -i 5m -p 5d
galedge fetch RELIANCE.NS -i 1d --start 2024-01-01 --end 2024-12-31
```

| Flag | Description |
|------|-------------|
| `-i, --interval` | Candle interval: `1m`, `2m`, `5m`, `15m`, `30m`, `1h`, `1d`, `1wk`, `1mo` |
| `-p, --period` | Lookback: `1d`, `5d`, `1mo`, `3mo`, `6mo`, `1y`, `2y`, `5y`, `max` |
| `--start` | Start date `YYYY-MM-DD` (overrides `--period`) |
| `--end` | End date `YYYY-MM-DD` |
| `-o, --output` | Data directory (default: `./data`) |
| `-v, --verbose` | Verbose logging |

**Interval limits** (yfinance restriction):
- `1m`: max 7 days
- `2m`–`30m`: max 60 days
- `1h`: max 730 days
- `1d` and above: unlimited

### `galedge show` — View Stored Price Data

Displays OHLCV data as a color-coded terminal table. Green for price up, red for down.

```bash
galedge show AAPL                    # first 50 rows
galedge show AAPL -t -n 20           # last 20 rows
galedge show AAPL -y 2026 -m 3       # March 2026 only
galedge show AAPL -i 5m -t           # 5-minute data
```

| Flag | Description |
|------|-------------|
| `-i, --interval` | Which interval data to read (default: `1d`) |
| `-y, --year` | Filter by year |
| `-m, --month` | Filter by month (requires `-y`) |
| `-n, --rows` | Max rows to display (default: 50) |
| `-t, --tail` | Show most recent rows |

### `galedge live` — Real-Time Price Ticker

Polls live prices and displays a continuously updating terminal table.

```bash
galedge live AAPL MSFT GOOGL           # poll every 30s
galedge live AAPL TSLA -s 10           # poll every 10s
galedge live AAPL --save data/live     # save snapshots on Ctrl+C
```

| Flag | Description |
|------|-------------|
| `-s, --seconds` | Poll interval in seconds (default: 30) |
| `--save` | Save all snapshots as Parquet on exit |

### `galedge options` — Options Chain

Fetches and displays options data including strike, bid/ask, volume, open interest, implied volatility, and ITM status.

```bash
galedge options AAPL                      # nearest expiry, calls
galedge options AAPL -k puts              # puts instead
galedge options AAPL -e 2026-05-15        # specific expiry
galedge options AAPL --show-only          # only show stored data
```

| Flag | Description |
|------|-------------|
| `-e, --expiry` | Expiration date `YYYY-MM-DD` (default: nearest) |
| `-k, --kind` | `calls` or `puts` (default: `calls`) |
| `-n, --rows` | Max rows (default: 30) |
| `-t, --tail` | Show highest strikes |
| `--show-only` | Don't fetch, just display stored data |

### `galedge fundamentals` — Financial Data

Fetches key stats, income statements, balance sheets, and cash flow.

```bash
galedge fundamentals AAPL                          # key stats overview
galedge fundamentals AAPL -s financials            # income statement (annual)
galedge fundamentals AAPL -s quarterly_financials  # income statement (quarterly)
galedge fundamentals AAPL -s balance_sheet         # balance sheet
galedge fundamentals AAPL -s cashflow              # cash flow
galedge fundamentals AAPL --show-only              # only show stored data
```

| Sheet | Description |
|-------|-------------|
| `info` | Key stats: P/E, EPS, margins, market cap, beta, 52W range |
| `financials` | Annual income statement |
| `quarterly_financials` | Quarterly income statement |
| `balance_sheet` | Annual balance sheet |
| `quarterly_balance_sheet` | Quarterly balance sheet |
| `cashflow` | Annual cash flow |
| `quarterly_cashflow` | Quarterly cash flow |

### `galedge intel` — Market Intelligence

Fetches insider trades, institutional holders, analyst recommendations, and news.

```bash
galedge intel AAPL                              # everything
galedge intel AAPL -k news                      # just news
galedge intel AAPL -k insider_transactions      # insider trades
galedge intel AAPL -k institutional_holders     # top funds
galedge intel AAPL -k mutual_fund_holders       # top mutual funds
galedge intel AAPL -k recommendations           # analyst ratings
```

| Flag | Description |
|------|-------------|
| `-k, --kind` | `all`, `insider_transactions`, `institutional_holders`, `mutual_fund_holders`, `recommendations`, `news` |
| `-n, --rows` | Max rows per section (default: 15) |
| `--show-only` | Don't fetch, just display stored data |

## Indian Stock Support

Use `.NS` for NSE and `.BO` for BSE:

```bash
galedge fetch RELIANCE.NS TCS.NS HDFCBANK.NS INFY.NS -p 1y
galedge show RELIANCE.NS -t
galedge fundamentals TCS.NS
galedge intel HDFCBANK.NS -k news
galedge live RELIANCE.NS TCS.NS INFY.NS -s 15
```

Index symbols: `^NSEI` (Nifty 50), `^NSEBANK` (Bank Nifty).

## Data Storage

All data is stored as **snappy-compressed Parquet** files:

```
data/
  AAPL/
    2025/
      10/  AAPL_1d.parquet
      11/  AAPL_1d.parquet
      12/  AAPL_1d.parquet
    2026/
      01/  AAPL_1d.parquet
      ...
    options/
      2026/
        04/  calls_2026-04-27.parquet
             puts_2026-04-27.parquet
      expirations.parquet
    fundamentals/
      info.parquet
      financials.parquet
      balance_sheet.parquet
      cashflow.parquet
      quarterly_financials.parquet
      quarterly_balance_sheet.parquet
      quarterly_cashflow.parquet
    intel/
      insider_transactions.parquet
      institutional_holders.parquet
      mutual_fund_holders.parquet
      recommendations.parquet
      news.parquet
```

- OHLCV data is partitioned by `TICKER/YYYY/MM/`
- Re-fetching merges new rows and deduplicates automatically
- Parquet with snappy compression: ~7KB per month of daily data

## Python API

You can also use the modules directly:

```python
from galedge.fetcher import fetch, fetch_multiple
from galedge.storage import save, load
from galedge.options import fetch_options, load_options
from galedge.fundamentals import fetch_fundamentals, load_fundamentals
from galedge.intel import fetch_intel, load_intel

# Fetch and save
result = fetch("AAPL", interval="1d", period="6mo")
save(result)

# Load back
df = load("AAPL", interval="1d", year=2026)

# Options
chain = fetch_options("AAPL")
calls = chain["calls"]

# Fundamentals
data = fetch_fundamentals("AAPL")
info = data["info"]

# Intel
intel = fetch_intel("AAPL")
news = intel["news"]
```

## Running Tests

```bash
source .venv/bin/activate
pytest tests/ -v
```

## Dependencies

- [yfinance](https://github.com/ranaroussi/yfinance) — market data from Yahoo Finance
- [pandas](https://pandas.pydata.org/) — data manipulation
- [pyarrow](https://arrow.apache.org/docs/python/) — Parquet read/write with snappy compression
