"use client";

import { useCurrency, CurrencyCode } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, DollarSign, CheckCircle2, XCircle } from "lucide-react";

export default function SettingsPage() {
  const { currency, setCurrency, symbol, rate, rateReady, rateFailed, rateUpdatedAt } = useCurrency();

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <Settings className="h-6 w-6" /> Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure your preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Display Currency
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Currency</Label>
            <Select
              value={currency}
              onValueChange={(v) => v && setCurrency(v as CurrencyCode)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">$ USD — US Dollar</SelectItem>
                <SelectItem value="INR">₹ INR — Indian Rupee</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              All prices will be displayed in{" "}
              <span className="font-medium text-foreground">{symbol} {currency}</span>.
            </p>

            {/* Live Rate Status */}
            {currency !== "USD" && (
              <div className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  {rateReady ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-emerald-500 font-medium">Live rate active</span>
                    </>
                  ) : rateFailed ? (
                    <>
                      <XCircle className="h-3.5 w-3.5 text-destructive" />
                      <span className="text-destructive font-medium">Rate fetch failed</span>
                    </>
                  ) : (
                    <>
                      <span className="h-3.5 w-3.5 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-amber-500 font-medium">Fetching rate...</span>
                    </>
                  )}
                </div>

                {rateReady && (
                  <div className="text-xs space-y-0.5">
                    <p>$1 = {symbol}{rate.toFixed(2)}</p>
                    {rateUpdatedAt && (
                      <p className="text-muted-foreground">Updated at {rateUpdatedAt}</p>
                    )}
                  </div>
                )}

                {rateFailed && (
                  <p className="text-xs text-muted-foreground">
                    Prices will be shown in each stock&apos;s native currency ($ for US, ₹ for Indian stocks)
                    until the rate becomes available.
                  </p>
                )}
              </div>
            )}

            <p className="text-xs mt-2">
              Exchange rates are fetched live from an open API and auto-update on each page load.
              No hardcoded rates are used.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
