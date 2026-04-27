"use client";

import { useState, ReactNode } from "react";
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
  /** Content to render in fullscreen expand modal */
  expandContent?: ReactNode;
  /** Callback when filter text changes */
  onFilter?: (query: string) => void;
  /** Show/hide filter */
  filterable?: boolean;
}

export function CardControls({ data, filename = "export", info, expandContent, onFilter, filterable }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");

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
            <TooltipTrigger >
              <Button
                variant="ghost"
                size="icon"
                className={`h-6 w-6 ${showFilter ? "text-emerald-400" : ""}`}
                onClick={handleFilterToggle}
              >
                <Filter className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p className="text-[10px]">{showFilter ? "Clear filter" : "Filter"}</p></TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger >
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-30 cursor-default">
                <Filter className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p className="text-[10px]">No filter available</p></TooltipContent>
          </Tooltip>
        )}

        {/* Info */}
        <Tooltip>
          <TooltipTrigger >
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Info className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[220px]">
            <p className="text-[10px]">{info || "Chart/table with real data from your portfolio and market prices."}</p>
          </TooltipContent>
        </Tooltip>

        {/* Expand */}
        <Tooltip>
          <TooltipTrigger >
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setExpanded(true)}
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p className="text-[10px]">Expand fullscreen</p></TooltipContent>
        </Tooltip>

        {/* Download */}
        <Tooltip>
          <TooltipTrigger >
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                if (data && data.length > 0) {
                  downloadCSV(data, filename);
                }
              }}
              disabled={!data || data.length === 0}
            >
              <Download className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p className="text-[10px]">{data && data.length > 0 ? "Download CSV" : "No data to download"}</p></TooltipContent>
        </Tooltip>
      </div>

      {/* Filter Input (inline, rendered by parent) */}
      {showFilter && onFilter && (
        <div className="absolute top-12 right-3 z-20 flex items-center gap-1 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 shadow-lg">
          <Search className="h-3 w-3 text-muted-foreground" />
          <input
            autoFocus
            type="text"
            value={filterQuery}
            onChange={(e) => handleFilterChange(e.target.value)}
            placeholder="Filter..."
            className="bg-transparent border-none outline-none text-[11px] w-[140px] text-foreground placeholder:text-muted-foreground"
          />
          <button onClick={handleFilterToggle} className="p-0.5 hover:bg-neutral-800 rounded">
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Expand Modal */}
      {expanded && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setExpanded(false)}>
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl w-[95vw] h-[90vh] overflow-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-neutral-900 border-b border-neutral-700">
              <span className="text-sm font-semibold">Expanded View</span>
              <div className="flex items-center gap-2">
                {data && data.length > 0 && (
                  <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => downloadCSV(data, filename)}>
                    <Download className="h-3 w-3" /> Download CSV
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(false)}>
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-4">
              {expandContent || (
                data && data.length > 0 ? (
                  <div className="overflow-auto">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="border-b border-neutral-700">
                          {Object.keys(data[0]).map((key) => (
                            <th key={key} className="px-3 py-2 text-left text-muted-foreground font-medium whitespace-nowrap">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((row, i) => (
                          <tr key={i} className="border-b border-neutral-800 hover:bg-neutral-800/30">
                            {Object.values(row).map((val, j) => (
                              <td key={j} className="px-3 py-1.5 tabular-nums whitespace-nowrap">{String(val ?? "—")}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-20 text-sm">
                    No tabular data available for this card.
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
