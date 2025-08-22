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
                ${
                  isActive
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
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
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-gray-200/70 text-gray-700 border-gray-300"
                    }`}
                >
                  {Number(tab.count ?? 0)}
                </span>
              </div>
              {isActive && (
                <div className="absolute left-3 right-3 -bottom-[3px] h-[3px] rounded-full bg-blue-600" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TaskStatusTabs;
