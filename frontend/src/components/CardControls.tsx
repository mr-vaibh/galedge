"use client";

import { useState, useEffect } from "react";
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
  const [expandHtml, setExpandHtml] = useState("");
  const [expandTitle, setExpandTitle] = useState("");

  useEffect(() => { setMounted(true); }, []);

  function handleExpand(e: React.MouseEvent) {
    const btn = e.currentTarget as HTMLElement;

    // Find parent Card using data-slot="card"
    const card = btn.closest("[data-slot='card']") || btn.closest("[class*='rounded-xl']") || btn.closest("[class*='rounded-lg']");
    if (!card) return;

    // Get title from data-slot="card-title"
    const titleEl = card.querySelector("[data-slot='card-title']");
    setExpandTitle(titleEl?.textContent || filename.replace(/_/g, " "));

    // Get content from data-slot="card-content"
    const contentEl = card.querySelector("[data-slot='card-content']");
    if (contentEl) {
      setExpandHtml(contentEl.innerHTML);
    } else {
      // Fallback: clone entire card, strip header
      const clone = card.cloneNode(true) as HTMLElement;
      const header = clone.querySelector("[data-slot='card-header']");
      if (header) header.remove();
      setExpandHtml(clone.innerHTML);
    }

    setExpanded(true);
  }

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
            <TooltipTrigger>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-30 cursor-default">
                <Filter className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p className="text-[10px]">No filter available</p></TooltipContent>
          </Tooltip>
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
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleExpand}
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p className="text-[10px]">Expand fullscreen</p></TooltipContent>
        </Tooltip>

        {/* Download */}
        <Tooltip>
          <TooltipTrigger>
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

      {/* Filter Input */}
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
      {expanded && mounted && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6" onClick={() => setExpanded(false)}>
          <div
            className="bg-neutral-900 border border-neutral-700 rounded-xl w-[94vw] max-h-[90vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-700 shrink-0">
              <span className="text-sm font-semibold">{expandTitle || "Expanded View"}</span>
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

            {/* Content */}
            <div className="overflow-auto flex-1 p-4">
              <div dangerouslySetInnerHTML={{ __html: expandHtml }} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
