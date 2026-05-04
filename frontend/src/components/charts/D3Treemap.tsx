"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { treemap, hierarchy } from "d3-hierarchy";

export interface TreemapNode {
  id: string;
  label: string;
  sublabel?: string;
  value: number;   // used for color (can be negative)
  size: number;    // used for sizing (always positive)
}

interface Props {
  nodes: TreemapNode[];
  height?: number;
  colorFn?: (value: number) => string;
  onSelect?: (id: string) => void;
  selectedId?: string | null;
  padding?: number;
}

function defaultColor(v: number): string {
  if (v > 10) return "#14532d";
  if (v > 5)  return "#166534";
  if (v > 2)  return "#15803d";
  if (v > 0)  return "#16a34a";
  if (v > -2) return "#991b1b";
  if (v > -5) return "#b91c1c";
  if (v > -10)return "#dc2626";
  return "#7f1d1d";
}

interface Leaf {
  id: string;
  label: string;
  sublabel?: string;
  value: number;
  x0: number; y0: number; x1: number; y1: number;
}

export function D3Treemap({
  nodes,
  height = 260,
  colorFn = defaultColor,
  onSelect,
  selectedId,
  padding = 2,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const leaves = useMemo<Leaf[]>(() => {
    if (!nodes.length || width < 10) return [];

    const root = hierarchy<{ children?: TreemapNode[] }>({ children: nodes })
      .sum((d) => {
        const n = d as unknown as TreemapNode;
        return typeof n.size === "number" ? Math.max(n.size, 0.01) : 0;
      })
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    treemap<{ children?: TreemapNode[] }>()
      .size([width, height])
      .paddingInner(padding)
      .paddingOuter(padding)(root);

    return root.leaves().map((leaf) => {
      const d = leaf.data as unknown as TreemapNode;
      return {
        id: d.id,
        label: d.label,
        sublabel: d.sublabel,
        value: d.value,
        x0: (leaf as unknown as { x0: number }).x0,
        y0: (leaf as unknown as { y0: number }).y0,
        x1: (leaf as unknown as { x1: number }).x1,
        y1: (leaf as unknown as { y1: number }).y1,
      };
    });
  }, [nodes, width, height, padding]);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", height }} className="overflow-hidden rounded">
      {leaves.map((leaf) => {
        const w = leaf.x1 - leaf.x0;
        const h = leaf.y1 - leaf.y0;
        const isSelected = leaf.id === selectedId;
        const bg = colorFn(leaf.value);
        const sign = leaf.value >= 0 ? "+" : "";
        const pctStr = `${sign}${leaf.value.toFixed(2)} %`;
        const small = w < 70 || h < 45;
        const tiny = w < 45 || h < 32;

        return (
          <div
            key={leaf.id}
            onClick={() => onSelect?.(leaf.id)}
            title={`${leaf.label}\n${pctStr}`}
            style={{
              position: "absolute",
              left: leaf.x0,
              top: leaf.y0,
              width: w,
              height: h,
              backgroundColor: bg,
              boxSizing: "border-box",
              cursor: onSelect ? "pointer" : "default",
              outline: isSelected ? "2px solid rgba(255,255,255,0.5)" : undefined,
              outlineOffset: isSelected ? "-2px" : undefined,
              transition: "filter 0.15s",
              borderRadius: 3,
            }}
            className="hover:brightness-110 overflow-hidden flex flex-col justify-between p-[5px]"
          >
            {!tiny && (
              <span
                className="text-white/90 leading-tight font-normal"
                style={{ fontSize: small ? 7 : 9 }}
              >
                {leaf.label}
              </span>
            )}
            {!tiny && leaf.sublabel && (
              <span className="text-white/60 leading-tight" style={{ fontSize: 7 }}>
                {leaf.sublabel}
              </span>
            )}
            {!tiny && (
              <span
                className="text-white font-semibold tabular-nums leading-none"
                style={{ fontSize: small ? 9 : 11 }}
              >
                {pctStr}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
