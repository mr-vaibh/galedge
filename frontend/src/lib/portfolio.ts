const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export interface Holding {
  id: string;
  symbol: string;
  shares: number;
  buyPrice: number;
  buyDate: string;
}

const STORAGE_KEY = "galedge_portfolio";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("galedge_auth_token");
}

function getHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

// ── Local storage helpers ─────────────────────────────────────────────────────

function localGet(): Holding[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function localSet(holdings: Holding[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
}

// ── Public API — uses backend if logged in, localStorage otherwise ─────────────

export async function getHoldings(): Promise<Holding[]> {
  if (typeof window === "undefined") return [];
  if (!getToken()) return localGet();
  try {
    const res = await fetch(`${API_BASE}/api/tracker/holdings`, { headers: getHeaders() });
    if (!res.ok) return localGet();
    return await res.json();
  } catch {
    return localGet();
  }
}

export async function addHolding(h: Omit<Holding, "id">): Promise<Holding> {
  const newHolding: Holding = { ...h, id: crypto.randomUUID() };
  if (!getToken()) {
    const holdings = localGet();
    holdings.push(newHolding);
    localSet(holdings);
    return newHolding;
  }
  const all = await getHoldings();
  all.push(newHolding);
  await syncToServer(all);
  localSet(all);
  return newHolding;
}

export async function removeHolding(id: string): Promise<void> {
  if (!getToken()) {
    localSet(localGet().filter(h => h.id !== id));
    return;
  }
  try {
    await fetch(`${API_BASE}/api/tracker/holdings/${id}`, { method: "DELETE", headers: getHeaders() });
  } catch { /* fallback: sync full list */ }
  const all = (await getHoldings()).filter(h => h.id !== id);
  localSet(all);
}

export async function updateHolding(id: string, updates: Partial<Omit<Holding, "id">>): Promise<void> {
  const all = await getHoldings();
  const updated = all.map(h => h.id === id ? { ...h, ...updates } : h);
  localSet(updated);
  if (getToken()) await syncToServer(updated);
}

async function syncToServer(holdings: Holding[]) {
  try {
    await fetch(`${API_BASE}/api/tracker/holdings`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(holdings),
    });
  } catch { /* silent — localStorage is the fallback */ }
}

export async function migrateLocalToServer(): Promise<boolean> {
  if (!getToken()) return false;
  const local = localGet();
  if (local.length === 0) return false;
  await syncToServer(local);
  return true;
}
