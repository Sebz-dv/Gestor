import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { HiOutlineMenu, HiOutlineX } from "react-icons/hi";
import { LuSettings } from "react-icons/lu";
import SideMenu from "./SideMenu";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";

const HEADER_HEIGHT = 64; // px

/* =========================
 *         Hooks
 * ========================= */
function useLockBodyScroll(locked) {
  useEffect(() => {
    if (!locked) return;
    const { overflow, paddingRight } = document.body.style;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    // Evita “jump” por desaparición del scroll
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [locked]);
}

function useCompany(companyProp) {
  const [company, setCompany] = useState(companyProp ?? null);
  const [loading, setLoading] = useState(!companyProp);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (companyProp) {
      setCompany(companyProp);
      setLoading(false);
      setError(null);
      return;
    }
    const controller = new AbortController();
    (async () => {
      try {
        setLoading(true);
        const { data } = await axiosInstance.get(API_PATHS.COMPANY.GET_COMPANY, {
          signal: controller.signal,
        });
        setCompany(data?.company || null);
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(e);
        // fallback decente
        setCompany({ name: "Mi Empresa", logoUrl: "" });
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [companyProp]);

  return { company, loading, error };
}

/* =========================
 *       Helpers UI
 * ========================= */
const getInitialsUrl = (name) => {
  const seed = encodeURIComponent(name || "Empresa");
  // Evita cambios de layout usando un tamaño fijo y esquinas redondeadas
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&radius=12&scale=90`;
};

const getLogoSrc = (name, url) => url || getInitialsUrl(name);

/* =========================
 *        Component
 * ========================= */
const Navbar = ({ activeMenu, company: companyProp }) => {
  const { company, loading } = useCompany(companyProp);
  const [openSideMenu, setOpenSideMenu] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const location = useLocation();
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  // Cierra el panel cuando cambie la ruta
  useEffect(() => {
    setOpenSideMenu(false);
  }, [location.pathname]);

  // Bloquear scroll cuando el menu está abierto
  useLockBodyScroll(openSideMenu);

  // Gestión de foco y ESC
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setOpenSideMenu(false);
    };
    if (openSideMenu) {
      document.addEventListener("keydown", onKey);
      // Lleva el foco al panel al abrir
      setTimeout(() => {
        panelRef.current?.focus?.();
      }, 0);
    } else {
      // Devuelve el foco al botón
      buttonRef.current?.focus?.();
    }
    return () => document.removeEventListener("keydown", onKey);
  }, [openSideMenu]);

  const logoSrc = useMemo(() => {
    if (logoError) return getInitialsUrl(company?.name);
    return getLogoSrc(company?.name, company?.logoUrl);
  }, [company?.name, company?.logoUrl, logoError]);

  const menuId = "mobile-sidemenu";

  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur supports-[backdrop-filter]:backdrop-blur border-b border-slate-200/50 dark:bg-[#0b1220]/80 dark:border-white/10">
      <div className="flex items-center gap-4 py-3 px-4 sm:px-6">
        {/* Botón hamburguesa */}
        <button
          ref={buttonRef}
          className="block lg:hidden p-2 rounded-md text-slate-800 hover:bg-slate-100 transition-colors dark:text-slate-200 dark:hover:bg-white/5"
          onClick={() => setOpenSideMenu((prev) => !prev)}
          aria-label={openSideMenu ? "Cerrar menú" : "Abrir menú"}
          aria-controls={menuId}
          aria-expanded={openSideMenu}
        >
          {openSideMenu ? <HiOutlineX className="text-2xl" /> : <HiOutlineMenu className="text-2xl" />}
        </button>

        {/* Marca (logo + nombre) */}
        <Link to="/" className="flex items-center gap-3 min-w-0 group" aria-label="Ir al inicio">
          <div className="relative w-9 h-9 shrink-0">
            {loading ? (
              <span className="block w-full h-full rounded-xl bg-slate-200 animate-pulse dark:bg-slate-700" />
            ) : ( 
              <img
                src={logoSrc}
                alt={`Logo de ${company?.name || "Mi Empresa"}`}
                className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700 bg-white"
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
                loading="lazy"
                decoding="async"
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
        </Link>

        <div className="flex-1" />

        {/* Acción rápida: ajustes de empresa */}
        <Link
          to="/admin/settings"
          className="hidden sm:inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 transition-colors"
          title="Ajustes de empresa"
        >
          <LuSettings className="text-base" />
          <span className="hidden md:inline">Empresa</span>
        </Link>
      </div>

      {/* Menú lateral móvil (slide-down) */}
      <div
        id={menuId}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        ref={panelRef}
        tabIndex={-1}
        className={`
          lg:hidden fixed left-0 right-0 top-[${HEADER_HEIGHT}px]
          border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b1220] shadow-sm
          origin-top transform transition-transform duration-200 ease-out
          ${openSideMenu ? "translate-y-0" : "-translate-y-[120%]"}
        `}
        style={{ top: HEADER_HEIGHT }}
      >
        <SideMenu activeMenu={activeMenu} />
      </div>

      {/* Overlay clickeable */}
      {openSideMenu && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-[1px]"
          aria-hidden="true"
          onClick={() => setOpenSideMenu(false)}
        />
      )}

      {/* Respeto a usuarios que prefieren menos movimiento */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          [role="dialog"] {
            transition: none !important;
          }
        }
      `}</style>
    </header>
  );
};

export default Navbar;
