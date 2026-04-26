"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

interface Props {
  data: { name: string; value: number }[];
  height?: number;
  color?: string;
  showNegativeColors?: boolean;
}

export function BarChartPanel({
  data,
  height = 200,
  color = "#3b82f6",
  showNegativeColors = true,
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
      <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 8, fill: "#71717a" }}
          tickLine={false}
          axisLine={{ stroke: "#27272a" }}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis
          tick={{ fontSize: 9, fill: "#71717a" }}
          tickLine={false}
          axisLine={{ stroke: "#27272a" }}
          tickFormatter={(v) => `${v.toFixed(1)}%`}
          width={40}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#18181b",
            border: "1px solid #27272a",
            borderRadius: 8,
            fontSize: 11,
          }}
          formatter={(value) => [`${Number(value).toFixed(2)}%`]}
        />
        <Bar dataKey="value" radius={[2, 2, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={showNegativeColors ? (entry.value >= 0 ? "#10b981" : "#ef4444") : color}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
