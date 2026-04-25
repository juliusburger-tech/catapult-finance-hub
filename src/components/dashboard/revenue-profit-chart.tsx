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
import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";


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
    marge: row.revenue > 0 ? row.profit / row.revenue : null,
  }));

  function renderTooltip(props: TooltipContentProps<ValueType, NameType>) {
    const { active, payload, label } = props ?? {};
    if (!active || !payload || payload.length === 0) return null;

    const umsatz = payload.find((p) => p?.dataKey === "umsatz")?.value ?? 0;
    const gewinn = payload.find((p) => p?.dataKey === "gewinn")?.value ?? 0;
    const firstPayload = payload[0]?.payload as { marge?: number | null } | undefined;
    const marge = firstPayload?.marge ?? null;

    return (
      <div
        style={{
          borderRadius: "var(--radius-card-token)",
          border: "1px solid var(--color-border-token)",
          background: "var(--color-surface)",
          color: "var(--color-text)",
          padding: "10px 12px",
          boxShadow: "var(--shadow-card-token)",
        }}
      >
        <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-muted)" }}>
          {label} {year}
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 13 }}>Umsatz: {formatEuro(Number(umsatz))}</p>
        <p style={{ margin: "2px 0 0", fontSize: 13 }}>Gewinn: {formatEuro(Number(gewinn))}</p>
        <p style={{ margin: "6px 0 0", fontSize: 13, fontWeight: 700 }}>
          Marge: {marge === null ? "—" : `${(marge * 100).toFixed(1).replace(".", ",")} %`}
        </p>
      </div>
    );
  }

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
            content={renderTooltip}
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
