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
import { Settings, DollarSign } from "lucide-react";

export default function SettingsPage() {
  const { currency, setCurrency, symbol, rate } = useCurrency();

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

          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              All prices will be displayed in{" "}
              <span className="font-medium text-foreground">{symbol} {currency}</span>.
            </p>
            {currency !== "USD" && (
              <p className="text-xs">
                Exchange rate: $1 = {symbol}{rate.toFixed(2)} (auto-updated)
              </p>
            )}
            <p className="text-xs mt-2">
              Note: Stock data is fetched in its native currency (USD for US stocks, INR for Indian stocks)
              and converted to your display currency automatically.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
