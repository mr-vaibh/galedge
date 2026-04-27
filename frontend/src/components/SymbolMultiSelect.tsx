"use client";

import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api, SearchResult } from "@/lib/api";

export function SymbolMultiSelect({
  value,
  onChange,
  max = 5,
  placeholder = "Add symbols...",
}: {
  value: string[];
  onChange: (symbols: string[]) => void;
  max?: number;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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
    if (timerRef.current) clearTimeout(timerRef.current);
    if (v.length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      try {
        const data = await api.search(v);
        setResults(data.filter((r) => !value.includes(r.symbol)));
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 300);
  }

  function addSymbol(symbol: string) {
    if (value.length >= max || value.includes(symbol)) return;
    onChange([...value, symbol]);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function removeSymbol(symbol: string) {
    onChange(value.filter((s) => s !== symbol));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && results.length > 0) {
      // Only allow adding from autocomplete results
      addSymbol(results[0].symbol);
    }
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex flex-wrap gap-1.5 items-center p-1.5 rounded-lg border bg-background min-h-[40px]">
        {value.map((s) => (
          <Badge key={s} variant="secondary" className="gap-1 pr-1">
            {s}
            <button
              onClick={() => removeSymbol(s)}
              className="ml-0.5 rounded-full hover:bg-muted p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {value.length < max && (
          <Input
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder={value.length === 0 ? placeholder : "Add more..."}
            className="flex-1 min-w-[120px] border-0 shadow-none focus-visible:ring-0 h-7 px-1"
          />
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-xl overflow-hidden z-50">
          {results.slice(0, 8).map((r) => (
            <button
              key={r.symbol}
              onClick={() => addSymbol(r.symbol)}
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
