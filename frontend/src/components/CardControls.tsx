"use client";

import { useState, useEffect, ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Download, Filter, Info, Maximize2, Minimize2, X, Search } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { downloadCSV } from "@/lib/csv";

interface Props {
  data?: Record<string, unknown>[];
  filename?: string;
  info?: string;
  onFilter?: (query: string) => void;
  filterable?: boolean;
  /** Pass React children to render live components in the expand modal */
  children?: ReactNode;
}

export function CardControls({ data, filename = "export", info, onFilter, filterable, children }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  function handleFilterToggle() {
    if (showFilter) {
      setShowFilter(false);
      setFilterQuery("");
      onFilter?.("");
    } else {
      setShowFilter(true);
    }
  }

  function handleFilterChange(q: string) {
    setFilterQuery(q);
    onFilter?.(q);
  }

  return (
    <>
      <div className="flex items-center gap-0.5">
        {/* Filter */}
        {(onFilter || filterable) ? (
          <Tooltip>
            <TooltipTrigger>
              <Button variant="ghost" size="icon" className={`h-6 w-6 ${showFilter ? "text-emerald-400" : ""}`} onClick={handleFilterToggle}>
                <Filter className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p className="text-[10px]">{showFilter ? "Clear filter" : "Filter"}</p></TooltipContent>
          </Tooltip>
        ) : (
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-20 cursor-default">
            <Filter className="h-3 w-3" />
          </Button>
        )}

        {/* Info */}
        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Info className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[220px]">
            <p className="text-[10px]">{info || "Real data from your portfolio and market prices."}</p>
          </TooltipContent>
        </Tooltip>

        {/* Expand */}
        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setExpanded(true)}>
              <Maximize2 className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p className="text-[10px]">Expand</p></TooltipContent>
        </Tooltip>

        {/* Download */}
        <Tooltip>
          <TooltipTrigger>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => { if (data && data.length > 0) downloadCSV(data, filename); }}
              disabled={!data || data.length === 0}
            >
              <Download className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p className="text-[10px]">{data && data.length > 0 ? "Download CSV" : "No data to download"}</p></TooltipContent>
        </Tooltip>
      </div>

      {/* Filter Input */}
      {showFilter && onFilter && (
        <div className="absolute top-12 right-3 z-20 flex items-center gap-1 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 shadow-lg">
          <Search className="h-3 w-3 text-muted-foreground" />
          <input autoFocus type="text" value={filterQuery} onChange={(e) => handleFilterChange(e.target.value)} placeholder="Filter..."
            className="bg-transparent border-none outline-none text-[11px] w-[140px] text-foreground placeholder:text-muted-foreground" />
          <button onClick={handleFilterToggle} className="p-0.5 hover:bg-neutral-800 rounded"><X className="h-3 w-3 text-muted-foreground" /></button>
        </div>
      )}

      {/* Expand Modal */}
      {expanded && mounted && createPortal(
        <ExpandModal
          title={filename.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase())}
          data={data}
          filename={filename}
          onClose={() => setExpanded(false)}
        >
          {children}
        </ExpandModal>,
        document.body
      )}
    </>
  );
}

/** Fullscreen modal that renders live React children or a data table fallback */
function ExpandModal({ title, data, filename, onClose, children }: {
  title: string;
  data?: Record<string, unknown>[];
  filename: string;
  onClose: () => void;
  children?: ReactNode;
}) {
  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl flex flex-col w-[92vw] h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-700 shrink-0">
          <span className="text-sm font-semibold">{title}</span>
          <div className="flex items-center gap-2">
            {data && data.length > 0 && (
              <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => downloadCSV(data, filename)}>
                <Download className="h-3 w-3" /> Download CSV
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5 min-h-0">
          {children ? (
            // Live React components — fully interactive
            <div className="w-full h-full">{children}</div>
          ) : data && data.length > 0 ? (
            // Data table fallback
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-neutral-900 z-10">
                <tr className="border-b border-neutral-700">
                  <th className="px-3 py-2 text-left text-muted-foreground font-medium">#</th>
                  {Object.keys(data[0]).map((key) => (
                    <th key={key} className="px-3 py-2 text-left text-muted-foreground font-medium whitespace-nowrap">
                      {key.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i} className="border-b border-neutral-800 hover:bg-neutral-800/40">
                    <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                    {Object.values(row).map((val, j) => {
                      const str = String(val ?? "—");
                      const isNeg = str.startsWith("-") && !isNaN(Number(str));
                      const isPos = !isNaN(Number(str)) && Number(str) > 0 && str !== "";
                      return (
                        <td key={j} className={`px-3 py-1.5 tabular-nums whitespace-nowrap ${isNeg ? "text-red-400" : isPos ? "text-emerald-400" : ""}`}>
                          {str}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
