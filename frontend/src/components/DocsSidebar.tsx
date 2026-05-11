"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  Rocket,
  GraduationCap,
  Briefcase,
  BarChart3,
  Shield,
  Sliders,
  Target,
  Atom,
  Wrench,
  Settings,
  Code2,
  BookA,
  ChevronRight,
  ArrowLeft,
  Menu,
  X,
} from "lucide-react";

interface DocSection {
  title: string;
  icon: React.ElementType;
  href: string;
  children?: { title: string; href: string }[];
}

const DOCS_NAV: DocSection[] = [
  {
    title: "Getting Started",
    icon: Rocket,
    href: "/docs/getting-started",
    children: [
      { title: "Create Account", href: "/docs/getting-started#create-account" },
      { title: "Upload Portfolio", href: "/docs/getting-started#upload-portfolio" },
      { title: "View Analytics", href: "/docs/getting-started#view-analytics" },
    ],
  },
  {
    title: "Concepts",
    icon: GraduationCap,
    href: "/docs/concepts",
    children: [
      { title: "Stocks & Indices", href: "/docs/concepts#stocks-indices" },
      { title: "Key Metrics", href: "/docs/concepts#key-metrics" },
      { title: "Factor Models", href: "/docs/concepts#factor-models" },
      { title: "Attribution", href: "/docs/concepts#attribution" },
      { title: "Optimization", href: "/docs/concepts#optimization" },
    ],
  },
  {
    title: "Portfolio",
    icon: Briefcase,
    href: "/docs/portfolio",
    children: [
      { title: "Upload CSV", href: "/docs/portfolio#upload-csv" },
      { title: "Select Portfolio", href: "/docs/portfolio#select-portfolio" },
      { title: "Portfolio Tracker", href: "/docs/portfolio#tracker" },
    ],
  },
  {
    title: "Analytics",
    icon: BarChart3,
    href: "/docs/analytics",
    children: [
      { title: "Performance", href: "/docs/analytics#performance" },
      { title: "Holdings", href: "/docs/analytics#holdings" },
      { title: "Returns & Risk", href: "/docs/analytics#returns-risk" },
      { title: "Peer Comparison", href: "/docs/analytics#peer-comparison" },
      { title: "Drawdown", href: "/docs/analytics#drawdown" },
      { title: "Period Analysis", href: "/docs/analytics#period-analysis" },
    ],
  },
  {
    title: "Risk Model",
    icon: Shield,
    href: "/docs/risk-model",
    children: [
      { title: "21-Factor Model", href: "/docs/risk-model#factor-model" },
      { title: "Factor Summary", href: "/docs/risk-model#factor-summary" },
      { title: "Stock Exposures", href: "/docs/risk-model#stock-exposures" },
    ],
  },
  {
    title: "Optimizer",
    icon: Sliders,
    href: "/docs/optimizer",
    children: [
      { title: "Universe Selection", href: "/docs/optimizer#universe" },
      { title: "Objectives", href: "/docs/optimizer#objectives" },
      { title: "Constraints", href: "/docs/optimizer#constraints" },
      { title: "Results", href: "/docs/optimizer#results" },
    ],
  },
  {
    title: "Strategy Builder",
    icon: Target,
    href: "/docs/strategy-builder",
    children: [
      { title: "Create Strategy", href: "/docs/strategy-builder#create" },
      { title: "Backtesting", href: "/docs/strategy-builder#backtesting" },
      { title: "Promote & Demote", href: "/docs/strategy-builder#promote" },
      { title: "Live Rebalance", href: "/docs/strategy-builder#rebalance" },
      { title: "Constraints & Objectives", href: "/docs/strategy-builder/constraints" },
    ],
  },
  {
    title: "Alpha Machine",
    icon: Atom,
    href: "/docs/alpha-machine",
    children: [
      { title: "Code Editor", href: "/docs/alpha-machine#code-editor" },
      { title: "Build Model", href: "/docs/alpha-machine#build-model" },
      { title: "Upload Factors", href: "/docs/alpha-machine#upload-factors" },
    ],
  },
  {
    title: "Tools",
    icon: Wrench,
    href: "/docs/tools",
    children: [
      { title: "Screener", href: "/docs/tools#screener" },
      { title: "Heatmap", href: "/docs/tools#heatmap" },
      { title: "Compare", href: "/docs/tools#compare" },
      { title: "Correlation", href: "/docs/tools#correlation" },
      { title: "AI Predict", href: "/docs/tools#predict" },
    ],
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/docs/settings",
  },
  {
    title: "API Reference",
    icon: Code2,
    href: "/docs/api-reference",
    children: [
      { title: "Authentication", href: "/docs/api-reference#auth" },
      { title: "Market Data", href: "/docs/api-reference#market-data" },
      { title: "Analytics", href: "/docs/api-reference#analytics" },
      { title: "Strategies", href: "/docs/api-reference#strategies" },
      { title: "Optimization", href: "/docs/api-reference#optimization" },
    ],
  },
  {
    title: "Glossary",
    icon: BookA,
    href: "/docs/glossary",
  },
];

function SidebarSection({ section, pathname }: { section: DocSection; pathname: string }) {
  const isActive = pathname === section.href || pathname.startsWith(section.href + "/");
  const [open, setOpen] = useState(isActive);
  const Icon = section.icon;

  return (
    <div>
      <div className="flex items-center">
        <Link
          href={section.href}
          className={`flex-1 flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
            isActive
              ? "text-emerald-400 font-medium"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {section.title}
        </Link>
        {section.children && (
          <button
            onClick={() => setOpen(!open)}
            className="p-1 mr-2 text-neutral-500 hover:text-white transition-colors"
          >
            <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
          </button>
        )}
      </div>
      {section.children && open && (
        <div className="ml-6 mt-0.5 mb-1 flex flex-col border-l border-neutral-800">
          {section.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className="px-3 py-1 text-xs text-neutral-500 hover:text-white transition-colors"
            >
              {child.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function DocsSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-neutral-800">
        <Link href="/docs" className="flex items-center gap-2.5">
          <Image src="/logo-icon.svg" alt="Galedge" width={28} height={28} className="rounded-lg" />
          <div>
            <span className="text-sm font-bold text-white">Galedge</span>
            <span className="ml-1.5 text-xs text-neutral-500">Docs</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <Link
          href="/docs"
          className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md mb-2 transition-colors ${
            pathname === "/docs"
              ? "text-emerald-400 font-medium"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <BookOpen className="h-4 w-4 shrink-0" />
          Overview
        </Link>

        <div className="flex flex-col gap-0.5">
          {DOCS_NAV.map((section) => (
            <SidebarSection key={section.href} section={section} pathname={pathname} />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-neutral-800">
        <Link
          href="/home"
          className="flex items-center gap-2 text-xs text-neutral-500 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to App
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-64 bg-neutral-950 border-r border-neutral-800 transition-transform lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebar}
      </aside>
    </>
  );
}
