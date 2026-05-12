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
from app.database import PricesSessionLocal

logger = logging.getLogger(__name__)

# ── NIFTY 50 ─────────────────────────────────────────────────────────────────

NIFTY_50 = [
    "ADANIENT.NS", "ADANIPORTS.NS", "APOLLOHOSP.NS", "ASIANPAINT.NS", "AXISBANK.NS",
    "BAJAJ-AUTO.NS", "BAJFINANCE.NS", "BAJAJFINSV.NS", "BEL.NS", "BHARTIARTL.NS",
    "CIPLA.NS", "COALINDIA.NS", "DRREDDY.NS", "EICHERMOT.NS", "ETERNAL.NS",
    "GRASIM.NS", "HCLTECH.NS", "HDFCBANK.NS", "HDFCLIFE.NS", "HINDALCO.NS",
    "HINDUNILVR.NS", "ICICIBANK.NS", "ITC.NS", "INFY.NS", "INDIGO.NS",
    "JSWSTEEL.NS", "JIOFIN.NS", "KOTAKBANK.NS", "LT.NS", "M&M.NS",
    "MARUTI.NS", "MAXHEALTH.NS", "NTPC.NS", "NESTLEIND.NS", "ONGC.NS",
    "POWERGRID.NS", "RELIANCE.NS", "SBILIFE.NS", "SHRIRAMFIN.NS", "SBIN.NS",
    "SUNPHARMA.NS", "TCS.NS", "TATACONSUM.NS", "TMPV.NS", "TATASTEEL.NS",
    "TECHM.NS", "TITAN.NS", "TRENT.NS", "ULTRACEMCO.NS", "WIPRO.NS",
]

# ── NIFTY NEXT 50 ─────────────────────────────────────────────────────────────

NIFTY_NEXT_50 = [
    "ABB.NS", "ADANIENSOL.NS", "ADANIGREEN.NS", "ADANIPOWER.NS", "AMBUJACEM.NS",
    "DMART.NS", "BAJAJHLDNG.NS", "BANKBARODA.NS", "BPCL.NS", "BOSCHLTD.NS",
    "BRITANNIA.NS", "CGPOWER.NS", "CANBK.NS", "CHOLAFIN.NS", "CUMMINSIND.NS",
    "DLF.NS", "DIVISLAB.NS", "GAIL.NS", "GODREJCP.NS", "HDFCAMC.NS",
    "HAL.NS", "HINDZINC.NS", "HYUNDAI.NS", "INDHOTEL.NS", "IOC.NS",
    "IRFC.NS", "JINDALSTEL.NS", "LTM.NS", "LODHA.NS", "MAZDOCK.NS",
    "MUTHOOTFIN.NS", "PIDILITIND.NS", "PFC.NS", "PNB.NS", "RECLTD.NS",
    "MOTHERSON.NS", "SHREECEM.NS", "ENRIN.NS", "SIEMENS.NS", "SOLARINDS.NS",
    "TVSMOTOR.NS", "TATACAP.NS", "TMCV.NS", "TATAPOWER.NS", "TORNTPHARM.NS",
    "UNIONBANK.NS", "UNITDSPR.NS", "VBL.NS", "VEDL.NS", "ZYDUSLIFE.NS",
]

# ── NIFTY MIDCAP 150 ──────────────────────────────────────────────────────────

NIFTY_MIDCAP_150 = [
    "360ONE.NS", "3MINDIA.NS", "ACC.NS", "AIAENG.NS", "APLAPOLLO.NS",
    "AUBANK.NS", "AWL.NS", "ABBOTINDIA.NS", "ATGL.NS", "ABCAPITAL.NS",
    "AJANTPHARM.NS", "ALKEM.NS", "ANTHEM.NS", "APARINDS.NS", "APOLLOTYRE.NS",
    "ASHOKLEY.NS", "ASTRAL.NS", "AUROPHARMA.NS", "AIIL.NS", "BSE.NS",
    "BAJAJHFL.NS", "BALKRISIND.NS", "BANKINDIA.NS", "MAHABANK.NS", "BERGEPAINT.NS",
    "BDL.NS", "BHARATFORG.NS", "BHEL.NS", "BHARTIHEXA.NS", "GROWW.NS",
    "BIOCON.NS", "BLUESTARCO.NS", "CRISIL.NS", "COCHINSHIP.NS", "COFORGE.NS",
    "COLPAL.NS", "CONCOR.NS", "COROMANDEL.NS", "DABUR.NS", "DALBHARAT.NS",
    "DIXON.NS", "ENDURANCE.NS", "ESCORTS.NS", "EXIDEIND.NS", "NYKAA.NS",
    "FEDERALBNK.NS", "FORTIS.NS", "GVT&D.NS", "GMRAIRPORT.NS", "GICRE.NS",
    "GLAXO.NS", "GLENMARK.NS", "MEDANTA.NS", "GODFRYPHLP.NS", "GODREJIND.NS",
    "GODREJPROP.NS", "FLUOROCHEM.NS", "HDBFS.NS", "HAVELLS.NS", "HEROMOTOCO.NS",
    "HEXT.NS", "HINDPETRO.NS", "POWERINDIA.NS", "HONAUT.NS", "HUDCO.NS",
    "ICICIGI.NS", "ICICIAMC.NS", "ICICIPRULI.NS", "IDFCFIRSTB.NS", "ITCHOTELS.NS",
    "INDIANB.NS", "IRCTC.NS", "IREDA.NS", "INDUSTOWER.NS", "INDUSINDBK.NS",
    "NAUKRI.NS", "IPCALAB.NS", "JKCEMENT.NS", "JSWENERGY.NS", "JSWINFRA.NS",
    "JSL.NS", "JUBLFOOD.NS", "KPRMILL.NS", "KEI.NS", "KPITTECH.NS",
    "KALYANKJIL.NS", "LTF.NS", "LTTS.NS", "LGEINDIA.NS", "LICHSGFIN.NS",
    "LAURUSLABS.NS", "LENSKART.NS", "LICI.NS", "LINDEINDIA.NS", "LLOYDSME.NS",
    "LUPIN.NS", "MRF.NS", "M&MFIN.NS", "MANKIND.NS", "MARICO.NS",
    "MFSL.NS", "MOTILALOFS.NS", "MPHASIS.NS", "MCX.NS", "NHPC.NS",
    "NLCINDIA.NS", "NMDC.NS", "NTPCGREEN.NS", "NATIONALUM.NS", "NAM-INDIA.NS",
    "OBEROIRLTY.NS", "OIL.NS", "PAYTM.NS", "OFSS.NS", "POLICYBZR.NS",
    "PIIND.NS", "PAGEIND.NS", "PATANJALI.NS", "PERSISTENT.NS", "PETRONET.NS",
    "PHOENIXLTD.NS", "POLYCAB.NS", "PREMIERENE.NS", "PRESTIGE.NS", "RADICO.NS",
    "RVNL.NS", "SBICARD.NS", "SJVN.NS", "SRF.NS", "SCHAEFFLER.NS",
    "SAIL.NS", "SUNDARMFIN.NS", "SUPREMEIND.NS", "SUZLON.NS", "SWIGGY.NS",
    "TATACOMM.NS", "TATAELXSI.NS", "TATAINVEST.NS", "NIACL.NS", "THERMAX.NS",
    "TORNTPOWER.NS", "TIINDIA.NS", "UNOMINDA.NS", "UPL.NS", "UBL.NS",
    "VMM.NS", "IDEA.NS", "VOLTAS.NS", "WAAREEENER.NS", "YESBANK.NS",
]

# ── NIFTY SMALLCAP 250 (representative selection) ─────────────────────────────

NIFTY_SMALLCAP_250 = [
    "ACMESOLAR.NS", "AADHARHFC.NS", "AARTIIND.NS", "AAVAS.NS", "ACE.NS",
    "ACUTAAS.NS", "ABFRL.NS", "ABLBL.NS", "ABREL.NS", "ABSLAMC.NS",
    "CPPLUS.NS", "AEGISLOG.NS", "AEGISVOPAK.NS", "AFCONS.NS", "AFFLE.NS",
    "ABDL.NS", "ARE&M.NS", "AMBER.NS", "ANANDRATHI.NS", "ANANTRAJ.NS",
    "ANGELONE.NS", "ANURAS.NS", "APTUS.NS", "ASAHIINDIA.NS", "ASTERDM.NS",
    "ATHERENERG.NS", "ATUL.NS", "BEML.NS", "BLS.NS", "BALRAMCHIN.NS",
    "BANDHANBNK.NS", "BATAINDIA.NS", "BAYERCROP.NS", "BELRISE.NS", "BIKAJI.NS",
    "BSOFT.NS", "BLUEDART.NS", "BLUEJET.NS", "BBTC.NS", "FIRSTCRY.NS",
    "BRIGADE.NS", "MAPMYINDIA.NS", "CCL.NS", "CESC.NS", "CIEINDIA.NS",
    "CANFINHOME.NS", "CANHLIFE.NS", "CAPLIPOINT.NS", "CGCL.NS", "CARBORUNIV.NS",
    "CARTRADE.NS", "CASTROLIND.NS", "CEATLTD.NS", "CEMPRO.NS", "CENTRALBK.NS",
    "CDSL.NS", "CHALET.NS", "CHAMBLFERT.NS", "CHENNPETRO.NS", "CHOICEIN.NS",
    "CHOLAHLDNG.NS", "CUB.NS", "CLEAN.NS", "COHANCE.NS", "CAMS.NS",
    "CONCORDBIO.NS", "CRAFTSMAN.NS", "CREDITACC.NS", "CROMPTON.NS", "CYIENT.NS",
    "DCMSHRIRAM.NS", "DOMS.NS", "DATAPATTNS.NS", "DEEPAKFERT.NS", "DEEPAKNTR.NS",
    "DELHIVERY.NS", "DEVYANI.NS", "LALPATHLAB.NS", "EIDPARRY.NS", "EIHOTEL.NS",
    "ELECON.NS", "ELGIEQUIP.NS", "EMAMILTD.NS", "EMCURE.NS", "EMMVEE.NS",
    "ENGINERSIN.NS", "ERIS.NS", "FACT.NS", "FINCABLES.NS", "FSL.NS",
    "FIVESTAR.NS", "FORCEMOT.NS", "GABRIEL.NS", "GALLANTT.NS", "GRSE.NS",
    "GILLETTE.NS", "GLAND.NS", "GODIGIT.NS", "GPIL.NS", "GRANULES.NS",
    "GRAPHITE.NS", "GRAVITA.NS", "GESHIP.NS", "GMDCLTD.NS", "HEG.NS",
    "HBLENGINE.NS", "HFCL.NS", "HSCL.NS", "HINDCOPPER.NS", "HOMEFIRST.NS",
    "HONASA.NS", "IDBI.NS", "IFCI.NS", "IIFL.NS", "IRB.NS",
    "IRCON.NS", "ITI.NS", "INDGN.NS", "INDIACEM.NS", "INDIAMART.NS",
    "IEX.NS", "IOB.NS", "IGL.NS", "INOXWIND.NS", "INTELLECT.NS",
    "IGIL.NS", "IKS.NS", "JBCHEPHARM.NS", "JBMA.NS", "JKTYRE.NS",
    "JMFINANCIL.NS", "JSWCEMENT.NS", "JSWDULUX.NS", "JAINREC.NS", "JPPOWER.NS",
    "J&KBANK.NS", "JINDALSAW.NS", "JUBLINGREA.NS", "JUBLPHARMA.NS", "JWL.NS",
    "JYOTICNC.NS", "KAJARIACER.NS", "KPIL.NS", "KARURVYSYA.NS", "KAYNES.NS",
    "KEC.NS", "KFINTECH.NS", "KIRLOSENG.NS", "KIMS.NS", "LTFOODS.NS",
    "LATENTVIEW.NS", "THELEELA.NS", "LEMONTREE.NS", "MMTC.NS", "MGL.NS",
    "MANAPPURAM.NS", "MRPL.NS", "MEESHO.NS", "MINDACORP.NS", "MSUMI.NS",
    "NATCOPHARM.NS", "NBCC.NS", "NCC.NS", "NSLNISP.NS", "NH.NS",
    "NAVA.NS", "NAVINFLUOR.NS", "NETWEB.NS", "NEULANDLAB.NS", "NEWGEN.NS",
    "NIVABUPA.NS", "NUVAMA.NS", "NUVOCO.NS", "OLAELEC.NS", "OLECTRA.NS",
    "ONESOURCE.NS", "PCBL.NS", "PGEL.NS", "PNBHOUSING.NS", "PTCIL.NS",
    "PVRINOX.NS", "PARADEEP.NS", "PFIZER.NS", "PWL.NS", "PINELABS.NS",
    "PIRAMALFIN.NS", "PPLPHARMA.NS", "POLYMED.NS", "POONAWALLA.NS", "RRKABEL.NS",
    "RBLBANK.NS", "RHIM.NS", "RITES.NS", "RAILTEL.NS", "RAINBOW.NS",
    "RKFORGE.NS", "REDINGTON.NS", "RPOWER.NS", "SBFC.NS", "SAGILITY.NS",
    "SAILIFE.NS", "SAMMAANCAP.NS", "SAPPHIRE.NS", "SARDAEN.NS", "SAREGAMA.NS",
    "SCHNEIDER.NS", "SCI.NS", "SHYAMMETL.NS", "SIGNATURE.NS", "SOBHA.NS",
    "SONACOMS.NS", "SONATSOFTW.NS", "STARHEALTH.NS", "SUMICHEM.NS", "SUNTV.NS",
    "SPLPETRO.NS", "SWANCORP.NS", "SYNGENE.NS", "SYRMA.NS", "TBOTEK.NS",
    "TATACHEM.NS", "TATATECH.NS", "TTML.NS", "TECHNOE.NS", "TEGA.NS",
    "TEJASNET.NS", "TENNIND.NS", "RAMCOCEM.NS", "TIMKEN.NS", "TITAGARH.NS",
    "TARIL.NS", "TRAVELFOOD.NS", "TRIDENT.NS", "TRITURBINE.NS", "UCOBANK.NS",
    "UTIAMC.NS", "URBANCO.NS", "USHAMART.NS", "VTL.NS", "VIJAYA.NS",
    "WELCORP.NS", "WELSPUNLIV.NS", "WHIRLPOOL.NS", "WOCKPHARMA.NS", "ZFCVINDIA.NS",
    "ZEEL.NS", "ZENTEC.NS", "ZENSARTECH.NS", "ZYDUSWELL.NS", "ECLERX.NS",
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

    BATCH = 50  # yfinance hangs on very large single batch calls

    # Batch-fetch full history for new symbols in chunks
    if fresh_symbols:
        logger.info("Fetching full history for %d new symbols in batches of %d", len(fresh_symbols), BATCH)
        for i in range(0, len(fresh_symbols), BATCH):
            chunk = fresh_symbols[i:i + BATCH]
            logger.info("Batch %d/%d: %d symbols", i // BATCH + 1, -(-len(fresh_symbols) // BATCH), len(chunk))
            df = _fetch_prices_batch(chunk, "max")
            rows, errs = _store_prices(db, chunk, df, latest_dates)
            db.commit()
            total_rows += rows
            errors += errs
            logger.info("Batch done: %d rows ingested so far", total_rows)

    # Batch-fetch recent data for already-ingested symbols
    if update_symbols:
        logger.info("Updating recent data for %d existing symbols", len(update_symbols))
        for i in range(0, len(update_symbols), BATCH):
            chunk = update_symbols[i:i + BATCH]
            df = _fetch_prices_batch(chunk, "5d")
            rows, errs = _store_prices(db, chunk, df, latest_dates)
            db.commit()
            total_rows += rows
            errors += errs

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
