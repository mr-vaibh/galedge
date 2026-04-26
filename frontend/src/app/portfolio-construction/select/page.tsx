"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { RefreshCw, Pencil, Trash2 } from "lucide-react";

const FUNDS = ["Bandhan", "Test", "Taurus", "F1", "Sim"];

const UPLOADED_PORTFOLIOS = [
  { fund: "Taurus", scheme: "ELSS", iteration: "1.0", created: "23-Feb-2026", modified: "23-Feb-2026" },
];

export default function SelectPortfolioPage() {
  const [fund, setFund] = useState("");
  const [scheme, setScheme] = useState("");

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Portfolio Construction</h1>
        <Button variant="outline" size="sm" className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Select Portfolio Form */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Select Portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Fund</Label>
              <Select value={fund} onValueChange={(v) => v && setFund(v)}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select Fund" /></SelectTrigger>
                <SelectContent>
                  {FUNDS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Scheme</Label>
              <Select value={scheme} onValueChange={(v) => v && setScheme(v)}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder={fund ? "Select Scheme" : "Select Fund First"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheme1">Scheme 1</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Date</Label>
              <Input type="date" className="w-[180px]" />
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700">Proceed</Button>
          </div>
        </CardContent>
      </Card>

      {/* Selected Portfolios Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Select Portfolio</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border/50 bg-muted/20">
                {["Fund Name", "Scheme Name", "Iteration", "Created Date", "Last Modified", "Modify", "Delete"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No records</td></tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Upload Portfolio Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Upload Portfolio</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border/50 bg-muted/20">
                {["Fund Name", "Scheme Name", "Iteration", "Created Date", "Last Modified", "Modify", "Delete"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {UPLOADED_PORTFOLIOS.map((p) => (
                <tr key={p.fund + p.scheme} className="border-b border-border/30 hover:bg-muted/30">
                  <td className="px-3 py-2">{p.fund}</td>
                  <td className="px-3 py-2">{p.scheme}</td>
                  <td className="px-3 py-2">{p.iteration}</td>
                  <td className="px-3 py-2 text-muted-foreground">{p.created}</td>
                  <td className="px-3 py-2 text-muted-foreground">{p.modified}</td>
                  <td className="px-3 py-2"><Button variant="ghost" size="icon" className="h-6 w-6"><Pencil className="h-3 w-3" /></Button></td>
                  <td className="px-3 py-2"><Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"><Trash2 className="h-3 w-3" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
