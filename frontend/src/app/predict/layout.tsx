import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Stock Prediction — ML-Powered Trading Signals",
  description:
    "AI-powered stock predictions using XGBoost ensemble models. Get direction probability, entry/exit prices, position sizing, risk metrics, and backtest results.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
