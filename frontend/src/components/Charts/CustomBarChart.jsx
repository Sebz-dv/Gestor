import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const CustomBarChart = ({ data = [] }) => {
  // Normaliza y asegura número
  const safeData = Array.isArray(data)
    ? data.map((d) => ({
        priority: String(d?.priority ?? "—"),
        count: Number(d?.count ?? 0),
      }))
    : [];

  // Color por prioridad
  const getBarColor = (entry) => {
    switch (entry?.priority) {
      case "Low":
        return "#00BC7D";
      case "Medium":
        return "#FE9900";
      case "High":
        return "#FF1F57";
      default:
        return "#00BC7D";
    }
  };

  // Tooltip personalizado (con dark)
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0]?.payload ?? {};
      return (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-md rounded-lg p-2">
          <p className="text-xs font-semibold text-purple-800 dark:text-purple-300 mb-1">
            {item.priority}
          </p>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Count: <span className="font-bold">{item.count}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    // Quitamos bg-white y usamos currentColor como tema del chart
    <div className="mt-6 text-slate-600 dark:text-slate-400">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={safeData}
          margin={{ top: 10, right: 8, bottom: 0, left: 8 }}
          barCategoryGap={24}
        >
          {/* La grid usa el color actual con opacidad -> funciona en dark y light */}
          <CartesianGrid stroke="currentColor" strokeOpacity={0.2} vertical={false} />

          {/* Ticks heredan color con currentColor */}
          <XAxis
            dataKey="priority"
            tick={{ fontSize: 12, fill: "currentColor" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            domain={[0, "dataMax + 1"]}
            tick={{ fontSize: 12, fill: "currentColor" }}
            tickLine={false}
            axisLine={false}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />

          <Bar dataKey="count" radius={[10, 10, 0, 0]} maxBarSize={56}>
            {(safeData || []).map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CustomBarChart;
