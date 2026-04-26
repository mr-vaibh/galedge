"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface PortfolioContextType {
  selectedPortfolioId: number | null;
  selectedFundName: string | null;
  selectedSchemeName: string | null;
  selectPortfolio: (id: number, fund: string, scheme: string) => void;
  clearPortfolio: () => void;
}

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

  function selectPortfolio(id: number, fund: string, scheme: string) {
    setId(id);
    setFund(fund);
    setScheme(scheme);
  }

  function clearPortfolio() {
    setId(null);
    setFund(null);
    setScheme(null);
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
