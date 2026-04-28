"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Code2, Terminal, ExternalLink, RefreshCw, Loader2, LogIn } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

function getCodeServerBase(): string {
  if (process.env.NEXT_PUBLIC_CODE_SERVER_URL) return process.env.NEXT_PUBLIC_CODE_SERVER_URL;
  if (typeof window === "undefined") return "";
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1") return "http://localhost:8080";
  return `https://code.${h.replace(/^www\./, "")}`;
}

export default function CodeEditorPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeServerUrl, setCodeServerUrl] = useState("");

  // Provision workspace and build iframe URL
  useEffect(() => {
    if (typeof window === "undefined") return;

    const authToken = token || localStorage.getItem("galedge_auth_token");
    if (!authToken) {
      setLoading(false);
      return;
    }

    setProvisioning(true);

    fetch(`${API_BASE}/api/alpha/workspace/provision`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.workspace_path) {
          const base = getCodeServerBase();
          setCodeServerUrl(`${base}/?folder=${data.workspace_path}`);
        } else {
          setError("Failed to provision workspace");
        }
      })
      .catch(() => {
        // Fallback to default path
        const base = getCodeServerBase();
        setCodeServerUrl(`${base}/?folder=/home/galedge-coder/workspace`);
      })
      .finally(() => {
        setProvisioning(false);
      });
  }, [token]);

  const isAuthenticated = !!(token || (typeof window !== "undefined" && localStorage.getItem("galedge_auth_token")));

  return (
    <div className="flex flex-col h-[calc(100vh-48px)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-semibold">Code Editor</span>
          <Badge variant="secondary" className="text-[8px]">VS Code</Badge>
          <Badge className="text-[8px] bg-emerald-600">Sandbox</Badge>
          {user && <span className="text-[9px] text-muted-foreground">{user.email}</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px] gap-1"
            onClick={() => { setLoading(true); setError(null); }}
          >
            <RefreshCw className="h-3 w-3" /> Reload
          </Button>
          {codeServerUrl && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] gap-1"
              onClick={() => window.open(codeServerUrl, "_blank")}
            >
              <ExternalLink className="h-3 w-3" /> Open in New Tab
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative">
        {/* Not logged in */}
        {!isAuthenticated && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950 z-10 gap-4">
            <LogIn className="h-12 w-12 text-muted-foreground/30" />
            <h2 className="text-lg font-semibold">Login Required</h2>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Sign in to get your own isolated Python sandbox with access to Galedge market data.
            </p>
            <Button onClick={() => router.push("/login")}>Login to Continue</Button>
          </div>
        )}

        {/* Provisioning workspace */}
        {provisioning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950 z-10">
            <Loader2 className="h-10 w-10 text-blue-400 animate-spin mb-4" />
            <p className="text-sm text-muted-foreground">Setting up your workspace...</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Creating isolated sandbox with Galedge SDK</p>
          </div>
        )}

        {/* Loading VS Code */}
        {loading && !provisioning && !error && isAuthenticated && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950 z-10">
            <Code2 className="h-12 w-12 text-blue-400 animate-pulse mb-4" />
            <p className="text-sm text-muted-foreground">Loading VS Code...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950 z-10 gap-4">
            <Terminal className="h-12 w-12 text-muted-foreground/30" />
            <h2 className="text-lg font-semibold">Could not load editor</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button size="sm" onClick={() => { setError(null); setLoading(true); }}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
            </Button>
          </div>
        )}

        {/* VS Code iframe */}
        {codeServerUrl && (
          <iframe
            src={codeServerUrl}
            className="w-full h-full border-0"
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); setError("VS Code server not reachable"); }}
            allow="clipboard-read; clipboard-write"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
          />
        )}
      </div>
    </div>
  );
}
