"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Maximize2, CheckCircle2, Save } from "lucide-react";

const METRICS = [
  "200D SMA", "20D SMA", "50D SMA", "ADR", "ATR", "Beta", "Book Value",
  "CAGR 3Y", "CAGR 5Y", "Cash Flow", "Current Ratio", "Debt to Equity",
  "Dividend Yield", "EPS", "EPS Growth", "EBITDA", "EBITDA Margin",
  "Enterprise Value", "EV/EBITDA", "Free Cash Flow", "Gross Margin",
  "High 52W", "Interest Coverage", "Low 52W", "Market Cap", "Market Cap Weight",
  "Net Income", "Net Profit Margin", "Operating Margin", "P/B Ratio",
  "P/E Ratio", "PEG Ratio", "Price", "Price to Sales", "Quick Ratio",
  "ROA", "ROCE", "ROE", "Revenue", "Revenue Growth", "RSI",
  "Shares Outstanding", "Total Assets", "Total Debt", "Volume",
  "Volume 20D Avg", "Working Capital", "Yield",
];

const EXAMPLES = [
  "MarketCap > 500 AND PE < 15 AND ROCE > 22",
  "ROE > 15 AND DebtToEquity < 1 AND DividendYield > 2",
  "MarketCap > 1000 AND PB < 3 AND EPS_Growth > 10",
];

export default function BuildScreenPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentUniverse, setParentUniverse] = useState("");
  const [sector, setSector] = useState("");
  const [industry, setIndustry] = useState("");
  const [portfolioWeight, setPortfolioWeight] = useState("");
  const [screenerQuery, setScreenerQuery] = useState("");
  const [scoreEquation, setScoreEquation] = useState("");
  const [scoreVariable, setScoreVariable] = useState("");
  const [metricSearch, setMetricSearch] = useState("");
  const [metricTab, setMetricTab] = useState("library");

  const filteredMetrics = METRICS.filter((m) =>
    m.toLowerCase().includes(metricSearch.toLowerCase())
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Build Your Alpha Machine</h1>
          <p className="text-xs text-muted-foreground">Build Your Screen Factor</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Date</span>
          <Input type="date" defaultValue="2026-04-24" className="h-8 w-[150px] text-xs" />
        </div>
      </div>

      {/* Header Fields */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Name *</Label>
              <Input placeholder="Screen Name" value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Description *</Label>
              <Input placeholder="Enter Description" value={description} onChange={(e) => setDescription(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Parent Universe</Label>
              <Select value={parentUniverse} onValueChange={(v) => v && setParentUniverse(v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Risk Model Estimation..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="risk_model">Risk Model Estimation</SelectItem>
                  <SelectItem value="nifty500">NIFTY 500</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Sector</Label>
              <Select value={sector} onValueChange={(v) => v && setSector(v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Sector" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sectors</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="financials">Financial Services</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Industry</Label>
              <Select value={industry} onValueChange={(v) => v && setIndustry(v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Industry" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Portfolio Weight</Label>
              <Select value={portfolioWeight} onValueChange={(v) => v && setPortfolioWeight(v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Market Cap Weight" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcap">Market Cap Weight</SelectItem>
                  <SelectItem value="equal">Equal Weight</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Query Builders + Metrics Library */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Screener Query */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-xs">Screener Query</CardTitle>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-muted-foreground">Example</span>
              <Select>
                <SelectTrigger className="h-6 w-[120px] text-[9px]"><SelectValue placeholder="Select example" /></SelectTrigger>
                <SelectContent>
                  {EXAMPLES.map((e, i) => <SelectItem key={i} value={e}>{e.slice(0, 30)}...</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-6 w-6"><Maximize2 className="h-3 w-3" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <textarea
              value={screenerQuery}
              onChange={(e) => setScreenerQuery(e.target.value)}
              placeholder="Example: MarketCap > 500 AND PE < 15 AND ROCE > 22"
              className="w-full h-32 bg-muted/30 border border-border/50 rounded-md p-2 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </CardContent>
        </Card>

        {/* Score Equation */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-xs">Score Equation</CardTitle>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-muted-foreground">Example</span>
              <Select>
                <SelectTrigger className="h-6 w-[120px] text-[9px]"><SelectValue placeholder="Select example" /></SelectTrigger>
                <SelectContent>
                  {EXAMPLES.map((e, i) => <SelectItem key={i} value={e}>{e.slice(0, 30)}...</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-6 w-6"><Maximize2 className="h-3 w-3" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <textarea
              value={scoreEquation}
              onChange={(e) => setScoreEquation(e.target.value)}
              placeholder="Example: MarketCap > 500 AND PE < 15 AND ROCE > 22"
              className="w-full h-24 bg-muted/30 border border-border/50 rounded-md p-2 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Score Variable:</span>
              <Input
                placeholder="Enter score variable name"
                value={scoreVariable}
                onChange={(e) => setScoreVariable(e.target.value)}
                className="h-7 text-xs flex-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Metrics Library */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-xs">Description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-muted-foreground italic">
              Select or type a metric to see its description here.
            </div>

            <Tabs value={metricTab} onValueChange={setMetricTab}>
              <TabsList className="h-7">
                <TabsTrigger value="library" className="text-[10px] h-6">Library</TabsTrigger>
                <TabsTrigger value="metric" className="text-[10px] h-6">Metric</TabsTrigger>
                <TabsTrigger value="operator" className="text-[10px] h-6">Operator</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search Metrics"
                value={metricSearch}
                onChange={(e) => setMetricSearch(e.target.value)}
                className="h-7 text-xs pl-7"
              />
            </div>

            <div className="text-[10px] text-muted-foreground">
              {filteredMetrics.length} Metrics Available
            </div>

            <div className="h-40 overflow-y-auto border border-border/30 rounded-md">
              {filteredMetrics.map((m) => (
                <button
                  key={m}
                  className="w-full text-left px-2 py-1 text-[11px] hover:bg-muted/50 border-b border-border/20"
                  onClick={() => {
                    setScreenerQuery((prev) => prev + (prev ? " AND " : "") + m);
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <Button variant="outline" className="gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" /> Verify Query
        </Button>
        <Button className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
          <Save className="h-3.5 w-3.5" /> Compute & Save
        </Button>
      </div>

      {/* Results Area */}
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">No records</p>
            <p className="text-[10px] mt-1">Build and run a screen to see results here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
