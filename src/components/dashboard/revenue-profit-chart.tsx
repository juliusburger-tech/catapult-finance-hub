"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatEuro } from "@/lib/format";
import type { MonthlyChartPoint } from "@/lib/dashboard/get-dashboard-data";

type RevenueProfitChartProps = {
  data: MonthlyChartPoint[];
  year: number;
};

export function RevenueProfitChart({ data, year }: RevenueProfitChartProps) {
  const chartData = data.map((row) => ({
    monat: row.label,
    umsatz: row.revenue,
    gewinn: row.profit,
  }));

  return (
    <div className="h-[320px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-border-token)" vertical={false} strokeDasharray="4 4" />
          <XAxis
            dataKey="monat"
            tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
            axisLine={{ stroke: "var(--color-border-token)" }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) =>
              formatEuro(Number(v)).replace(/\s*€$/, "").trim() + " €"
            }
            tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={72}
          />
          <Tooltip
            formatter={(value, name) => [
              formatEuro(Number(value ?? 0)),
              name === "umsatz" ? "Umsatz" : "Gewinn",
            ]}
            labelFormatter={(label) => `${label} ${year}`}
            contentStyle={{
              borderRadius: "var(--radius-card-token)",
              borderColor: "var(--color-border-token)",
              background: "var(--color-surface)",
              color: "var(--color-text)",
            }}
          />
          <Legend
            formatter={(value) => (value === "umsatz" ? "Umsatz" : "Gewinn")}
            wrapperStyle={{ fontSize: 12, color: "var(--color-text-muted)" }}
          />
          <Bar dataKey="umsatz" fill="#ff6f16" radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="gewinn" fill="#555555" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
