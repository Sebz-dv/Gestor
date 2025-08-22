import React, { useMemo, useState } from "react";

/** Avatar con fallback a iniciales, respetando `size` */
const Avatar = ({ name = "—", src, size = 48 }) => {
  const [broken, setBroken] = useState(false);
  const initials = useMemo(() => {
    const clean = String(name || "—").trim();
    const parts = clean.split(/\s+/);
    const a = parts[0]?.[0] || "";
    const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (a + b).slice(0, 2).toUpperCase();
  }, [name]);

  const showImg = Boolean(src) && !broken;
  const commonStyle = { width: size, height: size };

  if (showImg) {
    return (
      <img
        src={src}
        alt={`Avatar de ${name}`}
        className="rounded-full object-cover ring-2 ring-white dark:ring-slate-900 shrink-0"
        style={commonStyle}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <div
      className="rounded-full grid place-items-center ring-2 ring-white dark:ring-slate-900 shrink-0
                 bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700
                 dark:from-slate-700 dark:to-slate-800 dark:text-slate-200
                 text-sm font-semibold select-none"
      aria-label={`Iniciales de ${name}`}
      style={commonStyle}
    >
      {initials || "—"}
    </div>
  );
};

const StatCard = ({ label, value = 0, status = "default" }) => {
  const styles = {
    Pending:
      "text-amber-700 bg-amber-50 ring-1 ring-amber-100 dark:text-amber-300 dark:bg-amber-900/30 dark:ring-amber-800/60",
    "In Progress":
      "text-sky-700 bg-sky-50 ring-1 ring-sky-100 dark:text-sky-300 dark:bg-sky-900/30 dark:ring-sky-800/60",
    Completed:
      "text-emerald-700 bg-emerald-50 ring-1 ring-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/30 dark:ring-emerald-800/60",
    Overdue:
      "text-rose-700 bg-rose-50 ring-1 ring-rose-100 dark:text-rose-300 dark:bg-rose-900/30 dark:ring-rose-800/60",
    default:
      "text-slate-700 bg-slate-50 ring-1 ring-slate-100 dark:text-slate-300 dark:bg-slate-800/40 dark:ring-slate-700",
  };
  const cls = styles[status] || styles.default;
  const num = Number.isFinite(+value) ? +value : 0;
  const nf = useMemo(() => new Intl.NumberFormat("es-CO"), []);

  return (
    <div className={`flex-1 rounded-xl p-3 ${cls}`}>
      <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full
                       bg-white/70 dark:bg-white/10 dark:text-inherit">
        {status}
      </span>
      <p className="text-xl font-bold leading-tight mt-1 text-slate-900 dark:text-slate-100">
        {nf.format(num)}
      </p>
      <p className="text-xs opacity-70 text-slate-700 dark:text-slate-300">{label}</p>
    </div>
  );
};

// ---- Helper: lee conteos sin importar cómo vengan del backend ----
const toInt = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const extractCounts = (u = {}) => {
  const pending =
    u.pendingTasks ?? u.pending ?? u.stats?.pending ?? u.tasks?.pending ?? 0;
  const inProgress =
    u.inProgressTasks ??
    u.in_progress ??
    u.stats?.inProgress ??
    u.tasks?.in_progress ??
    0;
  const completed =
    u.completedTasks ??
    u.completed ??
    u.stats?.completed ??
    u.tasks?.completed ??
    0;
  const overdue =
    u.overdueTasks ?? u.overdue ?? u.stats?.overdue ?? u.tasks?.overdue ?? 0;

  return {
    pending: toInt(pending),
    inProgress: toInt(inProgress),
    completed: toInt(completed),
    overdue: toInt(overdue),
  };
};

const UserCard = ({ userInfo = {} }) => {
  const name = userInfo?.name || "—";
  const email = userInfo?.email || "—";
  const avatarUrl = userInfo?.profileImageUrl;

  const counts = useMemo(() => extractCounts(userInfo), [userInfo]);

  return (
    <div className="user-card p-3 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow
                    dark:border-slate-800 dark:bg-slate-900 dark:shadow-slate-950/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={name} src={avatarUrl} size={48} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate" title={name}>
              {name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate" title={email}>
              {email}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-stretch gap-3 mt-5">
        <StatCard label="Pending"     value={counts.pending}    status="Pending" />
        <StatCard label="In Progress" value={counts.inProgress} status="In Progress" />
        <StatCard label="Completed"   value={counts.completed}  status="Completed" />
        {counts.overdue > 0 && (
          <StatCard label="Overdue" value={counts.overdue} status="Overdue" />
        )}
      </div>
    </div>
  );
};

export default UserCard;
