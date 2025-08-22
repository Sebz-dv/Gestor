import React from "react";

const CustomLegend = ({ payload = [] }) => {
  if (!Array.isArray(payload)) return null;

  return (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {payload.map((entry, index) => (
        <div key={`legend-${index}`} className="flex items-center space-x-2">
          <div
            className="w-2.5 h-2.5 rounded-full ring-1 ring-slate-300 dark:ring-slate-700"
            style={{ backgroundColor: entry?.color }}
            aria-hidden="true"
          />
          <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
            {entry?.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default CustomLegend;
