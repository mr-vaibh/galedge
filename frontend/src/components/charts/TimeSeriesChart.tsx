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
          contentStyle={{
            backgroundColor: "#18181b",
            border: "1px solid #3f3f46",
            borderRadius: 8,
            fontSize: 11,
            color: "#f4f4f5",
            padding: "8px 12px",
          }}
          labelStyle={{ color: "#a1a1aa", marginBottom: 6, fontWeight: 600 }}
          formatter={(value, name, props) => {
            const color = props.color || "#f4f4f5";
            return [
              <span key="val" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
                <span style={{ color: "#a1a1aa" }}>{String(name)}</span>
                <span style={{ color: "#f4f4f5", fontWeight: 600, marginLeft: "auto", paddingLeft: 12 }}>{yFormatter(Number(value))}</span>
              </span>,
              "",
            ];
          }}
          wrapperStyle={{ zIndex: 50 }}
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
