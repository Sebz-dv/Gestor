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

  // Tooltip personalizado
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0]?.payload ?? {};
      return (
        <div className="bg-white shadow-md rounded-lg p-2 border border-gray-200">
          <p className="text-xs font-semibold text-purple-800 mb-1">
            {item.priority}
          </p>
          <p className="text-sm text-gray-600">
            Count: <span className="font-bold">{item.count}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white mt-6">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={safeData}
          margin={{ top: 10, right: 8, bottom: 0, left: 8 }}
          barCategoryGap={24}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="priority"
            tick={{ fontSize: 12, fill: "#555" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            domain={[0, "dataMax + 1"]}
            tick={{ fontSize: 12, fill: "#555" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "transparent" }}
          />
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
