import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import CustomTooltip from "./CustomToolTip";
import CustomLegend from "./CustomLegend";

const CustomPieChart = ({ data = [], colors = [] }) => {
  const safeData = Array.isArray(data) ? data : [];
  const palette = colors.length
    ? colors
    : ["#8D51FF", "#00B8DB", "#7BCE00", "#FFB020", "#FF5A5F"];

  return (
    // El wrapper define el “tema” del SVG con currentColor
    <div className="text-slate-600 dark:text-slate-400">
      <ResponsiveContainer width="100%" height={325}>
        <PieChart>
          <Pie
            data={safeData}
            dataKey="count"
            nameKey="status"
            cx="50%"
            cy="50%"
            outerRadius={130}
            innerRadius={100}
            labelLine={false}
            // Trazo sutil que se adapta a light/dark
            stroke="currentColor"
            strokeWidth={1}
            // Recharts propaga props al <path/>, la mayoría soporta strokeOpacity
            strokeOpacity={0.2}
          >
            {safeData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={palette[index % palette.length]} />
            ))}
          </Pie>

          {/* Tooltip y leyenda ya con dark en sus componentes */}
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CustomPieChart;
