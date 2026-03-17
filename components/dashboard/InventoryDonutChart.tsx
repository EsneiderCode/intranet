"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface InventoryByStatus {
  status: string;
  count: number;
}

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Disponible",
  IN_USE: "En uso",
  IN_REPAIR: "En reparación",
  DECOMMISSIONED: "Dado de baja",
};

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "#16a34a",
  IN_USE: "#2563eb",
  IN_REPAIR: "#d97706",
  DECOMMISSIONED: "#dc2626",
};

interface Props {
  data: InventoryByStatus[];
}

export function InventoryDonutChart({ data }: Props) {
  const total = data.reduce((s, d) => s + d.count, 0);

  const chartData = data.map((d) => ({
    name: STATUS_LABELS[d.status] ?? d.status,
    value: d.count,
    status: d.status,
  }));

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Sin ítems en inventario
      </div>
    );
  }

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.status}
                fill={STATUS_COLORS[entry.status] ?? "#6b7280"}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => {
              const n = Number(value);
              return [`${n} ítem${n !== 1 ? "s" : ""}`, name];
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span className="text-xs text-foreground">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
