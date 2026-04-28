"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Code2, Terminal, ExternalLink, RefreshCw } from "lucide-react";

function getCodeServerUrl() {
  if (process.env.NEXT_PUBLIC_CODE_SERVER_URL) return process.env.NEXT_PUBLIC_CODE_SERVER_URL;
  if (typeof window === "undefined") return "";
  const h = window.location.hostname;
  const ws = "?folder=/home/galedge-coder/workspace";
  if (h === "localhost" || h === "127.0.0.1") return `http://localhost:8080/${ws}`;
  return `https://code.${h.replace(/^www\./, "")}/${ws}`;
}

export default function CodeEditorPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [codeServerUrl, setCodeServerUrl] = useState("");

  // Resolve URL only on client to avoid SSR hydration mismatch
  useState(() => { setCodeServerUrl(getCodeServerUrl()); });

  return (
    <div className="flex flex-col h-[calc(100vh-48px)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-semibold">Code Editor</span>
          <Badge variant="secondary" className="text-[8px]">VS Code</Badge>
          <Badge className="text-[8px] bg-emerald-600">Full IDE</Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px] gap-1"
            onClick={() => { setLoading(true); setError(false); }}
          >
            <RefreshCw className="h-3 w-3" /> Reload
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px] gap-1"
            onClick={() => window.open(codeServerUrl, "_blank")}
          >
            <ExternalLink className="h-3 w-3" /> Open in New Tab
          </Button>
        </div>
      </div>

      {/* VS Code iframe */}
      <div className="flex-1 relative">
        {loading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950 z-10">
            <Code2 className="h-12 w-12 text-blue-400 animate-pulse mb-4" />
            <p className="text-sm text-muted-foreground">Loading VS Code...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950 z-10 gap-4">
            <Terminal className="h-12 w-12 text-muted-foreground/30" />
            <div className="text-center max-w-md space-y-2">
              <h2 className="text-lg font-semibold">VS Code Server Not Running</h2>
              <p className="text-sm text-muted-foreground">
                The code-server needs to be started on the server. Run these commands:
              </p>
              <div className="bg-neutral-900 rounded-lg p-3 text-left text-[11px] font-mono text-emerald-400 space-y-1">
                <p># Install code-server</p>
                <p>curl -fsSL https://code-server.dev/install.sh | sh</p>
                <p></p>
                <p># Start it</p>
                <p>code-server --bind-addr 0.0.0.0:8080 --auth none</p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Or set <code className="text-[10px] bg-neutral-800 px-1 py-0.5 rounded">NEXT_PUBLIC_codeServerUrl</code> environment variable.
              </p>
              <Button size="sm" className="mt-3" onClick={() => { setError(false); setLoading(true); }}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
              </Button>
            </div>
          </div>
        )}

        {codeServerUrl && <iframe
          src={codeServerUrl}
          className="w-full h-full border-0"
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
          allow="clipboard-read; clipboard-write"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
        />}
      </div>
    </div>
  );
}
