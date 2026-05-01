"use client";

import { useState } from "react";
import { api, PredictionResponse, BacktestResponse } from "@/lib/api";
import { SymbolInput } from "@/components/SymbolInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Brain, TrendingUp, TrendingDown, Minus, AlertTriangle, Target, Shield, BarChart3 } from "lucide-react";
import { formatPercent, changeColor } from "@/lib/format";
import { useCurrency } from "@/lib/currency";

function ScoreGauge({ label, score, color }: { label: string; score: number; color: string }) {
  const pct = Math.min(score, 100);
  return (
    <div className="text-center">
      <div className="relative w-20 h-20 mx-auto mb-2">
        <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="#27272a"
            strokeWidth="3"
          />
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={`${pct}, 100`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold">{Math.round(score)}</span>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function AdvancedRiskSection({ data }: { data: Record<string, unknown> | undefined }) {
  if (!data) return null;
  const mc = data.monte_carlo as any;
  const cv = data.cvar as any;
  const stress = data.stress_test as Record<string, any> | undefined;
  const dd = data.drawdown as any;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {mc && !mc.error && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Monte Carlo ({mc.n_simulations} simulations, {mc.holding_days}d)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-xs text-muted-foreground">Expected Return</span><div className={`font-bold tabular-nums ${mc.expected_return >= 0 ? "text-emerald-500" : "text-red-500"}`}>{mc.expected_return >= 0 ? "+" : ""}{mc.expected_return}%</div></div>
              <div><span className="text-xs text-muted-foreground">Prob of Loss</span><div className="font-bold text-red-400 tabular-nums">{mc.prob_loss}%</div></div>
              <div><span className="text-xs text-muted-foreground">Floor (1% chance of worse)</span><div className="font-bold text-red-400 tabular-nums">{mc.worst_case}%</div></div>
              <div><span className="text-xs text-muted-foreground">Ceiling (1% chance of better)</span><div className="font-bold text-emerald-400 tabular-nums">+{mc.best_case}%</div></div>
            </div>
            {mc.percentiles && (
              <div className="mt-3 flex items-center gap-1 text-[10px]">
                <span className="text-red-400">{mc.percentiles.p5}%</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden flex">
                  <div className="bg-red-500/40 h-full" style={{width:"20%"}} />
                  <div className="bg-amber-500/30 h-full" style={{width:"30%"}} />
                  <div className="bg-emerald-500/30 h-full" style={{width:"30%"}} />
                  <div className="bg-emerald-500/50 h-full" style={{width:"20%"}} />
                </div>
                <span className="text-emerald-400">+{mc.percentiles.p95}%</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {cv && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">CVaR / Expected Shortfall</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-xs text-muted-foreground">VaR ({cv.confidence * 100}%, {cv.holding_days}d)</span><div className="font-bold text-red-400 tabular-nums">{cv.var}%</div></div>
              <div><span className="text-xs text-muted-foreground">CVaR (avg worst {100 - cv.confidence * 100}%)</span><div className="font-bold text-red-400 tabular-nums">{cv.cvar}%</div></div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">In the worst {100 - cv.confidence * 100}% of scenarios, average loss is {cv.cvar}%</p>
          </CardContent>
        </Card>
      )}
      {stress && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Stress Test Scenarios</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.values(stress).map((s: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <span className="font-bold text-red-400 tabular-nums">{s.estimated_return}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {dd && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Drawdown Analysis</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-xs text-muted-foreground">Max Drawdown</span><div className="font-bold text-red-400 tabular-nums">{dd.max_drawdown}%</div></div>
              <div><span className="text-xs text-muted-foreground">Current Drawdown</span><div className={`font-bold tabular-nums ${dd.current_drawdown < -1 ? "text-red-400" : "text-zinc-400"}`}>{dd.current_drawdown}%</div></div>
              <div><span className="text-xs text-muted-foreground">Max DD Duration</span><div className="font-bold tabular-nums">{dd.max_drawdown_duration_days} days</div></div>
              <div><span className="text-xs text-muted-foreground">Avg Recovery</span><div className="font-bold tabular-nums">{dd.avg_recovery_days} days</div></div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function ActionBadge({ action }: { action: string }) {
  const styles = {
    BUY: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    SELL: "bg-red-500/20 text-red-400 border-red-500/30",
    HOLD: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  };
  const icons = { BUY: TrendingUp, SELL: TrendingDown, HOLD: Minus };
  const Icon = icons[action as keyof typeof icons] || Minus;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-bold ${styles[action as keyof typeof styles] || styles.HOLD}`}>
      <Icon className="h-4 w-4" /> {action}
    </span>
  );
}

export default function PredictPage() {
  const [symbol, setSymbol] = useState("AAPL");
  const [portfolioValue, setPortfolioValue] = useState("100000");
  const [riskTolerance, setRiskTolerance] = useState("medium");
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [backtest, setBacktest] = useState<BacktestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { formatCurrency, formatCurrencyCompact, symbol: curSymbol, currency, convert, rate, rateReady } = useCurrency();
  const stockCur = symbol.endsWith(".NS") || symbol.endsWith(".BO") ? "INR" : "USD";

  async function analyze() {
    if (!symbol.trim()) return;
    setLoading(true);
    setError(null);
    setPrediction(null);
    setBacktest(null);
    try {
      // Convert portfolio value from display currency to stock's native currency
      const rawValue = parseFloat(portfolioValue) || 100000;
      let nativeValue = rawValue;
      if (currency !== stockCur && rateReady) {
        if (currency === "INR" && stockCur === "USD") {
          nativeValue = rawValue / rate;
        } else if (currency === "USD" && stockCur === "INR") {
          nativeValue = rawValue * rate;
        }
      }

      const [pred, bt] = await Promise.all([
        api.predict(symbol.toUpperCase(), nativeValue, riskTolerance),
        api.predictBacktest(symbol.toUpperCase(), "1y", 10).catch(() => null),
      ]);
      setPrediction(pred);
      setBacktest(bt);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Prediction failed. Models may not be loaded.");
    }
    setLoading(false);
  }

  const p = prediction;
  const scoreColor = (s: number) => s >= 60 ? "#10b981" : s >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <Brain className="h-6 w-6 text-purple-400" /> AI Stock Prediction
        </h1>
        <p className="text-sm text-muted-foreground">
          ML-powered signals using XGBoost ensemble models — 150+ features, 3 timeframes
        </p>
      </div>

      {/* Input Form */}
      <Card className="overflow-visible">
        <CardContent className="pt-6 overflow-visible">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Symbol</Label>
              <SymbolInput value={symbol} onChange={setSymbol} className="w-[180px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Portfolio Value ({curSymbol})</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{curSymbol}</span>
                <Input type="number" value={portfolioValue} onChange={(e) => setPortfolioValue(e.target.value)} className="w-[170px] pl-7" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Risk Tolerance</Label>
              <Select value={riskTolerance} onValueChange={(v) => v && setRiskTolerance(v)}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={analyze} disabled={loading} className="gap-1.5">
              <Brain className="h-4 w-4" />
              {loading ? "Analyzing..." : "Analyze"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6 text-destructive text-sm">{error}</CardContent>
        </Card>
      )}

      {p && (
        <>
          {/* Composite Score + Action */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Composite Score</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="relative w-28 h-28 mb-3">
                  <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#27272a" strokeWidth="3" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={scoreColor(p.signals.composite)} strokeWidth="3" strokeDasharray={`${p.signals.composite}, 100`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold">{Math.round(p.signals.composite)}</span>
                    <span className="text-[10px] text-muted-foreground">/100</span>
                  </div>
                </div>
                <ActionBadge action={p.recommendation.action} />
                <div className="mt-2 text-xs text-muted-foreground">
                  Confidence: {(p.prediction.confidence * 100).toFixed(0)}%
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5"><Target className="h-4 w-4" /> Recommendation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Entry Price</div>
                    <div className="font-bold tabular-nums">{formatCurrency(p.recommendation.entry_price, stockCur)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Stop Loss</div>
                    <div className="font-bold text-red-400 tabular-nums">{formatCurrency(p.recommendation.stop_loss, stockCur)} ({p.recommendation.stop_loss_pct}%)</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Position Size</div>
                    <div className="font-bold tabular-nums">{formatCurrencyCompact(p.recommendation.position_size, stockCur)} ({p.recommendation.position_pct}%)</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Risk/Reward</div>
                    <div className="font-bold tabular-nums">1:{p.recommendation.risk_reward_ratio}</div>
                  </div>
                </div>
                <div className="mt-4 border-t pt-3">
                  <div className="text-xs text-muted-foreground mb-2">Targets</div>
                  <div className="flex gap-6">
                    {p.recommendation.targets.map((t, i) => (
                      <div key={i}>
                        <span className="text-emerald-400 font-bold tabular-nums">{formatCurrency(t.price, stockCur)}</span>
                        <span className="text-xs text-muted-foreground ml-1">({t.return_pct > 0 ? "+" : ""}{t.return_pct}%)</span>
                        <div className="text-[10px] text-muted-foreground">{(t.probability * 100).toFixed(0)}% probability</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Hold: {p.recommendation.hold_duration_days.min}-{p.recommendation.hold_duration_days.max} days
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Signal Gauges */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Signal Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-around flex-wrap gap-4 mb-6">
                <ScoreGauge label="Technical" score={p.signals.technical.score} color={scoreColor(p.signals.technical.score)} />
                <ScoreGauge label="Momentum" score={p.signals.momentum.score} color={scoreColor(p.signals.momentum.score)} />
                <ScoreGauge label="Fundamental" score={p.signals.fundamental.score} color={scoreColor(p.signals.fundamental.score)} />
                <ScoreGauge label="Sentiment" score={p.signals.sentiment.score} color={scoreColor(p.signals.sentiment.score)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {(["technical", "momentum", "fundamental", "sentiment"] as const).map((group) => (
                  <div key={group} className="space-y-1">
                    <div className="text-xs font-medium capitalize text-muted-foreground">{group}</div>
                    {p.signals[group].details.map((d, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{d.name}</span>
                        <span className={
                          d.signal === "bullish" || d.signal === "buy" || d.signal === "buying" || d.signal === "strong" || d.signal === "growing" || d.signal === "undervalued"
                            ? "text-emerald-400"
                            : d.signal === "bearish" || d.signal === "sell" || d.signal === "selling" || d.signal === "weak" || d.signal === "declining" || d.signal === "expensive"
                            ? "text-red-400"
                            : "text-zinc-400"
                        }>{String(d.value)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Risk + Expected Returns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5"><Shield className="h-4 w-4" /> Risk Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><div className="text-xs text-muted-foreground">VaR 95% (10d)</div><div className="font-bold text-red-400 tabular-nums">{(p.risk.var_95_10d * 100).toFixed(2)}%</div></div>
                  <div><div className="text-xs text-muted-foreground">Max Drawdown</div><div className="font-bold text-red-400 tabular-nums">{(p.risk.max_drawdown * 100).toFixed(2)}%</div></div>
                  <div><div className="text-xs text-muted-foreground">Volatility (annual)</div><div className="font-bold tabular-nums">{(p.risk.volatility_annualized * 100).toFixed(1)}%</div></div>
                  <div><div className="text-xs text-muted-foreground">Beta</div><div className="font-bold tabular-nums">{p.risk.beta.toFixed(3)}</div></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5"><BarChart3 className="h-4 w-4" /> Expected Returns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(p.prediction.timeframes).map(([tf, data]) => (
                    <div key={tf} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{tf}</span>
                      <div className="flex items-center gap-4">
                        <span className={changeColor(data.expected_return)}>
                          {data.expected_return >= 0 ? "+" : ""}{(data.expected_return * 100).toFixed(2)}%
                        </span>
                        <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${data.probability_up > 0.5 ? "bg-emerald-500" : "bg-red-500"}`}
                            style={{ width: `${data.probability_up * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">{(data.probability_up * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Feature Importance */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Top Predictive Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {p.model_info.top_features.slice(0, 10).map((f, i) => {
                  const maxImp = p.model_info.top_features[0]?.importance || 1;
                  return (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                      <span className="w-40 text-xs truncate">{f.name}</span>
                      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(f.importance / maxImp) * 100}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">{(f.importance * 100).toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Advanced Risk */}
          <AdvancedRiskSection data={(p as unknown as Record<string, unknown>).advanced_risk as Record<string, unknown> | undefined} />

          {/* Backtest */}
          {backtest && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" /> Backtest Results ({backtest.timeframe}, {backtest.period})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-sm">
                  <div><div className="text-xs text-muted-foreground">Total Return</div><div className={`font-bold tabular-nums ${changeColor(backtest.metrics.total_return)}`}>{backtest.metrics.total_return >= 0 ? "+" : ""}{backtest.metrics.total_return}%</div></div>
                  <div><div className="text-xs text-muted-foreground">Win Rate</div><div className="font-bold tabular-nums">{backtest.metrics.win_rate}%</div></div>
                  <div><div className="text-xs text-muted-foreground">Sharpe Ratio</div><div className="font-bold tabular-nums">{backtest.metrics.sharpe_ratio}</div></div>
                  <div><div className="text-xs text-muted-foreground">Max Drawdown</div><div className="font-bold text-red-400 tabular-nums">{backtest.metrics.max_drawdown}%</div></div>
                  <div><div className="text-xs text-muted-foreground">Profit Factor</div><div className="font-bold tabular-nums">{backtest.metrics.profit_factor}</div></div>
                  <div><div className="text-xs text-muted-foreground">Total Trades</div><div className="font-bold tabular-nums">{backtest.metrics.total_trades} ({backtest.metrics.winning_trades}W/{backtest.metrics.losing_trades}L)</div></div>
                </div>
                {backtest.trades.length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <div className="text-xs text-muted-foreground mb-2">Recent Trades</div>
                    <table className="w-full text-xs">
                      <thead><tr className="border-b">{["Entry", "Exit", "Entry $", "Exit $", "P&L", "Days"].map(h => <th key={h} className="p-1.5 text-right text-muted-foreground font-medium">{h}</th>)}</tr></thead>
                      <tbody>
                        {backtest.trades.slice(-10).map((t, i) => (
                          <tr key={i} className="border-b border-zinc-900">
                            <td className="p-1.5 text-right tabular-nums">{t.entry_date}</td>
                            <td className="p-1.5 text-right tabular-nums">{t.exit_date}</td>
                            <td className="p-1.5 text-right tabular-nums">{t.entry_price}</td>
                            <td className="p-1.5 text-right tabular-nums">{t.exit_price}</td>
                            <td className={`p-1.5 text-right tabular-nums ${changeColor(t.pnl)}`}>{t.pnl >= 0 ? "+" : ""}{t.pnl_pct}%</td>
                            <td className="p-1.5 text-right tabular-nums">{t.holding_days}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Disclaimer */}
          <div className="text-[10px] text-muted-foreground text-center py-2">
            This is not financial advice. ML predictions are probabilistic and can be wrong. Past performance does not guarantee future results. Always do your own research.
          </div>
        </>
      )}
    </div>
  );
}
