import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";
import {
  LuBuilding2,
  LuMail,
  LuPhone,
  LuGlobe,
  LuMapPin,
  LuUpload,
  LuPencil,
  LuExternalLink,
  LuFacebook,
  LuInstagram,
  LuLinkedin,
  LuTwitter,
  LuYoutube,
} from "react-icons/lu";
import CompanyFormModal from "../../components/modals/CompanyFormModal";

/* ----------------- Helpers ----------------- */
const safeJSON = (s, fb) => {
  try {
    return JSON.parse(s);
  } catch {
    return fb;
  }
};

const normalizeCompany = (c = null) => {
  if (!c) return null;
  return {
    id: c.id ?? null,
    name: c.name ?? "Mi Empresa",
    legalName: c.legalName ?? "",
    nit: c.nit ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    website: c.website ?? "",
    logoUrl: c.logoUrl ?? "",
    address: c.address ?? "",
    city: c.city ?? "",
    country: c.country ?? "",
    socials: {
      facebook: c.facebook ?? c?.socials?.facebook ?? "",
      instagram: c.instagram ?? c?.socials?.instagram ?? "",
      linkedin: c.linkedin ?? c?.socials?.linkedin ?? "",
      twitter: c.twitter ?? c?.socials?.twitter ?? "",
      youtube: c.youtube ?? c?.socials?.youtube ?? "",
      tiktok: c.tiktok ?? c?.socials?.tiktok ?? "",
    },
    meta: typeof c.meta === "string" ? safeJSON(c.meta, {}) : c.meta ?? {},
    createdAt: c.createdAt ?? null,
    updatedAt: c.updatedAt ?? null,
  };
};

const isUrl = (v = "") => /^https?:\/\//i.test(v?.trim?.() || "");

/* ----------------- Main ----------------- */
const CompanyDashboard = () => {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const fileRef = useRef(null);

  const fetchCompany = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get(API_PATHS.COMPANY.GET_COMPANY);
      const n = normalizeCompany(data?.company || null);
      setCompany(n);
    } catch (err) {
      console.error("[CompanyDashboard] GET /company error:", err);
      // Si es 404, el router sigue mal montado o el handler no existe
      if (err?.response?.status === 404) {
        toast.error("Endpoint /api/company no encontrado (404). Revisa rutas.");
      } else {
        toast.error(
          err?.response?.data?.message || "No pude cargar la empresa."
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  const logoSrc = useMemo(() => {
    if (company?.logoUrl) return company.logoUrl;
    const seed = encodeURIComponent(company?.name || "Empresa");
    return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}`;
  }, [company]);

  const handleUploadClick = () => fileRef.current?.click();

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast.loading("Subiendo logo…", { id: "logo" });
    try {
      // 1) Subir imagen
      const fd = new FormData();
      fd.append("image", file);
      const { data } = await axiosInstance.post(
        API_PATHS.IMAGE.UPLOAD_IMAGE,
        fd,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      const url = data?.imageUrl || data?.url;
      if (!url) throw new Error("No recibí la URL del logo");

      // 2) Intentar PATCH /company/logo
      try {
        await axiosInstance.patch(API_PATHS.COMPANY.UPDATE_COMPANY_LOGO, {
          logoUrl: url,
        });
      } catch (err) {
        // Si falla por CORS/405/Method Not Allowed → fallback a PUT /company (upsert)
        const code = err?.response?.status;
        const isCorsNetwork = err?.message?.includes("Network Error");
        if (isCorsNetwork || code === 405 || code === 404) {
          console.warn(
            "[CompanyDashboard] PATCH fallback → PUT /company (logoUrl)"
          );
          await axiosInstance.put(API_PATHS.COMPANY.UPSERT_COMPANY, {
            logoUrl: url,
          });
        } else {
          throw err; // otro error real
        }
      }

      toast.success("Logo actualizado ✅", { id: "logo" });
      fetchCompany();
    } catch (err) {
      console.error("[CompanyDashboard] handleLogoChange error:", err);
      toast.error(
        err?.response?.data?.message || "No pude actualizar el logo.",
        {
          id: "logo",
        }
      );
    } finally {
      // reset input para permitir repetir el mismo archivo si hace falta
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const openEdit = () => setEditOpen(true);
  const closeEdit = () => setEditOpen(false);
  const handleSaved = async () => {
    await fetchCompany();
    closeEdit();
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <img
            src={logoSrc}
            alt="Logo empresa"
            className="w-14 h-14 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700 bg-white"
          />
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-slate-100">
              {loading ? "Cargando…" : company?.name || "Configura tu empresa"}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Panel de identidad y contacto de la empresa.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoChange}
          />
          <button
            onClick={handleUploadClick}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100"
            title="Cambiar logo"
          >
            <LuUpload className="text-base" />
            Cambiar logo
          </button>
          <button
            onClick={openEdit}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white"
            title="Editar datos"
          >
            <LuPencil className="text-base" />
            Editar datos
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-12 gap-5">
        {/* Identidad */}
        <div className="col-span-12 lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <LuBuilding2 /> Identidad
          </h3>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Field
              label="Nombre comercial"
              value={company?.name}
              loading={loading}
            />
            <Field
              label="Razón social"
              value={company?.legalName}
              loading={loading}
            />
            <Field label="NIT" value={company?.nit} loading={loading} />
            <Field
              label="Sitio web"
              value={
                company?.website ? (
                  <a
                    href={
                      isUrl(company.website)
                        ? company.website
                        : `https://${company.website}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                  >
                    {company.website}
                    <LuExternalLink />
                  </a>
                ) : (
                  ""
                )
              }
              loading={loading}
            />
          </div>
        </div>

        {/* Contacto */}
        <div className="col-span-12 lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Contacto
          </h3>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Field
              label={
                <span className="inline-flex items-center gap-2">
                  <LuMail /> Email
                </span>
              }
              value={
                company?.email ? (
                  <a
                    href={`mailto:${company.email}`}
                    className="text-indigo-600 hover:underline"
                  >
                    {company.email}
                  </a>
                ) : (
                  ""
                )
              }
              loading={loading}
            />
            <Field
              label={
                <span className="inline-flex items-center gap-2">
                  <LuPhone /> Teléfono
                </span>
              }
              value={company?.phone}
              loading={loading}
            />
            <Field
              label={
                <span className="inline-flex items-center gap-2">
                  <LuMapPin /> Dirección
                </span>
              }
              value={company?.address}
              loading={loading}
            />
            <Field label="Ciudad" value={company?.city} loading={loading} />
            <Field label="País" value={company?.country} loading={loading} />
          </div>
        </div>

        {/* Redes */}
        <div className="col-span-12 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Redes
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <SocialChip
              icon={<LuLinkedin />}
              label="LinkedIn"
              href={company?.socials?.linkedin}
            />
            <SocialChip
              icon={<LuInstagram />}
              label="Instagram"
              href={company?.socials?.instagram}
            />
            <SocialChip
              icon={<LuFacebook />}
              label="Facebook"
              href={company?.socials?.facebook}
            />
            <SocialChip
              icon={<LuTwitter />}
              label="Twitter"
              href={company?.socials?.twitter}
            />
            <SocialChip
              icon={<LuYoutube />}
              label="YouTube"
              href={company?.socials?.youtube}
            />
          </div>
        </div>
      </div>

      {/* Modal de edición */}
      
      {editOpen && (
        <CompanyFormModal
          initialData={company}
          onClose={closeEdit}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};

export default CompanyDashboard;

/* ----------------- Subcomponentes ----------------- */
const Field = ({ label, value, loading }) => {
  const content = useMemo(() => {
    const v = typeof value === "string" ? value?.trim?.() : value;
    if (loading)
      return (
        <span className="inline-block h-[18px] w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
      );
    if (!v) return <span className="text-slate-400">—</span>;
    return value;
  }, [value, loading]);

  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <div className="mt-0.5 text-slate-800 dark:text-slate-200 break-words">
        {content}
      </div>
    </div>
  );
};

const SocialChip = ({ icon, label, href }) => {
  const valid = isUrl(href || "");
  return (
    <a
      href={valid ? href : undefined}
      target="_blank"
      rel="noreferrer"
      title={label}
      className={[
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ring-1",
        valid
          ? "bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 ring-slate-200 dark:ring-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          : "bg-slate-50 dark:bg-slate-800/50 text-slate-400 ring-slate-200 dark:ring-slate-700 cursor-not-allowed",
      ].join(" ")}
      onClick={(e) => {
        if (!valid) e.preventDefault();
      }}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </a>
  );
};

