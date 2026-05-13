"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardControls } from "@/components/CardControls";

export interface TreeColumn {
  key: string;
  label: string;
  align?: "left" | "right";
  format?: (v: number | string | null | undefined) => string;
}

export interface TreeRow {
  id: string;
  label: string;
  /** values keyed by column.key */
  values: Record<string, number | string | null | undefined>;
  children?: TreeRow[];
  /** if true, row is a section header with no values */
  isSection?: boolean;
}

interface Props {
  title: string;
  columns: TreeColumn[];
  rows: TreeRow[];
  /** row IDs that start expanded */
  defaultExpanded?: Set<string>;
  cardControls?: React.ReactNode;
  fontSize?: string;
}

function defaultFmt(v: number | string | null | undefined): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return n.toFixed(2);
}

function ColorVal({ v, fmt }: { v: number | string | null | undefined; fmt: (x: typeof v) => string }) {
  const str = fmt(v);
  if (str === "—" || str === "") return <span className="tabular-nums text-muted-foreground">{str}</span>;
  const n = typeof v === "number" ? v : Number(v);
  const colored = !isNaN(n) && str !== "—";
  return (
    <span className={`tabular-nums ${colored ? (n >= 0 ? "text-emerald-400" : "text-red-400") : ""}`}>
      {str}
    </span>
  );
}

function TreeRowComponent({
  row,
  columns,
  depth,
  expanded,
  onToggle,
  fontSize,
}: {
  row: TreeRow;
  columns: TreeColumn[];
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  fontSize: string;
}) {
  const hasChildren = (row.children?.length ?? 0) > 0;
  const isExpanded = expanded.has(row.id);

  return (
    <>
      <tr
        className={`border-b border-border/20 hover:bg-muted/10 transition-colors ${row.isSection ? "bg-muted/20" : ""}`}
      >
        {/* Label cell */}
        <td className="px-2 py-1" style={{ paddingLeft: `${8 + depth * 16}px` }}>
          <div className="flex items-center gap-1">
            {hasChildren ? (
              <button
                onClick={() => onToggle(row.id)}
                className="shrink-0 w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
            ) : (
              <span className="w-4 shrink-0" />
            )}
            <span
              className={`${row.isSection ? "font-semibold text-foreground" : depth === 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}
              style={{ fontSize }}
            >
              {row.label}
            </span>
          </div>
        </td>

        {/* Value cells */}
        {columns.map((col) => {
          const fmt = col.format ?? defaultFmt;
          const v = row.isSection ? null : (row.values[col.key] ?? null);
          return (
            <td
              key={col.key}
              className={`px-3 py-1 ${col.align === "left" ? "text-left" : "text-right"}`}
              style={{ fontSize }}
            >
              {row.isSection ? <span className="text-muted-foreground text-[9px] uppercase tracking-wider">{col.label}</span> : <ColorVal v={v} fmt={fmt} />}
            </td>
          );
        })}
      </tr>

      {/* Children */}
      {hasChildren && isExpanded &&
        row.children!.map((child) => (
          <TreeRowComponent
            key={child.id}
            row={child}
            columns={columns}
            depth={depth + 1}
            expanded={expanded}
            onToggle={onToggle}
            fontSize={fontSize}
          />
        ))
      }
    </>
  );
}

export function AnalyticsTreeTable({
  title,
  columns,
  rows,
  defaultExpanded,
  cardControls,
  fontSize = "10px",
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(defaultExpanded ?? new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader className="pb-1 py-2 px-3 flex-row items-center justify-between">
        <CardTitle className="text-[11px]">{title}</CardTitle>
        {cardControls ?? <CardControls />}
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize }}>
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-2 py-1.5 text-left font-medium text-muted-foreground min-w-[160px]">Metric</th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-3 py-1.5 font-medium text-muted-foreground min-w-[90px] ${col.align === "left" ? "text-left" : "text-right"}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <TreeRowComponent
                  key={row.id}
                  row={row}
                  columns={columns}
                  depth={0}
                  expanded={expanded}
                  onToggle={toggle}
                  fontSize={fontSize}
                />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
