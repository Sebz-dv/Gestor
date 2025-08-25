import React, { useEffect, useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";
import { LuUpload, LuX } from "react-icons/lu";

/* ----------------- Helpers ----------------- */
const mapRole = (r) => (r === "user" ? "member" : r || "member");
const isNonEmpty = (v) => typeof v === "string" && v.trim() !== "";
const getInitialsUrl = (seed) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    seed || "User"
  )}`;

const normalizeUser = (u = {}) => ({
  id: u.id ?? u.user_id ?? u.uid ?? u.email ?? String(Math.random()),
  name: u.name ?? u.full_name ?? u.username ?? "—",
  email: u.email ?? "—",
  role: mapRole(u.role ?? u.rol ?? "member"),
  status: u.status ?? (u.active === false ? "inactive" : "active"),
  profileImageUrl: u.profileImageUrl ?? u.avatar ?? null, // nunca ""
});

/* ----------------- Component ----------------- */
const UserFormModal = ({ userId, onClose, onSaved, roles = [] }) => {
  const isEdit = Boolean(userId);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: mapRole(roles[0]) || "member",
    status: "active",
    profileImageUrl: null,
  });

  useEffect(() => {
    const load = async () => {
      if (!isEdit) return;
      setLoading(true);
      try {
        const { data } = await axiosInstance.get(
          API_PATHS.USER.GET_USER_ID(userId)
        );
        const u = normalizeUser(data?.user || data);
        setForm((f) => ({
          ...f,
          name: u.name || "",
          email: u.email || "",
          password: "",
          role: mapRole(u.role) || "member",
          status: u.status || "active",
          profileImageUrl: isNonEmpty(u.profileImageUrl)
            ? u.profileImageUrl
            : null,
        }));
      } catch (err) {
        console.error(
          "[UserFormModal] GET user error:",
          err?.response?.data || err
        );
        toast.error(
          err?.response?.data?.message || "No pude cargar el usuario."
        );
        onClose?.();
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleUpload = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("image", file);
    toast.loading("Subiendo imagen…", { id: "upload" });
    try {
      const { data } = await axiosInstance.post(
        API_PATHS.IMAGE.UPLOAD_IMAGE,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      const url = data?.imageUrl || data?.url;
      if (!isNonEmpty(url)) throw new Error("No recibí la URL de la imagen");
      setForm((f) => ({ ...f, profileImageUrl: url }));
      toast.success("Imagen subida ✅", { id: "upload" });
    } catch (err) {
      console.error(
        "[UserFormModal] upload error:",
        err?.response?.data || err
      );
      toast.error(err?.response?.data?.message || "No pude subir la imagen.", {
        id: "upload",
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = form.name?.trim();
    const email = form.email?.trim().toLowerCase();
    const role = mapRole(form.role?.trim());
    const profileImageUrl = isNonEmpty(form.profileImageUrl)
      ? form.profileImageUrl
      : undefined;

    if (!name) return toast.error("El nombre es requerido.");
    if (!email) return toast.error("El email es requerido.");
    if (!isEdit && !form.password.trim())
      return toast.error("La contraseña es requerida.");
    if (!isEdit && String(form.password).length < 8)
      return toast.error("La contraseña debe tener al menos 8 caracteres.");

    setSaving(true);
    const payload = {
      name,
      email,
      role,
      profileImageUrl,
      ...(isEdit ? {} : { password: form.password }),
    };

    try {
      if (isEdit) {
        await axiosInstance.put(API_PATHS.USER.UPDATE_USER(userId), payload);
        toast.success("Usuario actualizado.");
      } else {
        await axiosInstance.post(API_PATHS.USER.CREATE_USERS, payload);
        toast.success("Usuario creado.");
      }
      onSaved?.();
    } catch (err) {
      console.error("[UserFormModal] save error:", err?.response?.data || err);
      toast.error(
        err?.response?.data?.message || "No pude guardar el usuario."
      );
    } finally {
      setSaving(false);
    }
  };

  // Avatar: nunca "" en src; fallback a iniciales o placeholder
  const seed = form.name?.trim() || form.email?.trim() || "User";
  const fallback = getInitialsUrl(seed);
  const avatarSrc = isNonEmpty(form.profileImageUrl)
    ? form.profileImageUrl
    : form.name?.trim()
    ? getInitialsUrl(form.name.trim())
    : null;

  const uiRoles = Array.from(
    new Set(["admin", "member", ...roles.map(mapRole)])
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {isEdit ? "Editar usuario" : "Nuevo usuario"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            <LuX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 py-4 space-y-3">
          {loading ? (
            <p className="text-sm text-slate-500">Cargando datos…</p>
          ) : (
            <>
              <div className="flex items-center gap-3">
                {avatarSrc ? (
                  <img
                    src={avatarSrc ?? undefined} // nunca ""
                    alt="avatar"
                    width={56}
                    height={56}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = fallback;
                    }}
                    className="w-14 h-14 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full ring-1 ring-slate-200 dark:ring-slate-700 bg-slate-100 dark:bg-slate-800 grid place-items-center text-[10px] text-slate-500">
                    Sin foto
                  </div>
                )}

                <label className="inline-flex items-center gap-2 cursor-pointer rounded-xl border border-dashed border-slate-300 dark:border-slate-600 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <LuUpload />
                  Subir avatar
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUpload(e.target.files?.[0])}
                  />
                </label>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Nombre
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={onChange}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {!isEdit && (
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={onChange}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Rol
                  </label>
                  <select
                    name="role"
                    value={form.role}
                    onChange={onChange}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {uiRoles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Estado
                  </label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={onChange}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl px-3 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-70"
                >
                  {saving
                    ? "Guardando…"
                    : isEdit
                    ? "Guardar cambios"
                    : "Crear usuario"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;
