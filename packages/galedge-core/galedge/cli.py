"""CLI entry point for galedge data pipeline."""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

from galedge.fetcher import VALID_INTERVALS, fetch_multiple
from galedge.storage import load, save_multiple

# ── ANSI helpers ─────────��────────────────────────────────────────────────────

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
DIM = "\033[2m"
BOLD = "\033[1m"
RESET = "\033[0m"


def _color_val(val: float, ref: float, fmt: str = ">10.2f") -> str:
    s = f"{val:{fmt}}"
    if val > ref:
        return f"{GREEN}{s}{RESET}"
    elif val < ref:
        return f"{RED}{s}{RESET}"
    return s


def _color_change(val: float) -> str:
    if val > 0:
        return f"{GREEN}+{val:.2f}{RESET}"
    elif val < 0:
        return f"{RED}{val:.2f}{RESET}"
    return f"{val:.2f}"


def _color_pct(val: float) -> str:
    if val > 0:
        return f"{GREEN}+{val:.2f}%{RESET}"
    elif val < 0:
        return f"{RED}{val:.2f}%{RESET}"
    return f"{val:.2f}%"


def _fmt_volume(v: int) -> str:
    if v >= 1_000_000:
        return f"{v / 1_000_000:.1f}M"
    if v >= 1_000:
        return f"{v / 1_000:.1f}K"
    return str(v)


def _fmt_big_number(v: float) -> str:
    if v is None or v != v:  # NaN check
        return "—"
    v = float(v)
    if abs(v) >= 1e12:
        return f"{v / 1e12:.2f}T"
    if abs(v) >= 1e9:
        return f"{v / 1e9:.2f}B"
    if abs(v) >= 1e6:
        return f"{v / 1e6:.2f}M"
    if abs(v) >= 1e3:
        return f"{v / 1e3:.1f}K"
    return f"{v:.2f}"


def _print_header(title: str, subtitle: str = "") -> None:
    sub = f"  {DIM}({subtitle}){RESET}" if subtitle else ""
    print(f"\n  {BOLD}{title}{RESET}{sub}\n")


def _print_table(header: str, separator: str, rows: list[str], count: int) -> None:
    print(f"  {DIM}{header}{RESET}")
    print(f"  {separator}")
    for r in rows:
        print(f"  {r}")
    print(f"  {separator}")
    print(f"  {DIM}{count} rows{RESET}\n")


# ── fetch ──────────────────────────────────────────────────���──────────────────

def _cmd_fetch(args: argparse.Namespace) -> None:
    results = fetch_multiple(
        tickers=[t.upper() for t in args.tickers],
        interval=args.interval,
        period=args.period,
        start=args.start,
        end=args.end,
    )
    if not results:
        print("No data fetched. Check your ticker symbols.", file=sys.stderr)
        sys.exit(1)

    written = save_multiple(results, base_dir=Path(args.output))
    print(f"\nDone! Saved {len(written)} file(s):")
    for p in written:
        print(f"  {p}")


# ── show ──────────────────��───────────────────────────────────────────────────

def _cmd_show(args: argparse.Namespace) -> None:
    import pandas as pd

    try:
        df = load(
            ticker=args.ticker.upper(),
            interval=args.interval,
            year=args.year,
            month=args.month,
            base_dir=Path(args.output),
        )
    except FileNotFoundError:
        ticker = args.ticker.upper()
        print(f"No {args.interval} data found for {ticker}.", file=sys.stderr)
        print(f"Fetch it first:  galedge fetch {ticker} -i {args.interval} -p 5d", file=sys.stderr)
        sys.exit(1)

    df["datetime"] = pd.to_datetime(df["datetime"])
    df = df.sort_values("datetime").reset_index(drop=True)

    if args.tail:
        df = df.tail(args.rows)
    else:
        df = df.head(args.rows)

    df["prev_close"] = df["close"].shift(1)
    df["change"] = df["close"] - df["prev_close"]
    df["change_pct"] = (df["change"] / df["prev_close"]) * 100

    ticker = args.ticker.upper()
    header = (
        f"{'DATE':<18} {'OPEN':>10} {'HIGH':>10} {'LOW':>10} "
        f"{'CLOSE':>10} {'CHG':>10} {'CHG%':>9} {'VOLUME':>10}"
    )
    sep = "─" * 93

    _print_header(ticker, args.interval)

    rows = []
    for _, row in df.iterrows():
        dt = row["datetime"].strftime("%Y-%m-%d %H:%M")
        prev = row["prev_close"] if pd.notna(row["prev_close"]) else row["open"]
        close_str = _color_val(row["close"], prev)
        chg = row["change"] if pd.notna(row["change"]) else 0.0
        pct = row["change_pct"] if pd.notna(row["change_pct"]) else 0.0

        rows.append(
            f"{dt:<18} {row['open']:>10.2f} {row['high']:>10.2f} {row['low']:>10.2f} "
            f"{close_str} {_color_change(chg):>20} {_color_pct(pct):>19} {_fmt_volume(int(row['volume'])):>10}"
        )

    _print_table(header, sep, rows, len(df))


# ── options ──────────────────────��────────────────────────────────────────────

def _cmd_options(args: argparse.Namespace) -> None:
    import pandas as pd
    from galedge.options import fetch_options, load_options, save_options

    ticker = args.ticker.upper()
    base = Path(args.output)

    if not args.show_only:
        data = fetch_options(ticker, expiry=args.expiry)
        save_options(data, base_dir=base)
        print(f"  Saved options for {ticker} (expiry: {data['calls']['expiry'].iloc[0]})")

        # Show available expirations
        exp_df = data["expirations"]
        print(f"\n  {BOLD}Available expirations:{RESET}")
        for exp in exp_df["expiry"].tolist():
            print(f"    {exp}")
        print()

    kind = args.kind
    try:
        df = load_options(ticker, expiry=args.expiry, kind=kind, base_dir=base)
    except FileNotFoundError:
        print(f"No options data for {ticker}. Run: galedge options {ticker}", file=sys.stderr)
        sys.exit(1)

    # Select important columns
    cols = ["strike", "lastPrice", "bid", "ask", "volume", "openInterest", "impliedVolatility", "inTheMoney"]
    display_cols = [c for c in cols if c in df.columns]
    df = df[display_cols].copy()

    expiry_label = args.expiry or "nearest"
    _print_header(f"{ticker} {kind.upper()}", f"expiry: {expiry_label}")

    header = (
        f"{'STRIKE':>10} {'LAST':>10} {'BID':>10} {'ASK':>10} "
        f"{'VOLUME':>10} {'OI':>10} {'IV':>8} {'ITM':>5}"
    )
    sep = "─" * 79

    rows = []
    for _, row in df.iterrows():
        itm = row.get("inTheMoney", False)
        itm_str = f"{GREEN}YES{RESET}" if itm else f"{DIM} NO{RESET}"
        iv = row.get("impliedVolatility", 0)
        iv_str = f"{YELLOW}{iv:>7.1%}{RESET}" if iv > 0.5 else f"{iv:>7.1%}"
        vol = int(row.get("volume", 0)) if pd.notna(row.get("volume")) else 0
        oi = int(row.get("openInterest", 0)) if pd.notna(row.get("openInterest")) else 0

        rows.append(
            f"{row['strike']:>10.2f} {row.get('lastPrice', 0):>10.2f} "
            f"{row.get('bid', 0):>10.2f} {row.get('ask', 0):>10.2f} "
            f"{_fmt_volume(vol):>10} {_fmt_volume(oi):>10} {iv_str} {itm_str:>15}"
        )

    if args.tail:
        rows = rows[-args.rows:]
    else:
        rows = rows[:args.rows]

    _print_table(header, sep, rows, len(rows))


# ── fundamentals ─────────────────────────────────────────���────────────────────

def _cmd_fundamentals(args: argparse.Namespace) -> None:
    import pandas as pd
    from galedge.fundamentals import fetch_fundamentals, load_fundamentals, save_fundamentals

    ticker = args.ticker.upper()
    base = Path(args.output)

    if not args.show_only:
        data = fetch_fundamentals(ticker)
        if not data:
            print(f"No fundamental data found for {ticker}.", file=sys.stderr)
            sys.exit(1)
        save_fundamentals(data, base_dir=base)
        print(f"  Saved fundamentals for {ticker}: {', '.join(data.keys())}")

    sheet = args.sheet

    if sheet == "info":
        _show_info(ticker, base)
    elif sheet in ("financials", "quarterly_financials"):
        _show_financial_statement(ticker, sheet, "Income Statement", base)
    elif sheet in ("balance_sheet", "quarterly_balance_sheet"):
        _show_financial_statement(ticker, sheet, "Balance Sheet", base)
    elif sheet in ("cashflow", "quarterly_cashflow"):
        _show_financial_statement(ticker, sheet, "Cash Flow", base)
    else:
        print(f"Unknown sheet: {sheet}", file=sys.stderr)
        sys.exit(1)


def _show_info(ticker: str, base: Path) -> None:
    from galedge.fundamentals import load_fundamentals

    try:
        df = load_fundamentals(ticker, "info", base)
    except FileNotFoundError:
        print(f"No info data for {ticker}. Run: galedge fundamentals {ticker}", file=sys.stderr)
        sys.exit(1)

    row = df.iloc[0]

    _print_header(ticker, "Key Stats")

    sections = [
        ("Valuation", [
            ("Market Cap", _fmt_big_number(row.get("marketCap", 0))),
            ("Enterprise Value", _fmt_big_number(row.get("enterpriseValue", 0))),
            ("Trailing P/E", f"{row.get('trailingPE', 0):.2f}" if row.get("trailingPE") else "—"),
            ("Forward P/E", f"{row.get('forwardPE', 0):.2f}" if row.get("forwardPE") else "—"),
            ("PEG Ratio", f"{row.get('pegRatio', 0):.2f}" if row.get("pegRatio") else "—"),
            ("Price/Book", f"{row.get('priceToBook', 0):.2f}" if row.get("priceToBook") else "—"),
        ]),
        ("Earnings", [
            ("Trailing EPS", f"{row.get('trailingEps', 0):.2f}" if row.get("trailingEps") else "—"),
            ("Forward EPS", f"{row.get('forwardEps', 0):.2f}" if row.get("forwardEps") else "—"),
            ("Revenue", _fmt_big_number(row.get("totalRevenue", 0))),
            ("Profit Margin", f"{row.get('profitMargins', 0):.1%}" if row.get("profitMargins") else "—"),
            ("Operating Margin", f"{row.get('operatingMargins', 0):.1%}" if row.get("operatingMargins") else "—"),
        ]),
        ("Dividends & Risk", [
            ("Dividend Yield", f"{row.get('dividendYield', 0):.2%}" if row.get("dividendYield") else "—"),
            ("Payout Ratio", f"{row.get('payoutRatio', 0):.1%}" if row.get("payoutRatio") else "—"),
            ("Beta", f"{row.get('beta', 0):.3f}" if row.get("beta") else "—"),
            ("52W High", f"{row.get('fiftyTwoWeekHigh', 0):.2f}" if row.get("fiftyTwoWeekHigh") else "—"),
            ("52W Low", f"{row.get('fiftyTwoWeekLow', 0):.2f}" if row.get("fiftyTwoWeekLow") else "—"),
        ]),
        ("Company", [
            ("Sector", str(row.get("sector", "—"))),
            ("Industry", str(row.get("industry", "—"))),
            ("Employees", _fmt_big_number(row.get("fullTimeEmployees", 0)) if row.get("fullTimeEmployees") else "—"),
        ]),
    ]

    for section_name, fields in sections:
        print(f"  {BOLD}{section_name}{RESET}")
        for label, value in fields:
            print(f"    {DIM}{label:<22}{RESET} {CYAN}{value}{RESET}")
        print()


def _show_financial_statement(ticker: str, sheet: str, label: str, base: Path) -> None:
    from galedge.fundamentals import load_fundamentals

    try:
        df = load_fundamentals(ticker, sheet, base)
    except FileNotFoundError:
        print(f"No {sheet} data for {ticker}. Run: galedge fundamentals {ticker}", file=sys.stderr)
        sys.exit(1)

    is_quarterly = sheet.startswith("quarterly")
    period = "Quarterly" if is_quarterly else "Annual"
    _print_header(f"{ticker} {label}", period)

    # Date columns
    dates = df["date"].tolist()
    date_strs = [d.strftime("%Y-%m-%d") if hasattr(d, "strftime") else str(d) for d in dates]

    # Skip metadata columns
    skip = {"date", "ticker", "fetched_at"}
    metric_cols = [c for c in df.columns if c not in skip]

    # Header
    date_header = "  " + f"{'METRIC':<40}" + "".join(f"{d:>16}" for d in date_strs)
    sep = "─" * (40 + 16 * len(date_strs) + 2)

    print(f"  {DIM}{date_header}{RESET}")
    print(f"  {sep}")

    # Show top metrics (most important ones first)
    important = [
        "Total Revenue", "Net Income", "Operating Income", "Gross Profit", "EBITDA",
        "Total Assets", "Total Liabilities Net Minority Interest", "Total Equity Gross Minority Interest",
        "Total Debt", "Cash And Cash Equivalents",
        "Free Cash Flow", "Operating Cash Flow", "Capital Expenditure",
    ]
    shown = set()
    for metric in important:
        if metric in metric_cols:
            vals = df[metric].tolist()
            val_strs = "".join(f"{_fmt_big_number(v):>16}" for v in vals)
            print(f"  {metric:<40}{val_strs}")
            shown.add(metric)

    # Then show remaining
    remaining = [c for c in metric_cols if c not in shown]
    if remaining and not getattr(args if 'args' in dir() else object(), 'brief', True):
        print(f"\n  {DIM}... and {len(remaining)} more metrics (use --all to see){RESET}")

    print(f"  {sep}\n")


# ── intel ─────────────────────────────────────────────────────────────────────

def _cmd_intel(args: argparse.Namespace) -> None:
    import pandas as pd
    from galedge.intel import fetch_intel, load_intel, save_intel

    ticker = args.ticker.upper()
    base = Path(args.output)

    if not args.show_only:
        data = fetch_intel(ticker)
        if not data:
            print(f"No intel data found for {ticker}.", file=sys.stderr)
            sys.exit(1)
        save_intel(data, base_dir=base)
        print(f"  Saved intel for {ticker}: {', '.join(data.keys())}\n")

    kind = args.kind

    if kind == "all":
        for k in ("recommendations", "insider_transactions", "institutional_holders", "news"):
            try:
                _show_intel_section(ticker, k, base, args.rows)
            except FileNotFoundError:
                pass
    else:
        try:
            _show_intel_section(ticker, kind, base, args.rows)
        except FileNotFoundError:
            print(f"No {kind} data for {ticker}. Run: galedge intel {ticker}", file=sys.stderr)
            sys.exit(1)


def _show_intel_section(ticker: str, kind: str, base: Path, max_rows: int) -> None:
    import pandas as pd
    from galedge.intel import load_intel

    df = load_intel(ticker, kind, base)

    if kind == "recommendations":
        _print_header(f"{ticker} Analyst Recommendations")
        header = f"{'PERIOD':<10} {'STRONG BUY':>11} {'BUY':>6} {'HOLD':>6} {'SELL':>6} {'STRONG SELL':>12}"
        sep = "─" * 55

        rows = []
        for _, row in df.head(max_rows).iterrows():
            sb = int(row.get("strongBuy", 0))
            b = int(row.get("buy", 0))
            h = int(row.get("hold", 0))
            s = int(row.get("sell", 0))
            ss = int(row.get("strongSell", 0))

            rows.append(
                f"{row.get('period', ''):>10} "
                f"{GREEN}{sb:>11}{RESET} {GREEN}{b:>6}{RESET} "
                f"{YELLOW}{h:>6}{RESET} "
                f"{RED}{s:>6}{RESET} {RED}{ss:>12}{RESET}"
            )
        _print_table(header, sep, rows, len(rows))

    elif kind == "insider_transactions":
        _print_header(f"{ticker} Insider Transactions")
        header = f"{'DATE':<12} {'INSIDER':<25} {'TRANSACTION':<18} {'SHARES':>10} {'VALUE':>12}"
        sep = "─" * 80

        rows = []
        for _, row in df.head(max_rows).iterrows():
            date = str(row.get("Start Date", ""))[:10]
            insider = str(row.get("Insider", ""))[:24]
            txn = str(row.get("Transaction", ""))[:17]
            shares = int(row.get("Shares", 0))
            value = row.get("Value", 0)

            is_buy = "buy" in txn.lower() or "purchase" in txn.lower()
            color = GREEN if is_buy else RED
            val_str = _fmt_big_number(value) if pd.notna(value) and value else "—"

            rows.append(
                f"{date:<12} {insider:<25} {color}{txn:<18}{RESET} "
                f"{shares:>10} {val_str:>12}"
            )
        _print_table(header, sep, rows, len(rows))

    elif kind == "institutional_holders":
        _print_header(f"{ticker} Top Institutional Holders")
        header = f"{'HOLDER':<40} {'SHARES':>14} {'VALUE':>14} {'% HELD':>8} {'% CHG':>8}"
        sep = "─" * 88

        rows = []
        for _, row in df.head(max_rows).iterrows():
            holder = str(row.get("Holder", ""))[:39]
            shares = int(row.get("Shares", 0))
            value = float(row.get("Value", 0))
            pct = float(row.get("pctHeld", 0))
            pct_chg = float(row.get("pctChange", 0)) if pd.notna(row.get("pctChange")) else 0.0

            chg_str = _color_pct(pct_chg * 100)

            rows.append(
                f"{holder:<40} {_fmt_big_number(shares):>14} {_fmt_big_number(value):>14} "
                f"{pct:>7.2%} {chg_str:>18}"
            )
        _print_table(header, sep, rows, len(rows))

    elif kind == "mutual_fund_holders":
        _print_header(f"{ticker} Top Mutual Fund Holders")
        header = f"{'FUND':<45} {'SHARES':>14} {'VALUE':>14} {'% HELD':>8}"
        sep = "─" * 85

        rows = []
        for _, row in df.head(max_rows).iterrows():
            holder = str(row.get("Holder", ""))[:44]
            shares = int(row.get("Shares", 0))
            value = float(row.get("Value", 0))
            pct = float(row.get("pctHeld", 0))

            rows.append(
                f"{holder:<45} {_fmt_big_number(shares):>14} {_fmt_big_number(value):>14} {pct:>7.2%}"
            )
        _print_table(header, sep, rows, len(rows))

    elif kind == "news":
        _print_header(f"{ticker} Recent News")
        sep = "─" * 90

        print(f"  {sep}")
        for _, row in df.head(max_rows).iterrows():
            title = row.get("title", "")
            pub = row.get("publisher", "")
            date = str(row.get("published_at", ""))[:16]
            link = row.get("link", "")

            print(f"  {BOLD}{title}{RESET}")
            print(f"  {DIM}{pub} • {date}{RESET}")
            if link:
                print(f"  {CYAN}{link}{RESET}")
            print()
        print(f"  {sep}")
        print(f"  {DIM}{min(len(df), max_rows)} articles{RESET}\n")


# ── main ──────────────────────��───────────────────────────��───────────────────

def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        prog="galedge",
        description="Stock market data pipeline — fetch, store, and view market data.",
    )
    sub = parser.add_subparsers(dest="command")

    # Common output arg
    def add_output(p):
        p.add_argument("-o", "--output", default="data", help="Base data directory (default: ./data)")

    # --- fetch ---
    p_fetch = sub.add_parser("fetch", help="Fetch and store OHLCV data")
    p_fetch.add_argument("tickers", nargs="+", help="Stock symbols (e.g. AAPL MSFT RELIANCE.NS)")
    p_fetch.add_argument("-i", "--interval", default="1d", choices=VALID_INTERVALS, help="Candle interval (default: 1d)")
    p_fetch.add_argument("-p", "--period", default=None, help="Lookback period (e.g. 1mo, 6mo, 1y, max)")
    p_fetch.add_argument("--start", default=None, help="Start date YYYY-MM-DD")
    p_fetch.add_argument("--end", default=None, help="End date YYYY-MM-DD")
    p_fetch.add_argument("-v", "--verbose", action="store_true")
    add_output(p_fetch)

    # --- live ---
    p_live = sub.add_parser("live", help="Live-poll prices in the terminal")
    p_live.add_argument("tickers", nargs="+", help="Stock symbols")
    p_live.add_argument("-s", "--seconds", type=int, default=30, help="Poll interval (default: 30s)")
    p_live.add_argument("--save", default=None, metavar="DIR", help="Save snapshots on exit")

    # --- show ---
    p_show = sub.add_parser("show", help="Display stored OHLCV data")
    p_show.add_argument("ticker", help="Stock symbol")
    p_show.add_argument("-i", "--interval", default="1d", choices=VALID_INTERVALS)
    p_show.add_argument("-y", "--year", type=int, default=None)
    p_show.add_argument("-m", "--month", type=int, default=None)
    p_show.add_argument("-n", "--rows", type=int, default=50)
    p_show.add_argument("-t", "--tail", action="store_true")
    add_output(p_show)

    # --- options ---
    p_opts = sub.add_parser("options", help="Fetch & view options chain")
    p_opts.add_argument("ticker", help="Stock symbol")
    p_opts.add_argument("-e", "--expiry", default=None, help="Expiration date YYYY-MM-DD (default: nearest)")
    p_opts.add_argument("-k", "--kind", default="calls", choices=["calls", "puts"], help="Show calls or puts")
    p_opts.add_argument("-n", "--rows", type=int, default=30)
    p_opts.add_argument("-t", "--tail", action="store_true")
    p_opts.add_argument("--show-only", action="store_true", help="Only show stored data, don't fetch")
    add_output(p_opts)

    # --- fundamentals ---
    p_fund = sub.add_parser("fundamentals", help="Fetch & view fundamentals")
    p_fund.add_argument("ticker", help="Stock symbol")
    p_fund.add_argument("-s", "--sheet", default="info",
                        choices=["info", "financials", "balance_sheet", "cashflow",
                                 "quarterly_financials", "quarterly_balance_sheet", "quarterly_cashflow"],
                        help="Which data to show (default: info)")
    p_fund.add_argument("--show-only", action="store_true", help="Only show stored data, don't fetch")
    add_output(p_fund)

    # --- intel ---
    p_intel = sub.add_parser("intel", help="Fetch & view insiders, institutions, analysts, news")
    p_intel.add_argument("ticker", help="Stock symbol")
    p_intel.add_argument("-k", "--kind", default="all",
                         choices=["all", "insider_transactions", "institutional_holders",
                                  "mutual_fund_holders", "recommendations", "news"],
                         help="What to show (default: all)")
    p_intel.add_argument("-n", "--rows", type=int, default=15)
    p_intel.add_argument("--show-only", action="store_true", help="Only show stored data, don't fetch")
    add_output(p_intel)

    args = parser.parse_args(argv)

    if args.command is None:
        parser.print_help()
        sys.exit(1)

    log_level = logging.DEBUG if getattr(args, "verbose", False) else logging.INFO
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
        datefmt="%H:%M:%S",
    )

    commands = {
        "fetch": _cmd_fetch,
        "show": _cmd_show,
        "options": _cmd_options,
        "fundamentals": _cmd_fundamentals,
        "intel": _cmd_intel,
    }

    if args.command == "live":
        from galedge.live import live_poll
        save_dir = Path(args.save) if args.save else None
        live_poll(
            tickers=[t.upper() for t in args.tickers],
            interval_sec=args.seconds,
            save_dir=save_dir,
        )
    elif args.command in commands:
        commands[args.command](args)


if __name__ == "__main__":
    main()
