"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BarChart3,
  GitCompareArrows,
  Filter,
  LayoutGrid,
  Grid3X3,
  Briefcase,
  Brain,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { title: "Home", href: "/", icon: Home },
  { title: "Screener", href: "/screener", icon: Filter },
  { title: "Compare", href: "/compare", icon: GitCompareArrows },
  { title: "Heatmap", href: "/heatmap", icon: LayoutGrid },
  { title: "Correlation", href: "/correlation", icon: Grid3X3 },
  { title: "AI Predict", href: "/predict", icon: Brain },
  { title: "Portfolio", href: "/portfolio", icon: Briefcase },
  { title: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/" />}
              tooltip="Galedge"
            >
              <Image
                src="/logo-icon.svg"
                alt="Galedge"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-bold">Galedge</span>
                <span className="text-xs text-muted-foreground">
                  Free Market Data
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 py-2 text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
          Data from Yahoo Finance. Not financial advice.
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
