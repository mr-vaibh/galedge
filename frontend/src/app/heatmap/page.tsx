"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, HeatmapSector, HeatmapStock } from "@/lib/api";
import { Button } from "@/components/ui/button";

// ── Color scale (finviz-style) ───────────────────────────────────────────────

function heatColor(pct: number): string {
  if (pct > 3) return "#006400";
  if (pct > 2) return "#0a7e0a";
  if (pct > 1) return "#1a8f1a";
  if (pct > 0.5) return "#2d9e2d";
  if (pct > 0) return "#3aaf3a";
  if (pct === 0) return "#333";
  if (pct > -0.5) return "#c04040";
  if (pct > -1) return "#b02020";
  if (pct > -2) return "#991010";
  if (pct > -3) return "#800808";
  return "#660000";
}

// ── Squarified treemap layout ────────────────────────────────────────────────

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface TreemapNode {
  id: string;
  value: number;
  label: string;
  sublabel?: string;
  changePct: number;
  children?: TreemapNode[];
  rect?: Rect;
  isSector?: boolean;
  onClick?: () => void;
}

function squarify(
  nodes: TreemapNode[],
  rect: Rect,
): TreemapNode[] {
  const totalValue = nodes.reduce((s, n) => s + n.value, 0);
  if (totalValue <= 0 || nodes.length === 0) return nodes;

  // Sort descending by value
  const sorted = [...nodes].sort((a, b) => b.value - a.value);
  layoutStrip(sorted, rect, totalValue);
  return sorted;
}

function layoutStrip(
  nodes: TreemapNode[],
  rect: Rect,
  totalValue: number,
) {
  if (nodes.length === 0) return;
  if (nodes.length === 1) {
    nodes[0].rect = { ...rect };
    return;
  }

  const { x, y, w, h } = rect;
  const horizontal = w >= h;

  let row: TreemapNode[] = [];
  let rowValue = 0;
  let remaining = [...nodes];
  let remainingValue = totalValue;

  function worstRatio(row: TreemapNode[], rowValue: number): number {
    const side = horizontal
      ? (rowValue / totalValue) * w
      : (rowValue / totalValue) * h;
    if (side === 0) return Infinity;

    let worst = 0;
    for (const n of row) {
      const other = horizontal
        ? (n.value / rowValue) * h
        : (n.value / rowValue) * w;
      const ratio = Math.max(side / other, other / side);
      if (ratio > worst) worst = ratio;
    }
    return worst;
  }

  let i = 0;
  while (i < remaining.length) {
    const node = remaining[i];
    const newRowValue = rowValue + node.value;
    const newRow = [...row, node];

    if (row.length === 0) {
      row = newRow;
      rowValue = newRowValue;
      i++;
      continue;
    }

    const currentWorst = worstRatio(row, rowValue);
    const newWorst = worstRatio(newRow, newRowValue);

    if (newWorst <= currentWorst) {
      row = newRow;
      rowValue = newRowValue;
      i++;
    } else {
      // Lay out this row
      const fraction = rowValue / totalValue;
      let rowRect: Rect;
      let remainRect: Rect;

      if (horizontal) {
        const rowW = fraction * w;
        rowRect = { x, y, w: rowW, h };
        remainRect = { x: x + rowW, y, w: w - rowW, h };
      } else {
        const rowH = fraction * h;
        rowRect = { x, y, w, h: rowH };
        remainRect = { x, y: y + rowH, w, h: h - rowH };
      }

      assignRowRects(row, rowRect, rowValue, !horizontal);

      // Recurse on remaining
      const rest = remaining.slice(i);
      const restValue = rest.reduce((s, n) => s + n.value, 0);
      layoutStrip(rest, remainRect, restValue);
      return;
    }
  }

  // Lay out final row
  assignRowRects(row, rect, rowValue, !horizontal);
}

function assignRowRects(
  row: TreemapNode[],
  rect: Rect,
  rowValue: number,
  vertical: boolean,
) {
  let offset = 0;
  for (const node of row) {
    const fraction = node.value / rowValue;
    if (vertical) {
      const nodeH = fraction * rect.h;
      node.rect = { x: rect.x, y: rect.y + offset, w: rect.w, h: nodeH };
      offset += nodeH;
    } else {
      const nodeW = fraction * rect.w;
      node.rect = { x: rect.x + offset, y: rect.y, w: nodeW, h: rect.h };
      offset += nodeW;
    }
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function HeatmapPage() {
  const router = useRouter();
  const [market, setMarket] = useState<"us" | "india">("us");
  const [sectors, setSectors] = useState<HeatmapSector[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 1200, h: 700 });
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    stock: HeatmapStock;
  } | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .heatmap(market)
      .then((r) => setSectors(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [market]);

  const updateDims = useCallback(() => {
    if (containerRef.current) {
      const w = containerRef.current.clientWidth;
      const h = Math.max(500, window.innerHeight - 160);
      setDims({ w, h });
    }
  }, []);

  useEffect(() => {
    updateDims();
    window.addEventListener("resize", updateDims);
    return () => window.removeEventListener("resize", updateDims);
  }, [updateDims]);

  // Build treemap layout
  const GAP = 2;
  const SECTOR_LABEL_H = 18;

  // First, lay out sectors
  const sectorNodes: TreemapNode[] = sectors.map((s) => ({
    id: s.sector,
    value: s.marketCap,
    label: s.sector,
    changePct: s.changePercent,
    isSector: true,
    children: s.stocks
      .filter((st) => st.marketCap > 0)
      .map((st) => ({
        id: st.symbol,
        value: st.marketCap,
        label: st.symbol,
        sublabel: st.name,
        changePct: st.changePercent,
        onClick: () => router.push(`/stock/${st.symbol}`),
      })),
  }));

  squarify(sectorNodes, { x: 0, y: 0, w: dims.w, h: dims.h });

  // Lay out stocks within each sector
  for (const sector of sectorNodes) {
    if (!sector.rect || !sector.children?.length) continue;
    const r = sector.rect;
    const innerRect = {
      x: r.x + GAP,
      y: r.y + SECTOR_LABEL_H + GAP,
      w: r.w - GAP * 2,
      h: r.h - SECTOR_LABEL_H - GAP * 2,
    };
    if (innerRect.w > 0 && innerRect.h > 0) {
      squarify(sector.children, innerRect);
    }
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Market Heatmap</h1>
          <p className="text-sm text-muted-foreground">
            Size = market cap, color = daily change
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            variant={market === "us" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMarket("us")}
          >
            US
          </Button>
          <Button
            variant={market === "india" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMarket("india")}
          >
            India
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative rounded-lg overflow-hidden border bg-[#1a1a1a]"
        style={{ height: dims.h }}
        onMouseLeave={() => setTooltip(null)}
      >
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-muted-foreground text-sm">Loading heatmap...</span>
          </div>
        ) : (
          <>
            {/* Sector labels */}
            {sectorNodes.map(
              (s) =>
                s.rect &&
                s.rect.w > 50 && (
                  <div
                    key={`label-${s.id}`}
                    className="absolute text-[10px] font-bold uppercase tracking-wider text-white/60 px-1 truncate pointer-events-none"
                    style={{
                      left: s.rect.x + GAP,
                      top: s.rect.y + 2,
                      width: s.rect.w - GAP * 2,
                      height: SECTOR_LABEL_H,
                      lineHeight: `${SECTOR_LABEL_H}px`,
                    }}
                  >
                    {s.label}
                  </div>
                )
            )}

            {/* Sector borders */}
            {sectorNodes.map(
              (s) =>
                s.rect && (
                  <div
                    key={`border-${s.id}`}
                    className="absolute border border-[#333] pointer-events-none"
                    style={{
                      left: s.rect.x,
                      top: s.rect.y,
                      width: s.rect.w,
                      height: s.rect.h,
                    }}
                  />
                )
            )}

            {/* Stock tiles */}
            {sectorNodes.flatMap(
              (s) =>
                s.children?.map((stock) => {
                  if (!stock.rect) return null;
                  const r = stock.rect;
                  const showLabel = r.w > 40 && r.h > 30;
                  const showPct = r.w > 35 && r.h > 20;
                  const large = r.w > 80 && r.h > 50;

                  return (
                    <div
                      key={stock.id}
                      className="absolute cursor-pointer transition-all hover:brightness-125 hover:z-10 flex flex-col items-center justify-center overflow-hidden"
                      style={{
                        left: r.x + 1,
                        top: r.y + 1,
                        width: r.w - 2,
                        height: r.h - 2,
                        backgroundColor: heatColor(stock.changePct),
                      }}
                      onClick={() =>
                        router.push(`/stock/${stock.id}`)
                      }
                      onMouseEnter={(e) =>
                        setTooltip({
                          x: e.clientX,
                          y: e.clientY,
                          stock: {
                            symbol: stock.id,
                            name: stock.sublabel || "",
                            marketCap: stock.value,
                            changePercent: stock.changePct,
                          },
                        })
                      }
                      onMouseMove={(e) =>
                        setTooltip((prev) =>
                          prev
                            ? { ...prev, x: e.clientX, y: e.clientY }
                            : null
                        )
                      }
                    >
                      {showLabel && (
                        <span
                          className={`font-bold text-white truncate leading-tight ${
                            large ? "text-sm" : "text-[10px]"
                          }`}
                        >
                          {stock.label}
                        </span>
                      )}
                      {showPct && (
                        <span
                          className={`text-white/90 leading-tight ${
                            large ? "text-xs" : "text-[9px]"
                          }`}
                        >
                          {stock.changePct >= 0 ? "+" : ""}
                          {stock.changePct.toFixed(2)}%
                        </span>
                      )}
                    </div>
                  );
                }) || []
            )}

            {/* Tooltip */}
            {tooltip && (
              <div
                className="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl pointer-events-none text-xs"
                style={{
                  left: tooltip.x + 12,
                  top: tooltip.y + 12,
                }}
              >
                <div className="font-bold text-white">
                  {tooltip.stock.symbol}
                </div>
                <div className="text-zinc-400">{tooltip.stock.name}</div>
                <div className="mt-1 flex items-center gap-3">
                  <span
                    className={
                      tooltip.stock.changePercent >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }
                  >
                    {tooltip.stock.changePercent >= 0 ? "+" : ""}
                    {tooltip.stock.changePercent.toFixed(2)}%
                  </span>
                  <span className="text-zinc-500">
                    MCap{" "}
                    {tooltip.stock.marketCap >= 1e12
                      ? `${(tooltip.stock.marketCap / 1e12).toFixed(2)}T`
                      : tooltip.stock.marketCap >= 1e9
                      ? `${(tooltip.stock.marketCap / 1e9).toFixed(1)}B`
                      : `${(tooltip.stock.marketCap / 1e6).toFixed(0)}M`}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
        <span>-3%</span>
        {[-3, -2, -1, -0.5, 0, 0.5, 1, 2, 3].map((v) => (
          <div
            key={v}
            className="w-6 h-3 rounded-sm"
            style={{ backgroundColor: heatColor(v) }}
          />
        ))}
        <span>+3%</span>
      </div>
    </div>
  );
}
