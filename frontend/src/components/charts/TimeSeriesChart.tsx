"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

const COLORS = ["#f97316", "#eab308", "#10b981", "#3b82f6", "#a855f7", "#ef4444", "#06b6d4", "#ec4899"];

interface Series {
  key: string;
  name: string;
  color?: string;
}

interface Props {
  data: Record<string, unknown>[];
  series: Series[];
  xKey?: string;
  height?: number;
  yFormatter?: (v: number) => string;
}

export function TimeSeriesChart({
  data,
  series,
  xKey = "date",
  height = 200,
  yFormatter = (v) => `${v.toFixed(2)}%`,
}: Props) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-muted-foreground text-[10px]" style={{ height }}>
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 9, fill: "#71717a" }}
          tickLine={false}
          axisLine={{ stroke: "#27272a" }}
          tickFormatter={(v) => String(v).slice(5, 10)}
        />
        <YAxis
          tick={{ fontSize: 9, fill: "#71717a" }}
          tickLine={false}
          axisLine={{ stroke: "#27272a" }}
          tickFormatter={yFormatter}
          width={45}
        />
        <Tooltip
          wrapperStyle={{ zIndex: 50 }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div style={{
                backgroundColor: "#18181b", border: "1px solid #3f3f46",
                borderRadius: 8, fontSize: 11, padding: "8px 12px", minWidth: 160,
              }}>
                <p style={{ color: "#a1a1aa", marginBottom: 6, fontWeight: 600 }}>{label}</p>
                {payload.map((entry) => (
                  <div key={entry.dataKey as string} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: entry.color, flexShrink: 0, display: "inline-block" }} />
                    <span style={{ color: "#a1a1aa", flex: 1 }}>{entry.name}</span>
                    <span style={{ color: "#f4f4f5", fontWeight: 600 }}>{yFormatter(Number(entry.value))}</span>
                  </div>
                ))}
              </div>
            );
          }}
        />
        <Legend
          iconType="line"
          iconSize={10}
          wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
        />
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color || COLORS[i % COLORS.length]}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
