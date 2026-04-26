"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Code2 } from "lucide-react";

export default function CodeEditorPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [branch, setBranch] = useState("scratch");
  const [ram, setRam] = useState("32");
  const [cpu, setCpu] = useState("16");
  const [timeout, setTimeout] = useState("2");

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Code Editor</h1>

      <div className="flex items-center justify-center min-h-[500px]">
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger>
            <Card className="p-8 cursor-pointer hover:bg-muted/30 transition-colors border-2 border-dashed">
              <div className="text-center">
                <Code2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <h2 className="text-lg font-semibold mb-1">Start Coding</h2>
                <p className="text-xs text-muted-foreground">Launch a Python sandbox for alpha research</p>
              </div>
            </Card>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start coding session</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">
              Choose a branch and sandbox resources before opening the IDE.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Branch</Label>
                <div className="space-y-2">
                  <button
                    onClick={() => setBranch("scratch")}
                    className={`w-full text-left px-4 py-3 rounded-lg border ${branch === "scratch" ? "border-blue-500 bg-blue-500/10" : "border-border"}`}
                  >
                    <div className="font-medium text-sm">Scratch</div>
                    <div className="text-[10px] text-muted-foreground">New workspace — start from scratch</div>
                  </button>
                  <button
                    onClick={() => setBranch("production")}
                    className={`w-full text-left px-4 py-3 rounded-lg border ${branch === "production" ? "border-blue-500 bg-blue-500/10" : "border-border"}`}
                  >
                    <div className="font-medium text-sm">Production</div>
                    <div className="text-[10px] text-muted-foreground">Continue from production code</div>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">RAM (GB)</Label>
                <Select value={ram} onValueChange={(v) => v && setRam(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8">8 GB</SelectItem>
                    <SelectItem value="16">16 GB</SelectItem>
                    <SelectItem value="32">32 GB</SelectItem>
                    <SelectItem value="64">64 GB</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">CPU cores</Label>
                <Select value={cpu} onValueChange={(v) => v && setCpu(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4 cores</SelectItem>
                    <SelectItem value="8">8 cores</SelectItem>
                    <SelectItem value="16">16 cores</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Session inactivity time</Label>
                <Select value={timeout} onValueChange={(v) => v && setTimeout(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="2">2 hours</SelectItem>
                    <SelectItem value="4">4 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                <Button className="bg-blue-600 hover:bg-blue-700">Start Coding</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function Card({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-lg border bg-card ${className}`} {...props}>{children}</div>;
}
