export interface DocsEntry {
  id: string;
  title: string;
  section: string;
  description: string;
  keywords: string;
  href: string;
}

export const DOCS_INDEX: DocsEntry[] = [
  // ─── Overview ────────────────────────────────────────────────────────────────
  {
    id: "docs-overview",
    title: "Galedge Documentation",
    section: "Overview",
    description:
      "Institutional-grade systematic investment platform. Build, test, and deploy quantitative strategies using real market data.",
    keywords:
      "overview introduction home start galedge platform quant systematic investing portfolio manager researcher getting started docs",
    href: "/docs",
  },

  // ─── Getting Started ─────────────────────────────────────────────────────────
  {
    id: "getting-started",
    title: "Getting Started",
    section: "Getting Started",
    description:
      "Go from zero to your first analytics in under 5 minutes. Create account, upload portfolio, view analytics.",
    keywords:
      "getting started quickstart tutorial beginner onboarding first steps setup account register login",
    href: "/docs/getting-started",
  },
  {
    id: "getting-started-create-account",
    title: "Create an Account",
    section: "Getting Started",
    description:
      "Register with your email, password, and organization. Automatically logged in after sign-up.",
    keywords:
      "create account register sign up email password organization login authentication user profile registration",
    href: "/docs/getting-started#create-account",
  },
  {
    id: "getting-started-upload-portfolio",
    title: "Upload Your Portfolio",
    section: "Getting Started",
    description:
      "Upload a CSV file with Symbol, Shares, BuyPrice, BuyDate columns. Supports NSE, BSE, and US stocks.",
    keywords:
      "upload portfolio CSV file holdings import stocks NSE BSE US symbols RELIANCE.NS AAPL shares buy price date ingestion",
    href: "/docs/getting-started#upload-portfolio",
  },
  {
    id: "getting-started-view-analytics",
    title: "View Analytics",
    section: "Getting Started",
    description:
      "Navigate to Analytics → Performance to see total return, CAGR, Sharpe ratio, max drawdown, and equity curve.",
    keywords:
      "view analytics performance total return CAGR Sharpe max drawdown equity curve first analytics",
    href: "/docs/getting-started#view-analytics",
  },

  // ─── Concepts ────────────────────────────────────────────────────────────────
  {
    id: "concepts",
    title: "Concepts",
    section: "Concepts",
    description:
      "Core financial concepts and terminology: stocks, indices, metrics, factor models, attribution, and optimization.",
    keywords:
      "concepts fundamentals financial terms theory education learn stocks metrics factors attribution optimization quant",
    href: "/docs/concepts",
  },
  {
    id: "concepts-stocks-indices",
    title: "Stocks & Indices",
    section: "Concepts",
    description:
      "Stocks represent ownership in companies. Indices like NIFTY 50, S&P 500 measure market performance. Market cap explained.",
    keywords:
      "stocks shares equity indices index NIFTY 50 NIFTY 100 NIFTY 500 S&P 500 market cap capitalization NSE India US market",
    href: "/docs/concepts#stocks-indices",
  },
  {
    id: "concepts-key-metrics",
    title: "Key Metrics",
    section: "Concepts",
    description:
      "P/E ratio, beta, Sharpe ratio, CAGR, max drawdown, volatility, dividend yield — the metrics behind every analytics view.",
    keywords:
      "metrics PE ratio price earnings beta Sharpe ratio CAGR compound annual growth rate max drawdown volatility standard deviation dividend yield risk return",
    href: "/docs/concepts#key-metrics",
  },
  {
    id: "concepts-factor-models",
    title: "Factor Models",
    section: "Concepts",
    description:
      "Factor models explain stock returns using common drivers. Galedge's 21-factor model covers market, style, and industry factors.",
    keywords:
      "factor model 21 factor market style industry factors exposure return BETA SIZE MOMENTUM VALUE VOLATILITY QUALITY GROWTH LEVERAGE LIQUIDITY systematic",
    href: "/docs/concepts#factor-models",
  },
  {
    id: "concepts-attribution",
    title: "Attribution",
    section: "Concepts",
    description:
      "Performance attribution decomposes portfolio returns into factor return, idiosyncratic return, and Brinson effects.",
    keywords:
      "attribution performance return decomposition factor return idiosyncratic Brinson allocation selection interaction effect excess return benchmark",
    href: "/docs/concepts#attribution",
  },
  {
    id: "concepts-optimization",
    title: "Portfolio Optimization",
    section: "Concepts",
    description:
      "CVXPY-powered optimization finds best weights given objectives (min risk, max Sharpe) and constraints (position limits, sector caps).",
    keywords:
      "portfolio optimization CVXPY efficient frontier tracking error turnover weights covariance matrix mean variance objectives constraints",
    href: "/docs/concepts#optimization",
  },

  // ─── Portfolio ────────────────────────────────────────────────────────────────
  {
    id: "portfolio",
    title: "Portfolio Management",
    section: "Portfolio",
    description:
      "Upload, select, and track your investment portfolios. CSV upload, portfolio selection, and live tracker.",
    keywords:
      "portfolio management upload select track holdings construction P&L profit loss",
    href: "/docs/portfolio",
  },
  {
    id: "portfolio-upload-csv",
    title: "Upload Portfolio CSV",
    section: "Portfolio",
    description:
      "Upload a CSV with Symbol, Shares, BuyPrice, BuyDate. Supports NSE (.NS), BSE (.BO), and US tickers. Auto-ingests price data.",
    keywords:
      "upload CSV portfolio holdings import file format Symbol Shares BuyPrice BuyDate NSE BSE US Yahoo Finance ticker data ingestion",
    href: "/docs/portfolio#upload-csv",
  },
  {
    id: "portfolio-select",
    title: "Select Portfolio",
    section: "Portfolio",
    description:
      "Set an active portfolio for all analytics, risk model, strategy builder, and optimizer pages.",
    keywords:
      "select portfolio active portfolio switch choose set analytics pages persists session",
    href: "/docs/portfolio#select-portfolio",
  },
  {
    id: "portfolio-tracker",
    title: "Portfolio Tracker",
    section: "Portfolio",
    description:
      "Simple standalone tracker for P&L, current value, invested amount. Saved in browser local storage.",
    keywords:
      "portfolio tracker P&L profit loss current value invested amount holdings table CSV export browser local storage currency conversion",
    href: "/docs/portfolio#tracker",
  },

  // ─── Analytics ────────────────────────────────────────────────────────────────
  {
    id: "analytics",
    title: "Analytics Suite",
    section: "Analytics",
    description:
      "Comprehensive analytics: performance, holdings, returns & risk, peer comparison, drawdown, period analysis, and more.",
    keywords:
      "analytics suite performance holdings returns risk peer comparison drawdown period analysis factor exposure attribution equity curve",
    href: "/docs/analytics",
  },
  {
    id: "analytics-performance",
    title: "Performance Summary",
    section: "Analytics",
    description:
      "High-level overview: total return %, CAGR, Sharpe, max drawdown, volatility, equity curve, drawdown chart, and value trend.",
    keywords:
      "performance summary total return CAGR Sharpe max drawdown volatility equity curve drawdown chart portfolio value P&L risk summary",
    href: "/docs/analytics#performance",
  },
  {
    id: "analytics-holdings",
    title: "Holdings Summary",
    section: "Analytics",
    description:
      "Portfolio composition: stock weights, sectors, market cap, factor exposure chart, and factor summary table.",
    keywords:
      "holdings summary composition weight sector market cap factor exposure chart bar chart checkboxes select deselect",
    href: "/docs/analytics#holdings",
  },
  {
    id: "analytics-returns-risk",
    title: "Returns & Risk Analysis",
    section: "Analytics",
    description:
      "Factor vs idiosyncratic return decomposition. Active, Benchmark, and Excess view modes. Factor risk contribution charts.",
    keywords:
      "returns risk analysis factor return idiosyncratic return decomposition active benchmark excess view mode factor risk contribution top contributors detractors",
    href: "/docs/analytics#returns-risk",
  },
  {
    id: "analytics-peer",
    title: "Peer Comparison",
    section: "Analytics",
    description:
      "Compare portfolio metrics against peer funds and industry benchmarks — returns, risk, and Sharpe ratio side by side.",
    keywords:
      "peer comparison benchmarks funds industry compare returns Sharpe risk metrics peer intelligence",
    href: "/docs/analytics#peer-comparison",
  },
  {
    id: "analytics-drawdown",
    title: "Drawdown Analysis",
    section: "Analytics",
    description:
      "Visualize every peak-to-trough decline. Identify worst drawdowns by depth and duration.",
    keywords:
      "drawdown analysis peak trough decline depth duration worst drawdown downside risk max drawdown chart",
    href: "/docs/analytics#drawdown",
  },
  {
    id: "analytics-period",
    title: "Period Analysis",
    section: "Analytics",
    description:
      "Break down performance by time period — monthly, quarterly, or yearly. See which periods contributed most.",
    keywords:
      "period analysis monthly quarterly yearly time period breakdown returns calendar",
    href: "/docs/analytics#period-analysis",
  },
  {
    id: "analytics-event-sensitivity",
    title: "Event Sensitivity",
    section: "Analytics",
    description:
      "Analyze portfolio response to specific market events such as rate hikes and earnings announcements.",
    keywords:
      "event sensitivity market events rate hikes earnings announcements portfolio response stress test",
    href: "/docs/analytics",
  },
  {
    id: "analytics-slicing",
    title: "Portfolio Slicing",
    section: "Analytics",
    description:
      "Slice holdings by sector, market cap, or factor exposure to see sub-portfolio performance.",
    keywords:
      "portfolio slicing slice sector market cap factor exposure sub-portfolio segment breakdown",
    href: "/docs/analytics",
  },

  // ─── Risk Model ────────────────────────────────────────────────────────────────
  {
    id: "risk-model",
    title: "Risk Model",
    section: "Risk Model",
    description:
      "Galedge's 21-factor risk model decomposes stock returns into market, style, and industry factors.",
    keywords:
      "risk model 21 factor cross-sectional regression factor exposures factor returns covariance systematic risk",
    href: "/docs/risk-model",
  },
  {
    id: "risk-model-21-factor",
    title: "21-Factor Risk Model",
    section: "Risk Model",
    description:
      "1 market factor (BETA), 10 style factors (SIZE, MOMENTUM, VALUE, VOLATILITY, QUALITY, GROWTH, LEVERAGE, LIQUIDITY, DIVIDEND_YIELD, EARNINGS_YIELD), 10 industry factors.",
    keywords:
      "21 factor model BETA SIZE MOMENTUM VALUE VOLATILITY QUALITY GROWTH LEVERAGE LIQUIDITY DIVIDEND_YIELD EARNINGS_YIELD TECHNOLOGY FINANCIALS HEALTHCARE ENERGY CONSUMER INDUSTRIALS MATERIALS UTILITIES COMMUNICATION cross-sectional regression",
    href: "/docs/risk-model#factor-model",
  },
  {
    id: "risk-model-factor-summary",
    title: "Factor Summary",
    section: "Risk Model",
    description:
      "Factor performance table, factor correlation heatmap, time series chart. Select model INEC1 for Indian equities.",
    keywords:
      "factor summary INEC1 factor performance CAGR Sharpe drawdown factor correlation heatmap matrix time series auto build",
    href: "/docs/risk-model#factor-summary",
  },
  {
    id: "risk-model-stock-exposures",
    title: "Stock Factor Exposures",
    section: "Risk Model",
    description:
      "Per-stock exposure to all 21 factors as z-scores. 0 = average, +1.0 = one std dev above, −1.0 = one std dev below.",
    keywords:
      "stock factor exposures z-score standardized score exposure neutral positive negative RELIANCE MOMENTUM VALUE style tilts",
    href: "/docs/risk-model#stock-exposures",
  },

  // ─── Optimizer ────────────────────────────────────────────────────────────────
  {
    id: "optimizer",
    title: "Portfolio Optimizer",
    section: "Optimizer",
    description:
      "Find optimal stock weights using CVXPY convex optimization. Set universe, objective, and constraints.",
    keywords:
      "optimizer portfolio optimization CVXPY convex optimal weights universe objective constraints mean variance",
    href: "/docs/optimizer",
  },
  {
    id: "optimizer-universe",
    title: "Universe Selection",
    section: "Optimizer",
    description:
      "Choose the pool of stocks: NIFTY 50, NIFTY 100, NIFTY NEXT 50, NIFTY 500, or a custom stock list.",
    keywords:
      "universe selection NIFTY 50 NIFTY 100 NIFTY NEXT 50 NIFTY 500 custom stocks pool blue chip large cap",
    href: "/docs/optimizer#universe",
  },
  {
    id: "optimizer-objectives",
    title: "Optimization Objectives",
    section: "Optimizer",
    description:
      "Choose to minimize risk, maximize return, maximize Sharpe ratio, or minimize tracking error.",
    keywords:
      "objectives minimize risk maximize return maximize Sharpe tracking error minimum variance capital preservation risk-adjusted",
    href: "/docs/optimizer#objectives",
  },
  {
    id: "optimizer-constraints",
    title: "Optimizer Constraints",
    section: "Optimizer",
    description:
      "Constrain position size (min/max weight), max positions, beta exposure, turnover, and sector weights.",
    keywords:
      "constraints position size min weight max weight max positions beta exposure turnover sector weight diversification limits bounds",
    href: "/docs/optimizer#constraints",
  },
  {
    id: "optimizer-results",
    title: "Optimizer Results",
    section: "Optimizer",
    description:
      "Expected return %, expected risk %, Sharpe ratio, positions count, weight table, and weight bar chart.",
    keywords:
      "optimizer results expected return expected risk Sharpe positions weights allocation table chart download CSV",
    href: "/docs/optimizer#results",
  },

  // ─── Strategy Builder ─────────────────────────────────────────────────────────
  {
    id: "strategy-builder",
    title: "Strategy Builder",
    section: "Strategy Builder",
    description:
      "Build quantitative strategies, backtest with real data and transaction costs, promote to production, generate trade lists.",
    keywords:
      "strategy builder quantitative backtest simulation transaction costs promote production trade list rebalance systematic",
    href: "/docs/strategy-builder",
  },
  {
    id: "strategy-builder-create",
    title: "Creating a Strategy",
    section: "Strategy Builder",
    description:
      "Set fund name, scheme name, iteration. Configure universe (NIFTY, SENSEX, BSE 500, custom screener), benchmark, and date.",
    keywords:
      "create strategy fund name scheme name iteration universe NIFTY SENSEX BSE 500 custom screener benchmark include futures FNO configuration",
    href: "/docs/strategy-builder#create",
  },
  {
    id: "strategy-builder-backtest",
    title: "Backtesting",
    section: "Strategy Builder",
    description:
      "Configure backtest: date range, rebalance schedule (weekly/monthly/quarterly), weight method (equal weight, momentum), stop loss, burn-in.",
    keywords:
      "backtest configure run date range start end rebalance schedule weekly monthly quarterly equal weight momentum stop loss total residual burn-in chunks walk-forward credits",
    href: "/docs/strategy-builder#backtesting",
  },
  {
    id: "strategy-builder-promote",
    title: "Promote & Demote",
    section: "Strategy Builder",
    description:
      "Promote backtested strategies to production. Production strategies can generate live rebalance trade lists. Demote to revert.",
    keywords:
      "promote demote production backtested live strategy status production tab revert",
    href: "/docs/strategy-builder#promote",
  },
  {
    id: "strategy-builder-rebalance",
    title: "Live Rebalance",
    section: "Strategy Builder",
    description:
      "Generate actionable trade lists: NEW BUY, INCREASE, REDUCE, EXIT, HOLD actions with quantities and prices.",
    keywords:
      "live rebalance trade list NEW BUY INCREASE REDUCE EXIT HOLD actions quantities prices symbol weight delta broker CSV download",
    href: "/docs/strategy-builder#rebalance",
  },

  // ─── Strategy Builder Constraints ─────────────────────────────────────────────
  {
    id: "strategy-builder-constraints",
    title: "Constraints & Objectives Guide",
    section: "Strategy Builder",
    description:
      "Full guide to all 7 constraint types and 4 objective types with parameters, JSON format, and recommended setups.",
    keywords:
      "constraints objectives guide JSON format bulk upload download parameters types position size beta turnover risk budget Sharpe tracking error",
    href: "/docs/strategy-builder/constraints",
  },
  {
    id: "constraint-position-size-bound",
    title: "Position Size Bound Constraint",
    section: "Strategy Builder",
    description:
      "Set min_weight and max_weight per stock. Prevents over-concentration. Typical range 2%–10%.",
    keywords:
      "position size bound min_weight max_weight allocation per stock concentration diversification 2% 10% constraint",
    href: "/docs/strategy-builder/constraints#constraints",
  },
  {
    id: "constraint-max-positions",
    title: "Maximum Number of Positions",
    section: "Strategy Builder",
    description:
      "Cap total holdings at max_positions stocks. Forces selection of highest-conviction names. Typical: 15–30.",
    keywords:
      "max positions maximum holdings cap stocks concentrated active exposure conviction 15 20 30 constraint",
    href: "/docs/strategy-builder/constraints#constraints",
  },
  {
    id: "constraint-max-capital",
    title: "Maximum Capital Constraint",
    section: "Strategy Builder",
    description:
      "Limit total deployed capital via max_capital (0–1). Hold cash reserve by setting below 1.0.",
    keywords:
      "max capital deployed cash reserve total weight limit fraction 0.9 0.95 constraint",
    href: "/docs/strategy-builder/constraints#constraints",
  },
  {
    id: "constraint-beta-exposure",
    title: "Beta Exposure Constraint",
    section: "Strategy Builder",
    description:
      "Keep portfolio beta in a band with min_beta and max_beta. Market-neutral near 0; defensive below 0.8.",
    keywords:
      "beta exposure constraint min_beta max_beta market neutral defensive aggressive band 0.7 1.2 sensitivity",
    href: "/docs/strategy-builder/constraints#constraints",
  },
  {
    id: "constraint-turnover",
    title: "Portfolio Turnover Constraint",
    section: "Strategy Builder",
    description:
      "Limit how much the portfolio trades at each rebalance with max_turnover. Reduces transaction costs.",
    keywords:
      "turnover constraint max_turnover trading costs transaction costs rebalance 30% 50% limit",
    href: "/docs/strategy-builder/constraints#constraints",
  },
  {
    id: "constraint-risk-budget",
    title: "Portfolio Risk Budget Constraint",
    section: "Strategy Builder",
    description:
      "Cap total annualized portfolio volatility with risk_budget. Useful for mandate-driven risk envelopes.",
    keywords:
      "risk budget constraint volatility annualized cap mandate low-risk income 15% aggressive 25%",
    href: "/docs/strategy-builder/constraints#constraints",
  },
  {
    id: "constraint-min-position-size",
    title: "Minimum Position Size Constraint",
    section: "Strategy Builder",
    description:
      "Ensure each held position is at least min_position_size (e.g., 1%). Avoids tiny unactionable allocations.",
    keywords:
      "minimum position size min_position_size tiny allocation floor meaningful 1% 2% 3%",
    href: "/docs/strategy-builder/constraints#constraints",
  },
  {
    id: "objective-sharpe",
    title: "Risk-Adjusted Return Objective (Maximize Sharpe)",
    section: "Strategy Builder",
    description:
      "Maximize Sharpe ratio — best risk-return trade-off. Most practical general-purpose objective.",
    keywords:
      "risk-adjusted return objective maximize Sharpe ratio general purpose risk return trade-off long only equity",
    href: "/docs/strategy-builder/constraints#objectives",
  },
  {
    id: "objective-minimize-risk",
    title: "Risk Minimization Objective",
    section: "Strategy Builder",
    description:
      "Minimum variance portfolio — lowest possible volatility. Best for capital preservation and defensive mandates.",
    keywords:
      "risk minimization minimize risk minimum variance low volatility capital preservation retiree defensive mandate",
    href: "/docs/strategy-builder/constraints#objectives",
  },
  {
    id: "objective-maximize-return",
    title: "Return Maximization Objective",
    section: "Strategy Builder",
    description:
      "Maximize expected portfolio return. Concentrated, aggressive — always pair with position size constraints.",
    keywords:
      "return maximization maximize return aggressive concentrated high conviction always use position size constraint",
    href: "/docs/strategy-builder/constraints#objectives",
  },
  {
    id: "objective-tracking-error",
    title: "Tracking Error Minimization Objective",
    section: "Strategy Builder",
    description:
      "Minimize deviation from a benchmark. Ideal for enhanced index funds and benchmark-aware mandates.",
    keywords:
      "tracking error minimization objective minimize TE benchmark aware enhanced index fund NIFTY 50 close to index",
    href: "/docs/strategy-builder/constraints#objectives",
  },

  // ─── Alpha Machine ─────────────────────────────────────────────────────────
  {
    id: "alpha-machine",
    title: "Alpha Machine",
    section: "Alpha Machine",
    description:
      "Quantitative research environment: VS Code in-browser IDE, build alpha models and screens, upload custom factors.",
    keywords:
      "alpha machine quantitative research environment VS Code IDE Python sandbox custom factors models screens signals alternative data",
    href: "/docs/alpha-machine",
  },
  {
    id: "alpha-machine-code-editor",
    title: "Code Editor",
    section: "Alpha Machine",
    description:
      "Full VS Code IDE (code-server) in your browser. Python sandbox with pandas, numpy, scikit-learn, cvxpy, yfinance, and more.",
    keywords:
      "code editor VS Code IDE browser Python sandbox pandas numpy scipy matplotlib scikit-learn statsmodels cvxpy yfinance isolated workspace terminal",
    href: "/docs/alpha-machine#code-editor",
  },
  {
    id: "alpha-machine-build-model",
    title: "Build Alpha Model",
    section: "Alpha Machine",
    description:
      "Combine multiple signals (momentum, value, quality) with weights to produce a score ranking stocks by attractiveness.",
    keywords:
      "build alpha model signals momentum value quality weights score rank stocks attractiveness factor combination custom model",
    href: "/docs/alpha-machine#build-model",
  },
  {
    id: "alpha-machine-build-screen",
    title: "Build Screen / Factor",
    section: "Alpha Machine",
    description:
      "Create custom screening factors by combining fundamental and technical indicators. Filter the stock universe.",
    keywords:
      "build screen factor custom screening fundamental technical indicators conditions P/E momentum filter universe criteria",
    href: "/docs/alpha-machine",
  },
  {
    id: "alpha-machine-upload-factors",
    title: "Upload Factors",
    section: "Alpha Machine",
    description:
      "Upload proprietary custom factor data (alternative data, sentiment scores) for use in models and analytics.",
    keywords:
      "upload factors custom factor proprietary alternative data sentiment scores upload file available optimizer analytics",
    href: "/docs/alpha-machine#upload-factors",
  },
  {
    id: "alpha-machine-alpha-scoring",
    title: "Alpha Scoring",
    section: "Alpha Machine",
    description:
      "Combine factor signals with weights to rank stocks. Higher scores indicate more attractive investment candidates.",
    keywords:
      "alpha scoring combine factors signals rank stocks attractive score composite multi-factor model weighting",
    href: "/docs/alpha-machine",
  },
  {
    id: "alpha-machine-ic-analysis",
    title: "IC Analysis",
    section: "Alpha Machine",
    description:
      "Information Coefficient — measures predictive power of alpha signals by correlating factor scores with future returns.",
    keywords:
      "IC analysis information coefficient predictive power alpha signals factor score future returns cross-sectional correlation signal quality",
    href: "/docs/alpha-machine",
  },

  // ─── Tools ────────────────────────────────────────────────────────────────
  {
    id: "tools",
    title: "Tools",
    section: "Tools",
    description:
      "Market research tools: stock screener, market heatmap, stock comparison, correlation matrix, AI prediction.",
    keywords:
      "tools market research screener heatmap comparison correlation AI prediction no portfolio required",
    href: "/docs/tools",
  },
  {
    id: "tools-screener",
    title: "Stock Screener",
    section: "Tools",
    description:
      "Filter and rank stocks by sector, P/E ratio, dividend yield. Results table with market cap, beta, forward P/E, and more.",
    keywords:
      "stock screener filter rank sector PE ratio P/E max dividend yield sort market cap beta forward PE fundamentals technical criteria",
    href: "/docs/tools#screener",
  },
  {
    id: "tools-heatmap",
    title: "Market Heatmap",
    section: "Tools",
    description:
      "Treemap showing the entire market at a glance. Rectangle size = market cap, color = daily change. Toggle US / India.",
    keywords:
      "heatmap treemap market visualization rectangle size market cap color daily change green red US India sector grouping hover",
    href: "/docs/tools#heatmap",
  },
  {
    id: "tools-compare",
    title: "Stock Comparison",
    section: "Tools",
    description:
      "Compare up to 5 stocks side by side. Normalized performance chart, time periods 1m–5y, fundamentals table.",
    keywords:
      "stock comparison compare 5 stocks normalized performance chart time period 1 month 3 months 1 year 5 years fundamentals table side by side",
    href: "/docs/tools#compare",
  },
  {
    id: "tools-correlation",
    title: "Correlation Matrix",
    section: "Tools",
    description:
      "Pearson correlation of daily returns for up to 10 stocks. Heatmap from −1.0 (red) to +1.0 (green).",
    keywords:
      "correlation matrix Pearson daily returns 10 stocks heatmap positive negative diversification co-movement 3 months 6 months 1 year 2 years",
    href: "/docs/tools#correlation",
  },
  {
    id: "tools-predict",
    title: "AI Predict",
    section: "Tools",
    description:
      "ML-powered stock prediction: direction, confidence, 5/10/20-day forecasts, signal breakdown, recommendation, VaR.",
    keywords:
      "AI predict ML prediction direction confidence 5 10 20 day forecast signal breakdown technical RSI MACD Bollinger momentum fundamental PE earnings sentiment recommendation BUY SELL HOLD VaR",
    href: "/docs/tools#predict",
  },

  // ─── Settings ────────────────────────────────────────────────────────────────
  {
    id: "settings",
    title: "Settings",
    section: "Settings",
    description:
      "Configure display currency (USD/INR), view live exchange rate, manage profile, keyboard shortcuts.",
    keywords:
      "settings currency USD INR dollar rupee exchange rate live profile keyboard shortcuts Cmd+K Esc Enter",
    href: "/docs/settings",
  },

  // ─── API Reference ────────────────────────────────────────────────────────────
  {
    id: "api-reference",
    title: "API Reference",
    section: "API Reference",
    description:
      "Complete REST API documentation. All endpoints return JSON. Authenticated endpoints require a Bearer token.",
    keywords:
      "API reference REST JSON endpoints Bearer token authentication base URL /api developer integration",
    href: "/docs/api-reference",
  },
  {
    id: "api-auth",
    title: "Authentication API",
    section: "API Reference",
    description:
      "POST /api/auth/register and POST /api/auth/login. Returns JWT access token.",
    keywords:
      "authentication API register login POST JWT access token Bearer authorization header",
    href: "/docs/api-reference#auth",
  },
  {
    id: "api-market-data",
    title: "Market Data API",
    section: "API Reference",
    description:
      "GET /api/quote, /api/quotes, /api/history, /api/technicals, /api/fundamentals, /api/options, /api/intel, /api/search.",
    keywords:
      "market data API quote quotes history OHLCV technicals RSI MACD Bollinger fundamentals income balance cashflow options calls puts intel news analyst insider search",
    href: "/docs/api-reference#market-data",
  },
  {
    id: "api-analytics",
    title: "Analytics API",
    section: "API Reference",
    description:
      "GET analytics endpoints: performance, return decomposition, holdings with factor exposures. Requires authentication.",
    keywords:
      "analytics API performance return decomposition holdings factor exposures portfolio_id authenticated",
    href: "/docs/api-reference#analytics",
  },
  {
    id: "api-strategies",
    title: "Strategies API",
    section: "API Reference",
    description:
      "List, create, promote, demote, and rebalance strategies. POST /api/strategies, promote, demote, rebalance.",
    keywords:
      "strategies API list create promote demote rebalance trade list POST GET strategy fund name universe constraints",
    href: "/docs/api-reference#strategies",
  },
  {
    id: "api-optimization",
    title: "Optimization API",
    section: "API Reference",
    description:
      "POST /api/optimize/smart — run portfolio optimizer. POST /api/optimize/efficient-frontier.",
    keywords:
      "optimization API POST optimize smart efficient frontier universe objective constraints expected return risk Sharpe weights",
    href: "/docs/api-reference#optimization",
  },

  // ─── Glossary ────────────────────────────────────────────────────────────────
  {
    id: "glossary",
    title: "Glossary",
    section: "Glossary",
    description:
      "A-Z definitions: Alpha, Backtest, Beta, CAGR, Drawdown, Factor, Sharpe, Tracking Error, VaR, Volatility, and more.",
    keywords:
      "glossary definitions terms A-Z Alpha Annualized Return Attribution Backtest Benchmark Beta Brinson CAGR Covariance CVXPY Drawdown Efficient Frontier Factor Factor Exposure Factor Return Idiosyncratic Long Only Market Cap Max Drawdown NIFTY NSE Objective PE Portfolio Weight Rebalancing Return Decomposition Sharpe Style Factor Tracking Error Transaction Costs Treemap Turnover Universe VaR Volatility Yahoo Finance Z-Score",
    href: "/docs/glossary",
  },
  {
    id: "glossary-alpha",
    title: "Alpha",
    section: "Glossary",
    description:
      "Return in excess of what the risk model predicts. True stock-picking skill, not explained by systematic factors.",
    keywords:
      "alpha excess return stock picking skill outperformance idiosyncratic positive negative risk model prediction",
    href: "/docs/glossary",
  },
  {
    id: "glossary-sharpe",
    title: "Sharpe Ratio",
    section: "Glossary",
    description:
      "Risk-adjusted performance measure: (Portfolio Return - Risk-Free Rate) / Volatility. Higher is better.",
    keywords:
      "Sharpe ratio risk-adjusted return risk-free rate volatility performance measure 1.0 excellent reward to risk",
    href: "/docs/glossary",
  },
  {
    id: "glossary-backtest",
    title: "Backtest",
    section: "Glossary",
    description:
      "Simulation of a strategy using historical data. Validates logic before deploying real capital.",
    keywords:
      "backtest simulation historical data strategy validation real capital out-of-sample in-sample past performance",
    href: "/docs/glossary",
  },
  {
    id: "glossary-drawdown",
    title: "Drawdown / Max Drawdown",
    section: "Glossary",
    description:
      "Decline from portfolio peak to trough. Max Drawdown is the worst such decline. Measures downside risk.",
    keywords:
      "drawdown max drawdown peak trough decline recovery downside risk worst case loss",
    href: "/docs/glossary",
  },
  {
    id: "glossary-efficient-frontier",
    title: "Efficient Frontier",
    section: "Glossary",
    description:
      "Set of portfolios offering the highest return for each risk level. Portfolios on the frontier are optimal.",
    keywords:
      "efficient frontier optimal portfolio highest return risk level mean variance Markowitz",
    href: "/docs/glossary",
  },
];
