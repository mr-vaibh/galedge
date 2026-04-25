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
};
