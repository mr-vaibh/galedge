import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio Optimizer — Mean-Variance with CVXPY",
  description:
    "Optimize portfolios using mean-variance optimization with CVXPY. 4 objective functions, 8 constraint types, efficient frontier computation.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
