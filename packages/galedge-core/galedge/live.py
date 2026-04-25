"""Live market data poller with terminal display."""

from __future__ import annotations

import signal
import sys
import time
from datetime import datetime
from pathlib import Path

import pandas as pd
import yfinance as yf


def _clear_line(n: int = 1) -> None:
    for _ in range(n):
        sys.stdout.write("\033[A\033[2K")


def _color(val: float, ref: float) -> str:
    if val > ref:
        return f"\033[92m{val:>10.2f}\033[0m"  # green
    elif val < ref:
        return f"\033[91m{val:>10.2f}\033[0m"  # red
    return f"{val:>10.2f}"


def _format_volume(v: int) -> str:
    if v >= 1_000_000:
        return f"{v / 1_000_000:.1f}M"
    if v >= 1_000:
        return f"{v / 1_000:.1f}K"
    return str(v)


def _fetch_snapshot(tickers: list[str]) -> pd.DataFrame:
    """Fetch latest quote for each ticker."""
    rows = []
    for symbol in tickers:
        t = yf.Ticker(symbol)
        info = t.fast_info
        hist = t.history(period="2d", interval="1d")
        if hist.empty:
            continue

        price = info.last_price
        prev_close = info.previous_close or hist["Close"].iloc[-2] if len(hist) > 1 else price
        change = price - prev_close
        change_pct = (change / prev_close * 100) if prev_close else 0

        rows.append({
            "ticker": symbol,
            "price": price,
            "change": change,
            "change%": change_pct,
            "open": info.open,
            "high": info.day_high,
            "low": info.day_low,
            "volume": info.last_volume,
            "prev_close": prev_close,
        })
    return pd.DataFrame(rows)


def live_poll(
    tickers: list[str],
    interval_sec: int = 30,
    save_dir: Path | None = None,
) -> None:
    """Poll live prices and display in terminal. Ctrl+C to stop."""

    stop = False

    def _handle_sig(*_):
        nonlocal stop
        stop = True

    signal.signal(signal.SIGINT, _handle_sig)

    header = (
        f"{'TICKER':<10} {'PRICE':>10} {'CHG':>10} {'CHG%':>8} "
        f"{'OPEN':>10} {'HIGH':>10} {'LOW':>10} {'VOLUME':>10}"
    )
    separator = "─" * len(header)
    prev_prices: dict[str, float] = {}
    lines_printed = 0
    snapshots: list[pd.DataFrame] = []

    print(f"\n  Live quotes — polling every {interval_sec}s  (Ctrl+C to stop)\n")

    while not stop:
        df = _fetch_snapshot(tickers)
        if df.empty:
            print("No data returned. Market may be closed.")
            time.sleep(interval_sec)
            continue

        # Clear previous table
        if lines_printed > 0:
            _clear_line(lines_printed)

        now = datetime.now().strftime("%H:%M:%S")
        lines = [f"  [{now}]  refreshing every {interval_sec}s", "", f"  {header}", f"  {separator}"]

        for _, row in df.iterrows():
            ticker = row["ticker"]
            price = row["price"]
            prev = prev_prices.get(ticker, price)

            price_str = _color(price, prev)
            chg = row["change"]
            chg_pct = row["change%"]

            chg_str = f"\033[92m+{chg:.2f}\033[0m" if chg >= 0 else f"\033[91m{chg:.2f}\033[0m"
            pct_str = f"\033[92m+{chg_pct:.2f}%\033[0m" if chg_pct >= 0 else f"\033[91m{chg_pct:.2f}%\033[0m"

            line = (
                f"  {ticker:<10} {price_str} {chg_str:>20} {pct_str:>18} "
                f"{row['open']:>10.2f} {row['high']:>10.2f} {row['low']:>10.2f} "
                f"{_format_volume(int(row['volume'])):>10}"
            )
            lines.append(line)
            prev_prices[ticker] = price

        lines.append("")
        output = "\n".join(lines)
        print(output)
        lines_printed = len(lines)

        if save_dir:
            df["fetched_at"] = datetime.now()
            snapshots.append(df)

        time.sleep(interval_sec)

    # Save collected snapshots on exit
    if save_dir and snapshots:
        combined = pd.concat(snapshots, ignore_index=True)
        save_dir.mkdir(parents=True, exist_ok=True)
        fname = f"live_{datetime.now().strftime('%Y%m%d_%H%M%S')}.parquet"
        path = save_dir / fname
        combined.to_parquet(path, engine="pyarrow", compression="snappy", index=False)
        print(f"\n  Saved {len(combined)} snapshots → {path}")

    print("\n  Stopped.")
