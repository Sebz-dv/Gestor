import React from "react";

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  const item = payload[0] ?? {};
  const name = item.name ?? item.payload?.status ?? "—";
  const value = item.value ?? item.payload?.count ?? 0;

  return (
    <div className="rounded-lg border p-2 shadow-md
                    bg-white border-slate-200
                    dark:bg-slate-900 dark:border-slate-700 dark:shadow-slate-950/40">
      <p className="text-xs font-semibold mb-1
                    text-violet-800 dark:text-violet-300">
        {name}
      </p>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Count: <span className="font-semibold text-slate-900 dark:text-slate-100">{value}</span>
      </p>
    </div>
  );
};

export default CustomTooltip;
