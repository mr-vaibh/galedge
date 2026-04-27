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

async function downloadCardAsImage(cardEl: HTMLElement, filename: string) {
  // Convert all SVGs in the card to canvas elements first (html2canvas can't handle SVGs well)
  const svgs = cardEl.querySelectorAll("svg");
  const replacements: { svg: SVGElement; canvas: HTMLCanvasElement }[] = [];

  for (const svg of Array.from(svgs)) {
    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();

      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = svg.clientWidth * 2;
          canvas.height = svg.clientHeight * 2;
          canvas.style.width = svg.clientWidth + "px";
          canvas.style.height = svg.clientHeight + "px";
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.scale(2, 2);
            ctx.drawImage(img, 0, 0, svg.clientWidth, svg.clientHeight);
          }
          svg.parentNode?.insertBefore(canvas, svg);
          svg.style.display = "none";
          replacements.push({ svg: svg as SVGElement, canvas });
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = reject;
        img.src = url;
      });
    } catch {
      // Skip SVGs that can't be converted
    }
  }

  try {
    const mod = await import("html2canvas");
    const html2canvas = mod.default || mod;
    const canvas = await html2canvas(cardEl, {
      backgroundColor: "#0a0a0a",
      scale: 2,
      logging: false,
    });
    const link = document.createElement("a");
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL("image/png", 1.0);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("Image download failed:", err);
    alert("Image export failed. Check console for details.");
  }

  // Restore SVGs
  for (const { svg, canvas } of replacements) {
    svg.style.display = "";
    canvas.parentNode?.removeChild(canvas);
  }
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
