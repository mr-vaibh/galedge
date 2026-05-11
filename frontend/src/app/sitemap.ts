import type { MetadataRoute } from "next";

const SITE_URL = "https://galedge.byvaibhav.com";

const POPULAR_STOCKS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "NFLX",
  "JPM", "V", "JNJ", "WMT", "UNH", "HD", "ORCL", "SBUX",
  "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
  "BAJFINANCE.NS", "BHARTIARTL.NS", "WIPRO.NS", "SBIN.NS", "MARUTI.NS",
  "TITAN.NS", "ASIANPAINT.NS", "LT.NS", "AXISBANK.NS", "KOTAKBANK.NS",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // ── Core app pages ────────────────────────────────────────────────────────
  const corePages: MetadataRoute.Sitemap = [
    { url: SITE_URL,                          lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${SITE_URL}/screener`,            lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: `${SITE_URL}/heatmap`,             lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: `${SITE_URL}/compare`,             lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${SITE_URL}/correlation`,         lastModified: now, changeFrequency: "weekly",  priority: 0.7 },
    { url: `${SITE_URL}/portfolio`,           lastModified: now, changeFrequency: "weekly",  priority: 0.7 },
    { url: `${SITE_URL}/predict`,             lastModified: now, changeFrequency: "weekly",  priority: 0.7 },
    { url: `${SITE_URL}/optimizer`,           lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${SITE_URL}/strategy-builder`,    lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${SITE_URL}/alpha-machine`,       lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${SITE_URL}/risk-model/factor-summary`,  lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/risk-model/stock-summary`,   lastModified: now, changeFrequency: "weekly",  priority: 0.7 },
    { url: `${SITE_URL}/login`,               lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/register`,            lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  // ── Docs pages ────────────────────────────────────────────────────────────
  const docPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/docs`,                                    lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/docs/getting-started`,                    lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/docs/concepts`,                           lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/docs/portfolio`,                          lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/docs/analytics`,                          lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/docs/risk-model`,                         lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/docs/optimizer`,                          lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/docs/strategy-builder`,                   lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/docs/strategy-builder/constraints`,       lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/docs/alpha-machine`,                      lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/docs/tools`,                              lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/docs/settings`,                           lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/docs/api-reference`,                      lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/docs/glossary`,                           lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];

  // ── Stock detail pages ────────────────────────────────────────────────────
  const stockPages: MetadataRoute.Sitemap = POPULAR_STOCKS.map((symbol) => ({
    url: `${SITE_URL}/stock/${symbol}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  return [...corePages, ...docPages, ...stockPages];
}
