import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CurrencyProvider } from "@/lib/currency";
import { AuthProvider } from "@/lib/auth";
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
    default: "Galedge — Free Stock Market Data",
    template: "%s | Galedge",
  },
  description:
    "Free, open-source stock market data platform. Real-time prices, interactive charts, stock screener, market heatmap, options chains, fundamentals, and portfolio tracker. Supports US and Indian (NSE/BSE) markets.",
  keywords: [
    "stock market",
    "stock screener",
    "market heatmap",
    "stock charts",
    "options chain",
    "technical indicators",
    "RSI",
    "MACD",
    "Bollinger Bands",
    "portfolio tracker",
    "NSE",
    "BSE",
    "Indian stocks",
    "free stock data",
    "stock comparison",
    "correlation matrix",
    "fundamental analysis",
    "insider trading",
    "analyst recommendations",
  ],
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
    title: "Galedge — Free Stock Market Data",
    description:
      "Real-time stock prices, charts, screener, heatmap, options, fundamentals, and portfolio tracker. Free and open-source. US + Indian markets.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Galedge — Free Stock Market Data",
    description:
      "Real-time stock prices, charts, screener, heatmap, options, fundamentals, and portfolio tracker. Free and open-source.",
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
        <TooltipProvider>
          <AppShell>{children}</AppShell>
        </TooltipProvider>
        </CurrencyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
