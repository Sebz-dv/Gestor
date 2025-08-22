import React from "react";
import Progress from "../Progress";
import AvatarGroup from "../AvatarGroup";
import { LuPaperclip } from "react-icons/lu";
import moment from "moment";

const safeFormat = (dateStr) => {
  const m = moment(dateStr);
  return m.isValid() ? m.format("Do MMM YYYY") : "—";
};

const TaskCard = ({
  title,
  description,
  priority,
  status,
  progress,
  createdAt,
  dueDate,
  assignedTo,
  attachmentCount,
  completedTodoCount,
  todoChecklist,
  onClick,
}) => {
  const getStatusTagColor = () => {
    switch (status) {
      case "In Progress":
        return "text-cyan-600 bg-cyan-50 border border-cyan-200";
      case "Completed":
        return "text-lime-600 bg-lime-50 border border-lime-200";
      default:
        return "text-violet-600 bg-violet-50 border border-violet-200";
    }
  };

  const getPriorityTagColor = () => {
    switch (priority) {
      case "Low":
        return "text-emerald-600 bg-emerald-50 border border-emerald-200";
      case "Medium":
        return "text-amber-600 bg-amber-50 border border-amber-200";
      default:
        return "text-rose-600 bg-rose-50 border border-rose-200";
    }
  };

  return (
    <div
      className="rounded-xl border border-gray-200 bg-white/80 backdrop-blur p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`text-[11px] font-medium px-3 py-0.5 rounded ${getStatusTagColor()}`}
        >
          {status}
        </span>
        <span
          className={`text-[11px] font-medium px-3 py-0.5 rounded ${getPriorityTagColor()}`}
        >
          {priority} Priority
        </span>
      </div>

      <h4 className="font-semibold text-gray-900 mb-1 line-clamp-1">{title}</h4>

      <div
        className={`pl-4 border-l-4 mb-3 ${
          status === "In Progress"
            ? "border-cyan-500"
            : status === "Completed"
            ? "border-indigo-500"
            : "border-violet-500"
        }`}
      >
        <p className="text-sm text-gray-700 mb-2 line-clamp-3">{description}</p>
        <p className="text-xs text-gray-500 mb-2">
          Task Done:{" "}
          <span className="font-medium text-gray-700">
            {completedTodoCount} / {todoChecklist?.length || 0}
          </span>
        </p>
        <Progress progress={progress} status={status} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
        <div>
          <label className="text-xs text-gray-500">Start Date</label>
          <p className="text-gray-800">{safeFormat(createdAt)}</p>
        </div>
        <div>
          <label className="text-xs text-gray-500">Due Date</label>
          <p className="text-gray-800">{safeFormat(dueDate)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <AvatarGroup avatars={assignedTo || []} />
        {attachmentCount > 0 && (
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <LuPaperclip className="text-base" />
            <span>{attachmentCount}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
