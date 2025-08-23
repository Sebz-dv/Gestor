import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Progress from "../Progress";
import AvatarGroup from "../AvatarGroup";
import { LuPaperclip } from "react-icons/lu";
import moment from "moment";
import "moment/locale/es";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS, BASE_URL } from "../../utils/apiPaths";

moment.locale("es");

const safeFormat = (dateStr) => {
  const m = moment(dateStr);
  return m.isValid() ? m.format("D [de] MMM YYYY") : "—";
};

const isTrue = (v) => v === true || v === 1 || v === "1" || v === "true";

// Traducciones visibles (no toco los valores crudos que llegan del backend)
const STATUS_ES = { Pending: "Pendiente", "In Progress": "En progreso", Completed: "Completada" };
const PRIORITY_ES = { Low: "Baja", Medium: "Media", High: "Alta" };

// ====== Helpers Avatares ======
const toArray = (x) => (Array.isArray(x) ? x : x == null ? [] : [x]);

const toAbsoluteUrl = (u) => {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/")) return `${BASE_URL}${u}`;
  if (u.startsWith("uploads/") || u.startsWith("static/")) return `${BASE_URL}/${u}`;
  return u; // última opción: ya viene usable
};

const normalizeUser = (u = {}) => ({
  id: u.id ?? u.user_id ?? u.uid ?? u.email ?? null,
  profileImageUrl: u.avatar ?? u.photoURL ?? u.profileImageUrl ?? u.image ?? u.picture ?? "",
});

// Cache compartida por instancia para no re-pedir el mismo user/id
const avatarCache = new Map(); // key => url(string) | "" (miss)

/**
 * Resuelve una entrada a URL:
 * - string URL directa
 * - objeto con profileImageUrl
 * - id (number/string) -> GET /api/users/:id -> profileImageUrl
 */
const useAvatarUrls = (assignedTo) => {
  const [urls, setUrls] = useState([]);
  const abortRef = useRef(new AbortController());

  const list = useMemo(() => {
    // dedup básico
    const raw = toArray(assignedTo);
    const seen = new Set();
    const unique = [];
    for (const a of raw) {
      const key =
        typeof a === "object" && a
          ? String(a.id ?? a.user_id ?? a.uid ?? a.email ?? JSON.stringify(a))
          : String(a);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(a);
      }
    }
    return unique;
  }, [assignedTo]);

  const fetchById = useCallback(async (id) => {
    const cacheKey = `id:${id}`;
    if (avatarCache.has(cacheKey)) return avatarCache.get(cacheKey);

    const url =
      typeof API_PATHS?.USERS?.GET_USER_BY_ID === "function"
        ? API_PATHS.USERS.GET_USER_BY_ID(id)
        : `/api/users/${id}`;

    try {
      const { data } = await axiosInstance.get(url, { signal: abortRef.current.signal });
      const user = normalizeUser(data?.user ?? data ?? {});
      const out = toAbsoluteUrl(user.profileImageUrl || "");
      avatarCache.set(cacheKey, out);
      return out;
    } catch {
      avatarCache.set(cacheKey, "");
      return "";
    }
  }, []);

  useEffect(() => {
    abortRef.current = new AbortController();

    (async () => {
      const results = await Promise.all(
        list.map(async (a) => {
          // string URL directa
          if (typeof a === "string") {
            if (/^https?:\/\//i.test(a)) return a;
            // Si viene algo tipo "/uploads/xxx" o "uploads/xxx"
            return toAbsoluteUrl(a);
          }

          // objeto con url directa
          if (a && typeof a === "object") {
            const direct =
              a.profileImageUrl || a.avatar || a.photoURL || a.image || a.picture || "";
            if (direct) return toAbsoluteUrl(direct);

            // objeto con id
            const idVal = a.id ?? a.user_id ?? a.uid ?? a.email ?? null;
            if (idVal != null) return fetchById(idVal);

            return "";
          }

          // número/otro -> tratar como id
          return fetchById(a);
        })
      );

      setUrls(results.filter(Boolean));
    })();

    return () => abortRef.current.abort();
  }, [list, fetchById]);

  return urls;
};

const TaskCard = ({
  title,
  description,
  priority,
  status,
  progress,
  createdAt,
  dueDate,
  assignedTo,       // puede ser IDs, objetos o URLs
  attachmentCount,
  completedTodoCount, // puede venir del backend
  todoChecklist,      // fallback si no viene el conteo
  todoTotalCount,     // total desde el backend (ideal)
  onClick,
}) => {
  // ========= Avatares resueltos =========
  const avatarUrls = useAvatarUrls(assignedTo);

  // ========= Colores etiquetas =========
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

  // ========= Hechas / Total (con fallback y coherencia) =========
  const completedTodos =
    typeof completedTodoCount === "number" && !Number.isNaN(completedTodoCount)
      ? completedTodoCount
      : Array.isArray(todoChecklist)
      ? todoChecklist.filter((i) => isTrue(i?.completed)).length
      : 0;

  const totalDerivado = Array.isArray(todoChecklist) ? todoChecklist.length : 0;
  const totalRaw =
    typeof todoTotalCount === "number" && !Number.isNaN(todoTotalCount)
      ? todoTotalCount
      : totalDerivado;

  const totalTodos = Math.max(totalRaw, completedTodos);

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 backdrop-blur p-4 shadow-sm hover:shadow-md dark:shadow-slate-950/40  transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-[11px] font-medium px-3 py-0.5 rounded ${getStatusTagColor()}`}>
          {STATUS_ES[status] ?? status ?? "—"}
        </span>
        <span className={`text-[11px] font-medium px-3 py-0.5 rounded ${getPriorityTagColor()}`}>
          {PRIORITY_ES[priority] ?? priority ?? "—"} • Prioridad
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
          Hechas:{" "}
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {Number(completedTodos)} / {Number(totalTodos)}
          </span>
        </p>

        <Progress progress={progress} status={status} />
      </div>

      <div className="flex items-center justify-between">
        <AvatarGroup avatars={avatarUrls} maxVisible={5} />
        {Number(attachmentCount) > 0 && (
          <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400" title="Adjuntos">
            <LuPaperclip className="text-base" />
            <span>{Number(attachmentCount)}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm mt-3">
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400">Creada</label>
          <p className="text-slate-800 dark:text-slate-200">{safeFormat(createdAt)}</p>
        </div>
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400">Vence</label>
          <p className="text-slate-800 dark:text-slate-200">{safeFormat(dueDate)}</p>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
