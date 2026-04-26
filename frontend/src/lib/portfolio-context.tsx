"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface PortfolioContextType {
  selectedPortfolioId: number | null;
  selectedFundName: string | null;
  selectedSchemeName: string | null;
  selectPortfolio: (id: number, fund: string, scheme: string) => void;
  clearPortfolio: () => void;
}

const STORAGE_KEY = "galedge_selected_portfolio";

const PortfolioContext = createContext<PortfolioContextType>({
  selectedPortfolioId: null,
  selectedFundName: null,
  selectedSchemeName: null,
  selectPortfolio: () => {},
  clearPortfolio: () => {},
});

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [selectedPortfolioId, setId] = useState<number | null>(null);
  const [selectedFundName, setFund] = useState<string | null>(null);
  const [selectedSchemeName, setScheme] = useState<string | null>(null);

  // Load from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { id, fund, scheme } = JSON.parse(saved);
        setId(id);
        setFund(fund);
        setScheme(scheme);
      }
    } catch {}
  }, []);

  function selectPortfolio(id: number, fund: string, scheme: string) {
    setId(id);
    setFund(fund);
    setScheme(scheme);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ id, fund, scheme }));
    } catch {}
  }

  function clearPortfolio() {
    setId(null);
    setFund(null);
    setScheme(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  return (
    <PortfolioContext.Provider value={{
      selectedPortfolioId,
      selectedFundName,
      selectedSchemeName,
      selectPortfolio,
      clearPortfolio,
    }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  return useContext(PortfolioContext);
}
