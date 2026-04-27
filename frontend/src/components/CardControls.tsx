"use client";

import { useState, useRef, ReactNode } from "react";
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
  title?: string;
  expandContent?: ReactNode;
  fullscreen?: boolean;
}

function downloadCardAsImage(cardEl: HTMLElement, filename: string) {
  // Find the SVG inside the card (Recharts chart)
  const svg = cardEl.querySelector("svg.recharts-surface") || cardEl.querySelector("svg");
  if (!svg) {
    alert("No chart found to export.");
    return;
  }

  const svgEl = svg as SVGSVGElement;
  const bbox = svgEl.getBoundingClientRect();
  const scale = 3; // 3x for high resolution
  const width = bbox.width * scale;
  const height = bbox.height * scale;

  // Clone SVG and add background
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("width", String(bbox.width));
  clone.setAttribute("height", String(bbox.height));
  clone.setAttribute("viewBox", `0 0 ${bbox.width} ${bbox.height}`);

  // Add dark background rect
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("width", "100%");
  bg.setAttribute("height", "100%");
  bg.setAttribute("fill", "#0a0a0a");
  clone.insertBefore(bg, clone.firstChild);

  // Serialize and create image
  const svgData = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, width, height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, bbox.width, bbox.height);
    }

    const link = document.createElement("a");
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL("image/png", 1.0);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    // Fallback: download SVG directly
    const svgLink = document.createElement("a");
    svgLink.download = `${filename}.svg`;
    svgLink.href = url;
    document.body.appendChild(svgLink);
    svgLink.click();
    document.body.removeChild(svgLink);
  };
  img.src = url;
}

export function CardControls({ data, filename = "export", info, onFilter, filterable, title, expandContent, fullscreen }: Props) {
  const [showFilter, setShowFilter] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
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

  function handleDownload() {
    if (data && data.length > 0) {
      // Table data → CSV
      downloadCSV(data, filename);
    } else {
      // Chart/heatmap → capture as image
      const el = containerRef.current;
      if (!el) return;
      const card = el.closest("[data-slot='card']") as HTMLElement | null;
      if (card) {
        downloadCardAsImage(card, filename);
      }
    }
  }

  const canExpand = !!expandContent;
  const canDownload = (data && data.length > 0) || true; // Always enabled — CSV or image

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
            <p className="text-[10px]">{data && data.length > 0 ? "Download CSV" : "Download as image"}</p>
          </TooltipContent>
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
