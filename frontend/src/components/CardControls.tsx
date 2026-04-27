"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
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
  const [cardHtml, setCardHtml] = useState<string>("");
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

  function handleExpand(e: React.MouseEvent) {
    // Find the closest Card parent and clone its content
    const btn = e.currentTarget as HTMLElement;
    const card = btn.closest("[class*='rounded-lg border'], [class*='card']");
    if (card) {
      // Clone the card's CardContent
      const content = card.querySelector("[class*='CardContent'], [class*='p-0'], [class*='p-2']");
      if (content) {
        setCardHtml(content.innerHTML);
      } else {
        setCardHtml(card.innerHTML);
      }
    }
    setExpanded(true);
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

      {/* Expand Modal — rendered via portal to avoid overflow clipping */}
      {expanded && mounted && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6" onClick={() => setExpanded(false)}>
          <div
            className="bg-neutral-900 border border-neutral-700 rounded-xl w-[92vw] max-h-[88vh] overflow-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-neutral-900/95 backdrop-blur border-b border-neutral-700">
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
            <div className="p-6">
              {/* Render cloned card content at larger size */}
              <div
                className="[&_table]:text-sm [&_td]:px-4 [&_td]:py-2 [&_th]:px-4 [&_th]:py-2.5 [&_svg]:w-full [&_svg]:h-auto"
                dangerouslySetInnerHTML={{ __html: cardHtml }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
