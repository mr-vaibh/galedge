"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCSV } from "@/lib/csv";

export function ExportButton({
  data,
  filename,
}: {
  data: Record<string, unknown>[];
  filename: string;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => downloadCSV(data, filename)}
      disabled={!data.length}
      className="gap-1.5"
    >
      <Download className="h-3.5 w-3.5" />
      Export CSV
    </Button>
  );
}
