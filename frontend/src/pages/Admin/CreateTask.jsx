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

const FieldHint = ({ children }) => (
  <p className="mt-1 text-[11px] text-slate-500">{children}</p>
);

const SectionTitle = ({ title, desc }) => (
  <div className="mb-3">
    <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
    {desc ? <p className="text-xs text-slate-500 mt-0.5">{desc}</p> : null}
  </div>
);

const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse rounded-md bg-slate-200/70 ${className}`} />
);

// ==========================================
// 🔧 Normalizers para datos inconsistentes
// ==========================================

// Intenta parsear strings tipo JSON ("[1,2]", "{...}") o CSV ("1,2,3")
const parseMaybeJson = (val) => {
  if (typeof val !== "string") return val;
  try {
    const trimmed = val.trim();
    if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
      return JSON.parse(trimmed);
    }
    // CSV de enteros: "1,2,3"
    if (/^\d+(,\d+)*$/.test(trimmed)) {
      return trimmed.split(",").map((s) => Number(s));
    }
    return val;
  } catch {
    return val;
  }
};

// Garantiza un arreglo a partir de valor, arreglo, JSON string, CSV, etc.
const ensureArray = (val) => {
  const v = parseMaybeJson(val);
  if (Array.isArray(v)) return v;
  if (v == null || v === "") return [];
  return [v];
};

// Acepta 1, "2", [1,"2"], {id:3}, {value:4}, "1,2" o "[1,2]" y devuelve [1,2,3,4] (números)
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

// Para enviar al API como primitivos (evita mandar objetos). Acepta scalar/array/JSON.
const toApiUserIds = (val) => {
  const arr = ensureArray(val);
  return arr
    .map((x) => (typeof x === "number" || typeof x === "string" ? Number(x) : null))
    .filter((n) => Number.isFinite(n));
};

// Acepta "name.ext", ["a"], {name,url}, {filename,path} o JSON string y devuelve [{name,url}]
const normalizeAttachmentsFromApi = (input) => {
  const arr = ensureArray(input);
  return arr
    .map((x) => {
      if (!x) return null;
      if (typeof x === "string") {
        return { name: x, url: x }; // si guardaste solo string, úsalo como nombre+url
      }
      if (typeof x === "object") {
        const name = x.name ?? x.filename ?? x.title ?? x.label ?? x.url ?? x.path ?? "archivo";
        const url = x.url ?? x.path ?? null;
        return { name: String(name), url: url ? String(url) : null };
      }
      return null;
    })
    .filter(Boolean);
};

// Para enviar al API como arreglo de strings. Acepta scalar/array/JSON.
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

  // Acepta :id o :taskId en la ruta; si no, intenta con state
  const { id: idParam, taskId: taskIdParam } = params || {};
  const routeId = idParam ?? taskIdParam ?? null; // de /admin/tasks/:id o /:taskId
  const stateId = location?.state?.taskId ?? null; // por si navegaste con state
  const taskId = routeId ?? stateId; // si no hay ninguno => modo crear

  const [taskData, setTaskData] = useState({
    title: "",
    description: "",
    priority: "Low",
    dueDate: null, // "YYYY-MM-DD"
    assignedTo: [], // [userId, ...] (números)
    todoChecklist: [], // [{ text:'', completed: boolean }]
    attachments: [], // [{ name, url }]
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

  // ---- Helpers de normalización/formatos ----
  const normalizeChecklist = (list = []) =>
    list.map((item) => {
      // Acepta string u objeto y lo lleva a { text, completed }
      if (typeof item === "string") return { text: item, completed: false };
      const text = typeof item?.text === "string" ? item.text : "";
      const completedRaw = item?.completed ?? item?.done ?? false; // soporta 'done' heredado
      return { text, completed: Boolean(completedRaw) };
    });

  const toApiChecklist = (list = []) => {
    const n = normalizeChecklist(list);
    return n.map(({ text, completed }) => ({ text, completed: Boolean(completed) }));
  };

  // ---- Cargar tarea (modo edición) ----
  const fetchTask = async (id) => {
    setLoading(true);
    setError("");
    try {
      const path = API_PATHS.TASKS.GET_TASK_BY_ID(id);
      console.log("[GET]", axiosInstance.defaults.baseURL + path);
      const { data } = await axiosInstance.get(path);

      setCurrentTask(data);

      setTaskData({
        title: data?.title ?? "",
        description: data?.description ?? "",
        priority: data?.priority ?? "Low",
        dueDate: data?.dueDate ? moment(data.dueDate).format("YYYY-MM-DD") : null,
        // 👇 Normaliza IDs a números, sin importar el formato que venga del backend
        assignedTo: normalizeUserIdsFromApi(data?.assignedTo ?? data?.assigned_to),
        // 👇 Convierte a {name,url} para que el input pueda renderizarlo
        attachments: normalizeAttachmentsFromApi(data?.attachments),
        todoChecklist: normalizeChecklist(data?.todoChecklist ?? data?.todo_checklist ?? []),
      });
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar la tarea.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log(`[CreateTask] modo: ${taskId ? "editar" : "crear"}`, { routeId, stateId, taskId });
    if (taskId) fetchTask(taskId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  // ---- Guardado ----
  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");

    // Validaciones mínimas
    if (!taskData.title?.trim()) return setError("Title is required.");
    if (!taskData.description?.trim()) return setError("Description is required.");
    if (!taskData.dueDate) return setError("Due date is required.");
    if (!Array.isArray(taskData.assignedTo) || taskData.assignedTo.length === 0)
      return setError("Selected users are required.");
    if (!Array.isArray(taskData.todoChecklist) || taskData.todoChecklist.length === 0)
      return setError("Add at least one task to the checklist.");

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
        // 👇 Envía arrays "planos" al backend
        assignedTo: toApiUserIds(taskData.assignedTo),
        attachments: toApiAttachments(taskData.attachments),
      };

      console.log("[POST]", axiosInstance.defaults.baseURL + API_PATHS.TASKS.CREATE_TASK, payload);
      await axiosInstance.post(API_PATHS.TASKS.CREATE_TASK, payload);

      toast.success("Task created successfully");
      clearData();
      navigate("/admin/tasks");
    } catch (err) {
      console.error(err);
      setError("Failed to create task.");
      toast.error("Failed to create task.");
    } finally {
      setLoading(false);
    }
  };

  const updateTask = async () => {
    setLoading(true);
    try {
      // Mantener status de completado cuando coincida por 'text'
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
        // 👇 Envía arrays normalizados al backend
        assignedTo: toApiUserIds(taskData.assignedTo),
        attachments: toApiAttachments(taskData.attachments),
      };

      const path = API_PATHS.TASKS.UPDATE_TASK(taskId);
      console.log("[PUT]", axiosInstance.defaults.baseURL + path, payload);
      await axiosInstance.put(path, payload);

      toast.success("Task updated successfully");
    } catch (err) {
      console.error(err);
      setError("Failed to update task.");
      toast.error("Failed to update task.");
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
      console.log("[DELETE]", axiosInstance.defaults.baseURL + path);
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
    <DashboardLayout activeMenu="Create Task">
      <div className="mt-5">
        {/* Header de página */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-slate-900">
              {taskId ? "Actualizar Tarea" : "Crear Tarea"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Define la información, asigna responsables y adjunta archivos.
            </p>
          </div>

          {taskId && (
            <button
              type="button"
              onClick={() => setOpenDeleteAlert(true)}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-rose-600 bg-rose-50 rounded px-3 py-2 border border-rose-200 hover:border-rose-300 transition-colors"
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
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="p-5 border-b border-slate-200">
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
                        <label className="text-xs font-medium text-slate-700">
                          Título
                        </label>
                        <input
                          placeholder="Crear App UI"
                          className="form-input mt-1"
                          value={taskData.title}
                          onChange={(e) => handleValueChange("title", e.target.value)}
                          disabled={loading}
                        />
                        <FieldHint>Un título corto y claro funciona mejor.</FieldHint>
                      </div>

                      <div className="mt-3">
                        <label className="text-xs font-medium text-slate-700">
                          Descripción
                        </label>
                        <textarea
                          placeholder="Describe la tarea"
                          className="form-input mt-1"
                          rows={4}
                          value={taskData.description}
                          onChange={(e) => handleValueChange("description", e.target.value)}
                          disabled={loading}
                        />
                        <FieldHint>Puedes pegar listas, requisitos o criterios de aceptación.</FieldHint>
                      </div>
                    </>
                  )}

                  {error && (
                    <div className="mt-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
                      {error}
                    </div>
                  )}
                </div>

                <div className="p-5 border-b border-slate-200">
                  <SectionTitle
                    title="Planificación y responsables"
                    desc="Define prioridad, fecha y personas asignadas."
                  />

                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-6 md:col-span-4">
                      <label className="text-xs font-medium text-slate-700">
                        Priority
                      </label>
                      <SelectDropdown
                        options={PRIORITY_DATA}
                        value={taskData.priority}
                        onChange={(value) => handleValueChange("priority", value)}
                        placeholder="Select Priority"
                        disabled={loading}
                      />
                      <FieldHint>Low si no es urgente; High para prioridad operativa.</FieldHint>
                    </div>

                    <div className="col-span-6 md:col-span-4">
                      <label className="text-xs font-medium text-slate-700">
                        Due Date
                      </label>
                      <input
                        type="date"
                        className="form-input mt-1"
                        value={taskData.dueDate || ""}
                        onChange={({ target }) => handleValueChange("dueDate", target.value)}
                        disabled={loading}
                      />
                      <FieldHint>Usa una fecha realista para evitar atrasos.</FieldHint>
                    </div>

                    <div className="col-span-12">
                      <label className="text-xs font-medium text-slate-700">
                        Assign To
                      </label>
                      <SelectUsers
                        selectedUsers={taskData.assignedTo}
                        setSelectedUsers={(value) => handleValueChange("assignedTo", value)}
                        disabled={loading}
                      />
                      <FieldHint>Puedes asignar múltiples personas.</FieldHint>
                    </div>
                  </div>
                </div>

                <div className="p-5 border-b border-slate-200">
                  <SectionTitle title="Checklist" desc="Desglosa la tarea en pasos accionables." />
                  <TodoListInput
                    todoList={taskData?.todoChecklist}
                    setTodoList={(value) => handleValueChange("todoChecklist", value)}
                    disabled={loading}
                  />
                </div>

                <div className="p-5">
                  <SectionTitle title="Adjuntos" desc="Agrega archivos de soporte (imágenes, PDFs, etc.)." />
                  <AddAttachmentsInput
                    attachments={taskData?.attachments}
                    setAttachments={(value) => handleValueChange("attachments", value)}
                    disabled={loading}
                  />
                </div>

                {/* Barra de acciones sticky dentro de la card */}
                <div className="sticky bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70">
                  <div className="p-4 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(-1)}
                      className="px-3 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                      disabled={loading}
                    >
                      Cancelar
                    </button>
                    <button
                      className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 transition-colors"
                      type="submit"
                      disabled={loading}
                    >
                      {loading ? (taskId ? "Actualizando…" : "Creando…") : (taskId ? "Actualizar tarea" : "Crear tarea")}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna lateral */}
            <div className="md:col-span-1">
              <div className="sticky top-24">
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                  <h4 className="text-sm font-semibold text-slate-800">Resumen</h4>
                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-500">Priority:</span>{" "}
                      <span className="font-medium">{taskData.priority || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Due Date:</span>{" "}
                      <span className="font-medium">{taskData.dueDate || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Asignados:</span>{" "}
                      <span className="font-medium">
                        {Array.isArray(taskData.assignedTo) ? taskData.assignedTo.length : 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Checklist:</span>{" "}
                      <span className="font-medium">
                        {Array.isArray(taskData.todoChecklist) ? taskData.todoChecklist.length : 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Adjuntos:</span>{" "}
                      <span className="font-medium">
                        {Array.isArray(taskData.attachments) ? taskData.attachments.length : 0}
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
            <div className="bg-white rounded-xl p-5 w-full max-w-sm shadow-2xl border border-slate-200">
              <h4 id="delete-title" className="text-base font-semibold text-slate-900">
                Eliminar tarea
              </h4>
              <p id="delete-desc" className="text-sm text-slate-600 mt-2">
                ¿Seguro que deseas eliminar esta tarea? Esta acción no se puede deshacer.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setOpenDeleteAlert(false)}
                  className="px-3 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
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
