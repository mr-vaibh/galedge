export interface Holding {
  id: string;
  symbol: string;
  shares: number;
  buyPrice: number;
  buyDate: string;
}

const STORAGE_KEY = "galedge_portfolio";

export function getHoldings(): Holding[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addHolding(h: Omit<Holding, "id">): Holding {
  const holdings = getHoldings();
  const newHolding: Holding = { ...h, id: crypto.randomUUID() };
  holdings.push(newHolding);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
  return newHolding;
}

export function removeHolding(id: string): void {
  const holdings = getHoldings().filter((h) => h.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
}

export function updateHolding(
  id: string,
  updates: Partial<Omit<Holding, "id">>
): void {
  const holdings = getHoldings().map((h) =>
    h.id === id ? { ...h, ...updates } : h
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
}
