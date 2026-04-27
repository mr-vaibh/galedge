"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Save, RotateCcw, FileCode2, FolderOpen, Plus, Trash2, Copy, Download, Loader2, Cloud, HardDrive, ShieldCheck } from "lucide-react";
import Editor from "@monaco-editor/react";
import { useAuth } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

const TEMPLATES: Record<string, { name: string; code: string }> = {
  blank: {
    name: "Blank",
    code: '# Write your alpha research code here\nimport pandas as pd\nimport numpy as np\n\n# Your code...\nprint("Hello from Galedge Alpha!")\n',
  },
  momentum: {
    name: "Momentum Alpha",
    code: `# Momentum Alpha Factor
# Computes 12-month momentum with 1-month reversal skip

import pandas as pd
import numpy as np

def compute_momentum(prices: pd.DataFrame, lookback=252, skip=21) -> pd.Series:
    """12-1 momentum: 12-month return skipping last month."""
    total_ret = prices.pct_change(lookback)
    recent_ret = prices.pct_change(skip)
    momentum = total_ret - recent_ret
    return momentum.iloc[-1]

# Example usage with sample data
np.random.seed(42)
dates = pd.date_range("2024-01-01", periods=300, freq="B")
stocks = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK"]
prices = pd.DataFrame(
    np.random.randn(300, 5).cumsum(axis=0) + 100,
    index=dates, columns=stocks
)

result = compute_momentum(prices)
print("Momentum Scores:")
print(result.sort_values(ascending=False).to_string())
print(f"\\nTop pick: {result.idxmax()} ({result.max():.4f})")
`,
  },
  mean_reversion: {
    name: "Mean Reversion",
    code: `# Mean Reversion Alpha
# Stocks that deviated most from their moving average

import pandas as pd
import numpy as np

def mean_reversion_signal(prices: pd.DataFrame, window=20) -> pd.Series:
    """Z-score of price relative to moving average."""
    ma = prices.rolling(window).mean()
    std = prices.rolling(window).std()
    z_score = (prices - ma) / std
    return z_score.iloc[-1]

# Example
np.random.seed(42)
dates = pd.date_range("2024-01-01", periods=100, freq="B")
stocks = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "SBIN"]
prices = pd.DataFrame(
    np.random.randn(100, 5).cumsum(axis=0) + 100,
    index=dates, columns=stocks
)

signal = mean_reversion_signal(prices)
print("Mean Reversion Z-Scores (negative = oversold):")
print(signal.sort_values().to_string())
print(f"\\nMost oversold: {signal.idxmin()} (z={signal.min():.2f})")
print(f"Most overbought: {signal.idxmax()} (z={signal.max():.2f})")
`,
  },
  value_composite: {
    name: "Value Composite",
    code: `# Value Composite Alpha
# Combines PE, PB, and Dividend Yield

import pandas as pd
import numpy as np

def value_composite(pe: pd.Series, pb: pd.Series, div_yield: pd.Series) -> pd.Series:
    """Rank-based value composite. Lower PE/PB = better, higher yield = better."""
    pe_rank = pe.rank(ascending=True)  # Low PE is good
    pb_rank = pb.rank(ascending=True)  # Low PB is good
    dy_rank = div_yield.rank(ascending=False)  # High yield is good

    composite = (pe_rank + pb_rank + dy_rank) / 3
    return composite.rank(ascending=True)  # Final rank: 1 = best value

# Example
stocks = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ITC", "SBIN", "LT", "COALINDIA"]
np.random.seed(42)
pe = pd.Series(np.random.uniform(8, 40, len(stocks)), index=stocks)
pb = pd.Series(np.random.uniform(1, 8, len(stocks)), index=stocks)
div_yield = pd.Series(np.random.uniform(0.5, 5, len(stocks)), index=stocks)

scores = value_composite(pe, pb, div_yield)
print("Value Composite Rankings (1 = best value):")
for stock in scores.sort_values().index:
    print(f"  {stock:12s}  Rank: {scores[stock]:.0f}  PE: {pe[stock]:.1f}  PB: {pb[stock]:.1f}  DY: {div_yield[stock]:.1f}%")
`,
  },
  risk_parity: {
    name: "Risk Parity Weights",
    code: `# Risk Parity Portfolio
# Weights inversely proportional to volatility

import pandas as pd
import numpy as np

def risk_parity_weights(returns: pd.DataFrame) -> pd.Series:
    """Inverse-volatility weighting."""
    vol = returns.std() * np.sqrt(252)
    inv_vol = 1 / vol
    weights = inv_vol / inv_vol.sum()
    return weights

# Example
np.random.seed(42)
dates = pd.date_range("2024-01-01", periods=252, freq="B")
stocks = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ITC", "COALINDIA"]
returns = pd.DataFrame(
    np.random.randn(252, 6) * np.array([0.02, 0.018, 0.015, 0.019, 0.012, 0.025]),
    index=dates, columns=stocks
)

weights = risk_parity_weights(returns)
vol = returns.std() * np.sqrt(252)

print("Risk Parity Portfolio:")
print(f"{'Stock':12s} {'Weight':>8s} {'Ann. Vol':>10s}")
print("-" * 32)
for stock in weights.sort_values(ascending=False).index:
    print(f"{stock:12s} {weights[stock]:>7.1%} {vol[stock]:>9.1%}")
print(f"\\nTotal: {weights.sum():.1%}")
`,
  },
};

interface FileTab {
  id: string;
  name: string;
  code: string;
  modified: boolean;
  cloudId: number | null; // null = local only, number = saved to backend
  saveStatus: "saved" | "saving" | "local";
}

export default function CodeEditorPage() {
  const { token } = useAuth();
  const [files, setFiles] = useState<FileTab[]>([
    { id: "main", name: "main.py", code: TEMPLATES.blank.code, modified: false, cloudId: null, saveStatus: "local" },
  ]);
  const [activeFileId, setActiveFileId] = useState("main");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [outputHeight, setOutputHeight] = useState(200);
  const [loaded, setLoaded] = useState(false);
  const editorRef = useRef<unknown>(null);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const activeFile = files.find((f) => f.id === activeFileId) || files[0];

  // --- Fetch saved files on mount ---
  useEffect(() => {
    if (!token) {
      setLoaded(true);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/alpha/code-files`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) { setLoaded(true); return; }
        const data: { id: number; name: string; code: string }[] = await res.json();
        if (data.length > 0) {
          const loaded_files: FileTab[] = data.map((f) => ({
            id: `cloud_${f.id}`,
            name: f.name,
            code: f.code,
            modified: false,
            cloudId: f.id,
            saveStatus: "saved" as const,
          }));
          setFiles(loaded_files);
          setActiveFileId(loaded_files[0].id);
        }
      } catch {
        // Silently fall back to local-only
      }
      setLoaded(true);
    })();
  }, [token]);

  // --- Auto-save with debounce ---
  const autoSave = useCallback(
    (fileId: string, cloudId: number | null, code: string, name: string) => {
      if (!token || !cloudId) return;

      // Mark as saving
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, saveStatus: "saving" as const } : f))
      );

      // Clear previous timer
      if (saveTimers.current[fileId]) clearTimeout(saveTimers.current[fileId]);

      saveTimers.current[fileId] = setTimeout(async () => {
        try {
          await fetch(`${API_BASE}/api/alpha/code-files/${cloudId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ code, name }),
          });
          setFiles((prev) =>
            prev.map((f) => (f.id === fileId ? { ...f, saveStatus: "saved" as const } : f))
          );
        } catch {
          // Silently fail — will retry on next edit
        }
      }, 2000);
    },
    [token]
  );

  function updateCode(value: string | undefined) {
    const code = value || "";
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id !== activeFileId) return f;
        const updated = { ...f, code, modified: true };
        return updated;
      })
    );
    // Trigger auto-save for the active file
    const file = files.find((f) => f.id === activeFileId);
    if (file) {
      autoSave(activeFileId, file.cloudId, code, file.name);
    }
  }

  async function newFile() {
    const num = files.length + 1;
    const name = `script_${num}.py`;
    const code = TEMPLATES.blank.code;

    if (token) {
      try {
        const res = await fetch(`${API_BASE}/api/alpha/code-files`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name, code }),
        });
        if (res.ok) {
          const data = await res.json();
          const id = `cloud_${data.id}`;
          setFiles((prev) => [...prev, { id, name: data.name, code: data.code, modified: false, cloudId: data.id, saveStatus: "saved" }]);
          setActiveFileId(id);
          return;
        }
      } catch {
        // Fall through to local
      }
    }

    // Fallback: local-only file
    const id = `file_${Date.now()}`;
    setFiles((prev) => [...prev, { id, name, code, modified: false, cloudId: null, saveStatus: "local" }]);
    setActiveFileId(id);
  }

  async function closeFile(id: string) {
    if (files.length <= 1) return;
    const file = files.find((f) => f.id === id);

    if (file?.cloudId) {
      const confirmed = window.confirm(`Delete "${file.name}" from saved files? This cannot be undone.`);
      if (!confirmed) return;

      try {
        await fetch(`${API_BASE}/api/alpha/code-files/${file.cloudId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Delete locally even if backend fails
      }
    }

    const remaining = files.filter((f) => f.id !== id);
    setFiles(remaining);
    if (activeFileId === id) setActiveFileId(remaining[0].id);
  }

  function loadTemplate(templateKey: string) {
    const template = TEMPLATES[templateKey];
    if (!template) return;
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id !== activeFileId) return f;
        const updated = { ...f, code: template.code, modified: true };
        return updated;
      })
    );
    const file = files.find((f) => f.id === activeFileId);
    if (file) {
      autoSave(activeFileId, file.cloudId, template.code, file.name);
    }
  }

  async function runCode() {
    setRunning(true);
    setOutput("Running...\n");
    try {
      const res = await fetch(`${API_BASE}/api/alpha/run-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: activeFile.code }),
      });
      const data = await res.json();
      if (data.output) {
        setOutput(data.output);
      } else if (data.error) {
        setOutput(`Error:\n${data.error}`);
      } else {
        setOutput("No output");
      }
    } catch {
      setOutput("Backend code execution not available.\n\nTo run Python code, start the backend with the /api/alpha/run-code endpoint.\n\nYour code:\n" + activeFile.code.slice(0, 500));
    }
    setRunning(false);
  }

  function copyCode() {
    navigator.clipboard.writeText(activeFile.code);
  }

  function downloadCode() {
    const blob = new Blob([activeFile.code], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = activeFile.name;
    a.click();
  }

  return (
    <div className="flex flex-col h-[calc(100vh-48px)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2">
          <FileCode2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Code Editor</span>
          <Badge variant="secondary" className="text-[8px]">Python</Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <Select onValueChange={(v) => { if (typeof v === "string") loadTemplate(v); }}>
            <SelectTrigger className="h-7 w-[160px] text-[10px]">
              <SelectValue placeholder="Load Template..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TEMPLATES).map(([key, t]) => (
                <SelectItem key={key} value={key}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={copyCode}>
            <Copy className="h-3 w-3" /> Copy
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={downloadCode}>
            <Download className="h-3 w-3" /> Save .py
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => setOutput("")}>
            <RotateCcw className="h-3 w-3" /> Clear
          </Button>
          <Button size="sm" className="h-7 text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={runCode} disabled={running}>
            {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            Run
          </Button>
        </div>
      </div>

      {/* File Tabs */}
      <div className="flex items-center gap-0 border-b border-border bg-neutral-950 shrink-0 overflow-x-auto">
        {files.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFileId(f.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] border-r border-border shrink-0 ${
              f.id === activeFileId
                ? "bg-neutral-900 text-foreground"
                : "bg-neutral-950 text-muted-foreground hover:bg-neutral-900/50"
            }`}
          >
            <FileCode2 className="h-3 w-3 text-yellow-500" />
            {f.name}
            {f.modified && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
            {/* Save status indicator */}
            {f.saveStatus === "saving" && (
              <span className="text-[9px] text-yellow-400 ml-1">Saving...</span>
            )}
            {f.saveStatus === "saved" && (
              <span className="text-[9px] text-emerald-400 ml-1 flex items-center gap-0.5">
                <Cloud className="h-2.5 w-2.5" /> Saved
              </span>
            )}
            {/* Cloud vs Local badge */}
            {f.cloudId ? (
              <Badge variant="secondary" className="text-[7px] px-1 py-0 h-3 ml-1 bg-emerald-900/40 text-emerald-400 border-emerald-700/50">
                <Cloud className="h-2 w-2 mr-0.5" />cloud
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[7px] px-1 py-0 h-3 ml-1 bg-neutral-800 text-neutral-400 border-neutral-700">
                <HardDrive className="h-2 w-2 mr-0.5" />local
              </Badge>
            )}
            {files.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); closeFile(f.id); }}
                className="ml-1 p-0.5 rounded hover:bg-neutral-700"
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            )}
          </button>
        ))}
        <button onClick={newFile} className="px-2 py-1.5 text-muted-foreground hover:text-foreground">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Editor + Output */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Monaco Editor */}
        <div className="flex-1 min-h-0">
          <Editor
            height="100%"
            language="python"
            theme="vs-dark"
            value={activeFile.code}
            onChange={updateCode}
            onMount={(editor) => { editorRef.current = editor; }}
            options={{
              fontSize: 13,
              fontFamily: "'Geist Mono', 'Fira Code', monospace",
              minimap: { enabled: false },
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              padding: { top: 12 },
              suggestOnTriggerCharacters: true,
              wordWrap: "on",
              tabSize: 4,
              renderWhitespace: "selection",
              bracketPairColorization: { enabled: true },
              smoothScrolling: true,
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: "on",
            }}
          />
        </div>

        {/* Resize Handle */}
        <div
          className="h-1 bg-border cursor-row-resize hover:bg-emerald-500/50 transition-colors shrink-0"
          onMouseDown={(e) => {
            const startY = e.clientY;
            const startH = outputHeight;
            const onMove = (ev: MouseEvent) => {
              const delta = startY - ev.clientY;
              setOutputHeight(Math.max(80, Math.min(500, startH + delta)));
            };
            const onUp = () => {
              window.removeEventListener("mousemove", onMove);
              window.removeEventListener("mouseup", onUp);
            };
            window.addEventListener("mousemove", onMove);
            window.addEventListener("mouseup", onUp);
          }}
        />

        {/* Output Panel */}
        <div className="shrink-0 bg-neutral-950 border-t border-border" style={{ height: outputHeight }}>
          <div className="flex items-center justify-between px-3 py-1 border-b border-border/50">
            <span className="text-[10px] text-muted-foreground font-medium">OUTPUT</span>
            {running && <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />}
          </div>
          <pre className="p-3 text-[11px] font-mono text-emerald-400 overflow-auto" style={{ height: outputHeight - 28 - 22 }}>
            {output || "Click Run to execute your code..."}
          </pre>
          {/* Security notice */}
          <div className="flex items-center gap-1.5 px-3 py-1 border-t border-border/30 bg-neutral-950/80">
            <ShieldCheck className="h-3 w-3 text-amber-500/70" />
            <span className="text-[9px] text-muted-foreground">
              Sandboxed environment — os, sys, subprocess blocked. 30s timeout.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
