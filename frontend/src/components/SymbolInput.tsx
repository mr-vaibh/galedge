"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { api, SearchResult } from "@/lib/api";

export function SymbolInput({
  value,
  onChange,
  placeholder = "AAPL",
  className = "w-[160px]",
}: {
  value: string;
  onChange: (symbol: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleChange(v: string) {
    setQuery(v);
    onChange(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (v.length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      try {
        const data = await api.search(v);
        setResults(data);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 300);
  }

  function handleSelect(symbol: string) {
    setQuery(symbol);
    onChange(symbol);
    setOpen(false);
    setResults([]);
  }

  return (
    <div ref={ref} className="relative">
      <Input
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className={className}
      />
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-xl overflow-hidden z-50 min-w-[240px]">
          {results.slice(0, 6).map((r) => (
            <button
              key={r.symbol}
              onClick={() => handleSelect(r.symbol)}
              className="w-full text-left px-3 py-2 hover:bg-accent flex items-center justify-between text-sm"
            >
              <div>
                <span className="font-medium">{r.symbol}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {r.name}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">{r.exchange}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
