"use client";

import { useState, useEffect, useRef } from "react";
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
}

export function CardControls({ data, filename = "export", info, onFilter, filterable }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [expandTitle, setExpandTitle] = useState("");
  const [expandHtml, setExpandHtml] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

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

  function handleExpand() {
    const el = containerRef.current;
    if (!el) return;
    const card = el.closest("[data-slot='card']");
    if (!card) return;

    // Get title
    const titleEl = card.querySelector("[data-slot='card-title']");
    setExpandTitle(titleEl?.textContent || filename);

    // Get CardContent
    const content = card.querySelector("[data-slot='card-content']");
    if (!content) return;

    // Charts can't be expanded (SVGs don't clone properly)
    const hasChart = content.querySelector(".recharts-wrapper, .recharts-responsive-container, svg.recharts-surface");
    if (hasChart) return;

    // Clone table/text content
    const clone = content.cloneNode(true) as HTMLElement;
    // Remove max-height constraints
    clone.querySelectorAll("[class*='max-h-']").forEach((el) => {
      (el as HTMLElement).style.maxHeight = "none";
    });
    clone.style.maxHeight = "none";
    clone.style.overflow = "visible";
    // Make tables fill width
    clone.querySelectorAll("table").forEach((t) => { t.style.width = "100%"; });

    setExpandHtml(clone.innerHTML);
    setExpanded(true);
  }

  // Has expandable content: either data for table, or non-chart card content
  const canExpand = data && data.length > 0;

  return (
    <>
      <div ref={containerRef} className="flex items-center gap-0.5">
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
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleExpand}>
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
          <input autoFocus type="text" value={filterQuery} onChange={(e) => { setFilterQuery(e.target.value); onFilter(e.target.value); }} placeholder="Filter..."
            className="bg-transparent border-none outline-none text-[11px] w-[140px] text-foreground placeholder:text-muted-foreground" />
          <button onClick={handleFilterToggle} className="p-0.5 hover:bg-neutral-800 rounded"><X className="h-3 w-3 text-muted-foreground" /></button>
        </div>
      )}

      {/* Expand Modal */}
      {expanded && mounted && createPortal(
        <div className="fixed inset-0 z-40 bg-black/85 flex items-center justify-center p-4" onClick={() => setExpanded(false)}>
          <div
            className={`bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl flex flex-col ${expandHtml ? "w-[94vw] h-[90vh]" : "max-w-[95vw] max-h-[90vh]"}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-700 shrink-0">
              <span className="text-sm font-semibold">{expandTitle}</span>
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

            {/* Content — cloned DOM from the card */}
            <div className="overflow-auto flex-1 min-h-0">
              <div className="w-full h-full p-1 [&_table]:h-full [&_table]:w-full [&>div]:h-full [&>div]:w-full [&_*]:max-h-none" dangerouslySetInnerHTML={{ __html: expandHtml }} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
