"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export type CurrencyCode = "USD" | "INR";

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  symbol: string;
  rate: number; // conversion rate FROM USD TO selected currency
  convert: (value: number, fromCurrency?: string) => number;
  formatCurrency: (value: number, fromCurrency?: string) => string;
  formatCurrencyCompact: (value: number, fromCurrency?: string) => string;
}

const SYMBOLS: Record<CurrencyCode, string> = {
  USD: "$",
  INR: "₹",
};

// Fallback rate if API fails
const FALLBACK_RATES: Record<string, number> = {
  USD_TO_INR: 84.5,
  INR_TO_USD: 1 / 84.5,
};

const STORAGE_KEY = "galedge_currency";

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("USD");
  const [rates, setRates] = useState<Record<string, number>>({
    USD: 1,
    INR: FALLBACK_RATES.USD_TO_INR,
  });

  // Load saved preference
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "USD" || saved === "INR") {
      setCurrencyState(saved);
    }
  }, []);

  // Fetch live exchange rate
  useEffect(() => {
    async function fetchRate() {
      try {
        const res = await fetch(
          "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json"
        );
        const data = await res.json();
        if (data?.usd?.inr) {
          setRates({ USD: 1, INR: data.usd.inr });
        }
      } catch {
        // Use fallback
      }
    }
    fetchRate();
  }, []);

  function setCurrency(c: CurrencyCode) {
    setCurrencyState(c);
    localStorage.setItem(STORAGE_KEY, c);
  }

  const convert = useCallback(
    (value: number, fromCurrency?: string): number => {
      if (!value || isNaN(value)) return value;
      const from = (fromCurrency || "USD").toUpperCase();

      // If already in target currency, no conversion
      if (from === currency) return value;

      // Convert to USD first, then to target
      const inUSD = from === "USD" ? value : value / (rates[from] || rates.INR);
      return inUSD * (rates[currency] || 1);
    },
    [currency, rates]
  );

  const formatCurrency = useCallback(
    (value: number, fromCurrency?: string): string => {
      if (value == null || isNaN(value)) return "—";
      const converted = convert(value, fromCurrency);
      return `${SYMBOLS[currency]}${converted.toFixed(2)}`;
    },
    [currency, convert]
  );

  const formatCurrencyCompact = useCallback(
    (value: number, fromCurrency?: string): string => {
      if (value == null || isNaN(value)) return "—";
      const converted = convert(value, fromCurrency);
      const abs = Math.abs(converted);
      const sign = converted < 0 ? "-" : "";
      if (abs >= 1e12) return `${sign}${SYMBOLS[currency]}${(abs / 1e12).toFixed(2)}T`;
      if (abs >= 1e9) return `${sign}${SYMBOLS[currency]}${(abs / 1e9).toFixed(2)}B`;
      if (abs >= 1e6) return `${sign}${SYMBOLS[currency]}${(abs / 1e6).toFixed(2)}M`;
      if (abs >= 1e3) return `${sign}${SYMBOLS[currency]}${(abs / 1e3).toFixed(1)}K`;
      return `${sign}${SYMBOLS[currency]}${abs.toFixed(2)}`;
    },
    [currency, convert]
  );

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        symbol: SYMBOLS[currency],
        rate: rates[currency] || 1,
        convert,
        formatCurrency,
        formatCurrencyCompact,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
