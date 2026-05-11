"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Fuse from "fuse.js";
import { Search, ArrowRight, X, Hash } from "lucide-react";
import { DOCS_INDEX, type DocsEntry } from "@/lib/docs-index";

// ── Fuse instance (singleton outside render cycle) ────────────────────────────
const fuse = new Fuse(DOCS_INDEX, {
  keys: ["title", "description", "keywords", "section"],
  threshold: 0.3,
  minMatchCharLength: 2,
  includeScore: true,
});

// ── Quick-jump shortcuts shown when no query ──────────────────────────────────
const SHORTCUTS: Pick<DocsEntry, "id" | "title" | "section" | "href">[] = [
  { id: "docs-overview", title: "Overview", section: "Overview", href: "/docs" },
  { id: "getting-started", title: "Getting Started", section: "Getting Started", href: "/docs/getting-started" },
  { id: "strategy-builder", title: "Strategy Builder", section: "Strategy Builder", href: "/docs/strategy-builder" },
  { id: "alpha-machine", title: "Alpha Machine", section: "Alpha Machine", href: "/docs/alpha-machine" },
  { id: "tools-screener", title: "Stock Screener", section: "Tools", href: "/docs/tools#screener" },
  { id: "glossary", title: "Glossary", section: "Glossary", href: "/docs/glossary" },
];

// ── Section colour badges ─────────────────────────────────────────────────────
const SECTION_COLORS: Record<string, string> = {
  Overview:          "bg-neutral-800 text-neutral-400",
  "Getting Started": "bg-emerald-500/15 text-emerald-400",
  Concepts:          "bg-blue-500/15 text-blue-400",
  Portfolio:         "bg-purple-500/15 text-purple-400",
  Analytics:         "bg-orange-500/15 text-orange-400",
  "Risk Model":      "bg-cyan-500/15 text-cyan-400",
  Optimizer:         "bg-yellow-500/15 text-yellow-400",
  "Strategy Builder":"bg-red-500/15 text-red-400",
  "Alpha Machine":   "bg-indigo-500/15 text-indigo-400",
  Tools:             "bg-pink-500/15 text-pink-400",
  Settings:          "bg-neutral-500/15 text-neutral-400",
  "API Reference":   "bg-emerald-500/15 text-emerald-400",
  Glossary:          "bg-blue-500/15 text-blue-400",
};

function sectionBadge(section: string) {
  return SECTION_COLORS[section] ?? "bg-neutral-800 text-neutral-400";
}

// ─────────────────────────────────────────────────────────────────────────────
export function DocsSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ── Search results ──────────────────────────────────────────────────────────
  const results: DocsEntry[] =
    query.trim().length >= 2
      ? fuse.search(query).slice(0, 8).map((r) => r.item)
      : [];

  const items = query.trim().length >= 2 ? results : [];

  // ── Keyboard listener (global) ──────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Focus input when modal opens ────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setActiveIdx(0);
    }
  }, [open]);

  // ── Reset active index when results change ──────────────────────────────────
  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  // ── Navigation handler ──────────────────────────────────────────────────────
  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router]
  );

  // ── In-modal keyboard navigation ────────────────────────────────────────────
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const list = items.length > 0 ? items : SHORTCUTS;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, list.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = list[activeIdx];
      if (item) navigate(item.href);
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (query) {
        setQuery("");
      } else {
        setOpen(false);
      }
    }
  }

  // ── Scroll active item into view ────────────────────────────────────────────
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLButtonElement>("[data-active='true']");
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Trigger button ────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-500 hover:text-neutral-400 text-sm transition-all group"
        aria-label="Search docs"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left text-xs">Search docs...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono text-neutral-600 group-hover:text-neutral-500 transition-colors">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* ── Modal overlay ─────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
          onClick={() => setOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden />

          {/* Dialog */}
          <div
            className="relative w-full max-w-xl rounded-xl border border-neutral-800 bg-neutral-950 shadow-2xl shadow-black/60 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input row */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-800">
              <Search className="h-4 w-4 text-neutral-500 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search documentation..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-neutral-600 outline-none"
                autoComplete="off"
                spellCheck={false}
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="text-neutral-600 hover:text-neutral-400 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono text-neutral-700 bg-neutral-900 border border-neutral-800 rounded px-1.5 py-0.5">
                ESC
              </kbd>
            </div>

            {/* Results / Default list */}
            <div ref={listRef} className="max-h-[420px] overflow-y-auto overscroll-contain">
              {/* ── Has query ───────────────────────────────────────────── */}
              {query.trim().length >= 2 && (
                <>
                  {items.length > 0 ? (
                    <div className="py-2">
                      {items.map((item, idx) => (
                        <ResultRow
                          key={item.id}
                          item={item}
                          isActive={idx === activeIdx}
                          onHover={() => setActiveIdx(idx)}
                          onClick={() => navigate(item.href)}
                        />
                      ))}
                    </div>
                  ) : (
                    /* Empty state */
                    <div className="py-12 text-center">
                      <p className="text-sm text-neutral-500">
                        No results for{" "}
                        <span className="text-white font-medium">&ldquo;{query}&rdquo;</span>
                      </p>
                      <p className="text-xs text-neutral-600 mt-1.5">
                        Try a shorter term or browse the sidebar
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* ── No query — show shortcuts ────────────────────────── */}
              {query.trim().length < 2 && (
                <div className="py-2">
                  <p className="px-4 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-600">
                    Jump to
                  </p>
                  {SHORTCUTS.map((s, idx) => (
                    <ShortcutRow
                      key={s.id}
                      item={s}
                      isActive={idx === activeIdx}
                      onHover={() => setActiveIdx(idx)}
                      onClick={() => navigate(s.href)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="border-t border-neutral-800 px-4 py-2 flex items-center gap-4 text-[10px] text-neutral-700">
              <span className="flex items-center gap-1">
                <kbd className="font-mono bg-neutral-900 border border-neutral-800 rounded px-1 py-0.5">↑↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="font-mono bg-neutral-900 border border-neutral-800 rounded px-1 py-0.5">↵</kbd>
                select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="font-mono bg-neutral-900 border border-neutral-800 rounded px-1 py-0.5">ESC</kbd>
                close
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ResultRow({
  item,
  isActive,
  onHover,
  onClick,
}: {
  item: DocsEntry;
  isActive: boolean;
  onHover: () => void;
  onClick: () => void;
}) {
  return (
    <button
      data-active={isActive}
      onMouseEnter={onHover}
      onClick={onClick}
      className={`w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors ${
        isActive ? "bg-neutral-800/70" : "hover:bg-neutral-900"
      }`}
    >
      <div className="mt-0.5 shrink-0">
        <Hash className="h-3.5 w-3.5 text-neutral-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded ${sectionBadge(item.section)}`}
          >
            {item.section}
          </span>
          <span className="text-sm font-medium text-white truncate">{item.title}</span>
        </div>
        {item.description && (
          <p className="text-xs text-neutral-500 leading-relaxed line-clamp-1">
            {item.description}
          </p>
        )}
      </div>
      {isActive && (
        <ArrowRight className="h-3.5 w-3.5 text-neutral-500 shrink-0 mt-1" />
      )}
    </button>
  );
}

function ShortcutRow({
  item,
  isActive,
  onHover,
  onClick,
}: {
  item: Pick<DocsEntry, "id" | "title" | "section" | "href">;
  isActive: boolean;
  onHover: () => void;
  onClick: () => void;
}) {
  return (
    <button
      data-active={isActive}
      onMouseEnter={onHover}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
        isActive ? "bg-neutral-800/70" : "hover:bg-neutral-900"
      }`}
    >
      <ArrowRight
        className={`h-3.5 w-3.5 shrink-0 transition-colors ${
          isActive ? "text-emerald-400" : "text-neutral-700"
        }`}
      />
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <span className="text-sm text-white">{item.title}</span>
        <span
          className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded ${sectionBadge(item.section)}`}
        >
          {item.section}
        </span>
      </div>
    </button>
  );
}
