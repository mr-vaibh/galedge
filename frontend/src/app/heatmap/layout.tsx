import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Market Heatmap — Sector Performance Treemap",
  description:
    "Visual market heatmap showing sector performance. Rectangles sized by market cap, colored by daily change. Covers 170+ US and 50+ Indian stocks.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
