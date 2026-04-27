"use client";

import { useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Download, Filter, Info, Maximize2, X, Search } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { downloadCSV } from "@/lib/csv";
import { useExpand } from "@/lib/expand-context";

interface Props {
  data?: Record<string, unknown>[];
  filename?: string;
  info?: string;
  onFilter?: (query: string) => void;
  filterable?: boolean;
  /** Title shown in expand modal header */
  title?: string;
  /** Content rendered in expand modal — pass same JSX as in the card but bigger */
  expandContent?: ReactNode;
  /** Force fullscreen modal (for charts/heatmaps). Auto-sizes for tables when false. */
  fullscreen?: boolean;
}

export function CardControls({ data, filename = "export", info, onFilter, filterable, title, expandContent, fullscreen }: Props) {
  const [showFilter, setShowFilter] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const { open } = useExpand();

  function handleFilterToggle() {
    if (showFilter) {
      setShowFilter(false);
      setFilterQuery("");
      onFilter?.("");
    } else {
      setShowFilter(true);
    }
  }

  function handleExpand() {
    if (expandContent) {
      open(title || filename, expandContent, data, filename, fullscreen);
    }
  }

  const canExpand = !!expandContent;

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
        {canExpand ? (
          <Tooltip>
            <TooltipTrigger>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleExpand}>
                <Maximize2 className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p className="text-[10px]">Expand</p></TooltipContent>
          </Tooltip>
        ) : (
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-20 cursor-default">
            <Maximize2 className="h-3 w-3" />
          </Button>
        )}

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
          <input autoFocus type="text" value={filterQuery} onChange={(e) => { setFilterQuery(e.target.value); onFilter(e.target.value); }} placeholder="Filter..."
            className="bg-transparent border-none outline-none text-[11px] w-[140px] text-foreground placeholder:text-muted-foreground" />
          <button onClick={handleFilterToggle} className="p-0.5 hover:bg-neutral-800 rounded"><X className="h-3 w-3 text-muted-foreground" /></button>
        </div>
      )}
    </>
  );
}
