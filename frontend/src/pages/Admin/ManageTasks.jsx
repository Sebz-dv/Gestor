import React, { useEffect, useState, useMemo } from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { LuFileSpreadsheet } from "react-icons/lu";
import TaskStatusTabs from "../../components/TaskStatusTabs";
import TaskCard from "../../components/Cards/TaskCard";

/* ---------------- Helpers ---------------- */
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

// Mapeo para mostrar tabs en español pero mantener valores internos para filtrar
const STATUS_ES = {
  All: "Todas",
  Pending: "Pendientes",
  "In Progress": "En progreso",
  Completed: "Completadas",
};
const STATUS_FROM_ES = Object.fromEntries(Object.entries(STATUS_ES).map(([k, v]) => [v, k]));

/* ---------------- Component ---------------- */
const ManageTasks = () => {
  const [allTasks, setAllTasks] = useState([]);
  const [tabs, setTabs] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All"); // mantiene valores internos
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const navigate = useNavigate();

  const getAllTasks = async () => {
    try {
      setLoading(true);
      setErr("");

      const response = await axiosInstance.get(API_PATHS.TASKS.GET_ALL_TASKS, {
        params: { status: filterStatus === "All" ? undefined : filterStatus },
      });

      const payload = response.data;
      const list = Array.isArray(payload?.task)
        ? payload.task
        : Array.isArray(payload)
        ? payload
        : [];

      const normalized = list.map(normalizeTask);
      setAllTasks(normalized);

      // Si no viene resumen, lo calculamos
      const ss = payload?.statusSummary ?? null;
      const computedTabs = [
        { label: "All", count: ss?.all ?? normalized.length },
        {
          label: "Pending",
          count: ss?.pending ?? normalized.filter((t) => t.status === "Pending").length,
        },
        {
          label: "In Progress",
          count: ss?.inProgress ?? normalized.filter((t) => t.status === "In Progress").length,
        },
        {
          label: "Completed",
          count: ss?.completed ?? normalized.filter((t) => t.status === "Completed").length,
        },
      ];
      setTabs(computedTabs);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setErr("No se pudieron cargar las tareas. Intenta nuevamente.");
      setAllTasks([]);
      setTabs([
        { label: "All", count: 0 },
        { label: "Pending", count: 0 },
        { label: "In Progress", count: 0 },
        { label: "Completed", count: 0 },
      ]);
    } finally {
      setLoading(false);
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
      const DELIM = ","; // usa ";" si tu Excel lo prefiere
      const EOL = "\r\n";
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

      // Orden por defecto
      const ORDER = { key: "title", dir: "asc" };
      const PRIORITY_ORDER = { Low: 1, Medium: 2, High: 3, Urgent: 4 };
      const STATUS_ORDER = { Pending: 1, "In Progress": 2, Completed: 3 };
      const collator = new Intl.Collator("es", { sensitivity: "base", numeric: true });

      const safeSlug = (s) =>
        String(s ?? "todas")
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
        Object.prototype.hasOwnProperty.call(map, val) ? map[val] : Number.MAX_SAFE_INTEGER;

      // Ordenar
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
            else if (da == null) cmp = 1; // nulls al final
            else if (db == null) cmp = -1;
            else cmp = da - db;
            break;
          }
          default: {
            const sa = String(va ?? "");
            const sb = String(vb ?? "");
            cmp = collator.compare(sa, sb);
          }
        }

        // Desempate estable: por título asc
        if (cmp === 0) {
          cmp = collator.compare(String(a?.title ?? ""), String(b?.title ?? ""));
        }

        return cmp * dir;
      });

      // CSV helpers
      const csvEscape = (val) => {
        if (val === null || val === undefined) return "";
        let s = String(val).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        const needsQuotes = s.includes('"') || s.includes(DELIM) || s.includes("\n");
        if (s.includes('"')) s = s.replace(/"/g, '""');
        return needsQuotes ? `"${s}"` : s;
      };

      const headers = [
        "ID",
        "Título",
        "Descripción",
        "Prioridad",
        "Estado",
        "Progreso",
        "Creada",
        "Vence",
        "Asignados",
        "Adjuntos",
        "Checklist (completados)",
        "Checklist (total)",
      ];

      const rows = sorted.map((t) => {
        const assignedToStr = Array.isArray(t.assignedTo)
          ? t.assignedTo
              .map((u) => (typeof u === "string" ? u : u?.name || u?.email || u?.id || ""))
              .join(" | ")
          : "";

        const attachmentsStr = Array.isArray(t.attachments)
          ? t.attachments.map((a) => a?.name || a?.filename || a?.url || "").join(" | ")
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

      // Descargar
      const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Nombre en español
      const filtroNombre = STATUS_ES[filterStatus] || filterStatus;
      a.download = `tareas_${safeSlug(filtroNombre)}_${today}.csv`;
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

  // Tabs en español (se muestran) y mapeo al set
  const tabsEs = useMemo(
    () => tabs.map((t) => ({ label: STATUS_ES[t.label] || t.label, count: t.count })),
    [tabs]
  );
  const activeTabEs = STATUS_ES[filterStatus] || filterStatus;
  const handleTabChangeEs = (labelEs) => setFilterStatus(STATUS_FROM_ES[labelEs] || labelEs);

  // Skeleton de cards
  const CardSkeleton = () => (
    <div className="rounded-xl border border-slate-200 bg-white p-4 animate-pulse dark:border-slate-800 dark:bg-slate-900">
      <div className="h-5 w-2/3 bg-slate-200 rounded dark:bg-slate-700" />
      <div className="mt-3 h-3 w-full bg-slate-200 rounded dark:bg-slate-700" />
      <div className="mt-2 h-3 w-5/6 bg-slate-200 rounded dark:bg-slate-700" />
      <div className="mt-4 h-3 w-1/2 bg-slate-200 rounded dark:bg-slate-700" />
    </div>
  );

  return (
    <DashboardLayout activeMenu="Administrador de Tareas">
      <div className="my-5">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Tareas</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Revisa, filtra y exporta tus tareas.
            </p>
          </div>

          <button
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md
                       border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100
                       dark:border-emerald-800 dark:text-emerald-300 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30"
            onClick={handleDownloadReport}
          >
            <LuFileSpreadsheet className="text-lg" />
            Descargar CSV
          </button>
        </div>

        {tabsEs?.length > 0 && (
          <div className="flex items-center gap-3 mt-4">
            <TaskStatusTabs tabs={tabsEs} activeTab={activeTabEs} setActiveTab={handleTabChangeEs} />
          </div>
        )}

        {/* Mensaje de error */}
        {err && (
          <div className="mt-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3
                          dark:text-rose-300 dark:bg-rose-900/30 dark:border-rose-800/50">
            {err}
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
            : allTasks?.length > 0
            ? allTasks.map((item) => (
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
              ))
            : (
              <div className="md:col-span-3">
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center
                                dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-slate-600 dark:text-slate-300">
                    No hay tareas en esta categoría.
                  </p>
                  <button
                    onClick={() => navigate("/admin/create-tasks")}
                    className="mt-3 inline-flex items-center px-3 py-2 text-sm font-medium rounded-md
                               border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100
                               dark:border-blue-800 dark:text-blue-300 dark:bg-blue-900/20 dark:hover:bg-blue-900/30"
                  >
                    Crear nueva tarea
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManageTasks;
