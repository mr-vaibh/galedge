"use client";

import { useState, useRef, useEffect, useMemo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Download, Filter, Info, Maximize2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { downloadCSV, makeFilename } from "@/lib/csv";
import { useExpand } from "@/lib/expand-context";
import { applyFilters, applySort, Filter as FilterType, Sort } from "@/lib/filter-utils";
import { FilterSortPopover } from "@/components/FilterSortPopover";

interface Props {
  data?: Record<string, unknown>[];
  filename?: string;
  info?: string;
  onFilter?: (query: string) => void;
  filterable?: boolean;
  title?: string;
  expandContent?: ReactNode;
  fullscreen?: boolean;
}

async function downloadCardAsImage(cardEl: HTMLElement, filename: string) {
  try {
    const { domToPng } = await import("modern-screenshot");
    const dataUrl = await domToPng(cardEl, {
      scale: 3,
      backgroundColor: "#0a0a0a",
    });
    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("Image download failed:", err);
    alert("Image export failed. Check console for details.");
  }
}

export function CardControls({ data, filename = "export", info, title, expandContent, fullscreen }: Props) {
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<FilterType[]>([]);
  const [sort, setSort] = useState<Sort | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { open } = useExpand();

  // Close filter on Escape
  useEffect(() => {
    if (!showFilter) return;
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") setShowFilter(false); }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showFilter]);

  // Compute filtered/sorted data
  const processedData = useMemo(() => {
    if (!data) return undefined;
    let result = data;
    result = applyFilters(result, filters);
    result = applySort(result, sort);
    return result;
  }, [data, filters, sort]);

  // Columns from data
  const columns = useMemo(() => {
    if (!data || !data.length) return [];
    return Object.keys(data[0]).filter((k) => {
      const v = data[0][k];
      return v === null || v === undefined || typeof v !== "object";
    });
  }, [data]);

  const hasFilters = filters.length > 0 || sort !== null;
  const canFilter = data && data.length > 0 && columns.length > 0;
  const canExpand = !!expandContent;

  function handleExpand() {
    if (expandContent) {
      open(title || filename, expandContent, processedData || data, filename, fullscreen);
    }
  }

  function handleDownload() {
    const name = title || filename;
    if (processedData && processedData.length > 0) {
      downloadCSV(processedData, makeFilename(name, "csv"));
    } else if (data && data.length > 0) {
      downloadCSV(data, makeFilename(name, "csv"));
    } else {
      // Chart/heatmap → image
      const el = containerRef.current;
      if (!el) return;
      const card = el.closest("[data-slot='card']") as HTMLElement | null;
      if (card) downloadCardAsImage(card, makeFilename(name, "png"));
    }
  }

  return (
    <>
      <div ref={containerRef} className="flex items-center gap-0.5 relative">
        {/* Filter */}
        {canFilter ? (
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="ghost"
                size="icon"
                className={`h-6 w-6 relative ${hasFilters ? "text-emerald-400" : ""}`}
                onClick={() => setShowFilter(!showFilter)}
              >
                <Filter className="h-3 w-3" />
                {hasFilters && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full text-[7px] text-white flex items-center justify-center font-bold">
                    {filters.length + (sort ? 1 : 0)}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p className="text-[10px]">{hasFilters ? `${filters.length} filter(s) active` : "Filter & Sort"}</p></TooltipContent>
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
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDownload}>
              <Download className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-[10px]">{data && data.length > 0 ? (hasFilters ? "Download filtered CSV" : "Download CSV") : "Download as image"}</p>
          </TooltipContent>
        </Tooltip>

        {/* Filter Popover */}
        {showFilter && canFilter && (
          <FilterSortPopover
            columns={columns}
            filters={filters}
            sort={sort}
            onFiltersChange={setFilters}
            onSortChange={setSort}
            onClose={() => setShowFilter(false)}
            anchorRef={containerRef}
          />
        )}
      </div>
    </>
  );
}
