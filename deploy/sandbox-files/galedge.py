"""Galedge Alpha Research SDK — access platform data from Python."""

import requests
import pandas as pd

API_BASE = "http://localhost:8001"

def get_prices(symbols: list[str], period: str = "1y") -> pd.DataFrame:
    """Get historical daily prices for given symbols.
    
    Args:
        symbols: List of stock symbols (e.g., ['RELIANCE.NS', 'TCS.NS'])
        period: Not used currently — returns all available data
    
    Returns:
        DataFrame with date index and symbol columns (close prices)
    """
    import sqlite3
    db = sqlite3.connect('/home/galedge-coder/galedge_readonly.db')
    placeholders = ','.join(['?'] * len(symbols))
    df = pd.read_sql_query(
        f'SELECT date, symbol, close FROM stock_prices WHERE symbol IN ({placeholders}) ORDER BY date',
        db, params=symbols
    )
    db.close()
    if df.empty:
        return pd.DataFrame()
    return df.pivot(index='date', columns='symbol', values='close')


def get_holdings(portfolio_id: int = None) -> pd.DataFrame:
    """Get portfolio holdings.
    
    Args:
        portfolio_id: Specific portfolio ID. If None, gets the first portfolio.
    
    Returns:
        DataFrame with symbol, weight, semv columns
    """
    import sqlite3
    db = sqlite3.connect('/home/galedge-coder/galedge_readonly.db')
    
    if portfolio_id is None:
        pid = db.execute('SELECT id FROM portfolios LIMIT 1').fetchone()
        if not pid:
            db.close()
            return pd.DataFrame()
        portfolio_id = pid[0]
    
    df = pd.read_sql_query(
        'SELECT symbol, weight, semv, date FROM portfolio_holdings WHERE portfolio_id = ? ORDER BY weight DESC',
        db, params=[portfolio_id]
    )
    db.close()
    return df


def get_factors(model: str = "INEC1") -> pd.DataFrame:
    """Get factor exposures for all stocks.
    
    Args:
        model: Factor model name (default: INEC1)
    
    Returns:
        DataFrame with symbol rows and factor columns
    """
    import sqlite3
    db = sqlite3.connect('/home/galedge-coder/galedge_readonly.db')
    
    # Get factor model ID
    fm = db.execute('SELECT id FROM factor_models WHERE name = ?', [model]).fetchone()
    if not fm:
        db.close()
        return pd.DataFrame()
    
    # Get factors
    factors = pd.read_sql_query('SELECT id, name FROM factors WHERE model_id = ?', db, params=[fm[0]])
    factor_map = dict(zip(factors['id'], factors['name']))
    
    # Get exposures
    exposures = pd.read_sql_query(
        'SELECT symbol, factor_id, exposure FROM factor_exposures WHERE factor_id IN (SELECT id FROM factors WHERE model_id = ?)',
        db, params=[fm[0]]
    )
    db.close()
    
    if exposures.empty:
        return pd.DataFrame()
    
    exposures['factor'] = exposures['factor_id'].map(factor_map)
    return exposures.pivot_table(index='symbol', columns='factor', values='exposure', aggfunc='last')


def get_factor_returns(model: str = "INEC1") -> pd.DataFrame:
    """Get daily factor returns.
    
    Returns:
        DataFrame with date index and factor columns
    """
    import sqlite3
    db = sqlite3.connect('/home/galedge-coder/galedge_readonly.db')
    
    fm = db.execute('SELECT id FROM factor_models WHERE name = ?', [model]).fetchone()
    if not fm:
        db.close()
        return pd.DataFrame()
    
    df = pd.read_sql_query(
        '''SELECT fr.date, f.name as factor, fr.cumulative_return 
           FROM factor_returns fr 
           JOIN factors f ON fr.factor_id = f.id 
           WHERE f.model_id = ? ORDER BY fr.date''',
        db, params=[fm[0]]
    )
    db.close()
    
    if df.empty:
        return pd.DataFrame()
    return df.pivot_table(index='date', columns='factor', values='cumulative_return', aggfunc='last')


def get_stock_info() -> pd.DataFrame:
    """Get stock info (sector, industry, market cap)."""
    import sqlite3
    db = sqlite3.connect('/home/galedge-coder/galedge_readonly.db')
    df = pd.read_sql_query('SELECT symbol, name, sector, industry, market_cap FROM stock_info', db)
    db.close()
    return df


def list_portfolios() -> pd.DataFrame:
    """List all portfolios."""
    import sqlite3
    db = sqlite3.connect('/home/galedge-coder/galedge_readonly.db')
    df = pd.read_sql_query('SELECT id, fund_name, scheme_name, benchmark, start_date, end_date FROM portfolios', db)
    db.close()
    return df


print('Galedge SDK loaded. Available: get_prices(), get_holdings(), get_factors(), get_factor_returns(), get_stock_info(), list_portfolios()')
