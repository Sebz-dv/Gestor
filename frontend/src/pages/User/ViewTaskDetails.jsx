import React, { useEffect, useState, useCallback, useMemo, useRef, useContext } from "react";
import { useParams, useLocation } from "react-router-dom";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import AvatarGroup from "../../components/AvatarGroup";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { UserContext } from "../../context/UserContext";

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

const pad2 = (n) => String(n).padStart(2, "0");
const fmtHMS = (seconds = 0) => {
  const s = Math.max(0, Number(seconds) | 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
};

// ==== FILES: helpers ====
const fmtBytes = (b = 0) => {
  const bytes = Number(b) || 0;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
};
const toArray = (x) => (Array.isArray(x) ? x : x == null ? [] : [x]);
const extractIds = (arr) =>
  toArray(arr)
    .map((a) =>
      typeof a === "object" && a
        ? Number(a.id ?? a.user_id ?? a.uid ?? a.value ?? NaN)
        : Number(a)
    )
    .filter((n) => Number.isFinite(n));

/* ---------- View ---------- */
const ViewTaskDetails = () => {
  const params = useParams(); // { id } según /user/tasks-details/:id
  const location = useLocation();
  const { user } = useContext(UserContext) || {};
  const myUserId = Number(user?.id ?? user?.user_id ?? 0);
  const amAdmin = String(user?.role || "").toLowerCase() === "admin";

  // Estados
  const [task, setTask] = useState(null);
  const [loadingTask, setLoadingTask] = useState(true);
  const [taskErr, setTaskErr] = useState("");

  // Avatares resueltos (sin /api/users admin-only)
  const [avatarUrls, setAvatarUrls] = useState([]);
  const avatarCacheRef = useRef(new Map()); // id -> url

  // Time tracking
  const [timeTotalSeconds, setTimeTotalSeconds] = useState(0); // total acumulado
  const [isRunning, setIsRunning] = useState(false);           // ¿yo tengo timer activo en esta tarea?
  const [myStartAt, setMyStartAt] = useState(null);            // Date de inicio de MI timer
  const tickRef = useRef(null);                                // interval id

  // ==== FILES: state ====
  const [files, setFiles] = useState([]);           // lista de archivos de la tarea
  const [filesLoading, setFilesLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const fileInputRef = useRef(null);

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
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border dark:border-yellow-800/60";
      case "In Progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 dark:border dark:border-blue-800/60";
      case "Completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 dark:border dark:border-green-800/60";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-slate-800/40 dark:text-slate-200 dark:border dark:border-slate-700";
    }
  };

  // --- Cargar resumen de tiempo ---
  const fetchTimeSummary = useCallback(async (taskId) => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.TASKS.GET_TASK_TIME(taskId));
      const total = Number(data?.totalSeconds ?? 0);
      const active = Array.isArray(data?.activeTimers) ? data.activeTimers : [];
      setTimeTotalSeconds(total);

      // ¿Yo tengo un timer activo?
      const mine = active.find((t) => Number(t.userId) === myUserId);
      if (mine) {
        setIsRunning(true);
        setMyStartAt(mine.startAt ? new Date(mine.startAt) : new Date());
      } else {
        setIsRunning(false);
        setMyStartAt(null);
      }
    } catch (e) {
      console.warn("[ViewTaskDetails] GET /timer fallo:", e?.response?.data || e?.message);
    }
  }, [myUserId]);

  // ==== FILES: API paths per taskId ====
  const fileAPI = useMemo(() => {
    const id = Number(effectiveId);
    return {
      list: API_PATHS?.TASK_FILES?.LIST?.(id) || `/api/tasks/${id}/files`,
      upload: API_PATHS?.TASK_FILES?.UPLOAD?.(id) || `/api/tasks/${id}/files`,
      download: (fileId) =>
        (API_PATHS?.TASK_FILES?.DOWNLOAD?.(id, fileId)) || `/api/tasks/${id}/files/${fileId}/download`,
      remove: (fileId) =>
        (API_PATHS?.TASK_FILES?.DELETE?.(id, fileId)) || `/api/tasks/${id}/files/${fileId}`,
    };
  }, [effectiveId]);

  // ==== FILES: permisos front (admin, creador o asignado) ====
  const amCreator = useMemo(
    () => (task ? Number(task?.createdBy) === myUserId : false),
    [task, myUserId]
  );
  const amAssignee = useMemo(() => {
    const ids = extractIds(task?.assignedTo);
    return ids.includes(myUserId);
  }, [task?.assignedTo, myUserId]);

  const canManageFiles = amAdmin || amCreator || amAssignee;

  // --- Cargar detalle de tarea
  const fetchTaskFiles = useCallback(async () => {
    try {
      setFilesLoading(true);
      const { data } = await axiosInstance.get(fileAPI.list);
      setFiles(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn("[ViewTaskDetails] GET files fallo:", e?.response?.data || e?.message);
      setFiles([]);
    } finally {
      setFilesLoading(false);
    }
  }, [fileAPI.list]);

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

      await fetchTimeSummary(Number(id));
      await fetchTaskFiles(); // ==== FILES: carga lista
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
  }, [fetchTimeSummary, fetchTaskFiles]); // ✅ incluir fetchTaskFiles

  // --- Resolución on-demand de avatares (sin /api/users) ---
  const fetchUserProfileImageById = useCallback(async (id) => {
    const cached = avatarCacheRef.current.get(String(id));
    if (cached !== undefined) return cached;

    const url =
      typeof API_PATHS?.USERS?.GET_USER_BY_ID === "function"
        ? API_PATHS.USERS.GET_USER_BY_ID(id)
        : `/api/users/${id}`;

    try {
      const res = await axiosInstance.get(url);
      const rawUser = res?.data?.user ?? res?.data ?? null;
      const user = normalizeUser(rawUser || {});
      const out = user.profileImageUrl || "";
      avatarCacheRef.current.set(String(id), out);
      return out;
    } catch (err) {
      console.warn("[ViewTaskDetails] No se pudo obtener usuario", id, err?.response?.data || err?.message);
      avatarCacheRef.current.set(String(id), "");
      return "";
    }
  }, []);

  const resolveAvatarsFromAssignedTo = useCallback(async (assignedTo) => {
    const list = Array.isArray(assignedTo) ? assignedTo : [];
    if (list.length === 0) {
      setAvatarUrls([]);
      return;
    }

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
        if (typeof a === "string" && /^https?:\/\//i.test(a)) return a;

        if (a && typeof a === "object") {
          const direct =
            a.profileImageUrl || a.avatar || a.photoURL || a.image || a.picture || "";
          if (direct) return direct;

          const idVal = a.id ?? a.user_id ?? a.uid ?? a.email ?? null;
          if (idVal != null) return fetchUserProfileImageById(idVal);

          return "";
        }

        return fetchUserProfileImageById(a);
      })
    );

    setAvatarUrls(urls.filter(Boolean));
  }, [fetchUserProfileImageById]);

  // --- Start/Stop handlers ---
  const handleStartTimer = useCallback(async () => {
    if (!task?.id) return;
    try {
      await axiosInstance.post(API_PATHS.TASKS.START_TASK_TIMER(task.id));
      setIsRunning(true);
      const now = new Date();
      setMyStartAt(now);
      await fetchTimeSummary(Number(task.id));
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message;
      console.warn("[ViewTaskDetails] start timer error:", msg);
      await fetchTimeSummary(Number(task.id));
    }
  }, [task?.id, fetchTimeSummary]);

  const handleStopTimer = useCallback(async () => {
    if (!task?.id) return;
    try {
      await axiosInstance.post(API_PATHS.TASKS.STOP_TASK_TIMER(task.id));
      setIsRunning(false);
      setMyStartAt(null);
      await fetchTimeSummary(Number(task.id));
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message;
      console.warn("[ViewTaskDetails] stop timer error:", msg);
      await fetchTimeSummary(Number(task.id));
    }
  }, [task?.id, fetchTimeSummary]);

  // ==== FILES: API calls ==== (firma sin taskId para evitar warning)
  const handleFileSelected = useCallback((e) => {
    const f = e?.target?.files?.[0];
    setSelectedFile(f || null);
    setUploadPct(0);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !task?.id) return;
    try {
      setUploading(true);
      setUploadPct(0);
      const form = new FormData();
      form.append("file", selectedFile);
      await axiosInstance.post(fileAPI.upload, form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (ev) => {
          if (!ev.total) return;
          setUploadPct(Math.round((ev.loaded * 100) / ev.total));
        },
      });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchTaskFiles();
    } catch (e) {
      console.warn("[ViewTaskDetails] UPLOAD fallo:", e?.response?.data || e?.message);
    } finally {
      setUploading(false);
      setUploadPct(0);
    }
  }, [selectedFile, task?.id, fileAPI.upload, fetchTaskFiles]);

  const handleDownload = useCallback(async (fileId, originalName = "archivo") => {
    try {
      const res = await axiosInstance.get(fileAPI.download(fileId), { responseType: "blob" });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = originalName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.warn("[ViewTaskDetails] DOWNLOAD fallo:", e?.response?.data || e?.message);
    }
  }, [fileAPI]);

  const handleDelete = useCallback(async (fileId) => {
    if (!fileId || !task?.id) return;
    const ok = window.confirm("¿Eliminar este archivo definitivamente?");
    if (!ok) return;
    try {
      await axiosInstance.delete(fileAPI.remove(fileId));
      await fetchTaskFiles();
    } catch (e) {
      console.warn("[ViewTaskDetails] DELETE fallo:", e?.response?.data || e?.message);
    }
  }, [task?.id, fileAPI, fetchTaskFiles]);

  /* ----------------- Effects ----------------- */
  useEffect(() => {
    getTaskDetailByID(effectiveId);
  }, [effectiveId, getTaskDetailByID]);

  useEffect(() => {
    resolveAvatarsFromAssignedTo(task?.assignedTo);
  }, [task?.assignedTo, resolveAvatarsFromAssignedTo]);

  // Ticker: suma en vivo mientras está corriendo
  useEffect(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (isRunning && myStartAt) {
      tickRef.current = setInterval(() => {
        const base = Number(timeTotalSeconds || 0);
        const delta = Math.floor((Date.now() - new Date(myStartAt).getTime()) / 1000);
        const merged = base + Math.max(0, delta);
        const el = document.getElementById("task-time-display");
        if (el) el.textContent = fmtHMS(merged);
      }, 1000);
    } else {
      const el = document.getElementById("task-time-display");
      if (el) el.textContent = fmtHMS(timeTotalSeconds);
    }
    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [isRunning, myStartAt, timeTotalSeconds]);

  useEffect(() => {
    if (!isRunning) {
      const el = document.getElementById("task-time-display");
      if (el) el.textContent = fmtHMS(timeTotalSeconds);
    }
  }, [timeTotalSeconds, isRunning]);

  return (
    <DashboardLayout activeMenu="My Tasks">
      <div className="mt-5">
        {!effectiveId && (
          <div className="mb-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded p-2
                          dark:text-rose-300 dark:bg-rose-900/20 dark:border-rose-800/60">
            Falta el parámetro <code>:id</code> en la URL o <code>taskId</code> en{" "}
            <code>state</code>/<code>query</code>.
          </div>
        )}

        {loadingTask ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">Cargando…</div>
        ) : taskErr ? (
          <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded p-2
                          dark:text-rose-300 dark:bg-rose-900/20 dark:border-rose-800/60">
            {taskErr}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 mt-4 gap-4">
            {task && (
              <>
                {/* Columna principal */}
                <div className="form-card col-span-3 p-4 bg-white rounded-lg border border-slate-200
                                dark:bg-slate-900 dark:border-slate-800 dark:shadow-slate-950/40">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl md:text-xl font-medium text-slate-900 dark:text-slate-100">
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
                    <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                      {task.description}
                    </p>
                  )}

                  {/* Checklist */}
                  <div className="mt-6">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
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
                              disabled={!isRunning && !amAdmin && !amCreator}
                              onChange={() => {
                                if (!isRunning && !amAdmin && !amCreator) {
                                  alert("Debes iniciar el temporizador antes de editar.");
                                  return;
                                }
                                updateTodoChecklist(index);
                              }}
                            />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                        Sin items en el checklist.
                      </p>
                    )}
                  </div>

                  {/* Adjuntos (strings/URLs) */}
                  {Array.isArray(task?.attachments) && task.attachments.length > 0 && (
                    <div className="mt-6">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
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
                              className="text-left text-sm p-2 rounded border border-slate-200 hover:bg-slate-50
                                         bg-white text-slate-700
                                         dark:bg-slate-900 dark:text-slate-200
                                         dark:border-slate-700 dark:hover:bg-slate-800/60"
                              title={name}
                            >
                              📎 {name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ==== FILES: Archivos por tarea (binarios en backend) ==== */}
                  <div className="mt-6">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Archivos
                    </label>

                    {/* Uploader */}
                    {canManageFiles && (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          onChange={handleFileSelected}
                          className="block w-full text-sm text-slate-700 dark:text-slate-200
                                     file:mr-2 file:py-1.5 file:px-3 file:rounded-md
                                     file:border file:border-slate-300
                                     file:text-sm file:font-medium
                                     file:bg-white file:text-slate-700
                                     hover:file:bg-slate-50
                                     dark:file:bg-slate-800 dark:file:text-slate-200 dark:file:border-slate-700"
                        />
                        <button
                          type="button"
                          onClick={handleUpload}
                          disabled={!selectedFile || uploading}
                          className="px-3 py-1.5 rounded-md text-sm font-medium border border-violet-300 text-violet-700 bg-violet-50 hover:bg-violet-100
                                     disabled:opacity-60 disabled:cursor-not-allowed
                                     dark:border-violet-800 dark:text-violet-300 dark:bg-violet-900/20 dark:hover:bg-violet-900/30"
                        >
                          {uploading ? `Subiendo… ${uploadPct}%` : "Subir"}
                        </button>
                      </div>
                    )}

                    {/* Listado */}
                    <div className="mt-3">
                      {filesLoading ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Cargando archivos…</p>
                      ) : files.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Sin archivos.</p>
                      ) : (
                        <ul className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-md">
                          {files.map((f) => (
                            <li key={f.id} className="p-2 flex items-center justify-between">
                              <div className="min-w-0">
                                <p className="text-sm text-slate-800 dark:text-slate-100 truncate">
                                  {f.originalName}
                                </p>
                                <p className="text-[12px] text-slate-500 dark:text-slate-400">
                                  {f.mimeType || "—"} • {fmtBytes(f.sizeBytes)} • {new Date(f.createdAt).toLocaleString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleDownload(f.id, f.originalName)}
                                  className="px-2 py-1 text-sm rounded border border-slate-300 hover:bg-slate-50
                                             dark:border-slate-700 dark:hover:bg-slate-800/60"
                                  title="Descargar"
                                >
                                  ⬇️
                                </button>
                                {canManageFiles && (
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(f.id)}
                                    className="px-2 py-1 text-sm rounded border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100
                                               dark:border-rose-800 dark:text-rose-300 dark:bg-rose-900/20 dark:hover:bg-rose-900/30"
                                    title="Eliminar"
                                  >
                                    🗑
                                  </button>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  {/* ==== /FILES ==== */}
                </div>

                {/* Columna lateral */}
                <div className="p-4 bg-white rounded-lg border border-slate-200
                                dark:bg-slate-900 dark:border-slate-800">
                  <InfoBox label="Descripción" value={task?.description || "—"} />
                  <InfoBox label="Prioridad" value={task?.priority || "—"} />
                  <InfoBox
                    label="Fecha de Vencimiento"
                    value={
                      task?.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"
                    }
                  />
                  <InfoBox label="Progreso" value={`${task?.progress ?? 0}%`} />

                  {/* Assigned To */}
                  <div className="mt-4">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Assigned To
                    </label>
                    <div className="mt-2">
                      {avatarUrls.length ? (
                        <AvatarGroup avatars={avatarUrls} maxVisible={5} />
                      ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400">—</p>
                      )}
                    </div>
                  </div>

                  {/* Time Tracking */}
                  <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-4">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Tiempo invertido
                    </label>
                    <div className="mt-2 flex items-center justify-between">
                      <div
                        id="task-time-display"
                        className="text-lg font-mono text-slate-900 dark:text-slate-100"
                        title="Tiempo total (hh:mm:ss)"
                      >
                        {fmtHMS(timeTotalSeconds)}
                      </div>
                      <div className="flex items-center gap-2">
                        {isRunning ? (
                          <button
                            type="button"
                            onClick={handleStopTimer}
                            className="px-3 py-1.5 rounded-md text-sm font-medium border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100
                                       dark:border-rose-800 dark:text-rose-300 dark:bg-rose-900/20 dark:hover:bg-rose-900/30"
                            title="Detener mi temporizador"
                          >
                            ⏹ Detener
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleStartTimer}
                            className="px-3 py-1.5 rounded-md text-sm font-medium border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100
                                       dark:border-emerald-800 dark:text-emerald-300 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30"
                            title="Iniciar mi temporizador"
                          >
                            ▶️ Iniciar
                          </button>
                        )}
                      </div>
                    </div>
                    {!isRunning && !amAdmin && !amCreator && (
                      <p className="mt-2 text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1
                                  dark:text-amber-300 dark:bg-amber-900/20 dark:border-amber-800/60">
                        Para editar esta tarea debes iniciar tu temporizador.
                      </p>
                    )}
                    {isRunning && myStartAt && (
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        Corriendo desde {new Date(myStartAt).toLocaleTimeString()}
                      </p>
                    )}
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

    const prevItems = task.todoChecklist.map((it) => ({ ...it }));
    const prevDerived = deriveStatusAndProgress(prevItems);

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
    <span className="font-medium text-slate-800 dark:text-slate-100">{label}:</span>{" "}
    <span className="text-slate-600 dark:text-slate-300">{value}</span>
  </div>
);

const TodoCheckList = ({ text, isChecked, onChange, disabled }) => (
  <div
    className={`flex items-center gap-3 p-2 border border-slate-200 rounded
                bg-white dark:bg-slate-900 dark:border-slate-700
                ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
  >
    <input
      type="checkbox"
      checked={isChecked}
      onChange={disabled ? undefined : onChange}
      disabled={disabled}
      className="w-4 h-4 accent-blue-600 dark:accent-blue-500"
    />
    <p
      className={`text-[13px] ${
        isChecked
          ? "line-through text-slate-400 dark:text-slate-500"
          : "text-gray-800 dark:text-slate-100"
      }`}
    >
      {text}
    </p>
  </div>
);
