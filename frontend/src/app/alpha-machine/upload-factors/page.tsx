"use client";

import { useState, useEffect, useRef } from "react";
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
import { RefreshCw, Upload, Trash2, Loader2, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

const SAMPLE_TEMPLATE = [
  { date: "20250204", symbol: "HDFCBANK", alpha: "0.318" },
  { date: "20250204", symbol: "RELIANCE", alpha: "0.137" },
  { date: "20250204", symbol: "TCS", alpha: "0.03" },
  { date: "20250204", symbol: "INFY", alpha: "0.211" },
  { date: "20250204", symbol: "POONAWALLA", alpha: "0.187" },
];

export default function UploadFactorsPage() {
  const { token } = useAuth();
  const [showUpload, setShowUpload] = useState(false);
  const [alphaName, setAlphaName] = useState("");
  const [alphaDesc, setAlphaDesc] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [models, setModels] = useState<{ user_models: Record<string, unknown>[]; platform_models: Record<string, unknown>[] }>({ user_models: [], platform_models: [] });
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  async function fetchModels() {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/alpha/models`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setModels(await res.json());
    } catch {}
    setLoading(false);
  }

  useEffect(() => { fetchModels(); }, [token]);

  async function handleUpload() {
    if (!alphaName || !selectedFile || !token) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("alpha_name", alphaName);
      formData.append("description", alphaDesc);
      formData.append("file", selectedFile);

      await fetch(`${API_BASE}/api/alpha/upload-factor`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      setShowUpload(false);
      setAlphaName("");
      setAlphaDesc("");
      setSelectedFile(null);
      fetchModels();
    } catch (e) {
      alert("Upload failed");
    }
    setUploading(false);
  }

  async function deleteModel(id: number) {
    if (!token || !confirm("Delete this alpha?")) return;
    await fetch(`${API_BASE}/api/alpha/models/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchModels();
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Alpha Models</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={fetchModels}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </Button>
          <Dialog open={showUpload} onOpenChange={setShowUpload}>
            <DialogTrigger>
              <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700">
                <Upload className="h-3.5 w-3.5" /> Upload Alpha
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader><DialogTitle>Upload Alpha</DialogTitle></DialogHeader>
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
                  <div
                    className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center cursor-pointer hover:border-border"
                    onClick={() => fileRef.current?.click()}
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv,.zip"
                      className="hidden"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                    {selectedFile ? (
                      <p className="text-sm text-emerald-400">{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</p>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                        <p className="text-xs text-muted-foreground">Click to select or drag CSV/ZIP file</p>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-medium">Example Format</span>
                  <table className="w-full mt-2 text-[11px]">
                    <thead><tr className="border-b border-border/50">
                      <th className="px-2 py-1.5 text-left text-muted-foreground">Date</th>
                      <th className="px-2 py-1.5 text-left text-muted-foreground">ExchangeSymbol</th>
                      <th className="px-2 py-1.5 text-right text-muted-foreground">Alpha</th>
                    </tr></thead>
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

                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                  onClick={handleUpload}
                  disabled={!alphaName || !selectedFile || uploading}
                >
                  {uploading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Alpha
                </Button>
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
                {["Alpha Name", "Description", "Status", "Delete"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="px-3 py-8 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></td></tr>
              ) : models.user_models.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">No alphas uploaded yet. Click "Upload Alpha" to add one.</td></tr>
              ) : (
                models.user_models.map((a) => (
                  <tr key={Number(a.id)} className="border-b border-border/30 hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium">{String(a.name)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{String(a.description || "—")}</td>
                    <td className="px-3 py-2"><Badge className="text-[8px] bg-blue-600">{String(a.status)}</Badge></td>
                    <td className="px-3 py-2">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteModel(Number(a.id))}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Platform Alphas */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Standard Alphas</h2>
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border/50 bg-muted/20">
                {["Alpha Name", "Description", "Status"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {models.platform_models.length === 0 ? (
                <tr><td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">Platform standard alphas coming soon</td></tr>
              ) : (
                models.platform_models.map((a) => (
                  <tr key={Number(a.id)} className="border-b border-border/30">
                    <td className="px-3 py-2 font-medium">{String(a.name)}</td>
                    <td className="px-3 py-2 text-muted-foreground text-[10px]">{String(a.description)}</td>
                    <td className="px-3 py-2"><Badge className="text-[8px] bg-emerald-600">{String(a.status)}</Badge></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
