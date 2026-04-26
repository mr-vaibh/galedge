"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Pencil, Trash2, Plus, Loader2 } from "lucide-react";
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

export default function AlphaMachinePage() {
  const router = useRouter();
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("screeners");
  const [screens, setScreens] = useState<Screen[]>([]);
  const [userModels, setUserModels] = useState<AlphaModel[]>([]);
  const [platformModels, setPlatformModels] = useState<AlphaModel[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    setLoading(true);
    if (!token) { setLoading(false); return; }

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [screensRes, modelsRes] = await Promise.all([
        fetch(`${API_BASE}/api/alpha/screens`, { headers }).then(r => r.ok ? r.json() : []),
        fetch(`${API_BASE}/api/alpha/models`, { headers }).then(r => r.ok ? r.json() : { user_models: [], platform_models: [] }),
      ]);

      setScreens(Array.isArray(screensRes) ? screensRes : []);
      setUserModels(modelsRes.user_models || []);
      setPlatformModels(modelsRes.platform_models || []);
    } catch {
      // API might not be available
    }
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [token]);

  async function deleteScreen(id: number) {
    if (!token || !confirm("Delete this screen?")) return;
    await fetch(`${API_BASE}/api/alpha/screens/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchData();
  }

  async function deleteModel(id: number) {
    if (!token || !confirm("Delete this alpha model?")) return;
    await fetch(`${API_BASE}/api/alpha/models/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchData();
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
          <TabsTrigger value="screeners">Screener/Factors</TabsTrigger>
          <TabsTrigger value="alpha">Alpha Model</TabsTrigger>
        </TabsList>

        <TabsContent value="screeners" className="space-y-6 mt-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">User Created Screens</h2>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => router.push("/alpha-machine/build-screen")}>
                <Plus className="h-3 w-3" /> New Screen
              </Button>
            </div>
            <div className="rounded-lg border bg-card overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    {["Screen Name", "Description", "Created Date", "Modified Date", "Modify", "Delete"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></td></tr>
                  ) : screens.length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                      No screens created yet.{" "}
                      <button className="text-blue-400 hover:underline" onClick={() => router.push("/alpha-machine/build-screen")}>
                        Create your first screen
                      </button>
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
        </TabsContent>

        <TabsContent value="alpha" className="space-y-6 mt-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">User Created Alpha Models</h2>
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
                      No alpha models created yet.{" "}
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

          <div>
            <h2 className="text-sm font-semibold mb-3">Galedge Alphas</h2>
            <div className="rounded-lg border bg-card overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    {["Model Name", "Description", "Status"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {platformModels.length === 0 ? (
                    <tr><td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">Platform alphas coming soon</td></tr>
                  ) : (
                    platformModels.map((m) => (
                      <tr key={m.id} className="border-b border-border/30">
                        <td className="px-3 py-2 font-medium">{m.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{m.description}</td>
                        <td className="px-3 py-2"><Badge className="text-[8px] bg-emerald-600">{m.status}</Badge></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
