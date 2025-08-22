import React, { useEffect, useState } from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { LuFileSpreadsheet } from "react-icons/lu";
import TaskStatusTabs from "../../components/TaskStatusTabs";
import TaskCard from "../../components/Cards/TaskCard";

const safeParseJSON = (val, fallback) => {
  if (Array.isArray(val)) return val;
  if (typeof val !== "string") return fallback;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const toArray = (val) => {
  if (Array.isArray(val)) return val;
  if (val === null || val === undefined || val === "") return [];
  return [val];
};

const normalizeTask = (raw) => {
  const attachmentsArr = safeParseJSON(raw.attachments, []);
  const assignedArr = toArray(raw.assignedTo);

  // Si algún backend manda snake_case, lo cubrimos con fallback
  return {
    id: raw.id ?? raw._id,
    title: raw.title ?? "",
    description: raw.description ?? "",
    priority: raw.priority ?? "Low",
    status: raw.status ?? "Pending",
    progress: Number(raw.progress ?? 0),
    createdAt: raw.createdAt ?? raw.created_at ?? null,
    dueDate: raw.dueDate ?? raw.due_date ?? null,
    assignedTo: assignedArr,
    attachments: attachmentsArr,
    completedTodoCount: Number(raw.completedTodoCount ?? 0),
    todoChecklist: safeParseJSON(raw.todoChecklist, []),
  };
};

const ManageTasks = () => {
  const [allTasks, setAllTasks] = useState([]);
  const [tabs, setTabs] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All");
  const navigate = useNavigate();

  const getAllTasks = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.TASKS.GET_ALL_TASKS, {
        params: { status: filterStatus === "All" ? undefined : filterStatus },
      });

      // 🔎 El payload puede venir como array directo o como { task: [...] }
      const payload = response.data;
      const list = Array.isArray(payload?.task)
        ? payload.task
        : Array.isArray(payload)
        ? payload
        : [];

      const normalized = list.map(normalizeTask);

      setAllTasks(normalized);

      // Si no viene statusSummary, lo calculamos localmente
      const ss = payload?.statusSummary ?? null;
      const computedTabs = [
        { label: "All", count: ss?.all ?? normalized.length },
        {
          label: "Pending",
          count:
            ss?.pending ??
            normalized.filter((t) => t.status === "Pending").length,
        },
        {
          label: "In Progress",
          count:
            ss?.inProgress ??
            normalized.filter((t) => t.status === "In Progress").length,
        },
        {
          label: "Completed",
          count:
            ss?.completed ??
            normalized.filter((t) => t.status === "Completed").length,
        },
      ];
      setTabs(computedTabs);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const handleClick = (taskData) => {
    navigate(`/admin/create-tasks/${taskData.id}`, {
      state: { taskId: taskData.id },
    });
  };

  const handleDownloadReport = () => {
    try {
      // --- Config de exportación ---
      const DELIM = ","; // cambia a ";" si tu Excel lo prefiere
      const EOL = "\r\n"; // CRLF para Excel
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const ORDER = { key: "title", dir: "asc" };
      // Ejemplos:
      // const ORDER = { key: "dueDate", dir: "asc" };
      // const ORDER = { key: "createdAt", dir: "desc" };
      // const ORDER = { key: "status", dir: "asc" };
      // const ORDER = { key: "priority", dir: "asc" };

      const PRIORITY_ORDER = { Low: 1, Medium: 2, High: 3, Urgent: 4 };
      const STATUS_ORDER = { Pending: 1, "In Progress": 2, Completed: 3 };
      const collator = new Intl.Collator("es", {
        sensitivity: "base",
        numeric: true,
      });

      const safeSlug = (s) =>
        String(s ?? "all")
          .toLowerCase()
          .replace(/[^a-z0-9]+/gi, "_")
          .replace(/^_+|_+$/g, "");

      const parseDate = (v) => {
        if (!v) return null;
        const iso = typeof v === "string" ? v.replace(" ", "T") : v;
        const d = new Date(iso);
        return Number.isNaN(d.getTime()) ? null : d.getTime();
      };

      const rank = (val, map) =>
        Object.prototype.hasOwnProperty.call(map, val)
          ? map[val]
          : Number.MAX_SAFE_INTEGER;

      // --- ORDENAR ---
      const sorted = [...(allTasks ?? [])].sort((a, b) => {
        const dir = ORDER.dir === "desc" ? -1 : 1;
        const key = ORDER.key;
        const va = a?.[key];
        const vb = b?.[key];
        let cmp = 0;

        switch (key) {
          case "priority":
            cmp = rank(va, PRIORITY_ORDER) - rank(vb, PRIORITY_ORDER);
            break;
          case "status":
            cmp = rank(va, STATUS_ORDER) - rank(vb, STATUS_ORDER);
            break;
          case "createdAt":
          case "dueDate": {
            const da = parseDate(va);
            const db = parseDate(vb);
            if (da == null && db == null) cmp = 0;
            else if (da == null) cmp = 1; // nulls last
            else if (db == null) cmp = -1;
            else cmp = da - db;
            break;
          }
          default: {
            // texto: title/description/lo que sea
            const sa = String(va ?? "");
            const sb = String(vb ?? "");
            cmp = collator.compare(sa, sb);
          }
        }

        // Desempate estable: por título asc
        if (cmp === 0) {
          cmp = collator.compare(
            String(a?.title ?? ""),
            String(b?.title ?? "")
          );
        }

        return cmp * dir;
      });

      // --- CSV helpers ---
      const csvEscape = (val) => {
        if (val === null || val === undefined) return "";
        let s = String(val).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        const needsQuotes =
          s.includes('"') || s.includes(DELIM) || s.includes("\n");
        if (s.includes('"')) s = s.replace(/"/g, '""');
        return needsQuotes ? `"${s}"` : s;
      };

      const headers = [
        "id",
        "title",
        "description",
        "priority",
        "status",
        "progress",
        "createdAt",
        "dueDate",
        "assignedTo",
        "attachments",
        "completedTodoCount",
        "todoChecklistCount",
      ];

      const rows = sorted.map((t) => {
        const assignedToStr = Array.isArray(t.assignedTo)
          ? t.assignedTo
              .map((u) =>
                typeof u === "string" ? u : u?.name || u?.email || u?.id || ""
              )
              .join(" | ")
          : "";

        const attachmentsStr = Array.isArray(t.attachments)
          ? t.attachments
              .map((a) => a?.name || a?.filename || a?.url || "")
              .join(" | ")
          : "";

        const fields = [
          t.id ?? "",
          t.title ?? "",
          t.description ?? "",
          t.priority ?? "",
          t.status ?? "",
          t.progress ?? "",
          t.createdAt ?? "",
          t.dueDate ?? "",
          assignedToStr,
          attachmentsStr,
          t.completedTodoCount ?? 0,
          (t.todoChecklist || []).length ?? 0,
        ];

        return fields.map(csvEscape).join(DELIM);
      });

      const headerLine = headers.map(csvEscape).join(DELIM);
      const csv = [headerLine, ...rows].join(EOL);

      // --- Descargar ---
      const blob = new Blob(["\uFEFF", csv], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tasks_${safeSlug(filterStatus)}_${today}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("Error generating CSV:", err);
    }
  };

  useEffect(() => {
    getAllTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  return (
    <DashboardLayout activeMenu="Manage Tasks">
      <div className="my-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h2 className="text-xl font-semibold">My Tasks</h2>
          <button className="flex download-btn" onClick={handleDownloadReport}>
            <LuFileSpreadsheet className="text-lg" />
            Download Report
          </button>
        </div>

        {tabs?.length > 0 && (
          <div className="flex items-center gap-3 mt-4">
            <TaskStatusTabs
              tabs={tabs}
              activeTab={filterStatus}
              setActiveTab={setFilterStatus}
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          {allTasks?.map((item) => (
            <TaskCard
              key={item.id}
              title={item.title}
              description={item.description}
              priority={item.priority}
              status={item.status}
              progress={item.progress}
              createdAt={item.createdAt}
              dueDate={item.dueDate}
              assignedTo={item.assignedTo}
              attachmentCount={item.attachments?.length || 0}
              completedTodoCount={item.completedTodoCount || 0}
              todoChecklist={item.todoChecklist || []}
              onClick={() => handleClick(item)}
            />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManageTasks;
