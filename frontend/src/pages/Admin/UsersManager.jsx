import React, { useCallback, useEffect, useMemo, useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";
import { LuPlus, LuPencil, LuTrash2, LuSearch, LuCheck } from "react-icons/lu";
import UserFormModal from "../../components/user/UserFormModal";
import Pagination from "../../components/user/Pagination";

/* ---------- helpers ---------- */
const mapRole = (r) => (r === "user" ? "member" : r || "member");
const isNonEmpty = (v) => typeof v === "string" && v.trim() !== "";
const getInitialsUrl = (seed) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    seed || "U"
  )}`;

const normalizeUser = (u = {}) => ({
  id: u.id ?? u.user_id ?? u.uid ?? u.email ?? String(Math.random()),
  name: u.name ?? u.full_name ?? u.username ?? "—",
  email: u.email ?? "—",
  role: mapRole(u.role ?? u.rol ?? "member"),
  status: u.status ?? (u.active === false ? "inactive" : "active"),
  profileImageUrl: u.profileImageUrl ?? u.avatar ?? null, // nunca ""
  createdAt: u.createdAt ?? u.created_at ?? u.created ?? null,
});

const formatDate = (d) => {
  try {
    if (!d) return "—";
    const dt = new Date(d);
    return Number.isNaN(dt) ? "—" : dt.toLocaleString("es-CO");
  } catch {
    return "—";
  }
};

const UsersManager = () => {
  // data
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // ui
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editUserId, setEditUserId] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get(API_PATHS.USER.GET_ALL_USER);
      const list = Array.isArray(data) ? data : data?.users || [];
      const normalized = list.map(normalizeUser).sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });
      setUsers(normalized);
    } catch (err) {
      toast.error(err?.response?.data?.message || "No pude cargar usuarios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const rolesFromData = useMemo(() => {
    const set = new Set(
      users.map((u) => mapRole(u.role || "")).filter(Boolean)
    );
    return Array.from(set).sort();
  }, [users]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return users.filter((u) => {
      const role = mapRole(u.role || "");
      const matchesQ =
        !term ||
        (u.name || "").toLowerCase().includes(term) ||
        (u.email || "").toLowerCase().includes(term) ||
        role.toLowerCase().includes(term);
      const matchesRole = roleFilter === "all" || role === roleFilter;
      const matchesStatus =
        statusFilter === "all" || (u.status || "active") === statusFilter;
      return matchesQ && matchesRole && matchesStatus;
    });
  }, [users, q, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(Math.max(1, page), totalPages);
  const pageData = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSafe]);

  // actions
  const openCreate = () => {
    setEditUserId(null);
    setModalOpen(true);
  };
  const openEdit = (id) => {
    setEditUserId(id);
    setModalOpen(true);
  };
  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este usuario?")) return;
    toast.loading("Eliminando usuario…", { id: "del-user" });
    try {
      await axiosInstance.delete(API_PATHS.USER.DELETE_USER(id));
      toast.success("Usuario eliminado.", { id: "del-user" });
      fetchUsers();
    } catch (err) {
      toast.error(err?.response?.data?.message || "No pude eliminarlo.", {
        id: "del-user",
      });
    }
  };
  const handleSaved = async () => {
    await fetchUsers();
    setModalOpen(false);
  };

  return (
    <>
      {/* Header + CTA */}
      <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Usuarios
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Administra usuarios. Sin excusas, con estilos.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
        >
          <LuPlus className="text-base" />
          Nuevo usuario
        </button>
      </div>

      {/* Filtros */}
      <div className="px-4 sm:px-5 pb-2 flex flex-col md:flex-row gap-3">
        <div className="relative w-full md:max-w-sm">
          <LuSearch className="absolute left-3 top-2.5 text-slate-400" />
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Buscar por nombre, email o rol…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => {
            setPage(1);
            setRoleFilter(e.target.value);
          }}
          className="w-full md:w-40 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">Todos los roles</option>
          {rolesFromData.map((r) => (
            <option key={r} value={r}>
              {r || "—"}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
          className="w-full md:w-40 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="px-4 sm:px-5 pb-4">
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm bg-white dark:bg-slate-900">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr className="text-center">
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">
                    Usuario
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">
                    Email
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">
                    Rol
                  </th>
                  {/* <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">
                    Estado
                  </th> */}
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">
                    Creado
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      className="px-4 py-6 text-center text-slate-500"
                      colSpan={6}
                    >
                      Cargando usuarios…
                    </td>
                  </tr>
                ) : pageData.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-6 text-center text-slate-500"
                      colSpan={6}
                    >
                      No hay usuarios que coincidan con tu búsqueda.
                    </td>
                  </tr>
                ) : (
                  pageData.map((u) => {
                    const seed = u.name || u.email || "U";
                    const avatarSrc = isNonEmpty(u.profileImageUrl)
                      ? u.profileImageUrl
                      : getInitialsUrl(seed);
                    return (
                      <tr
                        key={u.id}
                        className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/50"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={avatarSrc ?? undefined} // nunca ""
                              alt={u.name || "Usuario"}
                              className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = getInitialsUrl(seed);
                              }}
                            />
                            <p className="font-medium text-slate-800 dark:text-slate-100 truncate">
                              {u.name}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 text-center">
                          {u.email}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 text-center">
                          {mapRole(u.role) || "—"}
                        </td>
                        {/* <td className="px-4 py-3">
                          <span
                            className={[
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1",
                              u.status === "active"
                                ? "bg-green-50 text-green-700 ring-green-200 dark:bg-green-900/10 dark:text-green-300 dark:ring-green-800"
                                : "bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:ring-slate-700",
                            ].join(" ")}
                          >
                            <LuCheck className="text-[14px]" />
                            {u.status === "active" ? "Activo" : "Inactivo"}
                          </span>
                        </td> */}
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 text-center">
                          {formatDate(u.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEdit(u.id)}
                              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100"
                            >
                              <LuPencil />
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(u.id)}
                              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/30 text-rose-700 dark:text-rose-300"
                            >
                              <LuTrash2 />
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {!loading && filtered.length > 0 && (
            <Pagination
              page={pageSafe}
              pageSize={pageSize}
              totalItems={filtered.length}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
          )}
        </div>
      </div>

      {modalOpen && (
        <UserFormModal
          userId={editUserId}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
          roles={rolesFromData}
        />
      )}
    </>
  );
};

export default UsersManager;
