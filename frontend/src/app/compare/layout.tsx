import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stock Comparison — Side-by-Side Analysis",
  description:
    "Compare up to 5 stocks side by side. Overlaid normalized price charts and fundamentals comparison table with P/E, margins, dividend yield, and more.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
