"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Cpu, Loader2, CheckCircle2, X } from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

const AVAILABLE_FACTORS = [
  "MARKET", "BETA", "SIZE", "LTMOM", "EARNYILD", "VALUE",
  "GROWTH", "DIVYILD", "PROFIT", "FINLVG", "LIQUIDITY",
];

const CONTROL_FACTOR_OPTIONS = ["MARKET", "SIZE", "BETA"];

export default function BuildAlphaModelPage() {
  const router = useRouter();
  const { token, loading: authLoading } = useRequireAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [modelName, setModelName] = useState("");
  const [inputFactors, setInputFactors] = useState<string[]>([]);
  const [controlFactors, setControlFactors] = useState<string[]>([]);
  const [returnType, setReturnType] = useState("Total");
  const [regressionWeight, setRegressionWeight] = useState("mcap");
  const [universe, setUniverse] = useState("risk_model");
  const [halfLife, setHalfLife] = useState("");
  const [frequency, setFrequency] = useState("Quarterly");
  const [minObs, setMinObs] = useState("");
  const [computing, setComputing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  function toggleFactor(factor: string, list: string[], setter: (v: string[]) => void) {
    if (list.includes(factor)) {
      setter(list.filter(f => f !== factor));
    } else {
      setter([...list, factor]);
    }
  }

  async function handleCompute() {
    if (!modelName) {
      alert("Please enter a model name");
      return;
    }
    if (inputFactors.length === 0) {
      alert("Select at least one input factor");
      return;
    }

    setComputing(true);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/alpha/models`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: modelName,
          input_factors: inputFactors,
          control_factors: controlFactors,
          return_type: returnType,
          regression_weight: regressionWeight === "mcap" ? "Market Cap" : "Equal",
          universe: universe === "risk_model" ? "Risk Model Estimation Universe" : "NIFTY 500",
          half_life: halfLife ? parseInt(halfLife) : null,
          estimation_frequency: frequency,
          min_observations: minObs ? parseInt(minObs) : null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(`Model "${data.name}" created successfully (ID: ${data.id})`);
        setTimeout(() => {
          setShowDialog(false);
          router.push("/alpha-machine");
        }, 2000);
      } else {
        const err = await res.json();
        setResult(`Error: ${err.detail || "Failed to create model"}`);
      }
    } catch (e) {
      setResult("Error: Could not connect to API");
    }
    setComputing(false);
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Build Alpha Model</h1>
      </div>

      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-sm">How to Build an Alpha Model</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p>An alpha model combines multiple factors to generate stock rankings (alpha scores).</p>
          <ol className="list-decimal list-inside space-y-1">
            <li><strong>Input Factors</strong> — Select factors you believe predict returns (e.g., LTMOM for momentum, VALUE for value)</li>
            <li><strong>Control Factors</strong> — Optional factors to control for (e.g., SIZE, MARKET to neutralize size/market effects)</li>
            <li><strong>Configuration</strong> — Set return type, regression weight, and estimation frequency</li>
            <li><strong>Compute</strong> — The model runs a cross-sectional regression to determine factor weights</li>
          </ol>
          <p className="mt-2">The output is an alpha signal you can use in the Strategy Builder.</p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-center py-8">
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger>
            <Button size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Cpu className="h-5 w-5" /> Build Alpha Model
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Build Alpha Model</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Name *</Label>
                <Input placeholder="My Alpha Model" value={modelName} onChange={(e) => setModelName(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Input Factors <span className="text-muted-foreground">Selected: {inputFactors.length}</span></Label>
                  <div className="border rounded-md p-2 h-32 overflow-y-auto space-y-1">
                    {inputFactors.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground text-center py-4">Click factors below to add</p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {inputFactors.map(f => (
                          <Badge key={f} variant="secondary" className="gap-1 pr-1 text-[9px]">
                            {f}
                            <button onClick={() => toggleFactor(f, inputFactors, setInputFactors)}>
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {AVAILABLE_FACTORS.filter(f => !inputFactors.includes(f)).map(f => (
                      <Button key={f} variant="outline" size="sm" className="h-5 text-[9px] px-1.5"
                        onClick={() => toggleFactor(f, inputFactors, setInputFactors)}>
                        + {f}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Control Factors (Optional)</Label>
                  <div className="border rounded-md p-2 h-32 overflow-y-auto">
                    {controlFactors.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground text-center py-4">Optional — click to add</p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {controlFactors.map(f => (
                          <Badge key={f} variant="secondary" className="gap-1 pr-1 text-[9px]">
                            {f}
                            <button onClick={() => toggleFactor(f, controlFactors, setControlFactors)}>
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {CONTROL_FACTOR_OPTIONS.filter(f => !controlFactors.includes(f)).map(f => (
                      <Button key={f} variant="outline" size="sm" className="h-5 text-[9px] px-1.5"
                        onClick={() => toggleFactor(f, controlFactors, setControlFactors)}>
                        + {f}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Return Type</Label>
                  <Select value={returnType} onValueChange={(v) => { if (typeof v === "string") setReturnType(v); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Total">Total</SelectItem>
                      <SelectItem value="Excess">Excess</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Regression Weight</Label>
                  <Select value={regressionWeight} onValueChange={(v) => { if (typeof v === "string") setRegressionWeight(v); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mcap">Sort Market Cap</SelectItem>
                      <SelectItem value="equal">Equal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Universe</Label>
                  <Select value={universe} onValueChange={(v) => { if (typeof v === "string") setUniverse(v); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="risk_model">Risk Model Estimation Universe</SelectItem>
                      <SelectItem value="nifty500">NIFTY 500</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Half Life (days)</Label>
                  <Input type="number" placeholder="e.g. 252" value={halfLife} onChange={(e) => setHalfLife(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Estimation Frequency</Label>
                  <Select value={frequency} onValueChange={(v) => { if (typeof v === "string") setFrequency(v); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                      <SelectItem value="Quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Min Observations</Label>
                  <Input type="number" placeholder="e.g. 60" value={minObs} onChange={(e) => setMinObs(e.target.value)} />
                </div>
              </div>

              {result && (
                <div className={`p-3 rounded-lg text-xs ${result.startsWith("Error") ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-400"}`}>
                  {result.startsWith("Error") ? null : <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" />}
                  {result}
                </div>
              )}

              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 gap-1.5"
                onClick={handleCompute}
                disabled={computing || !modelName}
              >
                {computing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {computing ? "Computing..." : "Compute"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
