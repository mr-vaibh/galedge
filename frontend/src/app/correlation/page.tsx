"use client";

import { useState, useEffect } from "react";
import { api, CorrelationResponse } from "@/lib/api";
import { SymbolMultiSelect } from "@/components/SymbolMultiSelect";
import { ExportButton } from "@/components/ExportButton";
import { Button } from "@/components/ui/button";

const PERIODS = [
  { label: "3M", value: "3mo" },
  { label: "6M", value: "6mo" },
  { label: "1Y", value: "1y" },
  { label: "2Y", value: "2y" },
];

function corrColor(val: number): string {
  if (val >= 0.8) return "rgba(16,185,129,0.6)";
  if (val >= 0.5) return "rgba(16,185,129,0.3)";
  if (val >= 0.2) return "rgba(16,185,129,0.1)";
  if (val >= -0.2) return "transparent";
  if (val >= -0.5) return "rgba(239,68,68,0.1)";
  if (val >= -0.8) return "rgba(239,68,68,0.3)";
  return "rgba(239,68,68,0.6)";
}

export default function CorrelationPage() {
  const [symbols, setSymbols] = useState<string[]>(["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS"]);
  const [period, setPeriod] = useState("1y");
  const [data, setData] = useState<CorrelationResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (symbols.length < 2) { setData(null); return; }
    setLoading(true);
    api.correlation(symbols, period).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [symbols, period]);

  const exportData = data
    ? data.matrix.map((row, i) => {
        const obj: Record<string, unknown> = { Symbol: data.symbols[i] };
        row.forEach((val, j) => { obj[data.symbols[j]] = val?.toFixed(4) ?? "—"; });
        return obj;
      })
    : [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Correlation Matrix</h1>
        <p className="text-sm text-muted-foreground">See how stocks move together (Pearson correlation of daily returns)</p>
      </div>

      <SymbolMultiSelect value={symbols} onChange={setSymbols} max={10} />

      <div className="flex items-center gap-2">
        {PERIODS.map((p) => (
          <Button key={p.value} variant={period === p.value ? "secondary" : "ghost"} size="sm" onClick={() => setPeriod(p.value)}>
            {p.label}
          </Button>
        ))}
        {data && <ExportButton data={exportData} filename={`correlation_${symbols.join("_")}`} />}
      </div>

      {loading ? (
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
      ) : data && data.matrix.length > 0 ? (
        <div className="rounded-lg border bg-card p-4 overflow-x-auto">
          <table className="text-sm">
            <thead>
              <tr>
                <th className="p-2" />
                {data.symbols.map((s) => (
                  <th key={s} className="p-2 text-center font-medium text-xs min-w-[80px]">{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.matrix.map((row, i) => (
                <tr key={data.symbols[i]}>
                  <td className="p-2 font-medium text-xs">{data.symbols[i]}</td>
                  {row.map((val, j) => (
                    <td
                      key={j}
                      className="p-2 text-center tabular-nums text-xs font-medium"
                      style={{
                        backgroundColor: corrColor(val),
                        fontWeight: i === j ? 700 : 400,
                      }}
                    >
                      {val != null ? val.toFixed(2) : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center gap-2 mt-4 text-[10px] text-muted-foreground">
            <span>Strong negative</span>
            <div className="flex gap-0.5">
              {[-0.9, -0.5, -0.2, 0, 0.2, 0.5, 0.9].map((v) => (
                <div key={v} className="w-6 h-4 rounded" style={{ backgroundColor: corrColor(v) }} />
              ))}
            </div>
            <span>Strong positive</span>
          </div>
        </div>
      ) : symbols.length < 2 ? (
        <div className="text-center text-muted-foreground py-12">Add at least 2 symbols to see correlations</div>
      ) : null}
    </div>
  );
}
