"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Filter, Info, Maximize2 } from "lucide-react";
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
}

export function CardControls({ data, filename = "export", info }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex items-center gap-0.5">
      <Tooltip>
        <TooltipTrigger >
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Filter className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom"><p className="text-[10px]">Filter (coming soon)</p></TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger >
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Info className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px]">
          <p className="text-[10px]">{info || "Chart/table controls"}</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger >
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Maximize2 className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom"><p className="text-[10px]">Expand (coming soon)</p></TooltipContent>
      </Tooltip>

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
  );
}
