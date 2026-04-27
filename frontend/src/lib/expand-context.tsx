"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Minimize2, Download } from "lucide-react";
import { downloadCSV } from "@/lib/csv";

interface ExpandState {
  open: (title: string, content: ReactNode, data?: Record<string, unknown>[], filename?: string, fullscreen?: boolean) => void;
}

const ExpandContext = createContext<ExpandState>({ open: () => {} });

export function useExpand() {
  return useContext(ExpandContext);
}

export function ExpandProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<ReactNode>(null);
  const [data, setData] = useState<Record<string, unknown>[] | undefined>();
  const [filename, setFilename] = useState("export");
  const [fullscreen, setFullscreen] = useState(false);

  function open(t: string, c: ReactNode, d?: Record<string, unknown>[], f?: string, fs?: boolean) {
    setTitle(t);
    setContent(c);
    setData(d);
    setFilename(f || "export");
    setFullscreen(fs ?? false);
    setVisible(true);
  }

  const close = useCallback(() => {
    setVisible(false);
    setContent(null);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!visible) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [visible, close]);

  return (
    <ExpandContext.Provider value={{ open }}>
      {children}
      {visible && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-40 bg-black/85 flex items-center justify-center p-4" onClick={close}>
          <div
            className={`bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl flex flex-col ${fullscreen ? "w-[94vw] h-[90vh]" : "min-w-[420px] max-w-[94vw] max-h-[90vh]"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-700 shrink-0 gap-6">
              <span className="text-sm font-semibold">{title}</span>
              <div className="flex items-center gap-2 shrink-0">
                {data && data.length > 0 && (
                  <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => downloadCSV(data, filename)}>
                    <Download className="h-3 w-3" /> Download CSV
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={close}>
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className={`flex-1 min-h-0 overflow-auto p-4 [&_table]:border-collapse ${fullscreen ? "[&>div]:w-full [&>div]:h-full [&_.recharts-responsive-container]:!w-full [&_.recharts-responsive-container]:!h-full" : ""}`}>
              {content}
            </div>
          </div>
        </div>,
        document.body
      )}
    </ExpandContext.Provider>
  );
}
