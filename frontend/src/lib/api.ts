const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

async function fetchAPI<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  marketCap: number;
  exchange: string;
  currency: string;
}

export interface QuoteSummary {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
}

export interface HistoryPoint {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HistoryResponse {
  symbol: string;
  interval: string;
  count: number;
  data: HistoryPoint[];
}

export interface OptionRow {
  strike: number;
  lastPrice: number;
  bid: number;
  ask: number;
  volume: number | null;
  openInterest: number | null;
  impliedVolatility: number | null;
  inTheMoney: boolean;
  change: number | null;
  percentChange: number | null;
}

export interface OptionsResponse {
  symbol: string;
  expiry: string;
  kind: string;
  expirations: string[];
  count: number;
  data: OptionRow[];
}

export interface FundamentalsInfoResponse {
  symbol: string;
  sheet: string;
  data: Record<string, unknown>;
}

export interface FundamentalsSheetResponse {
  symbol: string;
  sheet: string;
  count: number;
  data: Record<string, unknown>[];
}

export interface IntelResponse {
  symbol: string;
  recommendations?: Record<string, unknown>[];
  insider_transactions?: Record<string, unknown>[];
  institutional_holders?: Record<string, unknown>[];
  mutual_fund_holders?: Record<string, unknown>[];
  news?: {
    title: string;
    publisher: string;
    publishedAt: string;
    summary: string;
    link: string;
  }[];
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export interface TechnicalsPoint {
  datetime: string;
  close: number;
  rsi_14: number | null;
  macd: number | null;
  macd_signal: number | null;
  macd_histogram: number | null;
  bb_upper: number | null;
  bb_middle: number | null;
  bb_lower: number | null;
  sma_20: number | null;
  sma_50: number | null;
  ema_12: number | null;
  ema_26: number | null;
}

export interface TechnicalsResponse {
  symbol: string;
  interval: string;
  count: number;
  data: TechnicalsPoint[];
}

export interface CompareResponse {
  symbols: string[];
  period: string;
  price_data: Record<
    string,
    { datetime: string; close: number; normalized: number }[]
  >;
  fundamentals: Record<string, Record<string, unknown>>;
}

export interface CorrelationResponse {
  symbols: string[];
  period: string;
  matrix: number[][];
}

export interface HeatmapStock {
  symbol: string;
  name: string;
  marketCap: number;
  changePercent: number;
}

export interface HeatmapSector {
  sector: string;
  marketCap: number;
  changePercent: number;
  stocks: HeatmapStock[];
}

export interface HeatmapResponse {
  market: string;
  data: HeatmapSector[];
}

export interface ScreenerResult {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  price: number;
  changePercent: number;
  marketCap: number;
  trailingPE: number | null;
  forwardPE: number | null;
  dividendYield: number | null;
  beta: number | null;
}

export interface ScreenerResponse {
  count: number;
  data: ScreenerResult[];
}

// ── API calls ────────────────────────────────────────────────────────────────

export interface SignalDetail {
  name: string;
  value: string | number;
  signal: string;
}

export interface SignalGroup {
  score: number;
  details: SignalDetail[];
}

export interface PredictionTarget {
  price: number;
  probability: number;
  return_pct: number;
}

export interface PredictionResponse {
  symbol: string;
  generated_at: string;
  prediction: {
    direction: string;
    confidence: number;
    composite_score: number;
    expected_return_5d?: number;
    expected_return_10d?: number;
    expected_return_20d?: number;
    timeframes: Record<string, { probability_up: number; expected_return: number }>;
  };
  signals: {
    technical: SignalGroup;
    momentum: SignalGroup;
    fundamental: SignalGroup;
    sentiment: SignalGroup;
    composite: number;
  };
  recommendation: {
    action: string;
    entry_price: number;
    stop_loss: number;
    stop_loss_pct: number;
    targets: PredictionTarget[];
    position_size: number;
    position_pct: number;
    hold_duration_days: { min: number; max: number };
    risk_reward_ratio: number;
  };
  risk: {
    var_95_10d: number;
    max_drawdown: number;
    volatility_20d: number;
    volatility_annualized: number;
    beta: number;
  };
  model_info: {
    features_used: number;
    top_features: { name: string; importance: number }[];
    training_metrics: Record<string, { accuracy: number | null; f1: number | null }>;
  };
}

export interface BacktestMetrics {
  total_return: number;
  total_return_dollar: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  avg_win: number;
  avg_loss: number;
  profit_factor: number;
  sharpe_ratio: number;
  max_drawdown: number;
  initial_capital: number;
  final_value: number;
}

export interface BacktestResponse {
  symbol: string;
  period: string;
  timeframe: string;
  metrics: BacktestMetrics;
  equity_curve: { date: string; value: number }[];
  trades: {
    entry_date: string;
    exit_date: string;
    entry_price: number;
    exit_price: number;
    pnl: number;
    pnl_pct: number;
    holding_days: number;
  }[];
}

export const api = {
  quote: (symbol: string) => fetchAPI<Quote>(`/api/quote/${symbol}`),

  quotes: (symbols: string[]) =>
    fetchAPI<QuoteSummary[]>(`/api/quotes?symbols=${symbols.join(",")}`),

  history: (symbol: string, interval = "1d", period = "6mo") =>
    fetchAPI<HistoryResponse>(
      `/api/history/${symbol}?interval=${interval}&period=${period}`
    ),

  options: (symbol: string, kind = "calls", expiry?: string) => {
    let url = `/api/options/${symbol}?kind=${kind}`;
    if (expiry) url += `&expiry=${expiry}`;
    return fetchAPI<OptionsResponse>(url);
  },

  fundamentals: (symbol: string, sheet = "info") =>
    fetchAPI<FundamentalsInfoResponse | FundamentalsSheetResponse>(
      `/api/fundamentals/${symbol}?sheet=${sheet}`
    ),

  intel: (symbol: string, kind = "all") =>
    fetchAPI<IntelResponse>(`/api/intel/${symbol}?kind=${kind}`),

  search: (q: string) => fetchAPI<SearchResult[]>(`/api/search?q=${q}`),

  technicals: (symbol: string, period = "6mo", interval = "1d") =>
    fetchAPI<TechnicalsResponse>(
      `/api/technicals/${symbol}?period=${period}&interval=${interval}`
    ),

  compare: (symbols: string[], period = "6mo", interval = "1d") =>
    fetchAPI<CompareResponse>(
      `/api/compare?symbols=${symbols.join(",")}&period=${period}&interval=${interval}`
    ),

  correlation: (symbols: string[], period = "1y") =>
    fetchAPI<CorrelationResponse>(
      `/api/correlation?symbols=${symbols.join(",")}&period=${period}`
    ),

  heatmap: (market = "us") =>
    fetchAPI<HeatmapResponse>(`/api/heatmap?market=${market}`),

  screener: (filters: Record<string, string>) =>
    fetchAPI<ScreenerResponse>(
      `/api/screener?${new URLSearchParams(filters).toString()}`
    ),

  predict: (symbol: string, portfolioValue = 100000, riskTolerance = "medium") =>
    fetchAPI<PredictionResponse>(
      `/api/predict/${symbol}?portfolio_value=${portfolioValue}&risk_tolerance=${riskTolerance}`
    ),

  predictBacktest: (symbol: string, period = "1y", timeframe = 10) =>
    fetchAPI<BacktestResponse>(
      `/api/predict/backtest/${symbol}?period=${period}&timeframe=${timeframe}`
    ),
};
