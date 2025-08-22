import React, { useMemo, useState } from "react";

/** Avatar con fallback a iniciales y manejo de errores de carga */
const Avatar = ({ name = "—", src, size = 48 }) => {
  const [broken, setBroken] = useState(false);
  const initials = useMemo(
    () =>
      (name || "—")
        .trim()
        .split(/\s+/)
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
    [name]
  );

  const showImg = Boolean(src) && !broken;

  if (showImg) {
    return (
      <img
        src={src || undefined}          // ← nunca ""
        alt={`Avatar de ${name}`}
        className="w-12 h-12 rounded-full object-cover ring-2 ring-white"
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <div
      className="w-12 h-12 rounded-full grid place-items-center ring-2 ring-white
                 bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700
                 text-sm font-semibold select-none"
      aria-label={`Iniciales de ${name}`}
      style={{ width: size, height: size }}
    >
      {initials || "—"}
    </div>
  );
};

const StatCard = ({ label, count = 0, status }) => {
  const styles = {
    Pending:   "text-amber-700 bg-amber-50 ring-1 ring-amber-100",
    "In Progress": "text-sky-700 bg-sky-50 ring-1 ring-sky-100",
    Completed: "text-emerald-700 bg-emerald-50 ring-1 ring-emerald-100",
    Overdue:   "text-rose-700 bg-rose-50 ring-1 ring-rose-100",
    default:   "text-slate-700 bg-slate-50 ring-1 ring-slate-100",
  };
  const cls = styles[status] || styles.default;

  return (
    <div className={`flex-1 rounded-xl p-3 ${cls}`}>
      <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/70">
        {status}
      </span>
      <p className="text-xl font-bold leading-tight mt-1">{Number(count) || 0}</p>
      <p className="text-xs opacity-70">{label}</p>
    </div>
  );
};

const UserCard = ({ userInfo = {} }) => {
  const name  = userInfo?.name || "—";
  const email = userInfo?.email || "—";
  const avatarUrl = userInfo?.profileImageUrl; // puede ser undefined

  return (
    <div className="user-card p-3 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* No más src="" */}
          <Avatar name={name} src={avatarUrl} />
          <div>
            <p className="text-sm font-semibold text-slate-800">{name}</p>
            <p className="text-xs text-slate-500">{email}</p>
          </div>
        </div>
      </div>

      <div className="flex items-stretch gap-3 mt-5">
        <StatCard
          label="Pending"
          count={userInfo?.pendingTasks}
          status="Pending"
        />
        <StatCard
          label="In Progress"
          count={userInfo?.inProgressTasks}
          status="In Progress"
        />
        <StatCard
          label="Completed"
          count={userInfo?.completedTasks}
          status="Completed"
        />
      </div>
    </div>
  );
};

export default UserCard;
