import React from "react";

const Progress = ({ progress = 0, status }) => {
  const getColor = () => {
    switch (status) {
      case "In Progress":
        return "bg-cyan-500";
      case "Completed":
        return "bg-indigo-500";
      default:
        return "bg-violet-500";
    }
  };

  return (
    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
      <div
        className={`${getColor()} h-1.5 rounded-full`}
        style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
      />
    </div>
  );
};

export default Progress;
