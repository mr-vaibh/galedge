"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Pencil, Trash2, Plus, Loader2, Lock, Play, Copy } from "lucide-react";
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
  start_date: string | null;
  end_date: string | null;
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
const STANDARD_ALPHAS = [
  {
    id: "alpha_multifactor",
    name: "Galedge Multi-Factor Alpha",
    description: "Combines Value, Quality, and Momentum factors with equal weights across NIFTY 500.",
    tags: ["Multi-Factor", "NIFTY 500"],
    factors: ["Value", "Quality", "Momentum"],
  },
  {
    id: "alpha_quality_tilt",
    name: "Quality Tilt Alpha",
    description: "Overweights high-ROE, low-debt compounders. Designed to outperform in sideways markets.",
    tags: ["Quality", "Low Volatility"],
    factors: ["ROE", "DebtToEquity", "ProfitMargin"],
  },
  {
    id: "alpha_value_momentum",
    name: "Value + Momentum Combo",
    description: "Buys cheap stocks with positive price momentum — avoids value traps by requiring trend confirmation.",
    tags: ["Value", "Momentum"],
    factors: ["PE", "PB", "Price Momentum"],
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
                    {["Model Name", "Start Date", "End Date", "Status", "Delete"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="px-3 py-8 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></td></tr>
                  ) : userModels.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                      No alpha models yet.{" "}
                      <button className="text-blue-400 hover:underline" onClick={() => router.push("/alpha-machine/build-model")}>
                        Build your first model
                      </button>
                    </td></tr>
                  ) : (
                    userModels.map((m) => (
                      <tr key={m.id} className="border-b border-border/30 hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium">{m.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{m.start_date || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{m.end_date || "—"}</td>
                        <td className="px-3 py-2"><Badge className="text-[8px]">{m.status}</Badge></td>
                        <td className="px-3 py-2">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteModel(m.id)}>
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

          {/* Galedge Standard Alphas (locked) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lock className="h-3.5 w-3.5 text-amber-400" />
              <h2 className="text-sm font-semibold">Galedge Alphas</h2>
              <span className="text-[10px] text-muted-foreground">— Research-grade factor models built by the platform.</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {STANDARD_ALPHAS.map((m) => (
                <div key={m.id} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex flex-col gap-2">
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
                  <div className="flex gap-1 flex-wrap pt-1 border-t border-border/30">
                    {m.tags.map((t) => (
                      <span key={t} className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${TAG_COLORS[t] ?? "bg-muted text-muted-foreground"}`}>{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
