"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  Home, Shield, Atom, Layers, Target, BarChart3, Settings, Brain,
  ChevronRight, ChevronDown, Filter, GitCompareArrows, LayoutGrid,
  Grid3X3, Briefcase, Sliders, LogIn, LogOut, User, BookOpen,
  TrendingUp, PieChart, Activity, Users,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem,
  SidebarFooter, SidebarSeparator,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { usePortfolio } from "@/lib/portfolio-context";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

interface NavItem {
  title: string;
  href: string;
  icon?: React.ElementType;
  children?: { title: string; href: string; section?: string }[];
}

const MAIN_NAV: NavItem[] = [
  { title: "Home", href: "/home", icon: Home },
  { title: "Docs", href: "/docs", icon: BookOpen },
];

const ANALYTICS_CHILDREN = [
  // Overview section
  { title: "Performance Summary", href: "/analytics/overview/performance", section: "Overview" },
  { title: "Peer Comparison", href: "/analytics/overview/peer-comparison", section: "Overview" },
  { title: "Holdings & Factor", href: "/analytics/overview/holdings", section: "Overview" },
  { title: "Period Analysis", href: "/analytics/overview/period-analysis", section: "Overview" },
  // Portfolio Analysis section
  { title: "Returns & Risks", href: "/analytics/portfolio-analysis/returns-risk", section: "Portfolio Analysis" },
  { title: "Slicing & Dicing", href: "/analytics/portfolio-analysis/slicing", section: "Portfolio Analysis" },
  { title: "Drawdowns", href: "/analytics/portfolio-analysis/drawdown", section: "Portfolio Analysis" },
  { title: "Event Sensitivity", href: "/analytics/portfolio-analysis/event-sensitivity", section: "Portfolio Analysis" },
  // Peer Intelligence section
  { title: "Peer Returns & Risks", href: "/analytics/peer-intelligence", section: "Peer Intelligence" },
  { title: "Peer Breakdown", href: "/analytics/peer-intelligence/peer-breakdown", section: "Peer Intelligence" },
];

const PLATFORM_NAV: NavItem[] = [
  {
    title: "Risk Model", href: "/risk-model", icon: Shield,
    children: [
      { title: "Factor Summary", href: "/risk-model/factor-summary" },
      { title: "Stock Summary", href: "/risk-model/stock-summary" },
    ],
  },
  {
    title: "Alpha Machine", href: "/alpha-machine", icon: Atom,
    children: [
      { title: "Home", href: "/alpha-machine" },
      { title: "Build Screen/Factor", href: "/alpha-machine/build-screen" },
      { title: "Build Alpha Model", href: "/alpha-machine/build-model" },
      { title: "Upload Factors", href: "/alpha-machine/upload-factors" },
      { title: "Code Editor", href: "/alpha-machine/code-editor" },
    ],
  },
  {
    title: "Portfolio Construction", href: "/portfolio-construction", icon: Layers,
    children: [
      { title: "Select Portfolio", href: "/portfolio-construction/select" },
      { title: "Upload Portfolio", href: "/portfolio-construction/upload" },
    ],
  },
  { title: "Optimizer", href: "/optimizer", icon: Sliders },
  {
    title: "Strategy Builder", href: "/strategy-builder", icon: Target,
    children: [
      { title: "Home", href: "/strategy-builder" },
      { title: "Build New Strategy", href: "/strategy-builder/build" },
    ],
  },
  { title: "Analytics", href: "/analytics", icon: BarChart3, children: ANALYTICS_CHILDREN },
];

const TOOLS_NAV: NavItem[] = [
  { title: "AI Predict", href: "/predict", icon: Brain },
  { title: "Screener", href: "/screener", icon: Filter },
  { title: "Compare", href: "/compare", icon: GitCompareArrows },
  { title: "Heatmap", href: "/heatmap", icon: LayoutGrid },
  { title: "Correlation", href: "/correlation", icon: Grid3X3 },
  { title: "Portfolio Tracker", href: "/portfolio", icon: Briefcase },
  { title: "Settings", href: "/settings", icon: Settings },
];

// ── Analytics sub-nav with section grouping ───────────────────────────────────

function AnalyticsSubNav({ children }: { children: { title: string; href: string; section?: string }[] }) {
  const pathname = usePathname();
  const sections: Record<string, typeof children> = {};
  children.forEach(c => {
    const s = c.section || "Other";
    if (!sections[s]) sections[s] = [];
    sections[s].push(c);
  });

  return (
    <SidebarMenuSub>
      {Object.entries(sections).map(([section, items]) => (
        <div key={section}>
          <div className="px-2 pt-2 pb-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/50">
            {section}
          </div>
          {items.map((child) => (
            <SidebarMenuSubItem key={child.href}>
              <SidebarMenuSubButton
                render={<Link href={child.href} />}
                isActive={pathname === child.href}
              >
                {child.title}
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </div>
      ))}
    </SidebarMenuSub>
  );
}

// ── Fund/Portfolio selector ───────────────────────────────────────────────────

interface SelectorItem {
  label: string;
  sublabel: string;
  source: "portfolio" | "strategy";
  sourceId: number;
  backtestId?: number;
}

function FundSelector() {
  const pathname = usePathname();
  const isAnalytics = pathname.startsWith("/analytics");
  const { selectedSource, selectedSourceId, selectedBacktestId, selectedBenchmark, setSelectedBenchmark, analyticsData, loadAnalytics } = usePortfolio();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SelectorItem[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("galedge_auth_token") : null;

  useEffect(() => {
    if (!isAnalytics || !token) return;
    fetch(`${API_BASE}/api/analytics/v2/selector`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        const list: SelectorItem[] = [];
        (d.portfolios || []).forEach((p: { id: number; fund_name: string; scheme_name?: string }) => {
          list.push({ label: p.fund_name, sublabel: p.scheme_name || "Uploaded", source: "portfolio", sourceId: p.id });
        });
        (d.strategies || []).forEach((s: { id: number; fund_name: string; scheme_name?: string; iteration_name?: string; backtests?: { id: number; start_date: string; end_date: string; status: string }[] }) => {
          (s.backtests || []).filter((b) => b.status === "completed").forEach(b => {
            list.push({
              label: s.fund_name,
              sublabel: `${s.scheme_name || ""} ${s.iteration_name || ""} · ${b.start_date?.slice(0, 7)} to ${b.end_date?.slice(0, 7)}`.trim(),
              source: "strategy",
              sourceId: s.id,
              backtestId: b.id,
            });
          });
        });
        setItems(list);
        // Auto-load if a selection exists in context but no data yet
        if (selectedSource && selectedSourceId && !analyticsData) {
          loadAnalytics(selectedSource, selectedSourceId, selectedBacktestId ?? undefined);
        }
      })
      .catch(() => {});
  }, [isAnalytics, token]); // eslint-disable-line

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!isAnalytics) return null;

  const selected = items.find(i =>
    i.source === selectedSource && i.sourceId === selectedSourceId &&
    (i.backtestId === selectedBacktestId || (!i.backtestId && !selectedBacktestId))
  );

  const displayLabel = selected?.label || (analyticsData ? "Portfolio loaded" : "Select Portfolio");
  const displaySub = selected?.sublabel || (analyticsData ? "" : "Click to choose");

  return (
    <div ref={ref} className="relative px-2 pb-2 group-data-[collapsible=icon]:hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 bg-muted/40 hover:bg-muted/70 transition-colors border border-border/30"
      >
        <div className="min-w-0 text-left">
          <div className="text-xs font-semibold truncate">{displayLabel}</div>
          <div className="text-[10px] text-muted-foreground truncate">{displaySub || selectedBenchmark}</div>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 ml-1 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-2 right-2 top-full z-50 mt-1 rounded-lg border border-border bg-popover shadow-xl overflow-hidden">
          <div className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
            Select Portfolio / Strategy
          </div>
          <div className="max-h-64 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-3 py-3 text-[11px] text-muted-foreground">No portfolios or backtests found</div>
            ) : (
              items.map((item, i) => {
                const isActive = item.source === selectedSource && item.sourceId === selectedSourceId && item.backtestId === selectedBacktestId;
                return (
                  <button
                    key={i}
                    className={`w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors ${isActive ? "bg-emerald-500/10 text-emerald-500" : ""}`}
                    onClick={() => {
                      loadAnalytics(item.source, item.sourceId, item.backtestId);
                      setOpen(false);
                    }}
                  >
                    <div className="text-[11px] font-medium truncate">{item.label}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{item.sublabel}</div>
                  </button>
                );
              })
            )}
          </div>
          <div className="border-t border-border px-3 py-1.5">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Benchmark</div>
            <div className="flex flex-wrap gap-1">
              {["NIFTY 50", "NIFTY NEXT 50", "NIFTY 100", "NIFTY 500"].map(b => (
                <button
                  key={b}
                  onClick={() => setSelectedBenchmark && setSelectedBenchmark(b)}
                  className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${selectedBenchmark === b ? "border-emerald-500 text-emerald-500 bg-emerald-500/10" : "border-border text-muted-foreground hover:border-foreground"}`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Nav section ───────────────────────────────────────────────────────────────

function NavSection({ items, label }: { items: NavItem[]; label?: string }) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      {label && (
        <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          {label}
        </div>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;

            if (item.children) {
              const isAnalyticsItem = item.href === "/analytics";
              return (
                <Collapsible key={item.href} defaultOpen={isActive} className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger>
                      <SidebarMenuButton isActive={isActive} tooltip={item.title} className="justify-between">
                        <span className="flex items-center gap-2">
                          {Icon && <Icon className="h-4 w-4" />}
                          <span>{item.title}</span>
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      {isAnalyticsItem ? (
                        <AnalyticsSubNav children={item.children as { title: string; href: string; section?: string }[]} />
                      ) : (
                        <SidebarMenuSub>
                          {item.children.map((child) => (
                            <SidebarMenuSubItem key={child.href}>
                              <SidebarMenuSubButton render={<Link href={child.href} />} isActive={pathname === child.href}>
                                {child.title}
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      )}
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              );
            }

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton render={<Link href={item.href} />} isActive={isActive} tooltip={item.title}>
                  {Icon && <Icon className="h-4 w-4" />}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

// ── Main sidebar ──────────────────────────────────────────────────────────────

export function AppSidebar() {
  const { user, logout } = useAuth();

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />} tooltip="Galedge Alpha">
              <Image src="/logo-icon.svg" alt="Galedge" width={32} height={32} className="rounded-lg" />
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-bold">Galedge Alpha</span>
                <span className="text-[10px] text-muted-foreground">Systematic Investment Platform</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <FundSelector />
      </SidebarHeader>
      <SidebarContent>
        <NavSection items={MAIN_NAV} />
        <SidebarSeparator />
        <NavSection items={PLATFORM_NAV} label="Platform" />
        <SidebarSeparator />
        <NavSection items={TOOLS_NAV} label="Tools" />
      </SidebarContent>
      <SidebarFooter>
        <div className="flex flex-col gap-2 px-3 py-2 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0">
          {user ? (
            <>
              <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
                <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={logout}
                className="w-full justify-start gap-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
                <LogOut className="h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">Logout</span>
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button variant="ghost" size="sm"
                className="w-full justify-start gap-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
                <LogIn className="h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">Login</span>
              </Button>
            </Link>
          )}
          <div className="text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
            Galedge Alpha v1.0 — Not financial advice.
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
