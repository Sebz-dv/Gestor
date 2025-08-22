import React from "react";

const Progress = ({ progress = 0, status }) => {
  const getColor = () => {
    switch (status) {
      case "In Progress":
        return "bg-cyan-500 dark:bg-cyan-400";
      case "Completed":
        return "bg-indigo-500 dark:bg-indigo-400";
      default:
        return "bg-violet-500 dark:bg-violet-400";
    }
  };

  const pct = Math.min(Math.max(progress, 0), 100);

  return (
    <div
      className="w-full bg-slate-200 dark:bg-slate-800/70 rounded-full h-1.5 overflow-hidden"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <div
        className={`${getColor()} h-1.5 rounded-full transition-[width] duration-300`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

export default Progress;
