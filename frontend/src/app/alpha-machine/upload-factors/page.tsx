"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Upload, Trash2, Maximize2, Minimize2 } from "lucide-react";

const USER_ALPHAS = [
  { name: "SampleFactor", desc: "No description available", start: "", end: "", freq: "", upload: "1.", status: "AVAILABLE" },
  { name: "TestFactor", desc: "No description available", start: "01-Jan-2023", end: "", freq: "", upload: "1.", status: "AVAILABLE" },
  { name: "factoring", desc: "No description available", start: "", end: "", freq: "", upload: "1.", status: "AVAILABLE" },
  { name: "test23", desc: "No description available", start: "", end: "", freq: "", upload: "1.", status: "AVAILABLE" },
  { name: "testing12", desc: "No description available", start: "", end: "", freq: "", upload: "1.", status: "AVAILABLE" },
  { name: "testingfile", desc: "No description available", start: "", end: "", freq: "", upload: "1.", status: "AVAILABLE" },
];

const STANDARD_ALPHAS = [
  { name: "Industry-Momentum (Q-5)", desc: "Industry return momentum computed as the return of an industry over the past 5 months minus the mean over the past 3 months", start: "01-Jan-2013", end: "05-Mar-2026", status: "AVAILABLE" },
  { name: "Industry-Momentum (Q-3)", desc: "Industry return momentum computed as the return of an industry over the past 3 months minus the mean over the past 3 months", start: "01-Jan-2013", end: "05-Mar-2026", status: "AVAILABLE" },
  { name: "Industry-Momentum (Q-1)", desc: "Industry return momentum computed as the return of an industry over the past 1 month", start: "01-Jan-2013", end: "05-Mar-2026", status: "AVAILABLE" },
  { name: "Residual-Momentum (Q-5)", desc: "Residual return momentum computed as the return of a stock 5 months minus the mean over the past 1 week", start: "01-Jan-2013", end: "05-Mar-2026", status: "AVAILABLE" },
  { name: "Residual-Momentum (Q-3)", desc: "Residual return momentum", start: "01-Jan-2013", end: "05-Mar-2026", status: "AVAILABLE" },
  { name: "Residual-Momentum (Q-1M)", desc: "Residual return momentum", start: "01-Jan-2013", end: "05-Mar-2026", status: "AVAILABLE" },
];

const SAMPLE_TEMPLATE = [
  { date: "20250204", symbol: "HDFCBANK", alpha: "0.318" },
  { date: "20250204", symbol: "RELIANCE", alpha: "0.137" },
  { date: "20250204", symbol: "TCS", alpha: "0.03" },
  { date: "20250204", symbol: "INFY", alpha: "0.211" },
  { date: "20250204", symbol: "POONAWALLA", alpha: "0.187" },
];

export default function UploadFactorsPage() {
  const [showUpload, setShowUpload] = useState(false);
  const [alphaName, setAlphaName] = useState("");
  const [alphaDesc, setAlphaDesc] = useState("");

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Alpha Models</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Dialog open={showUpload} onOpenChange={setShowUpload}>
            <DialogTrigger>
              <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700">
                <Upload className="h-3.5 w-3.5" /> Upload Alpha
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Upload Alpha</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Alpha Name</Label>
                  <Input placeholder="Enter Alpha Name" value={alphaName} onChange={(e) => setAlphaName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Description</Label>
                  <Input placeholder="Enter Description" value={alphaDesc} onChange={(e) => setAlphaDesc(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Upload CSV/ZIP</Label>
                  <div className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground">Drag files to upload</p>
                    <p className="text-[10px] text-muted-foreground/60">OR</p>
                    <Button variant="outline" size="sm" className="mt-2 gap-1.5">
                      <Upload className="h-3 w-3" /> Browse Files
                    </Button>
                  </div>
                </div>

                {/* Download Template */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Download Template</span>
                  <Tabs defaultValue="csv">
                    <TabsList className="h-7">
                      <TabsTrigger value="csv" className="text-[10px] h-6">CSV</TabsTrigger>
                      <TabsTrigger value="zip" className="text-[10px] h-6">ZIP</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Example Table */}
                <div>
                  <span className="text-xs font-medium">Example Table</span>
                  <table className="w-full mt-2 text-[11px]">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="px-2 py-1.5 text-left text-muted-foreground">Date</th>
                        <th className="px-2 py-1.5 text-left text-muted-foreground">ExchangeSymbol</th>
                        <th className="px-2 py-1.5 text-right text-muted-foreground">Alpha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SAMPLE_TEMPLATE.map((r, i) => (
                        <tr key={i} className="border-b border-border/30">
                          <td className="px-2 py-1">{r.date}</td>
                          <td className="px-2 py-1">{r.symbol}</td>
                          <td className="px-2 py-1 text-right tabular-nums">{r.alpha}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Button className="w-full bg-emerald-600 hover:bg-emerald-700">Save Alpha</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* User Created Alphas */}
      <div>
        <h2 className="text-sm font-semibold mb-3">User Created Alphas</h2>
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border/50 bg-muted/20">
                {["Alpha Name", "Description", "Start Date", "End Date", "Frequency", "Upload", "Status", "Delete"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {USER_ALPHAS.map((a) => (
                <tr key={a.name} className="border-b border-border/30 hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{a.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{a.desc}</td>
                  <td className="px-3 py-2 text-muted-foreground">{a.start || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{a.end || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{a.freq || "—"}</td>
                  <td className="px-3 py-2"><Badge variant="outline" className="text-[9px]">{a.upload}</Badge></td>
                  <td className="px-3 py-2"><Badge className="text-[9px] bg-blue-600">{a.status}</Badge></td>
                  <td className="px-3 py-2">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Standard Alphas */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Standard Alphas</h2>
          <Button variant="ghost" size="icon" className="h-6 w-6"><Maximize2 className="h-3 w-3" /></Button>
        </div>
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border/50 bg-muted/20">
                {["Alpha Name", "Description", "Start Date", "End Date", "Status"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STANDARD_ALPHAS.map((a) => (
                <tr key={a.name} className="border-b border-border/30 hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{a.name}</td>
                  <td className="px-3 py-2 text-muted-foreground text-[10px] max-w-[300px]">{a.desc}</td>
                  <td className="px-3 py-2 text-muted-foreground">{a.start}</td>
                  <td className="px-3 py-2 text-muted-foreground">{a.end}</td>
                  <td className="px-3 py-2"><Badge className="text-[9px] bg-emerald-600">{a.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
