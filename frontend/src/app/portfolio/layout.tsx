import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio Tracker — Track Your Holdings",
  description:
    "Free portfolio tracker with live P&L. Add your holdings, track real-time gains and losses. No signup required — data stored locally in your browser.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
