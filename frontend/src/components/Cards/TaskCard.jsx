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
        return "text-cyan-700 bg-cyan-50 border border-cyan-200 dark:text-cyan-300 dark:bg-cyan-900/30 dark:border-cyan-800/50";
      case "Completed":
        return "text-lime-700 bg-lime-50 border border-lime-200 dark:text-lime-300 dark:bg-lime-900/30 dark:border-lime-800/50";
      default:
        return "text-violet-700 bg-violet-50 border border-violet-200 dark:text-violet-300 dark:bg-violet-900/30 dark:border-violet-800/50";
    }
  };

  const getPriorityTagColor = () => {
    switch (priority) {
      case "Low":
        return "text-emerald-700 bg-emerald-50 border border-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/30 dark:border-emerald-800/50";
      case "Medium":
        return "text-amber-700 bg-amber-50 border border-amber-200 dark:text-amber-300 dark:bg-amber-900/30 dark:border-amber-800/50";
      default:
        return "text-rose-700 bg-rose-50 border border-rose-200 dark:text-rose-300 dark:bg-rose-900/30 dark:border-rose-800/50";
    }
  };

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 backdrop-blur p-4 shadow-sm hover:shadow-md dark:shadow-slate-950/40 transition-shadow transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-[11px] font-medium px-3 py-0.5 rounded ${getStatusTagColor()}`}>
          {status}
        </span>
        <span className={`text-[11px] font-medium px-3 py-0.5 rounded ${getPriorityTagColor()}`}>
          {priority} Priority
        </span>
      </div>

      <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 line-clamp-1">
        {title}
      </h4>

      <div
        className={`pl-4 border-l-4 mb-3 ${
          status === "In Progress"
            ? "border-cyan-500 dark:border-cyan-400"
            : status === "Completed"
            ? "border-indigo-500 dark:border-indigo-400"
            : "border-violet-500 dark:border-violet-400"
        }`}
      >
        <p className="text-sm text-slate-700 dark:text-slate-300 mb-2 line-clamp-3">
          {description}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
          Task Done:{" "}
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {completedTodoCount} / {todoChecklist?.length || 0}
          </span>
        </p>
        <Progress progress={progress} status={status} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400">Start Date</label>
          <p className="text-slate-800 dark:text-slate-200">{safeFormat(createdAt)}</p>
        </div>
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400">Due Date</label>
          <p className="text-slate-800 dark:text-slate-200">{safeFormat(dueDate)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <AvatarGroup avatars={assignedTo || []} />
        {attachmentCount > 0 && (
          <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
            <LuPaperclip className="text-base" />
            <span>{attachmentCount}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
