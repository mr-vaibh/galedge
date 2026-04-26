"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Shield,
  Atom,
  Layers,
  Target,
  BarChart3,
  Settings,
  Brain,
  ChevronRight,
  Filter,
  GitCompareArrows,
  LayoutGrid,
  Grid3X3,
  Briefcase,
  Sliders,
  LogIn,
  LogOut,
  User,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

interface NavItem {
  title: string;
  href: string;
  icon?: React.ElementType;
  children?: { title: string; href: string }[];
}

const MAIN_NAV: NavItem[] = [
  { title: "Home", href: "/", icon: Home },
];

const PLATFORM_NAV: NavItem[] = [
  {
    title: "Risk Model",
    href: "/risk-model",
    icon: Shield,
    children: [
      { title: "Factor Summary", href: "/risk-model/factor-summary" },
      { title: "Stock Summary", href: "/risk-model/stock-summary" },
    ],
  },
  {
    title: "Alpha Machine",
    href: "/alpha-machine",
    icon: Atom,
    children: [
      { title: "Home", href: "/alpha-machine" },
      { title: "Build Screen/Factor", href: "/alpha-machine/build-screen" },
      { title: "Build Alpha Model", href: "/alpha-machine/build-model" },
      { title: "Upload Factors", href: "/alpha-machine/upload-factors" },
      { title: "Code Editor", href: "/alpha-machine/code-editor" },
    ],
  },
  {
    title: "Portfolio Construction",
    href: "/portfolio-construction",
    icon: Layers,
    children: [
      { title: "Select Portfolio", href: "/portfolio-construction/select" },
      { title: "Upload Portfolio", href: "/portfolio-construction/upload" },
    ],
  },
  {
    title: "Optimizer",
    href: "/optimizer",
    icon: Sliders,
  },
  {
    title: "Strategy Builder",
    href: "/strategy-builder",
    icon: Target,
    children: [
      { title: "Home", href: "/strategy-builder" },
      { title: "Build New Strategy", href: "/strategy-builder/build" },
    ],
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    children: [
      { title: "Overview", href: "/analytics/overview/performance" },
      { title: "Portfolio Analysis", href: "/analytics/portfolio-analysis/returns-risk" },
      { title: "Peer Intelligence", href: "/analytics/peer-intelligence" },
      { title: "Lite Analytics", href: "/analytics/lite" },
    ],
  },
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
            const isActive = item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
            const Icon = item.icon;

            if (item.children) {
              return (
                <Collapsible key={item.href} defaultOpen={isActive} className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.title}
                        className="justify-between"
                      >
                        <span className="flex items-center gap-2">
                          {Icon && <Icon className="h-4 w-4" />}
                          <span>{item.title}</span>
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.children.map((child) => {
                          const childActive = pathname === child.href;
                          return (
                            <SidebarMenuSubItem key={child.href}>
                              <SidebarMenuSubButton
                                render={<Link href={child.href} />}
                                isActive={childActive}
                              >
                                {child.title}
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              );
            }

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  render={<Link href={item.href} />}
                  isActive={isActive}
                  tooltip={item.title}
                >
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

export function AppSidebar() {
  const { user, logout } = useAuth();

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/" />}
              tooltip="Galedge Alpha"
            >
              <Image
                src="/logo-icon.svg"
                alt="Galedge"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-bold">Galedge Alpha</span>
                <span className="text-[10px] text-muted-foreground">
                  Systematic Investment Platform
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
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
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="w-full justify-start gap-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
              >
                <LogOut className="h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">
                  Logout
                </span>
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
              >
                <LogIn className="h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">
                  Login
                </span>
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
