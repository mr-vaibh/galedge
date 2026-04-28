"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, ArrowUp, ArrowDown, Plus, X, Trash2 } from "lucide-react";
import { Filter, Sort, OPERATOR_LABELS } from "@/lib/filter-utils";

interface Props {
  columns: string[];
  filters: Filter[];
  sort: Sort | null;
  onFiltersChange: (filters: Filter[]) => void;
  onSortChange: (sort: Sort | null) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLDivElement | null>;
}

export function FilterSortPopover({ columns, filters, sort, onFiltersChange, onSortChange, onClose, anchorRef }: Props) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  // Position relative to anchor
  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 4,
        left: Math.max(8, rect.right - 340),
      });
    }
  }, [anchorRef]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose, anchorRef]);
  const [newColumn, setNewColumn] = useState(columns[0] || "");
  const [newOperator, setNewOperator] = useState<Filter["operator"]>("contains");
  const [newValue, setNewValue] = useState("");

  function addFilter() {
    if (!newColumn || !newValue.trim()) return;
    onFiltersChange([...filters, { column: newColumn, operator: newOperator, value: newValue.trim() }]);
    setNewValue("");
  }

  function removeFilter(index: number) {
    onFiltersChange(filters.filter((_, i) => i !== index));
  }

  function handleSort(column: string, direction: "asc" | "desc") {
    if (sort?.column === column && sort.direction === direction) {
      onSortChange(null); // Toggle off
    } else {
      onSortChange({ column, direction });
    }
  }

  function clearAll() {
    onFiltersChange([]);
    onSortChange(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") addFilter();
    if (e.key === "Escape") onClose();
  }

  if (typeof window === "undefined") return null;

  return createPortal(
    <div ref={popoverRef} className="fixed z-[100] w-[340px] bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl p-3 space-y-3" style={{ top: pos.top, left: pos.left }} onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold">Filter & Sort</span>
        <div className="flex items-center gap-1">
          {(filters.length > 0 || sort) && (
            <Button variant="ghost" size="sm" className="h-6 text-[9px] text-red-400" onClick={clearAll}>
              <Trash2 className="h-3 w-3 mr-1" /> Clear all
            </Button>
          )}
          <button onClick={onClose} className="p-1 rounded hover:bg-neutral-800">
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Active Filters */}
      {filters.length > 0 && (
        <div className="space-y-1">
          <span className="text-[9px] text-muted-foreground">Active Filters</span>
          <div className="flex flex-wrap gap-1">
            {filters.map((f, i) => (
              <Badge key={i} variant="secondary" className="text-[9px] gap-1 pr-1">
                <span className="text-muted-foreground">{f.column}</span>
                <span className="text-emerald-400">{OPERATOR_LABELS[f.operator]}</span>
                <span>{f.value}</span>
                <button onClick={() => removeFilter(i)} className="ml-0.5 p-0.5 rounded hover:bg-neutral-700">
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Add Filter */}
      <div className="space-y-1.5">
        <span className="text-[9px] text-muted-foreground">Add Filter</span>
        <div className="flex gap-1">
          <select
            value={newColumn}
            onChange={(e) => setNewColumn(e.target.value)}
            className="h-7 text-[10px] bg-neutral-800 border border-neutral-700 rounded px-1.5 flex-1 text-foreground"
          >
            {columns.map((c) => (
              <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
            ))}
          </select>
          <select
            value={newOperator}
            onChange={(e) => setNewOperator(e.target.value as Filter["operator"])}
            className="h-7 text-[10px] bg-neutral-800 border border-neutral-700 rounded px-1.5 w-[80px] text-foreground"
          >
            {Object.entries(OPERATOR_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-1">
          <Input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Filter value..."
            className="h-7 text-[10px] flex-1"
          />
          <Button size="sm" className="h-7 text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={addFilter} disabled={!newValue.trim()}>
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>
      </div>

      {/* Sort */}
      <div className="space-y-1.5 border-t border-neutral-700 pt-2">
        <span className="text-[9px] text-muted-foreground">Sort</span>
        <div className="flex gap-1">
          <select
            value={sort?.column || columns[0] || ""}
            onChange={(e) => handleSort(e.target.value, sort?.direction || "asc")}
            className="h-7 text-[10px] bg-neutral-800 border border-neutral-700 rounded px-1.5 flex-1 text-foreground"
          >
            {columns.map((c) => (
              <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            className={`h-7 text-[10px] gap-1 ${sort?.direction === "asc" ? "border-emerald-500 text-emerald-400" : ""}`}
            onClick={() => handleSort(sort?.column || columns[0], "asc")}
          >
            <ArrowUp className="h-3 w-3" /> Asc
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={`h-7 text-[10px] gap-1 ${sort?.direction === "desc" ? "border-emerald-500 text-emerald-400" : ""}`}
            onClick={() => handleSort(sort?.column || columns[0], "desc")}
          >
            <ArrowDown className="h-3 w-3" /> Desc
          </Button>
        </div>
        {sort && (
          <Badge variant="secondary" className="text-[9px] gap-1">
            <ArrowUpDown className="h-2.5 w-2.5" />
            {sort.column.replace(/_/g, " ")} — {sort.direction === "asc" ? "A→Z / 1→9" : "Z→A / 9→1"}
          </Badge>
        )}
      </div>

      {/* Result count */}
      <div className="text-[9px] text-muted-foreground text-right border-t border-neutral-700 pt-2">
        {filters.length > 0 ? `${filters.length} filter(s) active` : "No filters applied"}
        {sort ? ` • Sorted by ${sort.column}` : ""}
      </div>
    </div>,
    document.body
  );
}
