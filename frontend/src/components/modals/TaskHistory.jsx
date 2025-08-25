// src/components/modals/TaskHistory.jsx
import React, { useEffect, useRef, useState } from "react";
import { LuHistory, LuClock, LuX, LuChevronDown } from "react-icons/lu";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";

const DEFAULT_PAGE_SIZE = 20;

/**
 * Modal de historial de tarea (ligero y completo, con nombres de actor y detalles en listas)
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - taskId: number (requerido)
 *  - pageSize?: number (default 20)
 *  - resolveActorName?: (id) => string   (opcional, override)
 */
const TaskHistory = ({
  open,
  onClose,
  taskId,
  pageSize = DEFAULT_PAGE_SIZE,
  resolveActorName,
}) => {
  const [items, setItems] = useState([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // caché de nombres de usuario por id
  const [userCache, setUserCache] = useState({});

  const panelRef = useRef(null);

  // Lock scroll + ESC
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus?.();
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Reset al abrir / cambiar taskId
  useEffect(() => {
    if (!open || !Number.isFinite(taskId)) return;
    setItems([]);
    setOffset(0);
    setHasMore(true);
    setErrorMsg("");
  }, [open, taskId]);

  // Carga páginas
  useEffect(() => {
    if (!open || !Number.isFinite(taskId) || !hasMore) return;
    fetchMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, taskId, offset, hasMore]);

  const fetchMore = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const { data } = await axiosInstance.get(
        API_PATHS.TASKS.GET_TASK_HISTORY(taskId),
        { params: { limit: pageSize, offset } }
      );
      const batch = Array.isArray(data?.history) ? data.history : [];
      batch.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const merged = dedupBySignature([...items, ...batch]);
      setItems(merged);
      if (batch.length < pageSize) setHasMore(false);
    } catch (e) {
      setErrorMsg(e?.response?.data?.message || "No se pudo cargar el historial.");
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  // Resolver nombres de actores faltantes con USER.GET_USER_ID
  useEffect(() => {
    if (!open || items.length === 0) return;
    const unknown = [
      ...new Set(
        items
          .map((it) => Number(it.actorId))
          .filter((id) => Number.isFinite(id) && !userCache[id])
      ),
    ];
    if (unknown.length) {
      fetchActorNames(unknown, setUserCache);
    }
  }, [open, items]); // userCache se actualiza dentro del fetch

  const handleLoadMore = () => {
    if (!loading && hasMore) setOffset((o) => o + pageSize);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onMouseDown={handleOverlayClick}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-history-title"
        tabIndex={-1}
        className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800">
            <LuHistory className="text-slate-700 dark:text-slate-200" />
          </div>
          <h3 id="task-history-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Historial de la tarea
          </h3>
          <span className="ml-2 text-[11px] text-slate-500 dark:text-slate-400">
            {items.length} evento{items.length === 1 ? "" : "s"}
          </span>
          <button
            aria-label="Cerrar"
            onClick={onClose}
            className="ml-auto inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <LuX className="text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto">
          {!loading && items.length === 0 && !errorMsg && (
            <div className="px-4 py-6 text-xs text-slate-500 dark:text-slate-400">Sin movimientos.</div>
          )}
          {errorMsg && (
            <div className="px-4 py-4 text-xs text-rose-600 dark:text-rose-400">{errorMsg}</div>
          )}

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {items.map((it) => (
              <HistoryRow
                key={historySignature(it)} // ✅ key única y estable
                item={it}
                userName={
                  userCache[Number(it.actorId)] ??
                  (typeof resolveActorName === "function" ? resolveActorName(it.actorId) : undefined)
                }
              />
            ))}

            {loading && (
              <div className="px-4 py-4">
                <SkeletonLine />
                <div className="mt-2 w-2/3">
                  <SkeletonLine />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {hasMore ? "Mostrando recientes" : "Fin del historial"}
          </span>
          <div className="flex items-center gap-2">
            {hasMore && (
              <button
                type="button"
                onClick={handleLoadMore}
                className="text-[12px] font-medium px-2.5 py-1.5 rounded-md
                           bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700
                           text-slate-900 dark:text-slate-100 disabled:opacity-60"
                disabled={loading}
              >
                {loading ? "Cargando…" : "Ver más"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-[12px] px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700
                         hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskHistory;

/* ---------- Row ---------- */

const HistoryRow = ({ item, userName }) => {
  const [showDetails, setShowDetails] = useState(false);

  const meta = META[item.action] ?? {
    label: item.action,
    badge:
      "ring-slate-200 bg-slate-100 text-slate-700 dark:ring-slate-700 dark:bg-slate-800 dark:text-slate-200",
  };

  const d = new Date(item.createdAt);
  const whenAbs = isNaN(d) ? String(item.createdAt ?? "") : d.toLocaleString();
  const whenRel = isNaN(d) ? "" : relativeTimeFrom(d);

  // Actor: usa nombre si lo tenemos; si no, actorId
  const actor =
    userName ||
    item.actorName ||
    (item.actorId != null ? `Usuario #${item.actorId}` : "—");

  // diff resumido (máx 3)
  const diffEntries = Object.entries(safeParseMaybeJson(item?.diff) || {});
  const top = diffEntries.slice(0, 3);
  const extra = Math.max(0, diffEntries.length - top.length);

  // Datos del checklist cuando la acción es todo_*
  const isChecklist = item?.action?.startsWith("todo_");
  const newObj = safeParseMaybeJson(item?.new);
  const oldObj = safeParseMaybeJson(item?.old);
  const metaObj = safeParseMaybeJson(item?.meta);

  const checklistItemId = newObj?.id ?? oldObj?.id ?? metaObj?.id ?? null;
  const checklistItemText = newObj?.text ?? oldObj?.text ?? null;

  return (
    <div className="px-4 py-3 text-xs">
      {/* Línea superior con ID del evento */}
      <div className="flex items-start gap-2">
        <span
          className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full ring-1 text-[11px] ${meta.badge}`}
          title={item.action}
        >
          {meta.label}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-600 dark:text-slate-300">
            {/* ID del evento */}
            <span className="inline-flex items-center gap-1 font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 text-slate-700 dark:text-slate-200">
              id: {String(item?.id ?? "—")}
            </span>

            {/* Time */}
            <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <LuClock /> <span title={whenAbs}>{whenRel || whenAbs}</span>
            </span>

            {/* Actor */}
            <span>•</span>
            <span>Usuario: {String(actor)}</span>
          </div>

          {/* Info del checklist (si aplica) */}
          {isChecklist && (checklistItemId || checklistItemText) && (
            <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
              Tarea #{checklistItemId ?? "—"}
              {checklistItemText ? (
                <>
                  {" "}
                  — <em className="text-slate-800 dark:text-slate-100">{String(checklistItemText)}</em>
                </>
              ) : null}
            </div>
          )}

          {/* Diff resumido arriba (3 campos máx) */}
          {top.length > 0 && (
            <div className="mt-1 grid gap-1">
              {top.map(([field, ch]) => (
                <div
                  key={field}
                  className="rounded-md border border-slate-200 dark:border-slate-800 px-2 py-1 text-[11px] text-slate-700 dark:text-slate-200"
                >
                  <span className="font-medium">{prettyField(field)}:</span>{" "}
                  <span className="opacity-70 line-through">{renderVal(field, ch?.from)}</span>{" "}
                  <span className="opacity-50">→</span>{" "}
                  <span>{renderVal(field, ch?.to)}</span>
                </div>
              ))}
              {extra > 0 && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  +{extra} cambio{extra === 1 ? "" : "s"} más
                </div>
              )}
            </div>
          )}

          {/* Duración de timer */}
          {item.action === "timer_stopped" && metaObj?.seconds != null && (
            <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
              Tiempo: <strong>{formatDuration(metaObj.seconds)}</strong>
            </div>
          )}

          {/* Botón Detalles (listas ordenadas) */}
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="mt-2 inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60"
            aria-expanded={showDetails}
          >
            <LuChevronDown className={`transition-transform ${showDetails ? "rotate-180" : ""}`} />
            {showDetails ? "Ocultar detalles" : "Ver detalles"}
          </button>

          {showDetails && (
            <div className="mt-2 space-y-2">
              {/* Cambios: diff completo (id/taskId/sortOrder ocultos) */}
              <DetailsSection title="Cambios">
                <DiffList value={omitHiddenKeys(safeParseMaybeJson(item?.diff))} />
              </DetailsSection>

              {/* Nuevo / Anterior / Meta como listas recursivas (id/taskId/sortOrder ocultos) */}
              <DetailsSection title="Nuevo">
                <KeyValueList value={omitHiddenKeys(newObj)} />
              </DetailsSection>

              <DetailsSection title="Anterior">
                <KeyValueList value={omitHiddenKeys(oldObj)} />
              </DetailsSection>

              <DetailsSection title="Meta">
                <KeyValueList value={omitHiddenKeys(metaObj)} />
              </DetailsSection>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------- Meta mínima ---------- */

const META = {
  created: { label: "Creada", badge: "ring-emerald-200 bg-emerald-50 text-emerald-700 dark:ring-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200" },
  updated: { label: "Actualizada", badge: "ring-blue-200 bg-blue-50 text-blue-700 dark:ring-blue-800 dark:bg-blue-900/30 dark:text-blue-200" },
  deleted: { label: "Eliminada", badge: "ring-rose-200 bg-rose-50 text-rose-700 dark:ring-rose-800 dark:bg-rose-900/30 dark:text-rose-200" },
  todo_added: { label: "Checklist (+)", badge: "ring-indigo-200 bg-indigo-50 text-indigo-700 dark:ring-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200" },
  todo_updated: { label: "Checklist (✎)", badge: "ring-indigo-200 bg-indigo-50 text-indigo-700 dark:ring-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200" },
  todo_deleted: { label: "Checklist (×)", badge: "ring-indigo-200 bg-indigo-50 text-indigo-700 dark:ring-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200" },
  timer_started: { label: "Timer ▶", badge: "ring-amber-200 bg-amber-50 text-amber-700 dark:ring-amber-800 dark:bg-amber-900/30 dark:text-amber-200" },
  timer_stopped: { label: "Timer ⏸", badge: "ring-amber-200 bg-amber-50 text-amber-700 dark:ring-amber-800 dark:bg-amber-900/30 dark:text-amber-200" },
};

/* ---------- Helpers visuales de detalles ---------- */

const DetailsSection = ({ title, children }) => (
  <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
    <div className="px-2 py-1 text-[10px] font-semibold bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wide">
      {title}
    </div>
    <div className="px-3 py-2">{children}</div>
  </div>
);

/** Lista de cambios (diff) */
const DiffList = ({ value }) => {
  const obj = safeParseMaybeJson(value);
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return <p className="text-[11px] text-slate-500">—</p>;
  }
  const filtered = omitHiddenKeys(obj);
  if (!filtered || Object.keys(filtered).length === 0) {
    return <p className="text-[11px] text-slate-500">—</p>;
  }
  return (
    <ol className="list-decimal ml-5 space-y-1">
      {entriesSorted(filtered).map(([k, v], idx) => (
        <li key={`${k}-${idx}`} className="text-[11px]">
          <DiffEntry field={k} node={v} />
        </li>
      ))}
    </ol>
  );
};

const DiffEntry = ({ field, node }) => {
  // Caso típico: { from, to }
  if (node && typeof node === "object" && ("from" in node || "to" in node)) {
    return (
      <>
        <span className="font-medium">{prettyField(field)}:</span>{" "}
        <span className="opacity-70 line-through">{renderVal(field, node.from)}</span>{" "}
        <span className="opacity-50">→</span>{" "}
        <span>{renderVal(field, node.to)}</span>
      </>
    );
  }
  // Si viene un objeto anidado, recorrerlo
  if (node && typeof node === "object" && !Array.isArray(node)) {
    const child = omitHiddenKeys(node);
    if (!child || Object.keys(child).length === 0) {
      return (
        <>
          <span className="font-medium">{prettyField(field)}:</span> <span>—</span>
        </>
      );
    }
    return (
      <>
        <span className="font-medium">{prettyField(field)}</span>
        <ol className="list-decimal ml-5 mt-1 space-y-1">
          {entriesSorted(child).map(([k, v], i) => (
            <li key={`${k}-${i}`} className="text-[11px]">
              <DiffEntry field={k} node={v} />
            </li>
          ))}
        </ol>
      </>
    );
  }
  // Primitivos / arrays
  return (
    <>
      <span className="font-medium">{prettyField(field)}:</span>{" "}
      <span>{renderVal(field, node)}</span>
    </>
  );
};

/** KeyValueList: renderiza objetos/arrays/primitivos como <ol> recursiva */
const KeyValueList = ({ value }) => {
  const base = safeParseMaybeJson(value);
  const v = omitHiddenKeys(base);

  if (
    v == null ||
    (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0)
  ) {
    return <p className="text-[11px] text-slate-500">—</p>;
  }

  if (Array.isArray(v)) {
    if (v.length === 0) return <p className="text-[11px] text-slate-500">[]</p>;
    return (
      <ol className="list-decimal ml-5 space-y-1">
        {v.map((item, idx) => (
          <li key={idx} className="text-[11px]">
            {typeof item === "object" && item !== null ? (
              <KeyValueList value={omitHiddenKeys(item)} />
            ) : (
              <span>{renderVal("", item)}</span>
            )}
          </li>
        ))}
      </ol>
    );
  }

  if (typeof v === "object") {
    return (
      <ol className="list-decimal ml-5 space-y-1">
        {entriesSorted(v).map(([k, val], idx) => (
          <li key={`${k}-${idx}`} className="text-[11px]">
            {typeof val === "object" && val !== null ? (
              <>
                <span className="font-medium">{prettyField(k)}</span>
                <KeyValueList value={omitHiddenKeys(val)} />
              </>
            ) : (
              <>
                <span className="font-medium">{prettyField(k)}:</span>{" "}
                <span>{renderVal(k, val)}</span>
              </>
            )}
          </li>
        ))}
      </ol>
    );
  }

  // Primitivo
  return <p className="text-[11px]">{renderVal("", v)}</p>;
};

/* ---------- Helpers de datos ---------- */

// Campos a ocultar SOLO en "Ver detalles"
const HIDDEN_DETAIL_FIELDS = new Set(["id", "taskId", "sortOrder"]);

function omitHiddenKeys(input) {
  if (!input || typeof input !== "object") return input;
  if (Array.isArray(input)) {
    return input.map((x) => (typeof x === "object" ? omitHiddenKeys(x) : x));
  }
  const out = {};
  for (const [k, v] of Object.entries(input)) {
    if (HIDDEN_DETAIL_FIELDS.has(k)) continue;
    out[k] =
      v && typeof v === "object" ? omitHiddenKeys(v) : v;
  }
  return out;
}

// Firma estable para keys y deduplicación
function historySignature(it) {
  const ts = it?.createdAt ? new Date(it.createdAt).getTime() : "nodate";
  const diffSig = safeJson(it?.diff || {});
  const metaSig = safeJson(it?.meta || {});
  return [
    it?.id ?? "noid",
    ts,
    it?.action ?? "noact",
    it?.actorId ?? "noactor",
    it?.entity ?? "noent",
    it?.entityId ?? "noentid",
    diffSig,
    metaSig,
  ].join("|");
}

function dedupBySignature(arr) {
  const seen = new Set();
  const out = [];
  for (const it of arr) {
    const sig = historySignature(it);
    if (!seen.has(sig)) {
      seen.add(sig);
      out.push(it);
    }
  }
  return out;
}

const SkeletonLine = () => (
  <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
);

function entriesSorted(obj) {
  // Ordena mostrando primero campos comunes, luego alfabético
  const priority = [
    "title",
    "text",
    "status",
    "completed",
    "priority",
    "progress",
    "dueDate",
    "assignedTo",
    "attachments",
    "entity",
    "entityId",
    "actorId",
  ];
  const keys = Object.keys(obj);
  const score = (k) => {
    const idx = priority.indexOf(k);
    return idx === -1 ? 1000 + k.localeCompare(k) : idx;
  };
  return keys
    .sort((a, b) => score(a) - score(b) || a.localeCompare(b))
    .map((k) => [k, obj[k]]);
}

function prettyField(f) {
  const map = {
    dueDate: "Fecha límite",
    assignedTo: "Asignados",
    createdBy: "Creador",
    attachments: "Adjuntos",
    progress: "Progreso",
    status: "Estado",
    priority: "Prioridad",
    title: "Título",
    description: "Descripción",
    // checklist / comunes (OJO: id/taskId/sortOrder se ocultan solo en detalles)
    text: "Texto",
    taskId: "ID de tarea",
    completed: "Completado",
    sortOrder: "Orden",
    entity: "Entidad",
    entityId: "ID Entidad",
    actorId: "ID Actor",
  };
  return map[f] || f;
}

function renderVal(field, v) {
  if (v == null) return "—";

  // completed puede venir como 0/1 o boolean
  if (field === "completed") {
    const b = typeof v === "boolean" ? v : Number(v) === 1;
    return b ? "Sí" : "No";
  }

  if (typeof v === "boolean") return v ? "Sí" : "No";

  if (Array.isArray(v)) {
    if (v.every((x) => typeof x !== "object")) {
      // array plano
      return v.join(", ");
    }
    // array de objetos: indicar cantidad
    return `[${v.length} ítems]`;
  }
  if (typeof v === "object") {
    // objeto: mostrar descripción corta
    const s = JSON.stringify(v);
    return s.length > 80 ? s.slice(0, 79) + "…" : s;
  }
  if (field === "dueDate") {
    const d = new Date(v);
    return isNaN(d) ? String(v) : d.toLocaleDateString();
  }
  const s = String(v);
  return s.length > 120 ? s.slice(0, 119) + "…" : s;
}

function formatDuration(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h ? `${h}h ` : ""}${m ? `${m}m ` : ""}${sec}s`.trim();
}

function relativeTimeFrom(date) {
  const now = new Date();
  const diff = Math.floor((date - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}

function safeJson(obj) {
  try {
    return JSON.stringify(obj);
  } catch {
    return "";
  }
}

function safeParseMaybeJson(v) {
  if (typeof v !== "string") return v;
  const t = v.trim();
  if (!t) return v;
  if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
    try {
      return JSON.parse(t);
    } catch {
      return v;
    }
  }
  return v;
}

/* ---------- Fetch de nombres ---------- */

async function fetchActorNames(ids, setUserCache) {
  const results = {};
  await Promise.allSettled(
    ids.map(async (id) => {
      // Preferido: USER.GET_USER_ID
      try {
        const { data } = await axiosInstance.get(API_PATHS?.USER?.GET_USER_ID?.(id));
        const name =
          data?.name ||
          data?.user?.name ||
          [data?.firstName, data?.lastName].filter(Boolean).join(" ") ||
          data?.email ||
          `Usuario #${id}`;
        results[id] = name;
        return;
      } catch {
        // Fallback: /users/:id
        try {
          const { data } = await axiosInstance.get(
            API_PATHS?.USERS?.GET_USER_BY_ID?.(id)
          );
          const name =
            data?.name ||
            data?.user?.name ||
            [data?.firstName, data?.lastName].filter(Boolean).join(" ") ||
            data?.email ||
            `Usuario #${id}`;
          results[id] = name;
        } catch {
          results[id] = `Usuario #${id}`;
        }
      }
    })
  );
  setUserCache((prev) => ({ ...prev, ...results }));
}
