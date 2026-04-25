import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Correlation Matrix — Stock Price Correlations",
  description:
    "Analyze how stocks move together with a Pearson correlation matrix. Select up to 10 stocks and visualize their price return correlations.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
