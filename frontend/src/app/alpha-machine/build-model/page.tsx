"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Cpu } from "lucide-react";

export default function BuildAlphaModelPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [modelName, setModelName] = useState("");
  const [returnType, setReturnType] = useState("Total");
  const [regressionWeight, setRegressionWeight] = useState("");
  const [universe, setUniverse] = useState("");
  const [halfLife, setHalfLife] = useState("");
  const [frequency, setFrequency] = useState("Quarterly");
  const [minObs, setMinObs] = useState("");

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Build Alpha Model</h1>
      </div>

      <div className="flex items-center justify-center min-h-[400px]">
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger>
            <Button size="lg" variant="outline" className="gap-2">
              <Cpu className="h-5 w-5" /> Build
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Build Alpha Model</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input placeholder="Name" value={modelName} onChange={(e) => setModelName(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Input Factors <span className="text-muted-foreground">Selected Input Factors: 0</span></Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Select factors" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="momentum">Momentum</SelectItem>
                      <SelectItem value="value">Value</SelectItem>
                      <SelectItem value="quality">Quality</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="h-28 border rounded-md p-2 text-xs text-muted-foreground flex items-center justify-center">
                    No factors selected
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Control Factors (Optional)</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Select factors" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="market">Market</SelectItem>
                      <SelectItem value="size">Size</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="h-28 border rounded-md p-2 text-xs text-muted-foreground flex items-center justify-center">
                    No factors selected
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Return Type</Label>
                  <Select value={returnType} onValueChange={(v) => v && setReturnType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Total">Total</SelectItem>
                      <SelectItem value="Excess">Excess</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Regression Weight</Label>
                  <Select value={regressionWeight} onValueChange={(v) => v && setRegressionWeight(v)}>
                    <SelectTrigger><SelectValue placeholder="Sort Market Cap" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mcap">Sort Market Cap</SelectItem>
                      <SelectItem value="equal">Equal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Universe</Label>
                  <Select value={universe} onValueChange={(v) => v && setUniverse(v)}>
                    <SelectTrigger><SelectValue placeholder="Risk Model Estimation Universe" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="risk_model">Risk Model Estimation Universe</SelectItem>
                      <SelectItem value="nifty500">NIFTY 500</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Half Life (in days)</Label>
                  <Input type="number" placeholder="Input Number" value={halfLife} onChange={(e) => setHalfLife(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Estimation Frequency</Label>
                  <Select value={frequency} onValueChange={(v) => v && setFrequency(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                      <SelectItem value="Quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Minimum Number of Observations</Label>
                  <Input type="number" placeholder="Input in Number" value={minObs} onChange={(e) => setMinObs(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Forward Horizons</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Select horizons" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1m">1 Month</SelectItem>
                      <SelectItem value="3m">3 Months</SelectItem>
                      <SelectItem value="6m">6 Months</SelectItem>
                      <SelectItem value="12m">12 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button className="w-full bg-blue-600 hover:bg-blue-700">Compute</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
