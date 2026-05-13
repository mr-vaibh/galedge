"use client";

export type AnalyticsView = "Active" | "Benchmark" | "Main";

interface Props {
  view: AnalyticsView;
  onChange: (v: AnalyticsView) => void;
  hasBenchmark?: boolean; // false = only Active + Main (peer pages)
}

export function ViewToggle({ view, onChange, hasBenchmark = true }: Props) {
  const options: AnalyticsView[] = hasBenchmark
    ? ["Active", "Benchmark", "Main"]
    : ["Active", "Main"];

  return (
    <div className="flex items-center gap-0.5 bg-muted/30 rounded-lg p-0.5 border border-border/40">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3 py-1 text-[11px] font-medium rounded-md transition-all ${
            view === opt
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
