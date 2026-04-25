import type { MetadataRoute } from "next";

const SITE_URL = "https://galedge.byvaibhav.com";

const POPULAR_STOCKS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "NFLX",
  "JPM", "V", "JNJ", "WMT", "UNH", "HD",
  "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily" as const, priority: 1 },
    { url: `${SITE_URL}/screener`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${SITE_URL}/heatmap`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${SITE_URL}/compare`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.8 },
    { url: `${SITE_URL}/correlation`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${SITE_URL}/portfolio`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.7 },
  ];

  const stockPages = POPULAR_STOCKS.map((symbol) => ({
    url: `${SITE_URL}/stock/${symbol}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...stockPages];
}
