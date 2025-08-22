import React from "react";

const TaskStatusTabs = ({ tabs = [], activeTab, setActiveTab }) => {
  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.label;
          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => setActiveTab(tab.label)}
              className={`relative px-3 md:px-4 py-2 text-sm font-medium rounded-md transition-colors
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400
                ${
                  isActive
                    ? "text-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/30"
                    : "text-slate-600 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800/60"
                }`}
              aria-current={isActive ? "page" : undefined}
              aria-pressed={isActive}
              title={tab.label}
            >
              <div className="flex items-center">
                <span className="text-sm">{tab.label}</span>
                <span
                  className={`ml-2 text-[11px] px-2 py-[2px] rounded-full border
                    ${
                      isActive
                        ? "bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500"
                        : "bg-slate-200/70 text-slate-700 border-slate-300 dark:bg-slate-700/60 dark:text-slate-200 dark:border-slate-600"
                    }`}
                >
                  {Number(tab.count ?? 0)}
                </span>
              </div>

              {isActive && (
                <div className="absolute left-3 right-3 -bottom-[3px] h-[3px] rounded-full bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TaskStatusTabs;
