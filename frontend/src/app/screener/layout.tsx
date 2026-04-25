import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stock Screener — Filter by P/E, Sector, Dividend Yield",
  description:
    "Free stock screener. Filter US and Indian stocks by sector, P/E ratio, dividend yield, market cap, and more. Sort and export results as CSV.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
