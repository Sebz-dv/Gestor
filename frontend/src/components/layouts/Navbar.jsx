import React, { useEffect, useMemo, useState } from "react";
import { HiOutlineMenu, HiOutlineX } from "react-icons/hi";
import { LuSettings } from "react-icons/lu";
import SideMenu from "./SideMenu";

// Si quieres auto-fetch:
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";

const getLogoSrc = (name, url) => {
  if (url) return url;
  const seed = encodeURIComponent(name || "Empresa");
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}`;
};

const Navbar = ({ activeMenu, company: companyProp }) => {
  const [openSideMenu, setOpenSideMenu] = useState(false);
  const [company, setCompany] = useState(companyProp || null);
  const [loading, setLoading] = useState(!companyProp);

  // Auto-fetch solo si no recibimos company por props
  useEffect(() => {
    if (companyProp) return;
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const { data } = await axiosInstance.get(API_PATHS.COMPANY.GET_COMPANY);
        if (!mounted) return;
        setCompany(data?.company || null);
      } catch (e) {
        if (!mounted) return;
        console.warn("[Navbar] No pude cargar /api/company:", e?.response?.status || e?.message);
        setCompany({ name: "Mi Empresa", logoUrl: "" });
      } finally {
        mounted && setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [companyProp]);

  const logoSrc = useMemo(() => getLogoSrc(company?.name, company?.logoUrl), [company]);

  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur supports-[backdrop-filter]:backdrop-blur border-b border-slate-200/50 dark:bg-[#0b1220]/80 dark:border-white/10">
      <div className="flex items-center gap-4 py-3 px-4 sm:px-6">
        {/* Botón hamburguesa */}
        <button
          className="block lg:hidden p-2 rounded-md text-slate-800 hover:bg-slate-100 transition-colors dark:text-slate-200 dark:hover:bg-white/5"
          onClick={() => setOpenSideMenu((prev) => !prev)}
          aria-label={openSideMenu ? "Cerrar menú" : "Abrir menú"}
        >
          {openSideMenu ? <HiOutlineX className="text-2xl" /> : <HiOutlineMenu className="text-2xl" />}
        </button>

        {/* Marca (logo + nombre) */}
        <a href="/" className="flex items-center gap-3 min-w-0 group">
          <div className="relative w-9 h-9 shrink-0">
            {loading ? (
              <span className="block w-full h-full rounded-xl bg-slate-200 animate-pulse dark:bg-slate-700" />
            ) : (
              <img
                src={logoSrc}
                alt={`Logo de ${company?.name || "Mi Empresa"}`}
                className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700 bg-white"
                referrerPolicy="no-referrer"
              />
            )}
          </div>

          <div className="flex flex-col min-w-0">
            <span className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[50vw] sm:max-w-xs">
              {loading ? (
                <span className="inline-block h-4 w-32 bg-slate-200 rounded animate-pulse dark:bg-slate-700" />
              ) : (
                company?.name || "Mi Empresa"
              )}
            </span>
          </div>
        </a>

        <div className="flex-1" />

        {/* Acción rápida: ir a ajustes de empresa */}
        <a
          href="/admin/settings"
          className="hidden sm:inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 transition-colors"
          title="Ajustes de empresa"
        >
          <LuSettings className="text-base" />
          <span className="hidden md:inline">Empresa</span>
        </a>
      </div>

      {/* Menú lateral móvil */}
      {openSideMenu && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-[1px]"
            onClick={() => setOpenSideMenu(false)}
          />
          <div className="fixed top-[64px] left-0 right-0 bg-white dark:bg-[#0b1220] border-t border-slate-200 dark:border-white/10 shadow-sm">
            <SideMenu activeMenu={activeMenu} />
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
