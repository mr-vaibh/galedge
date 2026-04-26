"use client";

import { useState } from "react";
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
import { Upload, Download } from "lucide-react";

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
  const [fund, setFund] = useState("");
  const [scheme, setScheme] = useState("");
  const [benchmark, setBenchmark] = useState("");

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
              <Select value={benchmark} onValueChange={(v) => v && setBenchmark(v)}>
                <SelectTrigger><SelectValue placeholder="Select Benchmark" /></SelectTrigger>
                <SelectContent>
                  {BENCHMARKS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Date</Label>
              <Input type="date" defaultValue="2026-04-24" />
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
          <div className="border-2 border-dashed border-border/50 rounded-lg p-12 text-center mb-4">
            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Drag files to upload</p>
            <p className="text-xs text-muted-foreground/60 my-1">OR</p>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Upload className="h-3 w-3" /> Browse Files
            </Button>
          </div>

          <div className="text-xs text-red-400 mb-4">
            <span className="font-medium">Note:</span> SEMV = Stock Equivalent Market Value (Uploaded values must be in crores)
          </div>

          {/* Example + Download Template */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium">Example</span>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
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

      <div className="flex justify-end">
        <Button className="bg-blue-600 hover:bg-blue-700">Proceed</Button>
      </div>
    </div>
  );
}
