"""Data ingestion pipeline — populates StockPrice, StockInfo, IndexConstituent tables.

Uses yfinance for price data and stock info. Designed to run as a daily job
or initial bulk load. Universe covers NIFTY 500 (50 + NEXT 50 + MIDCAP 150 + SMALLCAP 250)
plus major US stocks. Period defaults to "max" to fetch the full available history.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from concurrent.futures import ThreadPoolExecutor

import pandas as pd
import yfinance as yf
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.models.market_data import StockPrice, StockInfo, IndexConstituent

logger = logging.getLogger(__name__)

# ── NIFTY 50 ─────────────────────────────────────────────────────────────────

NIFTY_50 = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
    "HINDUNILVR.NS", "BHARTIARTL.NS", "ITC.NS", "SBIN.NS", "LT.NS",
    "BAJFINANCE.NS", "MARUTI.NS", "HCLTECH.NS", "AXISBANK.NS",
    "TATAMOTORS.NS", "SUNPHARMA.NS", "WIPRO.NS", "TITAN.NS", "NTPC.NS",
    "POWERGRID.NS", "KOTAKBANK.NS", "ASIANPAINT.NS", "ADANIPORTS.NS",
    "ULTRACEMCO.NS", "NESTLEIND.NS", "TECHM.NS", "TATASTEEL.NS",
    "JSWSTEEL.NS", "HINDALCO.NS", "DIVISLAB.NS", "DRREDDY.NS",
    "CIPLA.NS", "APOLLOHOSP.NS", "EICHERMOT.NS", "BAJAJ-AUTO.NS",
    "HEROMOTOCO.NS", "M&M.NS", "BPCL.NS", "ONGC.NS", "COALINDIA.NS",
    "GRASIM.NS", "INDUSINDBK.NS", "TATACONSUM.NS", "BRITANNIA.NS",
    "HDFCLIFE.NS", "SBILIFE.NS", "BAJAJFINSV.NS", "ADANIENT.NS",
    "ZOMATO.NS", "VEDL.NS",
]

# ── NIFTY NEXT 50 ─────────────────────────────────────────────────────────────

NIFTY_NEXT_50 = [
    "SHRIRAMFIN.NS", "HAVELLS.NS", "PIDILITIND.NS", "GODREJCP.NS",
    "DABUR.NS", "AMBUJACEM.NS", "ACC.NS", "BANDHANBNK.NS", "COLPAL.NS",
    "NAUKRI.NS", "MUTHOOTFIN.NS", "BERGEPAINT.NS", "JUBLFOOD.NS",
    "LUPIN.NS", "BIOCON.NS", "TVSMOTOR.NS", "PAGEIND.NS", "AUROPHARMA.NS",
    "ALKEM.NS", "TORNTPHARM.NS", "BALKRISIND.NS", "MFSL.NS",
    "CANBK.NS", "PNB.NS", "BANKBARODA.NS", "IDFCFIRSTB.NS",
    "FEDERALBNK.NS", "SAIL.NS", "NATIONALUM.NS", "NMDC.NS",
    "PETRONET.NS", "IOC.NS", "GAIL.NS", "IRCTC.NS", "TRENT.NS",
    "DMART.NS", "PIIND.NS", "SIEMENS.NS", "ABB.NS", "HAL.NS",
    "BEL.NS", "BHEL.NS", "CONCOR.NS", "IRFC.NS", "PFC.NS",
    "RECLTD.NS", "NHPC.NS", "SJVN.NS", "POLYCAB.NS", "VOLTAS.NS",
]

# ── NIFTY MIDCAP 150 ──────────────────────────────────────────────────────────

NIFTY_MIDCAP_150 = [
    # Financial Services
    "CHOLAFIN.NS", "BAJAJHLDNG.NS", "AUBANK.NS", "RBLBANK.NS", "SBICARD.NS",
    "KARURVYSYA.NS", "CITYUNIONBK.NS", "MAHABANK.NS", "EQUITASBNK.NS",
    "CREDITACC.NS", "UJJIVANSFB.NS", "ICICIPRULI.NS", "ICICIGI.NS",
    "STARHEALTH.NS", "NIACL.NS", "GICRE.NS", "MANAPPURAM.NS",
    "ANGELONE.NS", "MOTILALOFS.NS", "360ONE.NS", "JMFINANCIL.NS",
    "CDSL.NS", "BSE.NS", "MCX.NS", "CAMS.NS", "KFINTECH.NS",
    # IT / Tech
    "MPHASIS.NS", "PERSISTENT.NS", "COFORGE.NS", "LTTS.NS", "KPITTECH.NS",
    "TATAELXSI.NS", "TANLA.NS", "MASTEK.NS", "ZENSAR.NS", "AFFLE.NS",
    "INDIAMART.NS", "RATEGAIN.NS", "LATENTVIEW.NS", "HAPPSTMNDS.NS",
    "TATACOMM.NS", "ROUTE.NS",
    # Consumer / FMCG
    "EMAMILTD.NS", "RADICO.NS", "VSTIND.NS", "UNITEDBREW.NS",
    "UNITEDSPIRITS.NS", "GODREJIND.NS", "MARICO.NS", "JYOTHYLAB.NS",
    "ZYDUSWELL.NS", "GILLETTE.NS", "HONAUT.NS",
    # Auto & Components
    "SUNDRMFAST.NS", "MOTHERSON.NS", "ENDURANCE.NS", "ESCORTS.NS",
    "TIINDIA.NS", "BHARATFORG.NS", "APOLLOTYRE.NS", "CEAT.NS",
    "BOSCHLTD.NS", "CRAFTSMAN.NS", "MAHINDCIE.NS", "MRF.NS",
    # Industrials / Capital Goods
    "THERMAX.NS", "CUMMINSIND.NS", "AIAENG.NS", "ELGIEQUIP.NS",
    "TIMKEN.NS", "SCHAEFFLER.NS", "SKF.NS", "GRINDWELL.NS",
    "PRAJ.NS", "INGERRAND.NS", "KSB.NS", "RVNL.NS",
    "RAILTEL.NS", "IRCON.NS", "NBCC.NS", "APARINDS.NS", "KEI.NS",
    # Real Estate
    "GODREJPROP.NS", "SOBHA.NS", "PRESTIGE.NS", "BRIGADE.NS",
    "PHOENIXLTD.NS", "OBEROIRLTY.NS", "SUNTECK.NS", "MAHLIFE.NS",
    # Building Materials / Cement
    "ASTRAL.NS", "SUPREMEIND.NS", "CERA.NS", "KAJARIA.NS",
    "RAMCOCEM.NS", "JKCEMENT.NS", "DALMIACBT.NS", "CENTURYPLY.NS",
    "GREENPANEL.NS",
    # Chemicals
    "DEEPAKFERT.NS", "COROMANDEL.NS", "ATUL.NS", "NAVINFLUOR.NS",
    "VINATI.NS", "DEEPAKNTR.NS", "AARTIIND.NS", "FINEORG.NS",
    "CLEAN.NS", "TATACHEM.NS", "GALAXYSURF.NS", "ROSSARI.NS",
    "ALKYLAMINE.NS", "BALAMINES.NS", "NOCIL.NS", "SUDARSCHEM.NS",
    "FLUOROCHEM.NS", "PCBL.NS",
    # Power / Gas / Energy
    "TORNTPOWER.NS", "IGL.NS", "MGL.NS", "GUJGASLTD.NS", "ATGL.NS",
    "CESC.NS", "JSWENERGY.NS", "ADANIPOWER.NS", "TATAPOWER.NS",
    "ADANIGREEN.NS",
    # Metals
    "RATNAMANI.NS", "HINDZINC.NS", "HINDCOPPER.NS", "MOIL.NS",
    "JINDALSAW.NS", "WELCORP.NS",
    # Consumer Electronics / Durables
    "CROMPTON.NS", "BLUESTARCO.NS", "DIXON.NS", "AMBER.NS",
    "VGUARD.NS", "ORIENTELEC.NS", "WHIRLPOOL.NS", "PVRINOX.NS",
    # Healthcare / Hospitals
    "MAXHEALTH.NS", "FORTIS.NS", "METROPOLIS.NS", "SYNGENE.NS",
    "IPCA.NS", "GLENMARK.NS", "JBCHEPHARM.NS", "GRANULES.NS",
    "ERIS.NS", "LAURUS.NS", "NATCOPHARM.NS", "AJANTPHARM.NS",
    "LALPATHLAB.NS", "ZYDUSLIFE.NS", "GLAND.NS",
    # New Economy / Fintech
    "POLICYBZR.NS", "PAYTM.NS", "NYKAA.NS", "DELHIVERY.NS",
    "CARTRADE.NS", "MAPMYINDIA.NS",
]

# ── NIFTY SMALLCAP 250 (representative selection) ─────────────────────────────

NIFTY_SMALLCAP_250 = [
    # Financial
    "AAVAS.NS", "HOMEFIRST.NS", "APTUS.NS", "HUDCO.NS", "IREDA.NS",
    "NUVAMA.NS", "IIFLSEC.NS", "MOTILALOFS.NS",
    # IT / SaaS
    "RPTECH.NS", "QUICKHEAL.NS", "INTELLECT.NS", "CYIENT.NS",
    "BIRLASOFT.NS", "NIITTECH.NS", "NEWGEN.NS", "SONATSOFTW.NS",
    "MPHASIS.NS",
    # Consumer / Food
    "KRBL.NS", "LTFOODS.NS", "BALRAMCHIN.NS", "AVANTIFEED.NS",
    "KPRMILL.NS", "SAREGAMA.NS", "VENKEYS.NS", "DHAMPUR.NS",
    "EIDPARRY.NS", "DHARAMSI.NS",
    # Textiles
    "RAYMOND.NS", "TRIDENT.NS", "CENTURYTEX.NS", "WELSPUNLIV.NS",
    "VARDHMAN.NS", "KITEX.NS",
    # Staffing / HR
    "TEAMLEASE.NS", "QUESS.NS", "SIS.NS",
    # Healthcare / Diagnostics
    "THYROCARE.NS", "KRSNAA.NS", "HEALTHIUM.NS", "SEQUENT.NS",
    "PFIZER.NS", "ABBOTINDIA.NS", "GLAXO.NS", "SANOFI.NS",
    # Auto / Ancillaries
    "SUPRAJIT.NS", "SANSERA.NS", "MINDA.NS", "VARROC.NS",
    "GABRIEL.NS", "MMFINANCE.NS", "JKTYRES.NS",
    # Industrials / Infrastructure
    "POWERMECH.NS", "KEC.NS", "KALPATPOWR.NS", "GPPL.NS",
    "JINDALWORLD.NS", "HLEGLAS.NS", "ELECTCAST.NS",
    # Chemicals (small)
    "PAUSHAKLTD.NS", "APCOTEX.NS", "GUJALKALI.NS", "NEOGEN.NS",
    "TATACHEM.NS",
    # Media / Telecom
    "NETWORK18.NS", "TV18BRDCST.NS", "HFCL.NS", "GTLINFRA.NS",
    # Real Estate / Hotels
    "EIHOTEL.NS", "LEMONTREE.NS", "CHALET.NS", "MAHINDHOTEL.NS",
    # Packaging
    "MOLDTKPAC.NS", "UFLEX.NS", "HUHTAMAKI.NS",
    # Metals / Mining
    "WELSPUNIND.NS", "JSLHISAR.NS", "APLAPOLLO.NS",
    # Power Equipment
    "INOXWIND.NS", "SUZLON.NS", "ORIENTGREEN.NS",
    # Agri
    "NATHBIOGENS.NS", "KAVERI.NS", "DHANUKA.NS", "RALLIS.NS",
    # Exchanges / Infra
    "MSTCLTD.NS", "IRCON.NS", "RITES.NS", "WABCOINDIA.NS",
]

# ── US Stocks ─────────────────────────────────────────────────────────────────

US_STOCKS = [
    # Mega cap tech
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AVGO",
    "ORCL", "ADBE", "CRM", "AMD", "INTC", "QCOM", "TXN", "IBM",
    # Software / Cloud
    "NOW", "WDAY", "PANW", "CRWD", "ZS", "DDOG", "NET", "SNOW",
    "PLTR", "TWLO", "SHOP", "NFLX",
    # Fintech / Payments
    "V", "MA", "PYPL", "SQ", "COIN",
    # Banks / Finance
    "JPM", "BAC", "GS", "MS", "BLK", "SPGI", "ICE", "CME",
    # Healthcare
    "UNH", "JNJ", "LLY", "PFE", "ABBV", "MRK", "AMGN", "GILD",
    "BMY", "MDT", "ABT", "TMO", "DHR", "ISRG",
    # Consumer
    "WMT", "PG", "KO", "PEP", "COST", "HD", "LOW", "NKE", "MCD",
    "SBUX", "TGT", "CMG", "YUM", "MNST",
    # Energy
    "XOM", "CVX", "COP",
    # Industrials
    "HON", "CAT", "BA", "GE", "DE", "UPS", "LMT", "RTX", "NOC", "GD",
    # Telecom / Media
    "T", "VZ", "DIS", "CMCSA",
    # REITs / Real Estate
    "AMT", "CCI", "PLD",
    # Utilities
    "NEE", "DUK", "SO",
    # Autos
    "F", "GM", "RIVN",
    # New economy
    "UBER", "ABNB", "ROKU",
]

# ── Composite lists ───────────────────────────────────────────────────────────

ALL_NSE_STOCKS = list(dict.fromkeys(
    NIFTY_50 + NIFTY_NEXT_50 + NIFTY_MIDCAP_150 + NIFTY_SMALLCAP_250
))


# ── Price Ingestion ───────────────────────────────────────────────────────────

def _fetch_prices_batch(symbols: list[str], period: str = "max") -> pd.DataFrame:
    """Fetch prices for multiple symbols using yf.download (single batch call)."""
    try:
        df = yf.download(
            symbols,
            period=period,
            interval="1d",
            group_by="ticker",
            progress=False,
            threads=True,
            auto_adjust=True,
        )
        return df
    except Exception as e:
        logger.error("Batch download failed: %s", e)
        return pd.DataFrame()


def ingest_prices(
    db: Session,
    symbols: list[str] | None = None,
    period: str = "max",
) -> dict:
    """Ingest daily OHLCV prices into the database.

    Uses yf.download for batch efficiency, then upserts into stock_prices table.
    Fetches full available history by default (period="max").
    """
    symbols = symbols or ALL_NSE_STOCKS
    logger.info("Ingesting prices for %d symbols, period=%s", len(symbols), period)

    # Find latest date per symbol already in DB — skip re-fetching old data
    latest_dates = {}
    for sym in symbols:
        result = db.execute(
            select(func.max(StockPrice.date)).where(StockPrice.symbol == sym)
        ).scalar()
        if result:
            latest_dates[sym] = result

    # Symbols that already have data only need recent days, not max history
    fresh_symbols = [s for s in symbols if s not in latest_dates]
    update_symbols = [s for s in symbols if s in latest_dates]

    total_rows = 0
    errors = 0

    # Batch-fetch full history for new symbols
    if fresh_symbols:
        logger.info("Fetching full history for %d new symbols", len(fresh_symbols))
        df = _fetch_prices_batch(fresh_symbols, "max")
        rows, errs = _store_prices(db, fresh_symbols, df, latest_dates)
        total_rows += rows
        errors += errs

    # Batch-fetch recent data for already-ingested symbols (fast daily update)
    if update_symbols:
        logger.info("Updating recent data for %d existing symbols", len(update_symbols))
        df = _fetch_prices_batch(update_symbols, "5d")
        rows, errs = _store_prices(db, update_symbols, df, latest_dates)
        total_rows += rows
        errors += errs

    db.commit()
    logger.info("Price ingestion complete: %d rows, %d errors", total_rows, errors)
    return {"ingested": total_rows, "errors": errors}


def _store_prices(
    db: Session,
    symbols: list[str],
    df: pd.DataFrame,
    latest_dates: dict,
) -> tuple[int, int]:
    total_rows = 0
    errors = 0

    for sym in symbols:
        try:
            if df.empty:
                continue

            if len(symbols) == 1:
                sym_df = df
            else:
                if sym not in df.columns.get_level_values(0):
                    continue
                sym_df = df[sym]

            sym_df = sym_df.dropna(subset=["Close"])
            if sym_df.empty:
                continue

            latest = latest_dates.get(sym)
            if latest:
                sym_df = sym_df[sym_df.index.date > latest]

            if sym_df.empty:
                continue

            rows = []
            for idx, row in sym_df.iterrows():
                close = float(row.get("Close", 0))
                rows.append(StockPrice(
                    symbol=sym,
                    date=idx.date() if hasattr(idx, "date") else idx,
                    open=float(row.get("Open", 0)),
                    high=float(row.get("High", 0)),
                    low=float(row.get("Low", 0)),
                    close=close,
                    adj_close=close,  # auto_adjust=True: Close is already split/dividend-adjusted
                    volume=int(row.get("Volume", 0)),
                ))

            db.bulk_save_objects(rows)
            total_rows += len(rows)
            logger.debug("Ingested %d rows for %s", len(rows), sym)

        except Exception as e:
            logger.warning("Failed to ingest %s: %s", sym, e)
            errors += 1

    return total_rows, errors


# ── Stock Info Ingestion ──────────────────────────────────────────────────────

def _fetch_stock_info(sym: str) -> dict | None:
    """Fetch stock info for a single symbol."""
    try:
        info = yf.Ticker(sym).info
        return {
            "symbol": sym,
            "name": info.get("shortName", sym),
            "sector": info.get("sector", ""),
            "industry": info.get("industry", ""),
            "market_cap": info.get("marketCap", 0) or 0,
            "exchange": "NSE" if sym.endswith(".NS") else "BSE" if sym.endswith(".BO") else "US",
        }
    except Exception:
        return None


def ingest_stock_info(
    db: Session,
    symbols: list[str] | None = None,
) -> dict:
    """Ingest/update stock info (name, sector, industry, market cap)."""
    symbols = symbols or ALL_NSE_STOCKS
    logger.info("Ingesting stock info for %d symbols", len(symbols))

    with ThreadPoolExecutor(max_workers=10) as executor:
        results = list(executor.map(_fetch_stock_info, symbols))

    updated = 0
    for info in results:
        if not info:
            continue

        existing = db.query(StockInfo).filter(StockInfo.symbol == info["symbol"]).first()
        if existing:
            existing.name = info["name"]
            existing.sector = info["sector"]
            existing.industry = info["industry"]
            existing.market_cap = info["market_cap"]
        else:
            db.add(StockInfo(
                symbol=info["symbol"],
                name=info["name"],
                sector=info["sector"],
                industry=info["industry"],
                market_cap=info["market_cap"],
                exchange=info["exchange"],
            ))
        updated += 1

    db.commit()
    logger.info("Stock info updated: %d symbols", updated)
    return {"updated": updated}


# ── Index Constituents ────────────────────────────────────────────────────────

def ingest_index_constituents(db: Session) -> dict:
    """Populate index constituent table with current memberships."""
    indices = {
        "NIFTY 50": NIFTY_50,
        "NIFTY NEXT 50": NIFTY_NEXT_50,
        "NIFTY 100": NIFTY_50 + NIFTY_NEXT_50,
        "NIFTY MIDCAP 150": NIFTY_MIDCAP_150,
        "NIFTY 200": NIFTY_50 + NIFTY_NEXT_50 + NIFTY_MIDCAP_150,
        "NIFTY SMALLCAP 250": NIFTY_SMALLCAP_250,
        "NIFTY 500": ALL_NSE_STOCKS,
    }

    today = date.today()
    count = 0

    for index_name, symbols in indices.items():
        equal_weight = 1.0 / len(symbols)
        for sym in symbols:
            existing = db.query(IndexConstituent).filter(
                IndexConstituent.index_name == index_name,
                IndexConstituent.symbol == sym,
                IndexConstituent.date == today,
            ).first()
            if not existing:
                db.add(IndexConstituent(
                    index_name=index_name,
                    symbol=sym,
                    date=today,
                    weight=equal_weight,
                ))
                count += 1

    db.commit()
    logger.info("Index constituents updated: %d entries", count)
    return {"updated": count}


# ── Full Ingestion ────────────────────────────────────────────────────────────

def run_full_ingestion(db: Session, period: str = "max") -> dict:
    """Run complete data ingestion pipeline."""
    logger.info("=== Starting full data ingestion: %d NSE + %d US symbols ===",
                len(ALL_NSE_STOCKS), len(US_STOCKS))

    all_symbols = ALL_NSE_STOCKS + US_STOCKS
    info_result = ingest_stock_info(db, all_symbols)
    price_result = ingest_prices(db, all_symbols, period)
    index_result = ingest_index_constituents(db)

    result = {
        "stock_info": info_result,
        "prices": price_result,
        "index_constituents": index_result,
    }
    logger.info("=== Full ingestion complete: %s ===", result)
    return result
