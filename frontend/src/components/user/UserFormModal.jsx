import React, { useEffect, useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";
import { LuUpload, LuX } from "react-icons/lu";

const normalizeUser = (u = {}) => ({
  id: u.id ?? u.user_id ?? u.uid ?? u.email ?? String(Math.random()),
  name: u.name ?? u.full_name ?? u.username ?? "—",
  email: u.email ?? "—",
  role: u.role ?? u.rol ?? "user",
  status: u.status ?? (u.active === false ? "inactive" : "active"),
  profileImageUrl: u.profileImageUrl ?? u.avatar ?? "",
});

const UserFormModal = ({ userId, onClose, onSaved, roles = [] }) => {
  const isEdit = Boolean(userId);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: roles[0] || "user",
    status: "active",
    profileImageUrl: "",
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
          role: u.role || roles[0] || "user",
          status: u.status || "active",
          profileImageUrl: u.profileImageUrl || "",
        }));
      } catch (err) {
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
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      const url = data?.imageUrl || data?.url || "";
      setForm((f) => ({ ...f, profileImageUrl: url }));
      toast.success("Imagen subida ✅", { id: "upload" });
    } catch (err) {
      toast.error(err?.response?.data?.message || "No pude subir la imagen.", {
        id: "upload",
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("El nombre es requerido.");
    if (!form.email.trim()) return toast.error("El email es requerido.");
    if (!isEdit && !form.password.trim())
      return toast.error("La contraseña es requerida.");

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role?.trim() || "user",
      status: form.status === "inactive" ? "inactive" : "active",
      profileImageUrl: form.profileImageUrl || undefined,
      avatar: form.profileImageUrl || undefined,
      ...(form.password ? { password: form.password } : {}),
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
      toast.error(
        err?.response?.data?.message || "No pude guardar el usuario."
      );
    } finally {
      setSaving(false);
    }
  };

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
                <img
                  src={
                    form.profileImageUrl ||
                    (form.name
                      ? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                          form.name
                        )}`
                      : "")
                  }
                  alt="avatar"
                  className="w-14 h-14 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                />
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
                    {roles.length === 0 && <option value="user">user</option>}
                    {Array.from(new Set(["admin", "user", ...roles])).map(
                      (r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      )
                    )}
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
