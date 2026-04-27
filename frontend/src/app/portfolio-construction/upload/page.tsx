"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Download, Loader2, CheckCircle2 } from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

const BENCHMARKS = [
  "NIFTY 50", "NIFTY 500", "NIFTY 100", "NIFTY 200", "SENSEX", "BSE 500",
  "NIFTY MIDCAP 150", "NIFTY SMALLCAP 250",
];

const SAMPLE_TEMPLATE = [
  { symbol: "HDFCBANK", semv: "3.18" },
  { symbol: "RELIANCE", semv: "1.37" },
  { symbol: "TCS", semv: "0.3" },
];

export default function UploadPortfolioPage() {
  const router = useRouter();
  const { token, loading: authLoading } = useRequireAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fund, setFund] = useState("");
  const [scheme, setScheme] = useState("");
  const [benchmark, setBenchmark] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };

  const handleDownloadTemplate = () => {
    const header = "ExchangeSymbol,SEMV";
    const rows = SAMPLE_TEMPLATE.map((r) => `${r.symbol},${r.semv}`);
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "portfolio_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleProceed = async () => {
    if (!fund.trim()) {
      setError("Fund name is required");
      return;
    }
    if (!file) {
      setError("Please upload a CSV file");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Step 1: Create portfolio
      const createRes = await fetch(`${API_BASE}/api/portfolios/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fund_name: fund,
          scheme_name: scheme,
          benchmark: benchmark || "NIFTY 500",
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => null);
        const detail = err?.detail;
        const msg = typeof detail === "string" ? detail
          : Array.isArray(detail) ? detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join(", ")
          : `Failed to create portfolio (${createRes.status})`;
        throw new Error(msg);
      }

      const portfolio = await createRes.json();
      const portfolioId = portfolio.id;

      // Step 2: Upload holdings CSV
      const formData = new FormData();
      formData.append("file", file);
      formData.append("holding_date", date);

      const uploadRes = await fetch(`${API_BASE}/api/portfolios/${portfolioId}/upload-holdings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => null);
        const detail = err?.detail;
        const msg = typeof detail === "string" ? detail
          : Array.isArray(detail) ? detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join(", ")
          : `Failed to upload holdings (${uploadRes.status})`;
        throw new Error(msg);
      }

      // Step 3: Navigate to portfolio selection
      router.push("/portfolio-construction/select");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Upload Portfolio</h1>

      {/* Header Fields */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Fund</Label>
              <Input placeholder="Enter Fund Name" value={fund} onChange={(e) => setFund(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Scheme</Label>
              <Input placeholder="Enter Scheme Name" value={scheme} onChange={(e) => setScheme(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Benchmark</Label>
              <Select value={benchmark} onValueChange={(v) => { if (typeof v === "string") setBenchmark(v); }}>
                <SelectTrigger><SelectValue placeholder="Select Benchmark" /></SelectTrigger>
                <SelectContent>
                  {BENCHMARKS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload CSV */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Upload CSV</CardTitle>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <div
            className="border-2 border-dashed border-border/50 rounded-lg p-12 text-center mb-4 cursor-pointer hover:border-border transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {file ? (
              <>
                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-500" />
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1.5"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                >
                  Remove
                </Button>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Drag files to upload</p>
                <p className="text-xs text-muted-foreground/60 my-1">OR</p>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Upload className="h-3 w-3" /> Browse Files
                </Button>
              </>
            )}
          </div>

          <div className="text-xs text-red-400 mb-4">
            <span className="font-medium">Note:</span> SEMV = Stock Equivalent Market Value (Uploaded values must be in crores)
          </div>

          {/* Example + Download Template */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium">Example</span>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleDownloadTemplate}>
              <Download className="h-3 w-3" /> Download Template — CSV
            </Button>
          </div>

          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-3 py-2 text-left text-muted-foreground">ExchangeSymbol</th>
                <th className="px-3 py-2 text-right text-muted-foreground">SEMV</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_TEMPLATE.map((r) => (
                <tr key={r.symbol} className="border-b border-border/30">
                  <td className="px-3 py-1.5">{r.symbol}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{r.semv}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {error && (
        <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          className="bg-blue-600 hover:bg-blue-700 gap-1.5"
          onClick={handleProceed}
          disabled={loading}
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {loading ? "Uploading..." : "Proceed"}
        </Button>
      </div>
    </div>
  );
}
