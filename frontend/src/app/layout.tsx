import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CurrencyProvider } from "@/lib/currency";
import { AuthProvider } from "@/lib/auth";
import { PortfolioProvider } from "@/lib/portfolio-context";
import { ExpandProvider } from "@/lib/expand-context";
import { AppShell } from "@/components/AppShell";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://galedge.byvaibhav.com";

export const metadata: Metadata = {
  title: {
    default: "Galedge Alpha — Systematic Investing Platform for India",
    template: "%s | Galedge",
  },
  description:
    "Build, backtest, and deploy quantitative investment strategies on 60+ years of NSE and US market data. Factor attribution, portfolio optimization, alpha models, IC analysis, screener, and live rebalancing — all in one platform. Free to start.",
  keywords: [
    "systematic investing India",
    "NSE backtesting",
    "portfolio optimizer India",
    "factor model NSE",
    "quantitative strategy",
    "Brinson attribution",
    "alpha model",
    "information coefficient",
    "portfolio analytics",
    "stock screener NSE",
    "NIFTY 500 backtesting",
    "risk factor model",
    "momentum value quality investing",
    "live rebalancing",
    "portfolio construction",
    "market heatmap India",
    "stock comparison India",
    "correlation matrix stocks",
    "fundamental analysis NSE",
    "Indian stock market analytics",
  ],
  verification: {
    google: "wNBPgyCM82GVZ-4nfvUVGBoxrx3SoP_3TLrYYinp9MI",
  },
  authors: [{ name: "Galedge", url: SITE_URL }],
  creator: "Galedge",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Galedge",
    title: "Galedge Alpha — Systematic Investing Platform for India",
    description:
      "Build and backtest quantitative strategies on 60+ years of NSE data. Factor attribution, portfolio optimizer, alpha models, screener, and live rebalancing.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Galedge Alpha — Systematic Investing Platform for India",
    description:
      "Build and backtest quantitative strategies on NSE data. Factor attribution, optimizer, alpha models, and live rebalancing. Free to start.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Galedge",
  url: SITE_URL,
  description:
    "Free, open-source stock market data platform with real-time prices, interactive charts, stock screener, market heatmap, options chains, fundamentals, and portfolio tracker.",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Real-time stock quotes",
    "Interactive candlestick charts",
    "Technical indicators (RSI, MACD, Bollinger Bands, SMA, EMA)",
    "Stock screener with filters",
    "Market heatmap by sector",
    "Stock comparison tool",
    "Correlation matrix",
    "Options chain viewer",
    "Fundamental analysis",
    "Insider trading data",
    "Analyst recommendations",
    "Portfolio tracker",
    "CSV export",
    "US and Indian market support (NSE/BSE)",
  ],
  creator: {
    "@type": "Organization",
    name: "Galedge",
    url: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full">
        <AuthProvider>
        <CurrencyProvider>
        <PortfolioProvider>
        <TooltipProvider>
        <ExpandProvider>
          <AppShell>{children}</AppShell>
        </ExpandProvider>
        </TooltipProvider>
        </PortfolioProvider>
        </CurrencyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
