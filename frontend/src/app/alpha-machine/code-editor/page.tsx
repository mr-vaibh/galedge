"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Code2, Terminal, Cpu } from "lucide-react";

export default function CodeEditorPage() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Code Editor</h1>

      <div className="flex items-center justify-center min-h-[500px]">
        <Card className="max-w-md">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="flex justify-center gap-3">
              <Code2 className="h-10 w-10 text-muted-foreground/30" />
              <Terminal className="h-10 w-10 text-muted-foreground/30" />
              <Cpu className="h-10 w-10 text-muted-foreground/30" />
            </div>
            <h2 className="text-lg font-semibold">Python Sandbox</h2>
            <p className="text-sm text-muted-foreground">
              Coming Soon — A sandboxed Python environment for custom alpha research.
            </p>
            <div className="text-xs text-muted-foreground/60 space-y-1">
              <p>Features planned:</p>
              <ul className="list-disc list-inside text-left pl-4">
                <li>Jupyter-like Python IDE in the browser</li>
                <li>Access to Galedge data APIs and factor libraries</li>
                <li>Configurable RAM (8-64GB) and CPU cores</li>
                <li>Scratch and Production branches</li>
                <li>Session persistence with auto-save</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
