import React from "react";
import moment from "moment";

/** Normaliza estado a etiquetas de UI */
const normalizeStatus = (status) => {
  if (!status) return "Unknown";
  const s = String(status).trim();
  if (s === "InProgress") return "In Progress";
  return s;
};

/** Colores para el badge de ESTADO (light + dark) */
const getStatusBadgeColor = (statusRaw) => {
  const status = normalizeStatus(statusRaw);
  switch (status) {
    case "Completed":
      return "bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50";
    case "Pending":
      return "bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/50";
    case "In Progress":
      return "bg-cyan-100 text-cyan-700 border border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800/50";
    default:
      return "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700";
  }
};

/** Colores para el badge de PRIORIDAD (light + dark) */
const getPriorityBadgeColor = (priority) => {
  switch (priority) {
    case "High":
      return "bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50";
    case "Medium":
      return "bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800/50";
    case "Low":
      return "bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50";
    default:
      return "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700";
  }
};

/**
 * Espera un array de objetos tipo:
 * { id?, _id?, title, status, priority, createdAt?, dueDate? }
 */
const TaskListTable = ({ tableData = [] }) => {
  return (
    <div className="overflow-x-auto p-0 mt-3">
      <table className="min-w-full">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-slate-800 dark:text-slate-300 font-medium text-[13px]">Nombre</th>
            <th className="px-4 py-3 text-left text-slate-800 dark:text-slate-300 font-medium text-[13px]">Estado</th>
            <th className="px-4 py-3 text-left text-slate-800 dark:text-slate-300 font-medium text-[13px]">Prioridad</th>
            <th className="px-4 py-3 text-left text-slate-800 dark:text-slate-300 font-medium text-[13px] hidden md:table-cell">Creado</th>
          </tr>
        </thead>
        <tbody>
          {tableData.map((task, idx) => {
            const key = task.id ?? task._id ?? `row-${idx}`;
            const statusLabel = normalizeStatus(task.status);
            const dateValue = task.createdAt ?? task.createAt ?? task.dueDate ?? null;

            return (
              <tr key={key} className="border-t border-slate-200 dark:border-slate-800">
                <td className="my-3 mx-4 text-slate-700 dark:text-slate-300 text-[13px] line-clamp-1 overflow-hidden">
                  {task.title ?? "—"}
                </td>

                <td className="py-4 px-4">
                  <span className={`px-2 py-1 text-xs rounded inline-block ${getStatusBadgeColor(statusLabel)}`}>
                    {statusLabel}
                  </span>
                </td>

                <td className="py-4 px-4">
                  <span className={`px-2 py-1 text-xs rounded inline-block ${getPriorityBadgeColor(task.priority)}`}>
                    {task.priority ?? "—"}
                  </span>
                </td>

                <td className="py-4 px-4 text-slate-700 dark:text-slate-400 text-[13px] text-nowrap hidden md:table-cell">
                  {dateValue ? moment(dateValue).format("D MMM YYYY") : "N/A"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TaskListTable;
