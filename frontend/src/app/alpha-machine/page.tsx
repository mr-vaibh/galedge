"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Pencil, Trash2, Plus, Loader2, Lock, Play, Copy, Cpu, BarChart2, ArrowRight, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

interface Screen {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface AlphaModel {
  id: number;
  name: string;
  description: string;
  status: string;
  input_factors: string[];
  has_results: boolean;
  computed_at: string | null;
  n_stocks: number | null;
  start_date: string | null;
  end_date: string | null;
}

interface AlphaStock {
  rank: number;
  symbol: string;
  score: number;
  z_score: number;
  exposures: Record<string, number>;
}

// ── Hardcoded locked standard screens ────────────────────────────────────────
const STANDARD_SCREENS = [
  {
    id: "std_quality",
    name: "Quality Compounder",
    description: "High-ROE businesses with manageable debt and reasonable valuation. Classic quality filter.",
    query: "ROE > 15 AND PE < 30 AND DebtToEquity < 0.5 AND MarketCap > 1000",
    tags: ["Quality", "Large Cap"],
  },
  {
    id: "std_value",
    name: "Deep Value",
    description: "Statistically cheap stocks — low P/E, low P/B, with decent dividend cushion.",
    query: "PE < 12 AND PB < 1.5 AND DividendYield > 1.5 AND MarketCap > 500",
    tags: ["Value", "Dividend"],
  },
  {
    id: "std_garp",
    name: "GARP — Growth at Reasonable Price",
    description: "Growing businesses trading below fair value. Balances earnings growth with valuation.",
    query: "ROE > 18 AND PE < 25 AND EarningsGrowth > 10 AND MarketCap > 2000",
    tags: ["Growth", "Quality"],
  },
  {
    id: "std_dividend",
    name: "Dividend Aristocrat",
    description: "High-yield, profitable companies with low leverage. Income-focused portfolio building block.",
    query: "DividendYield > 3 AND ROE > 12 AND DebtToEquity < 1 AND PE < 20",
    tags: ["Dividend", "Income"],
  },
  {
    id: "std_smallcap_value",
    name: "Small Cap Value",
    description: "Under-researched small caps with strong fundamentals — higher risk, higher alpha potential.",
    query: "MarketCap < 5000 AND MarketCap > 200 AND PE < 15 AND ROE > 12 AND DebtToEquity < 0.7",
    tags: ["Small Cap", "Value"],
  },
  {
    id: "std_low_leverage",
    name: "Low Leverage Quality",
    description: "Fortress balance sheets with high profitability. Resilient in downturns.",
    query: "DebtToEquity < 0.3 AND ROE > 20 AND ProfitMargin > 12 AND MarketCap > 1000",
    tags: ["Quality", "Defensive"],
  },
  {
    id: "std_momentum",
    name: "Profitable Momentum",
    description: "Large-cap profitable businesses — proxy for momentum with quality guard.",
    query: "MarketCap > 5000 AND ROE > 20 AND ProfitMargin > 10 AND PE < 40",
    tags: ["Momentum", "Large Cap"],
  },
  {
    id: "std_roce",
    name: "Capital Efficiency Screen",
    description: "Stocks with exceptional capital allocation — ROCE > 25 ensures management uses equity well.",
    query: "ROCE > 25 AND PE < 35 AND MarketCap > 500",
    tags: ["Quality", "Capital Efficiency"],
  },
];

// ── Hardcoded locked Galedge Alpha models ────────────────────────────────────
// factor names must match Factor.name values in the risk model DB
const STANDARD_ALPHAS = [
  {
    id: "alpha_multifactor",
    name: "Galedge Multi-Factor Alpha",
    description: "Combines Value, Quality, and Momentum factors with equal weights across NIFTY 500.",
    tags: ["Multi-Factor", "NIFTY 500"],
    factors: ["VALUE", "PROFIT", "LTMOM"],
  },
  {
    id: "alpha_quality_tilt",
    name: "Quality Tilt Alpha",
    description: "Overweights high-ROE, low-debt compounders. Designed to outperform in sideways markets.",
    tags: ["Quality", "Low Volatility"],
    factors: ["PROFIT", "FINLVG", "EARNYILD"],
  },
  {
    id: "alpha_value_momentum",
    name: "Value + Momentum Combo",
    description: "Buys cheap stocks with positive price momentum — avoids value traps by requiring trend confirmation.",
    tags: ["Value", "Momentum"],
    factors: ["VALUE", "LTMOM", "EARNYILD"],
  },
];

const TAG_COLORS: Record<string, string> = {
  Quality: "bg-blue-500/15 text-blue-400",
  Value: "bg-amber-500/15 text-amber-400",
  Growth: "bg-emerald-500/15 text-emerald-400",
  Dividend: "bg-purple-500/15 text-purple-400",
  Income: "bg-purple-500/15 text-purple-400",
  Momentum: "bg-orange-500/15 text-orange-400",
  "Large Cap": "bg-neutral-500/15 text-neutral-400",
  "Small Cap": "bg-rose-500/15 text-rose-400",
  Defensive: "bg-cyan-500/15 text-cyan-400",
  "Capital Efficiency": "bg-indigo-500/15 text-indigo-400",
  "Multi-Factor": "bg-blue-500/15 text-blue-400",
  "Low Volatility": "bg-cyan-500/15 text-cyan-400",
  "NIFTY 500": "bg-neutral-500/15 text-neutral-400",
};

export default function AlphaMachinePage() {
  const router = useRouter();
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("screeners");
  const [screens, setScreens] = useState<Screen[]>([]);
  const [userModels, setUserModels] = useState<AlphaModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [computingId, setComputingId] = useState<number | null>(null);
  const [computingStdId, setComputingStdId] = useState<string | null>(null);
  const [resultsModel, setResultsModel] = useState<{
    model: AlphaModel;
    stocks: AlphaStock[];
    factorReturns: Record<string, number>;
    computedAt: string;
  } | null>(null);

  async function fetchData() {
    setLoading(true);
    if (!token) { setLoading(false); return; }
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [screensRes, modelsRes] = await Promise.all([
        fetch(`${API_BASE}/api/alpha/screens`, { headers }).then(r => r.ok ? r.json() : []),
        fetch(`${API_BASE}/api/alpha/models`, { headers }).then(r => r.ok ? r.json() : { user_models: [] }),
      ]);
      setScreens(Array.isArray(screensRes) ? screensRes : []);
      setUserModels(modelsRes.user_models || []);
    } catch { /* silent */ }
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [token]);

  async function deleteScreen(id: number) {
    if (!token || !confirm("Delete this screen?")) return;
    await fetch(`${API_BASE}/api/alpha/screens/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    fetchData();
  }

  async function deleteModel(id: number) {
    if (!token || !confirm("Delete this alpha model?")) return;
    await fetch(`${API_BASE}/api/alpha/models/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    fetchData();
  }

  async function cloneScreen(s: typeof STANDARD_SCREENS[0]) {
    if (!token) { router.push("/login"); return; }
    setCloningId(s.id);
    try {
      await fetch(`${API_BASE}/api/alpha/screens`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${s.name} (Copy)`,
          description: s.description,
          screener_query: s.query,
          score_equation: "",
          score_variable: "",
          parent_universe: "NIFTY 500",
          portfolio_weight: "equal",
        }),
      });
      setActiveTab("screeners");
      fetchData();
    } catch { /* silent */ }
    setCloningId(null);
  }

  async function computeModel(m: AlphaModel) {
    if (!token) return;
    setComputingId(m.id);
    try {
      const res = await fetch(`${API_BASE}/api/alpha/models/${m.id}/compute`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Computation failed" }));
        alert(err.detail || "Computation failed");
      } else {
        await fetchData();
      }
    } catch { alert("Could not connect to server"); }
    setComputingId(null);
  }

  async function computeStandardAlpha(s: typeof STANDARD_ALPHAS[0]) {
    if (!token) { router.push("/login"); return; }
    setComputingStdId(s.id);
    try {
      const res = await fetch(`${API_BASE}/api/alpha/compute-factors`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ factors: s.factors, top_n: 100 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Computation failed" }));
        alert(err.detail || "Computation failed — ensure the risk model has been built.");
      } else {
        const data = await res.json();
        setResultsModel({
          model: { id: -1, name: s.name, description: s.description, status: "available", input_factors: s.factors, has_results: true, computed_at: new Date().toISOString().slice(0, 10), n_stocks: data.n_stocks, start_date: null, end_date: null },
          stocks: data.stocks,
          factorReturns: data.factor_returns ?? {},
          computedAt: new Date().toISOString().slice(0, 10),
        });
      }
    } catch { alert("Could not connect to server"); }
    setComputingStdId(null);
  }

  async function viewResults(m: AlphaModel) {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/alpha/models/${m.id}/results?top_n=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { alert("No results yet. Click Compute first."); return; }
      const data = await res.json();
      setResultsModel({ model: m, stocks: data.stocks, factorReturns: data.factor_returns ?? {}, computedAt: data.computed_at ?? "" });
    } catch { alert("Failed to load results"); }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Alpha Machine</h1>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={fetchData}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </Button>
      </div>

      {!token && (
        <div className="rounded-lg border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">Login to create and manage screens and alpha models</p>
          <Button onClick={() => router.push("/login")} size="sm">Login</Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="screeners">Screener / Factors</TabsTrigger>
          <TabsTrigger value="alpha">Alpha Models</TabsTrigger>
        </TabsList>

        {/* ── Screeners Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="screeners" className="space-y-6 mt-4">

          {/* User screens */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">My Screens</h2>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => router.push("/alpha-machine/build-screen")}>
                <Plus className="h-3 w-3" /> New Screen
              </Button>
            </div>
            <div className="rounded-lg border bg-card overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    {["Screen Name", "Description", "Created", "Modified", "Edit", "Delete"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="px-3 py-8 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></td></tr>
                  ) : screens.length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                      No screens yet.{" "}
                      <button className="text-blue-400 hover:underline" onClick={() => router.push("/alpha-machine/build-screen")}>
                        Create your first screen
                      </button>{" "}or clone a Standard Alpha below.
                    </td></tr>
                  ) : (
                    screens.map((s) => (
                      <tr key={s.id} className="border-b border-border/30 hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium">{s.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{s.description || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{s.created_at?.slice(0, 10)}</td>
                        <td className="px-3 py-2 text-muted-foreground">{s.updated_at?.slice(0, 10)}</td>
                        <td className="px-3 py-2">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => router.push(`/alpha-machine/build-screen?id=${s.id}`)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </td>
                        <td className="px-3 py-2">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteScreen(s.id)}>
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

          {/* Standard locked screens */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lock className="h-3.5 w-3.5 text-amber-400" />
              <h2 className="text-sm font-semibold">Standard Alphas</h2>
              <span className="text-[10px] text-muted-foreground">— Pre-built by Galedge. Run or clone to customise.</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {STANDARD_SCREENS.map((s) => (
                <div key={s.id} className="rounded-lg border border-border/60 bg-card p-3 flex flex-col gap-2 hover:border-border transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Lock className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
                      <span className="text-[12px] font-semibold leading-tight">{s.name}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{s.description}</p>
                  <div className="font-mono text-[9px] bg-muted/40 rounded px-2 py-1.5 text-muted-foreground leading-relaxed truncate" title={s.query}>
                    {s.query}
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {s.tags.map((t) => (
                      <span key={t} className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${TAG_COLORS[t] ?? "bg-muted text-muted-foreground"}`}>{t}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 pt-1 border-t border-border/40 mt-auto">
                    <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 flex-1"
                      onClick={() => router.push(`/alpha-machine/build-screen?query=${encodeURIComponent(s.query)}`)}>
                      <Play className="h-3 w-3" /> Run
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 flex-1"
                      disabled={cloningId === s.id}
                      onClick={() => cloneScreen(s)}>
                      {cloningId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Copy className="h-3 w-3" />}
                      Clone
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── Alpha Models Tab ──────────────────────────────────────────────── */}
        <TabsContent value="alpha" className="space-y-6 mt-4">

          {/* User models */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">My Alpha Models</h2>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => router.push("/alpha-machine/build-model")}>
                <Plus className="h-3 w-3" /> New Model
              </Button>
            </div>
            <div className="rounded-lg border bg-card overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    {["Model", "Factors", "Status", "Stocks", "Computed", "Actions"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="px-3 py-8 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></td></tr>
                  ) : userModels.length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                      No alpha models yet.{" "}
                      <button className="text-blue-400 hover:underline" onClick={() => router.push("/alpha-machine/build-model")}>
                        Build your first model
                      </button>
                    </td></tr>
                  ) : (
                    userModels.map((m) => (
                      <tr key={m.id} className="border-b border-border/30 hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium">{m.name}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-0.5">
                            {(m.input_factors || []).slice(0, 4).map(f => (
                              <span key={f} className="text-[8px] px-1 py-0.5 rounded bg-blue-500/15 text-blue-400 font-mono">{f}</span>
                            ))}
                            {(m.input_factors || []).length > 4 && <span className="text-[8px] text-muted-foreground">+{(m.input_factors || []).length - 4}</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <Badge className={`text-[8px] ${m.status === "available" ? "bg-emerald-600" : m.status === "computing" ? "bg-amber-600" : ""}`}>
                            {m.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{m.n_stocks ?? "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground text-[10px]">{m.computed_at ?? "—"}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm" className="h-6 text-[9px] gap-0.5"
                              disabled={computingId === m.id}
                              onClick={() => computeModel(m)}>
                              {computingId === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Cpu className="h-3 w-3" />}
                              Compute
                            </Button>
                            {m.has_results && (
                              <Button variant="secondary" size="sm" className="h-6 text-[9px] gap-0.5"
                                onClick={() => viewResults(m)}>
                                <BarChart2 className="h-3 w-3" /> Results
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteModel(m.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Galedge Standard Alphas (locked) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lock className="h-3.5 w-3.5 text-amber-400" />
              <h2 className="text-sm font-semibold">Galedge Alphas</h2>
              <span className="text-[10px] text-muted-foreground">— Research-grade factor models built by the platform.</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {STANDARD_ALPHAS.map((m) => (
                <div key={m.id} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex flex-col gap-2 hover:border-amber-500/40 transition-colors">
                  <div className="flex items-center gap-1.5">
                    <Lock className="h-3 w-3 text-amber-400 shrink-0" />
                    <span className="text-[12px] font-semibold">{m.name}</span>
                    <Badge className="text-[8px] bg-amber-500/20 text-amber-400 border-0 ml-auto">Galedge</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{m.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {m.factors.map((f) => (
                      <span key={f} className="text-[9px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground font-mono">{f}</span>
                    ))}
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {m.tags.map((t) => (
                      <span key={t} className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${TAG_COLORS[t] ?? "bg-muted text-muted-foreground"}`}>{t}</span>
                    ))}
                  </div>
                  <div className="pt-1 border-t border-amber-500/20 mt-auto">
                    <Button size="sm" className="w-full h-7 text-[10px] gap-1.5 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/30"
                      variant="outline"
                      disabled={computingStdId === m.id}
                      onClick={() => computeStandardAlpha(m)}>
                      {computingStdId === m.id
                        ? <><Loader2 className="h-3 w-3 animate-spin" /> Computing...</>
                        : <><Cpu className="h-3 w-3" /> Compute & View Results</>}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Alpha Model Results Modal */}
      {resultsModel && (
        <Dialog open onOpenChange={() => setResultsModel(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-blue-400" />
                {resultsModel.model.name} — Alpha Scores
              </DialogTitle>
            </DialogHeader>

            {/* Factor returns summary */}
            <div className="flex flex-wrap gap-2 pb-2 border-b border-border/50">
              {Object.entries(resultsModel.factorReturns).map(([f, r]) => (
                <div key={f} className="flex items-center gap-1 px-2 py-1 rounded bg-muted/40">
                  <span className="text-[9px] font-mono text-muted-foreground">{f}</span>
                  <span className={`text-[9px] font-semibold ${r >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {r >= 0 ? "+" : ""}{(r * 100).toFixed(2)}%
                  </span>
                </div>
              ))}
              <span className="text-[9px] text-muted-foreground self-center ml-auto">Computed: {resultsModel.computedAt}</span>
            </div>

            {/* Use as Universe button */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{resultsModel.stocks.length} stocks ranked by alpha score</span>
              <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-[11px]"
                onClick={() => {
                  const symbols = resultsModel.stocks.slice(0, 50).map(s => s.symbol).join(",");
                  const label = encodeURIComponent(`${resultsModel.model.name} (Top 50)`);
                  router.push(`/strategy-builder/build?symbols=${symbols}&universe_label=${label}`);
                  setResultsModel(null);
                }}>
                <ArrowRight className="h-3.5 w-3.5" /> Use Top 50 in Strategy Builder
              </Button>
            </div>

            {/* Ranked stocks table */}
            <div className="overflow-y-auto max-h-[50vh] border rounded-lg">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-card border-b border-border/50">
                  <tr>
                    {["Rank", "Symbol", "Alpha Score", "Z-Score", ...Object.keys(resultsModel.factorReturns).map(f => `${f} Exp`)].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resultsModel.stocks.map((s) => (
                    <tr key={s.symbol} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="px-3 py-1.5 text-muted-foreground">{s.rank}</td>
                      <td className="px-3 py-1.5 font-medium">{s.symbol}</td>
                      <td className={`px-3 py-1.5 tabular-nums font-mono ${s.score >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {s.score >= 0 ? "+" : ""}{s.score.toFixed(4)}
                      </td>
                      <td className={`px-3 py-1.5 tabular-nums font-mono ${s.z_score >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {s.z_score >= 0 ? "+" : ""}{s.z_score.toFixed(2)}σ
                      </td>
                      {Object.keys(resultsModel.factorReturns).map(f => (
                        <td key={f} className="px-3 py-1.5 tabular-nums text-muted-foreground">
                          {s.exposures[f] != null ? s.exposures[f].toFixed(3) : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
