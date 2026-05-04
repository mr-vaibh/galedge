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

// Rich financial-terminal color palette
function defaultColor(v: number): string {
  if (v > 10) return "#0d4a24";
  if (v > 5)  return "#125c2e";
  if (v > 2)  return "#166534";
  if (v > 0)  return "#1a7a3c";
  if (v > -2) return "#9b1c1c";
  if (v > -5) return "#8b1111";
  if (v > -10)return "#7a0f0f";
  return "#660c0c";
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
      .paddingOuter(0)(root);

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
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height }}
      className="overflow-hidden"
    >
      {leaves.map((leaf) => {
        const w = leaf.x1 - leaf.x0;
        const h = leaf.y1 - leaf.y0;
        const isSelected = leaf.id === selectedId;
        const bg = colorFn(leaf.value);
        const sign = leaf.value >= 0 ? "+" : "";
        const pctStr = `${sign}${leaf.value.toFixed(2)} %`;

        // Adaptive font sizes based on cell dimensions
        const large = w > 140 && h > 90;
        const medium = w > 90 && h > 55;
        const showLabel = w > 50 && h > 40;
        const showValue = w > 35 && h > 28;

        const labelSize = large ? 12 : medium ? 10 : 9;
        const valueSize = large ? 18 : medium ? 14 : 11;
        const pad = large ? 10 : medium ? 8 : 5;

        return (
          <div
            key={leaf.id}
            onClick={() => onSelect?.(leaf.id)}
            title={`${leaf.label}: ${pctStr}`}
            style={{
              position: "absolute",
              left: leaf.x0,
              top: leaf.y0,
              width: w,
              height: h,
              backgroundColor: bg,
              // Metallic gradient: bright top-left, dark bottom-right
              backgroundImage: [
                `linear-gradient(135deg,`,
                `rgba(255,255,255,0.12) 0%,`,
                `rgba(255,255,255,0.04) 40%,`,
                `rgba(0,0,0,0.18) 100%)`,
              ].join(" "),
              boxSizing: "border-box",
              cursor: onSelect ? "pointer" : "default",
              // Selected: bright ring; default: subtle inset depth
              boxShadow: isSelected
                ? "inset 0 0 0 2px rgba(255,255,255,0.55), inset 0 1px 0 rgba(255,255,255,0.3)"
                : "inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.3)",
              transition: "filter 0.12s, box-shadow 0.12s",
              padding: pad,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              overflow: "hidden",
            }}
            className="hover:brightness-110"
          >
            {/* Event name — top */}
            {showLabel && (
              <span
                style={{
                  fontSize: labelSize,
                  color: "rgba(255,255,255,0.88)",
                  lineHeight: 1.25,
                  fontWeight: 400,
                  letterSpacing: "0.01em",
                  display: "-webkit-box",
                  WebkitLineClamp: large ? 3 : 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {leaf.label}
              </span>
            )}

            {/* Percentage — bottom */}
            {showValue && (
              <span
                style={{
                  fontSize: valueSize,
                  color: "rgba(255,255,255,0.97)",
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                  textShadow: "0 1px 3px rgba(0,0,0,0.4)",
                }}
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
