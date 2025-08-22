import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import AvatarGroup from "../../components/AvatarGroup";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";

/* ----------------- Helpers ----------------- */
const normalizeUser = (u = {}) => ({
  id: u.id ?? u.user_id ?? u.uid ?? u.email ?? Math.random().toString(36),
  name: u.name ?? u.full_name ?? u.username ?? "—",
  email: u.email ?? "—",
  profileImageUrl: u.avatar ?? u.photoURL ?? u.profileImageUrl ?? "",
  pendingTasks:
    u.pendingTasks ?? u.pending ?? u.stats?.pending ?? u.tasks?.pending ?? 0,
  inProgressTasks:
    u.inProgressTasks ??
    u.in_progress ??
    u.stats?.inProgress ??
    u.tasks?.in_progress ??
    0,
  completedTasks:
    u.completedTasks ?? u.completed ?? u.stats?.completed ?? u.tasks?.completed ?? 0,
  overdueTasks: u.overdueTasks ?? u.overdue ?? u.stats?.overdue ?? u.tasks?.overdue ?? 0,
});

const isTrue = (v) => v === true || v === 1 || v === "1" || v === "true";

/* Derivación & persistencia */
const deriveStatusAndProgress = (items = []) => {
  const total = Array.isArray(items) ? items.length : 0;
  const done = Array.isArray(items) ? items.filter((i) => isTrue(i?.completed)).length : 0;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  let status = "Pending";
  if (total > 0 && done === total) status = "Completed";
  else if (done > 0) status = "In Progress";

  return { status, progress };
};

const persistStatusAndProgress = async (taskId, status, progress) => {
  const endpoint =
    API_PATHS?.TASKS?.UPDATE_STATUS_PROGRESS?.(taskId) ||
    API_PATHS?.TASKS?.UPDATE_TASK?.(taskId) ||
    `/api/tasks/${taskId}`;

  try {
    await axiosInstance.put(endpoint, { status, progress });
  } catch (e) {
    console.warn(
      "[ViewTaskDetails] No se pudo persistir status/progress",
      e?.response?.data || e?.message
    );
  }
};

/* ---------- View ---------- */
const ViewTaskDetails = () => {
  const params = useParams(); // { id } según /user/tasks-details/:id
  const location = useLocation();

  // Estados
  const [task, setTask] = useState(null);
  const [loadingTask, setLoadingTask] = useState(true);
  const [taskErr, setTaskErr] = useState("");

  // Avatares resueltos (sin /api/users admin-only)
  const [avatarUrls, setAvatarUrls] = useState([]);
  const avatarCacheRef = useRef(new Map()); // id -> url

  // Resolver ID desde: /:id | state.taskId | ?id=123
  const effectiveId = useMemo(() => {
    const idFromParams = params?.id ?? params?.taskId ?? null;
    const idFromState = location?.state?.taskId ?? null;
    const idFromQuery = new URLSearchParams(location.search).get("id");
    return idFromParams ?? idFromState ?? idFromQuery ?? null;
  }, [params, location]);

  const getStatusTagColor = (status) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "In Progress":
        return "bg-blue-100 text-blue-800";
      case "Completed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Cargar detalle de tarea
  const getTaskDetailByID = useCallback(async (id) => {
    if (!id) {
      setTaskErr("No se recibió un ID de tarea en la ruta/estado/query.");
      setTask(null);
      setLoadingTask(false);
      console.warn("[ViewTaskDetails] Sin ID, no se hace request");
      return;
    }
    try {
      setLoadingTask(true);
      setTaskErr("");

      const url = API_PATHS.TASKS.GET_TASK_BY_ID(id);
      const res = await axiosInstance.get(url);
      const taskInfo = res?.data?.task ?? res?.data ?? null;

      const { status, progress } = deriveStatusAndProgress(taskInfo?.todoChecklist);
      const merged = { ...taskInfo, status, progress };
      setTask(merged);

      if (status !== taskInfo?.status || progress !== (taskInfo?.progress ?? 0)) {
        persistStatusAndProgress(taskInfo.id, status, progress);
      }
    } catch (error) {
      console.groupCollapsed("[ViewTaskDetails] Error en fetch");
      console.error("Axios error =>", error);
      if (error?.response) {
        console.log("response.status =>", error.response.status);
        console.log("response.data =>", error.response.data);
      } else if (error?.request) {
        console.log("No hubo respuesta del servidor (request enviado).");
      } else {
        console.log("Error al configurar la petición.");
      }
      console.groupEnd();

      setTaskErr("No se pudo cargar la tarea. Revisa la ruta y el backend.");
      setTask(null);
    } finally {
      setLoadingTask(false);
    }
  }, []);

  // --- Resolución on-demand de avatares (sin /api/users) ---
  const fetchUserProfileImageById = useCallback(async (id) => {
    // cache
    const cached = avatarCacheRef.current.get(String(id));
    if (cached !== undefined) return cached;

    const url =
      typeof API_PATHS?.USERS?.GET_USER_BY_ID === "function"
        ? API_PATHS.USERS.GET_USER_BY_ID(id)
        : `/api/users/${id}`;

    try {
      const res = await axiosInstance.get(url);
      // el backend puede responder { user } o el objeto directo
      const rawUser = res?.data?.user ?? res?.data ?? null;
      const user = normalizeUser(rawUser || {});
      const out = user.profileImageUrl || "";
      avatarCacheRef.current.set(String(id), out);
      return out;
    } catch (err) {
      // Si también es 403 aquí, devolvemos vacío (no avatar) y seguimos
      console.warn("[ViewTaskDetails] No se pudo obtener usuario", id, err?.response?.data || err?.message);
      avatarCacheRef.current.set(String(id), ""); // cachea vacío para no insistir
      return "";
    }
  }, []);

  const resolveAvatarsFromAssignedTo = useCallback(async (assignedTo) => {
    const list = Array.isArray(assignedTo) ? assignedTo : [];
    if (list.length === 0) {
      setAvatarUrls([]);
      return;
    }

    // Quitamos duplicados conservando orden
    const unique = [];
    const seen = new Set();
    for (const a of list) {
      const key =
        typeof a === "object" && a !== null
          ? String(a.id ?? a.user_id ?? a.uid ?? a.email ?? JSON.stringify(a))
          : String(a);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(a);
      }
    }

    const urls = await Promise.all(
      unique.map(async (a) => {
        // 1) URL directa
        if (typeof a === "string" && /^https?:\/\//i.test(a)) return a;

        // 2) Objeto usuario con foto
        if (a && typeof a === "object") {
          const direct =
            a.profileImageUrl || a.avatar || a.photoURL || a.image || a.picture || "";
          if (direct) return direct;

          // 2.b) Objeto con id pero sin foto -> intento GET by ID
          const idVal = a.id ?? a.user_id ?? a.uid ?? a.email ?? null;
          if (idVal != null) return fetchUserProfileImageById(idVal);

          return "";
        }

        // 3) ID (número o string)
        return fetchUserProfileImageById(a);
      })
    );

    setAvatarUrls(urls.filter(Boolean));
  }, [fetchUserProfileImageById]);

  /* ----------------- Effects ----------------- */
  useEffect(() => {
    getTaskDetailByID(effectiveId);
  }, [effectiveId, getTaskDetailByID]);

  useEffect(() => {
    resolveAvatarsFromAssignedTo(task?.assignedTo);
  }, [task?.assignedTo, resolveAvatarsFromAssignedTo]);

  return (
    <DashboardLayout activeMenu="My Tasks">
      <div className="mt-5">
        {!effectiveId && (
          <div className="mb-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">
            Falta el parámetro <code>:id</code> en la URL o <code>taskId</code> en{" "}
            <code>state</code>/<code>query</code>.
          </div>
        )}

        {loadingTask ? (
          <div className="text-sm text-slate-500">Cargando…</div>
        ) : taskErr ? (
          <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">
            {taskErr}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 mt-4 gap-4">
            {task && (
              <>
                {/* Columna principal */}
                <div className="form-card col-span-3 p-4 bg-white rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl md:text-xl font-medium">
                      {task?.title ?? "—"}
                    </h2>
                    <div
                      className={`text-[13px] font-medium px-4 py-0.5 rounded ${getStatusTagColor(
                        task?.status
                      )}`}
                    >
                      {task?.status ?? "Pending"}
                    </div>
                  </div>

                  {task?.description && (
                    <p className="mt-2 text-sm text-slate-700">{task.description}</p>
                  )}

                  {/* Checklist */}
                  <div className="mt-6">
                    <label className="text-xs font-medium text-slate-500">
                      Todo Checklist
                    </label>
                    {Array.isArray(task?.todoChecklist) &&
                    task.todoChecklist.length > 0 ? (
                      <ul className="mt-2 space-y-2">
                        {task.todoChecklist.map((item, index) => (
                          <li key={index}>
                            <TodoCheckList
                              text={item?.text ?? `Item #${index + 1}`}
                              isChecked={isTrue(item?.completed)}
                              onChange={() => updateTodoChecklist(index)}
                            />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-500 mt-2">Sin items en el checklist.</p>
                    )}
                  </div>

                  {/* Adjuntos */}
                  {Array.isArray(task?.attachments) && task.attachments.length > 0 && (
                    <div className="mt-6">
                      <label className="text-xs font-medium text-slate-500">
                        Adjuntos
                      </label>
                      <div className="mt-2 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {task.attachments.map((att, i) => {
                          const url = typeof att === "string" ? att : att?.url;
                          const name =
                            (typeof att === "string"
                              ? att.split("/").pop()
                              : att?.name) ?? `Adjunto ${i + 1}`;
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                if (!url) return;
                                const href = /^https?:\/\//i.test(url) ? url : "https://" + url;
                                window.open(href, "_blank", "noopener,noreferrer");
                              }}
                              className="text-left text-sm p-2 rounded border border-slate-200 hover:bg-slate-50"
                              title={name}
                            >
                              📎 {name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Columna lateral */}
                <div className="p-4 bg-white rounded-lg border border-slate-200">
                  <InfoBox label="Descripción" value={task?.description || "—"} />
                  <InfoBox label="Prioridad" value={task?.priority || "—"} />
                  <InfoBox
                    label="Fecha de Vencimiento"
                    value={
                      task?.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"
                    }
                  />
                  <InfoBox label="Progreso" value={`${task?.progress ?? 0}%`} />
                  <div className="mt-4">
                    <label className="text-xs font-medium text-slate-500">
                      Assigned To
                    </label>
                    <div className="mt-2">
                      {avatarUrls.length ? (
                        <AvatarGroup avatars={avatarUrls} maxVisible={5} />
                      ) : (
                        <p className="text-sm text-slate-500">—</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );

  // ✅ Actualización optimista del checklist + status/progress derivados
  async function updateTodoChecklist(index) {
    if (!task?.todoChecklist?.[index]) return;

    const taskId = Number(task?.id);

    // copia simple del estado actual
    const prevItems = task.todoChecklist.map((it) => ({ ...it }));
    const prevDerived = deriveStatusAndProgress(prevItems);

    // Toggle local y normalización del payload
    const normalized = prevItems
      .map((it, i) => {
        const idNum =
          it?.id === null || it?.id === undefined || it?.id === "" ? null : Number(it.id);

        const base = {
          text: String(it?.text ?? ""),
          completed: i === index ? !isTrue(it?.completed) : isTrue(it?.completed),
          sortOrder: Number.isFinite(Number(it?.sortOrder)) ? Number(it.sortOrder) : i,
        };

        return idNum != null ? { id: idNum, ...base } : base;
      })
      .filter((it) => String(it.text).trim().length > 0);

    const nextDerived = deriveStatusAndProgress(normalized);

    // Optimista: actualiza UI
    setTask((t) =>
      t
        ? {
            ...t,
            todoChecklist: normalized,
            status: nextDerived.status,
            progress: nextDerived.progress,
          }
        : t
    );

    try {
      const res = await axiosInstance.put(
        API_PATHS.TASKS.UPDATE_TODO_CHECKLIST(taskId),
        { items: normalized },
        { headers: { "Content-Type": "application/json" } }
      );

      const serverTask = res?.data?.task ?? res?.data ?? null;
      const items = serverTask?.todoChecklist ?? normalized;
      const finalDerived = deriveStatusAndProgress(items);

      setTask((t) =>
        serverTask
          ? {
              ...serverTask,
              todoChecklist: items,
              status: finalDerived.status,
              progress: finalDerived.progress,
            }
          : t
      );

      persistStatusAndProgress(taskId, finalDerived.status, finalDerived.progress);
    } catch (err) {
      setTask((t) =>
        t
          ? {
              ...t,
              todoChecklist: prevItems,
              status: prevDerived.status,
              progress: prevDerived.progress,
            }
          : t
      );
      console.groupCollapsed("[ViewTaskDetails] Error /todo");
      console.log("payload items =>", normalized);
      console.log("status =>", err?.response?.status, "data =>", err?.response?.data);
      console.groupEnd();
    }
  }
};

export default ViewTaskDetails;

/* ---------- Subcomponentes ---------- */

const InfoBox = ({ label, value }) => (
  <div className="mt-2">
    <span className="font-medium">{label}:</span>{" "}
    <span className="text-slate-600">{value}</span>
  </div>
);

const TodoCheckList = ({ text, isChecked, onChange }) => (
  <div className="flex items-center gap-3 p-2 border border-slate-200 rounded">
    <input type="checkbox" checked={isChecked} onChange={onChange} className="w-4 h-4" />
    <p className={`text-[13px] ${isChecked ? "line-through text-slate-400" : "text-gray-800"}`}>
      {text}
    </p>
  </div>
);
