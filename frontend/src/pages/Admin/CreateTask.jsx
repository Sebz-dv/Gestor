// src/pages/Admin/CreateTask.jsx
import React, { useEffect, useState } from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { PRIORITY_DATA } from "../../utils/data";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import moment from "moment";
import { LuTrash2 } from "react-icons/lu";
import SelectDropdown from "../../components/input/SelectDropdown";
import SelectUsers from "../../components/input/SelectUsers";
import TodoListInput from "../../components/input/TodoListInput";
import AddAttachmentsInput from "../../components/input/AddAttachmentsInput";
import TaskHistory from "../../components/modals/TaskHistory";
import TaskHistoryModal from "../../components/modals/TaskHistory";

const FieldHint = ({ children }) => (
  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
    {children}
  </p>
);

const SectionTitle = ({ title, desc }) => (
  <div className="mb-3">
    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
      {title}
    </h3>
    {desc ? (
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
        {desc}
      </p>
    ) : null}
  </div>
);

const Skeleton = ({ className = "" }) => (
  <div
    className={`animate-pulse rounded-md bg-slate-200/70 dark:bg-slate-700/50 ${className}`}
  />
);

// ==========================================
// 🔧 Normalizers para datos inconsistentes
// ==========================================
const parseMaybeJson = (val) => {
  if (typeof val !== "string") return val;
  try {
    const trimmed = val.trim();
    if (
      (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
      (trimmed.startsWith("{") && trimmed.endsWith("}"))
    ) {
      return JSON.parse(trimmed);
    }
    if (/^\d+(,\d+)*$/.test(trimmed)) {
      return trimmed.split(",").map((s) => Number(s));
    }
    return val;
  } catch {
    return val;
  }
};
const ensureArray = (val) => {
  const v = parseMaybeJson(val);
  if (Array.isArray(v)) return v;
  if (v == null || v === "") return [];
  return [v];
};
const normalizeUserIdsFromApi = (input) => {
  const arr = ensureArray(input);
  const ids = arr.map((x) => {
    if (x == null) return null;
    if (typeof x === "number" || typeof x === "string") return Number(x);
    if (typeof x === "object") {
      return Number(
        x.id ?? x.userId ?? x.value ?? x.key ?? x.uid ?? x.user_id ?? NaN
      );
    }
    return null;
  });
  return [...new Set(ids.filter((n) => Number.isFinite(n)))];
};
const toApiUserIds = (val) => {
  const arr = ensureArray(val);
  return arr
    .map((x) =>
      typeof x === "number" || typeof x === "string" ? Number(x) : null
    )
    .filter((n) => Number.isFinite(n));
};
const normalizeAttachmentsFromApi = (input) => {
  const arr = ensureArray(input);
  return arr
    .map((x) => {
      if (!x) return null;
      if (typeof x === "string") {
        return { name: x, url: x };
      }
      if (typeof x === "object") {
        const name =
          x.name ??
          x.filename ??
          x.title ??
          x.label ??
          x.url ??
          x.path ??
          "archivo";
        const url = x.url ?? x.path ?? null;
        return { name: String(name), url: url ? String(url) : null };
      }
      return null;
    })
    .filter(Boolean);
};
const toApiAttachments = (val) => {
  const arr = ensureArray(val);
  return arr
    .map((a) => {
      if (!a) return null;
      if (typeof a === "string") return a;
      if (typeof a === "object") return a.url || a.name || null;
      return null;
    })
    .filter((s) => typeof s === "string" && s.trim().length > 0);
};

const toIso = (d) => (d ? new Date(d).toISOString() : null);

const CreateTask = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const { id: idParam, taskId: taskIdParam } = params || {};
  const routeId = idParam ?? taskIdParam ?? null;
  const stateId = location?.state?.taskId ?? null;
  const taskId = routeId ?? stateId;
  const [openHistory, setOpenHistory] = useState(false);

  const [taskData, setTaskData] = useState({
    title: "",
    description: "",
    priority: "Low",
    dueDate: null,
    assignedTo: [],
    todoChecklist: [],
    attachments: [],
  });

  const [currentTask, setCurrentTask] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);

  const handleValueChange = (key, value) => {
    setTaskData((prev) => ({ ...prev, [key]: value }));
  };

  const clearData = () => {
    setTaskData({
      title: "",
      description: "",
      priority: "Low",
      dueDate: null,
      assignedTo: [],
      todoChecklist: [],
      attachments: [],
    });
    setError("");
  };

  const normalizeChecklist = (list = []) =>
    list.map((item) => {
      if (typeof item === "string") return { text: item, completed: false };
      const text = typeof item?.text === "string" ? item.text : "";
      const completedRaw = item?.completed ?? item?.done ?? false;
      return { text, completed: Boolean(completedRaw) };
    });

  const toApiChecklist = (list = []) => {
    const n = normalizeChecklist(list);
    return n.map(({ text, completed }) => ({
      text,
      completed: Boolean(completed),
    }));
  };

  const fetchTask = async (id) => {
    setLoading(true);
    setError("");
    try {
      const path = API_PATHS.TASKS.GET_TASK_BY_ID(id);
      const { data } = await axiosInstance.get(path);

      setCurrentTask(data);

      setTaskData({
        title: data?.title ?? "",
        description: data?.description ?? "",
        priority: data?.priority ?? "Low",
        dueDate: data?.dueDate
          ? moment(data.dueDate).format("YYYY-MM-DD")
          : null,
        assignedTo: normalizeUserIdsFromApi(
          data?.assignedTo ?? data?.assigned_to
        ),
        attachments: normalizeAttachmentsFromApi(data?.attachments),
        todoChecklist: normalizeChecklist(
          data?.todoChecklist ?? data?.todo_checklist ?? []
        ),
      });
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar la tarea.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (taskId) fetchTask(taskId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");

    if (!taskData.title?.trim()) return setError("El título es obligatorio.");
    if (!taskData.description?.trim())
      return setError("La descripción es obligatoria.");
    if (!taskData.dueDate)
      return setError("La fecha de vencimiento es obligatoria.");
    if (!Array.isArray(taskData.assignedTo) || taskData.assignedTo.length === 0)
      return setError("Debes asignar al menos una persona.");
    if (
      !Array.isArray(taskData.todoChecklist) ||
      taskData.todoChecklist.length === 0
    )
      return setError("Agrega al menos un ítem al checklist.");

    if (taskId) {
      await updateTask();
    } else {
      await createTask();
    }
  };

  const createTask = async () => {
    setLoading(true);
    try {
      const payload = {
        ...taskData,
        dueDate: toIso(taskData.dueDate),
        todoChecklist: toApiChecklist(taskData.todoChecklist),
        assignedTo: toApiUserIds(taskData.assignedTo),
        attachments: toApiAttachments(taskData.attachments),
      };

      await axiosInstance.post(API_PATHS.TASKS.CREATE_TASK, payload);

      toast.success("Tarea creada correctamente");
      clearData();
      navigate("/admin/tasks");
    } catch (err) {
      console.error(err);
      setError("No se pudo crear la tarea.");
      toast.error("No se pudo crear la tarea.");
    } finally {
      setLoading(false);
    }
  };

  const updateTask = async () => {
    setLoading(true);
    try {
      const prev = Array.isArray(currentTask?.todoChecklist)
        ? normalizeChecklist(currentTask.todoChecklist)
        : [];

      const curr = normalizeChecklist(taskData.todoChecklist);

      const merged = curr.map((item) => {
        const match = prev.find((t) => t.text === item.text);
        const completed = match?.completed ?? item.completed ?? false;
        return { text: item.text, completed: Boolean(completed) };
      });

      const payload = {
        ...taskData,
        dueDate: toIso(taskData.dueDate),
        todoChecklist: merged,
        assignedTo: toApiUserIds(taskData.assignedTo),
        attachments: toApiAttachments(taskData.attachments),
      };

      const path = API_PATHS.TASKS.UPDATE_TASK(taskId);
      await axiosInstance.put(path, payload);

      toast.success("Tarea actualizada correctamente");
    } catch (err) {
      console.error(err);
      setError("No se pudo actualizar la tarea.");
      toast.error("No se pudo actualizar la tarea.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!taskId) return;
    setLoading(true);
    setError("");
    try {
      const path = API_PATHS.TASKS.DELETE_TASK(taskId);
      await axiosInstance.delete(path);
      toast.success("Tarea eliminada");
      navigate("/admin/tasks");
    } catch (err) {
      console.error(err);
      setError("No se pudo eliminar la tarea.");
      toast.error("Hubo un problema al eliminar.");
    } finally {
      setLoading(false);
      setOpenDeleteAlert(false);
    }
  };

  return (
    <DashboardLayout activeMenu={taskId ? "Actualizar Tarea" : "Crear Tarea"}>
      <div className="mt-5">
        {/* Header de página */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {taskId ? "Actualizar tarea" : "Crear tarea"}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Completa la información, asigna responsables y adjunta archivos.
            </p>
          </div>

          {taskId && (
            <button
              type="button"
              onClick={() => setOpenDeleteAlert(true)}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-rose-700 bg-rose-50 rounded-lg px-3 py-2 border border-rose-200 hover:bg-rose-100 transition-colors
                         dark:text-rose-300 dark:bg-rose-900/20 dark:border-rose-800/50 dark:hover:bg-rose-900/30"
              disabled={loading}
            >
              <LuTrash2 className="text-base" /> Eliminar
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Card principal */}
            <div className="md:col-span-3">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="p-5 border-b border-slate-200 dark:border-slate-800">
                  <SectionTitle
                    title="Información general"
                    desc="Estos campos ayudan a entender el alcance de la tarea."
                  />

                  {/* Skeletons en carga */}
                  {loading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-9 w-3/4" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  ) : (
                    <>
                      <div className="mt-2">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Título
                        </label>
                        <input
                          placeholder="Ej. Diseñar la pantalla de inicio"
                          className="form-input mt-1"
                          value={taskData.title}
                          onChange={(e) =>
                            handleValueChange("title", e.target.value)
                          }
                          disabled={loading}
                          aria-label="Título de la tarea"
                        />
                        <FieldHint>
                          Usa un título corto, directo y fácil de reconocer.
                        </FieldHint>
                      </div>

                      <div className="mt-3">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Descripción
                        </label>
                        <textarea
                          placeholder="Describe objetivos, criterios de aceptación, consideraciones, etc."
                          className="form-input mt-1"
                          rows={4}
                          value={taskData.description}
                          onChange={(e) =>
                            handleValueChange("description", e.target.value)
                          }
                          disabled={loading}
                          aria-label="Descripción de la tarea"
                        />
                        <FieldHint>
                          Puedes pegar listas, requisitos o links de referencia.
                        </FieldHint>
                      </div>
                    </>
                  )}

                  {error && (
                    <div
                      className="mt-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3
                                    dark:text-rose-300 dark:bg-rose-900/30 dark:border-rose-800/50"
                    >
                      {error}
                    </div>
                  )}
                </div>

                <div className="p-5 border-b border-slate-200 dark:border-slate-800">
                  <SectionTitle
                    title="Planificación y responsables"
                    desc="Define prioridad, fecha de vencimiento y personas asignadas."
                  />

                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-6 md:col-span-4">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Prioridad
                      </label>
                      <SelectDropdown
                        options={PRIORITY_DATA}
                        value={taskData.priority}
                        onChange={(value) =>
                          handleValueChange("priority", value)
                        }
                        placeholder="Selecciona una prioridad"
                        disabled={loading}
                      />
                      <FieldHint>
                        “Alta” para urgencias operativas. “Baja” si puede
                        esperar.
                      </FieldHint>
                    </div>

                    <div className="col-span-6 md:col-span-4">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Fecha de vencimiento
                      </label>
                      <input
                        type="date"
                        className="form-input mt-1"
                        value={taskData.dueDate || ""}
                        onChange={({ target }) =>
                          handleValueChange("dueDate", target.value)
                        }
                        disabled={loading}
                        aria-label="Fecha de vencimiento"
                      />
                      <FieldHint>
                        Elige una fecha realista para evitar atrasos.
                      </FieldHint>
                    </div>

                    <div className="col-span-12">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Asignar a
                      </label>
                      <SelectUsers
                        selectedUsers={taskData.assignedTo}
                        setSelectedUsers={(value) =>
                          handleValueChange("assignedTo", value)
                        }
                        disabled={loading}
                      />
                      <FieldHint>Puedes asignar múltiples personas.</FieldHint>
                    </div>
                  </div>
                </div>

                <div className="p-5 border-b border-slate-200 dark:border-slate-800">
                  <SectionTitle
                    title="Checklist"
                    desc="Desglosa la tarea en pasos accionables."
                  />
                  <TodoListInput
                    todoList={taskData?.todoChecklist}
                    setTodoList={(value) =>
                      handleValueChange("todoChecklist", value)
                    }
                    disabled={loading}
                  />
                </div>

                <div className="p-5">
                  <SectionTitle
                    title="Adjuntos"
                    desc="Agrega archivos de soporte (imágenes, PDFs, etc.)."
                  />
                  <AddAttachmentsInput
                    attachments={taskData?.attachments}
                    setAttachments={(value) =>
                      handleValueChange("attachments", value)
                    }
                    disabled={loading}
                  />
                </div>

                {/* Barra de acciones sticky dentro de la card */}
                <div
                  className="sticky bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70
                                dark:border-slate-800 dark:bg-slate-900/90 dark:supports-[backdrop-filter]:bg-slate-900/70 rounded-b-2xl"
                >
                  <div className="p-4 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(-1)}
                      className="px-3 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors
                                 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800/60"
                      disabled={loading}
                    >
                      Cancelar
                    </button>
                    <button
                      className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 transition-colors"
                      type="submit"
                      disabled={loading}
                    >
                      {loading
                        ? taskId
                          ? "Actualizando…"
                          : "Creando…"
                        : taskId
                        ? "Actualizar tarea"
                        : "Crear tarea"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna lateral */}
            <div className="md:col-span-1">
              <div className="sticky top-24">
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 dark:border-slate-800 dark:bg-slate-900">
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Resumen
                  </h4>
                  {/* Historial de la tarea */}
                  {taskId && (
                    <>
                      <button
                        type="button"
                        onClick={() => setOpenHistory(true)}
                        className="mt-3 w-full text-[12px] px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700
                 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      >
                        Ver historial
                      </button>

                      <TaskHistory
                        open={openHistory}
                        onClose={() => setOpenHistory(false)}
                        taskId={Number(taskId)}
                        // opcional:
                        // resolveActorName={(id) => usersMap[id] || `Usuario #${id}`}
                      />
                    </>
                  )}
                  <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">
                        Prioridad
                      </span>
                      <span className="font-medium">
                        {taskData.priority || "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">
                        Vence
                      </span>
                      <span className="font-medium">
                        {taskData.dueDate || "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">
                        Asignados
                      </span>
                      <span className="font-medium">
                        {Array.isArray(taskData.assignedTo)
                          ? taskData.assignedTo.length
                          : 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">
                        Checklist
                      </span>
                      <span className="font-medium">
                        {Array.isArray(taskData.todoChecklist)
                          ? taskData.todoChecklist.length
                          : 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">
                        Adjuntos
                      </span>
                      <span className="font-medium">
                        {Array.isArray(taskData.attachments)
                          ? taskData.attachments.length
                          : 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Modal eliminación accesible */}
        {openDeleteAlert && (
          <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            aria-describedby="delete-desc"
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800">
              <h4
                id="delete-title"
                className="text-base font-semibold text-slate-900 dark:text-slate-100"
              >
                Eliminar tarea
              </h4>
              <p
                id="delete-desc"
                className="text-sm text-slate-600 dark:text-slate-300 mt-2"
              >
                ¿Seguro que deseas eliminar esta tarea? Esta acción no se puede
                deshacer.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setOpenDeleteAlert(false)}
                  className="px-3 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors
                             dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800/60"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="px-3 py-2 text-sm font-semibold text-white bg-rose-600 rounded-md hover:bg-rose-700 active:bg-rose-800 disabled:opacity-60 transition-colors flex items-center gap-1.5"
                  disabled={loading}
                >
                  <LuTrash2 className="text-base" />
                  {loading ? "Eliminando…" : "Eliminar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CreateTask;
