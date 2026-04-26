"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export type CurrencyCode = "USD" | "INR";

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  symbol: string;
  rate: number;
  rateReady: boolean;
  rateFailed: boolean;
  rateUpdatedAt: string | null;
  convert: (value: number, fromCurrency?: string) => number;
  formatCurrency: (value: number, fromCurrency?: string) => string;
  formatCurrencyCompact: (value: number, fromCurrency?: string) => string;
}

const SYMBOLS: Record<CurrencyCode, string> = {
  USD: "$",
  INR: "₹",
};

const STORAGE_KEY = "galedge_currency";

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("USD");
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [rateReady, setRateReady] = useState(false);
  const [rateFailed, setRateFailed] = useState(false);
  const [rateUpdatedAt, setRateUpdatedAt] = useState<string | null>(null);

  // Load saved preference
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "USD" || saved === "INR") {
      setCurrencyState(saved);
    }
  }, []);

  // Fetch live exchange rate — no fallback
  useEffect(() => {
    async function fetchRate() {
      try {
        const res = await fetch(
          "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json"
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data?.usd?.inr) {
          setRates({ USD: 1, INR: data.usd.inr });
          setRateReady(true);
          setRateFailed(false);
          setRateUpdatedAt(new Date().toLocaleTimeString());
        } else {
          throw new Error("Invalid rate data");
        }
      } catch {
        setRateFailed(true);
        setRateReady(false);
      }
    }
    fetchRate();
  }, []);

  function setCurrency(c: CurrencyCode) {
    setCurrencyState(c);
    localStorage.setItem(STORAGE_KEY, c);
  }

  // When conversion is needed but rate isn't available, skip conversion
  // and show in the stock's native currency with its own symbol
  const canConvert = rateReady && rates !== null;

  const convert = useCallback(
    (value: number, fromCurrency?: string): number => {
      if (!value || isNaN(value)) return value;
      const from = (fromCurrency || "USD").toUpperCase();

      if (from === currency) return value;
      if (!canConvert || !rates) return value; // no conversion, return raw

      const inUSD = from === "USD" ? value : value / (rates[from] || 1);
      return inUSD * (rates[currency] || 1);
    },
    [currency, rates, canConvert]
  );

  // Determine which symbol to show: if conversion fails, use the source currency symbol
  const effectiveSymbol = useCallback(
    (fromCurrency?: string): string => {
      const from = (fromCurrency || "USD").toUpperCase() as CurrencyCode;
      if (from === currency) return SYMBOLS[currency];
      if (!canConvert) return SYMBOLS[from] || SYMBOLS.USD; // show native symbol
      return SYMBOLS[currency];
    },
    [currency, canConvert]
  );

  const formatCurrency = useCallback(
    (value: number, fromCurrency?: string): string => {
      if (value == null || isNaN(value)) return "—";
      const converted = convert(value, fromCurrency);
      const sym = effectiveSymbol(fromCurrency);
      return `${sym}${converted.toFixed(2)}`;
    },
    [convert, effectiveSymbol]
  );

  const formatCurrencyCompact = useCallback(
    (value: number, fromCurrency?: string): string => {
      if (value == null || isNaN(value)) return "—";
      const converted = convert(value, fromCurrency);
      const sym = effectiveSymbol(fromCurrency);
      const abs = Math.abs(converted);
      const sign = converted < 0 ? "-" : "";
      if (abs >= 1e12) return `${sign}${sym}${(abs / 1e12).toFixed(2)}T`;
      if (abs >= 1e9) return `${sign}${sym}${(abs / 1e9).toFixed(2)}B`;
      if (abs >= 1e6) return `${sign}${sym}${(abs / 1e6).toFixed(2)}M`;
      if (abs >= 1e3) return `${sign}${sym}${(abs / 1e3).toFixed(1)}K`;
      return `${sign}${sym}${abs.toFixed(2)}`;
    },
    [convert, effectiveSymbol]
  );

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        symbol: SYMBOLS[currency],
        rate: rates?.[currency] ?? 1,
        rateReady,
        rateFailed,
        rateUpdatedAt,
        convert,
        formatCurrency,
        formatCurrencyCompact,
      }}
    >
      {children}

      {/* Toast: shown when currency is not USD and rate fetch failed */}
      {rateFailed && currency !== "USD" && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-2 fade-in">
          <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm shadow-lg">
            <div className="font-medium">Currency conversion unavailable</div>
            <div className="text-xs mt-1 opacity-80">
              Could not fetch live exchange rate. Prices are shown in each stock&apos;s
              native currency ({SYMBOLS.USD} for US, {SYMBOLS.INR} for Indian stocks).
            </div>
          </div>
        </div>
      )}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
