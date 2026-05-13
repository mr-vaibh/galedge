"use client";

import { useState, useCallback, useRef } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
} from "recharts";

const COLORS = ["#f97316", "#eab308", "#10b981", "#3b82f6", "#a855f7", "#ef4444", "#06b6d4", "#ec4899"];

interface Series {
  key: string;
  name: string;
  color?: string;
}

interface Props {
  data: Record<string, unknown>[];
  series: Series[];
  xKey?: string;
  height?: number;
  yFormatter?: (v: number) => string;
}

function RangeDeltaPanel({
  data, series, xKey, start, end, yFormatter, colors,
}: {
  data: Record<string, unknown>[];
  series: Series[];
  xKey: string;
  start: string;
  end: string;
  yFormatter: (v: number) => string;
  colors: Record<string, string>;
}) {
  const [a, b] = start < end ? [start, end] : [end, start];

  const closest = (label: string) =>
    data.reduce((best, row) => {
      const rk = String(row[xKey] ?? "");
      return Math.abs(rk.localeCompare(label)) < Math.abs(String(best[xKey] ?? "").localeCompare(label)) ? row : best;
    }, data[0]);

  const rowA = closest(a);
  const rowB = closest(b);

  const deltas = series.map((s) => {
    const va = Number(rowA[s.key] ?? 0);
    const vb = Number(rowB[s.key] ?? 0);
    const diff = vb - va;
    const pct = va !== 0 ? (diff / Math.abs(va)) * 100 : 0;
    return { s, va, vb, diff, pct };
  }).filter((d) => Number.isFinite(d.diff));

  if (!deltas.length) return null;

  return (
    <div style={{
      background: "rgba(24,24,27,0.96)",
      border: "1px solid #3f3f46",
      borderRadius: 10,
      padding: "10px 14px",
      fontSize: 11,
      minWidth: 200,
      pointerEvents: "none",
    }}>
      <div style={{ color: "#71717a", fontSize: 10, marginBottom: 8, fontWeight: 600, letterSpacing: "0.05em" }}>
        {a.slice(0, 10)} → {b.slice(0, 10)}
      </div>
      {deltas.map(({ s, diff, pct }) => {
        const color = colors[s.key] || "#f4f4f5";
        const isPos = diff >= 0;
        const sign = isPos ? "+" : "";
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block" }} />
            <span style={{ color: "#a1a1aa", flex: 1 }}>{s.name}</span>
            <span style={{
              color: isPos ? "#10b981" : "#f87171",
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              fontSize: 12,
            }}>
              {sign}{yFormatter(diff)}
            </span>
            <span style={{
              color: isPos ? "#10b981" : "#f87171",
              fontSize: 10,
              opacity: 0.75,
              minWidth: 42,
              textAlign: "right",
            }}>
              {sign}{pct.toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function TimeSeriesChart({
  data,
  series,
  xKey = "date",
  height = 200,
  yFormatter = (v) => `${v.toFixed(2)}%`,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState<string | null>(null);
  const [dragEnd, setDragEnd]     = useState<string | null>(null);
  const [dragging, setDragging]   = useState(false);
  const [pinned, setPinned]       = useState(false);
  const [mousePos, setMousePos]   = useState<{x: number; y: number}>({ x: 0, y: 0 });
  const [pinnedPos, setPinnedPos] = useState<{x: number; y: number}>({ x: 0, y: 0 });

  const colorMap: Record<string, string> = {};
  series.forEach((s, i) => { colorMap[s.key] = s.color || COLORS[i % COLORS.length]; });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseDown = useCallback((e: any) => {
    if (!e?.activeLabel) return;
    setDragStart(e.activeLabel);
    setDragEnd(e.activeLabel);
    setDragging(true);
    setPinned(false);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseMove = useCallback((e: any) => {
    if (!dragging || !e?.activeLabel) return;
    setDragEnd(e.activeLabel);
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    if (dragStart && dragEnd && dragStart !== dragEnd) {
      setPinned(true);
      setPinnedPos(mousePos);
    } else {
      setDragStart(null);
      setDragEnd(null);
    }
  }, [dragging, dragStart, dragEnd, mousePos]);

  const clearRange = useCallback(() => {
    setDragStart(null);
    setDragEnd(null);
    setDragging(false);
    setPinned(false);
  }, []);

  const hasRange = dragStart && dragEnd && dragStart !== dragEnd;
  const [a, b] = hasRange
    ? dragStart < dragEnd ? [dragStart, dragEnd] : [dragEnd, dragStart]
    : [null, null];

  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-muted-foreground text-[10px]" style={{ height }}>
        No data available
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", userSelect: "none", outline: "none" }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      onDragStart={(e) => e.preventDefault()}
    >


      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ cursor: dragging ? "col-resize" : "crosshair", outline: "none" }}
          tabIndex={-1}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 9, fill: "#71717a" }}
            tickLine={false}
            axisLine={{ stroke: "#27272a" }}
            tickFormatter={(v) => String(v).slice(5, 10)}
          />
          <YAxis
            tick={{ fontSize: 9, fill: "#71717a" }}
            tickLine={false}
            axisLine={{ stroke: "#27272a" }}
            tickFormatter={yFormatter}
            width={45}
          />

          {/* Shaded selection area */}
          {hasRange && a && b && (
            <ReferenceArea
              x1={a} x2={b}
              fill="rgba(139,92,246,0.08)"
              stroke="none"
              strokeWidth={0}
            />
          )}

          {/* Dotted boundary lines */}
          {hasRange && a && (
            <ReferenceLine
              x={a}
              stroke="#8b5cf6"
              strokeDasharray="5 4"
              strokeWidth={1.5}
              strokeOpacity={0.8}
            />
          )}
          {hasRange && b && b !== a && (
            <ReferenceLine
              x={b}
              stroke="#8b5cf6"
              strokeDasharray="5 4"
              strokeWidth={1.5}
              strokeOpacity={0.8}
            />
          )}

          {/* Normal tooltip — suppressed while dragging */}
          {!dragging && !pinned && (
            <Tooltip
              wrapperStyle={{ zIndex: 50 }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div style={{
                    backgroundColor: "#18181b", border: "1px solid #3f3f46",
                    borderRadius: 8, fontSize: 11, padding: "8px 12px", minWidth: 160,
                  }}>
                    <p style={{ color: "#a1a1aa", marginBottom: 6, fontWeight: 600 }}>{label}</p>
                    {payload.map((entry) => (
                      <div key={entry.dataKey as string} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: entry.color, flexShrink: 0, display: "inline-block" }} />
                        <span style={{ color: "#a1a1aa", flex: 1 }}>{entry.name}</span>
                        <span style={{ color: "#f4f4f5", fontWeight: 600 }}>{yFormatter(Number(entry.value))}</span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
          )}

          <Legend
            iconType="line"
            iconSize={10}
            wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
          />
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color || COLORS[i % COLORS.length]}
              strokeWidth={1.5}
              dot={false}
              activeDot={dragging ? false : { r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>


      {/* Delta panel — follows cursor during drag, stays pinned after release */}
      {hasRange && (pinned || dragging) && (() => {
        const pos = pinned ? pinnedPos : mousePos;
        const panelW = 220;
        const containerW = containerRef.current?.offsetWidth ?? 600;
        // Flip to left if panel would overflow right edge of container
        const offsetX = pos.x + panelW + 20 > containerW ? -panelW - 12 : 16;
        return (
          <div style={{
            position: "absolute",
            left: Math.max(0, pos.x + offsetX),
            top: Math.max(0, pos.y - 20),
            zIndex: 50,
            // Never capture mouse events while dragging — passes through to chart
            pointerEvents: pinned ? "auto" : "none",
          }}>
            <RangeDeltaPanel
              data={data} series={series} xKey={xKey}
              start={dragStart!} end={dragEnd!}
              yFormatter={yFormatter} colors={colorMap}
            />
            {pinned && (
              <button
                onClick={clearRange}
                style={{
                  position: "absolute", top: 6, right: 6,
                  background: "none", border: "none", cursor: "pointer",
                  color: "#71717a", fontSize: 14, lineHeight: 1,
                  padding: "2px 4px",
                }}
                title="Clear range"
              >✕</button>
            )}
          </div>
        );
      })()}
    </div>
  );
}
