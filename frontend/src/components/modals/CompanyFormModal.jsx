// src/components/company/CompanyFormModal.jsx
import React, { useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";

const CompanyFormModal = ({ initialData, onClose, onSaved }) => {
  const isNew = !initialData;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => ({
    name: initialData?.name || "",
    legalName: initialData?.legalName || "",
    nit: initialData?.nit || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    website: initialData?.website || "",
    address: initialData?.address || "",
    city: initialData?.city || "",
    country: initialData?.country || "",
    socials: {
      facebook: initialData?.socials?.facebook || "",
      instagram: initialData?.socials?.instagram || "",
      linkedin: initialData?.socials?.linkedin || "",
      twitter: initialData?.socials?.twitter || "",
      youtube: initialData?.socials?.youtube || "",
      tiktok: initialData?.socials?.tiktok || "",
    },
  }));

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onChangeSocial = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, socials: { ...f.socials, [name]: value } }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("El nombre de la empresa es obligatorio.");
      return;
    }

    setSaving(true);
    try {
      await axiosInstance.put(API_PATHS.COMPANY.UPSERT_COMPANY, form);
      toast.success("Datos de empresa guardados.");
      onSaved?.();
    } catch (err) {
      console.error("[CompanyFormModal] PUT /company error:", err);
      toast.error(err?.response?.data?.message || "No pude guardar los datos.");
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
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {isNew ? "Configurar empresa" : "Editar empresa"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Identidad */}
            <Input
              label="Nombre"
              name="name"
              value={form.name}
              onChange={onChange}
            />
            <Input
              label="Razón social"
              name="legalName"
              value={form.legalName}
              onChange={onChange}
            />
            <Input
              label="NIT"
              name="nit"
              value={form.nit}
              onChange={onChange}
            />
            <Input
              label="Sitio web"
              name="website"
              value={form.website}
              onChange={onChange}
              placeholder="https://tusitio.com"
            />

            {/* Contacto */}
            <Input
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
              placeholder="contacto@empresa.com"
            />
            <Input
              label="Teléfono"
              name="phone"
              value={form.phone}
              onChange={onChange}
              placeholder="+57 300 000 0000"
            />

            {/* Ubicación */}
            <Input
              label="Dirección"
              name="address"
              value={form.address}
              onChange={onChange}
            />
            <Input
              label="Ciudad"
              name="city"
              value={form.city}
              onChange={onChange}
            />
            <Input
              label="País"
              name="country"
              value={form.country}
              onChange={onChange}
            />

            {/* Redes */}
            <div className="md:col-span-2">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Redes
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputSocial
                  label="LinkedIn"
                  name="linkedin"
                  value={form.socials.linkedin}
                  onChange={onChangeSocial}
                />
                <InputSocial
                  label="Instagram"
                  name="instagram"
                  value={form.socials.instagram}
                  onChange={onChangeSocial}
                />
                <InputSocial
                  label="Facebook"
                  name="facebook"
                  value={form.socials.facebook}
                  onChange={onChangeSocial}
                />
                <InputSocial
                  label="Twitter"
                  name="twitter"
                  value={form.socials.twitter}
                  onChange={onChangeSocial}
                />
                <InputSocial
                  label="YouTube"
                  name="youtube"
                  value={form.socials.youtube}
                  onChange={onChangeSocial}
                />
                <InputSocial
                  label="TikTok"
                  name="tiktok"
                  value={form.socials.tiktok}
                  onChange={onChangeSocial}
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Usa URLs completas (ej.{" "}
                <span className="underline">
                  https://linkedin.com/company/tu-empresa
                </span>
                ).
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
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
              className="rounded-xl px-3 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-70"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyFormModal;

/* --------- Inputs --------- */
const Input = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
}) => (
  <div>
    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
      {label}
    </label>
    <input
      name={name}
      value={value}
      onChange={onChange}
      type={type}
      placeholder={placeholder}
      className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
    />
  </div>
);

const InputSocial = ({ label, name, value, onChange }) => (
  <div>
    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
      {label}
    </label>
    <input
      name={name}
      value={value}
      onChange={onChange}
      placeholder="https://..."
      className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
    />
  </div>
);
