import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../context/UserContext";
import { SIDE_MENU_ADMIN_DATA, SIDE_MENU_USER_DATA } from "../../utils/data";
import {
  LuMenu,
  LuX,
  LuChevronLeft,
  LuLogOut,
  LuSun,
  LuMoon,
} from "react-icons/lu";
import { motion, AnimatePresence } from "framer-motion";

const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "U";

/* Theme helpers */
const getInitialTheme = () => {
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") return saved;
  } catch (error) {
    console.error("Error getting initial theme:", error);
  }
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "light";
};

const applyTheme = (theme) => {
  const root = document.documentElement; // <html>
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
};

/* Toggle visual pill */
const ThemeToggle = ({ theme, onToggle }) => (
  <button
    onClick={onToggle}
    aria-label="Cambiar tema"
    title={theme === "dark" ? "Cambiar a claro" : "Cambiar a oscuro"}
    className="relative w-12 h-7 rounded-full bg-slate-200/80 dark:bg-white/10 border border-slate-300/60 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/[0.12] transition-colors"
  >
    <motion.span
      layout
      transition={{ type: "spring", stiffness: 500, damping: 30, mass: 0.4 }}
      className="absolute top-1 left-1 h-5 w-5 rounded-full bg-white dark:bg-slate-800 shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10"
      style={{ x: theme === "dark" ? 20 : 0 }}
    />
    <LuSun
      className={[
        "absolute left-1.5 top-1.5 w-3.5 h-3.5 transition-opacity",
        theme === "dark"
          ? "opacity-40 text-amber-300"
          : "opacity-100 text-amber-500",
      ].join(" ")}
    />
    <LuMoon
      className={[
        "absolute right-1.5 top-1.5 w-3.5 h-3.5 transition-opacity",
        theme === "dark"
          ? "opacity-100 text-indigo-200"
          : "opacity-40 text-slate-500",
      ].join(" ")}
    />
  </button>
);

const SideMenu = ({ activeMenu }) => {
  const { user, clearUser } = useContext(UserContext);
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar:collapsed");
    return saved === "true";
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  /* Theme state */
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem("theme", theme);
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  // Rutas según rol
  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    setItems(
      user.role === "admin" ? SIDE_MENU_ADMIN_DATA : SIDE_MENU_USER_DATA
    );
  }, [user]);

  // Persistir colapso en desktop
  useEffect(() => {
    localStorage.setItem("sidebar:collapsed", String(collapsed));
  }, [collapsed]);

  // Helpers
  const handleLogout = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      clearUser?.();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  const handleClick = (route) => {
    if (route === "logout") return handleLogout();
    navigate(route);
    setMobileOpen(false); // cerrar drawer en móvil tras navegar
  };

  const imageSrc = user?.profileImageUrl || null;

  // Clases condicionadas
  const desktopWidth = collapsed ? "md:w-20" : "md:w-64";
  const showLabels = !collapsed;

  // Agregar manualmente el botón de logout al final (si no está en data)
  const menuWithLogout = useMemo(() => {
    const hasLogout = items?.some((i) => i.path === "logout");
    return hasLogout
      ? items
      : [
          ...items,
          {
            label: "Cerrar sesión",
            path: "logout",
            icon: LuLogOut,
          },
        ];
  }, [items]);

  // Variants para animaciones suaves
  const itemVariants = {
    initial: { x: 0, opacity: 1 },
    hover: {
      x: 3,
      transition: { type: "spring", stiffness: 400, damping: 30 },
    },
    tap: { scale: 0.985 },
  };

  return (
    <>
      {/* Top bar para móvil: hamburger + toggle tema */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="md:hidden sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-slate-200 flex items-center justify-between px-3 h-[61px] dark:bg-[#0b1220]/80 dark:border-white/10"
      >
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
          className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-white/5"
        >
          <LuMenu className="w-5 h-5 text-slate-800 dark:text-slate-200" />
        </button>
        <div className="text-sm text-slate-700 dark:text-slate-200">
          {user?.name ? `Hola, ${user.name}` : "Hola"}
        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </motion.div>

      {/* Backdrop móvil con fade */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-black z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar contenedor */}
      <motion.aside
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className={[
          // Base
          "bg-white/95 backdrop-blur border-r border-slate-200/70 shadow-xl shadow-slate-900/5 z-50",
          "dark:bg-[#0b1220]/90 dark:border-white/10 dark:shadow-black/30",
          // Posición/altura
          "fixed md:sticky top-[61px] md:top-[61px] h-[calc(100vh-61px)]",
          // Ancho
          "w-72 md:w-auto",
          desktopWidth,
          // Transiciones
          "transition-[width,transform] duration-200 ease-out will-change-transform",
          // Drawer móvil (slide via CSS)
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
        role="navigation"
        aria-label="Barra lateral"
      >
        {/* Header del sidebar (desktop): marca + acciones */}
        <div className="hidden md:flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-white/10">
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="text-sm font-semibold text-slate-800 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-indigo-300 dark:to-cyan-300"
          >
            {collapsed ? "DM" : "DoMore"}
          </motion.div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
              className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-white/5"
              title={collapsed ? "Expandir" : "Colapsar"}
            >
              <LuChevronLeft
                className={[
                  "w-5 h-5 transition-transform text-slate-700 dark:text-slate-200",
                  collapsed ? "rotate-180" : "rotate-0",
                ].join(" ")}
              />
            </button>
          </div>
        </div>

        {/* Header del sidebar (móvil): botón cerrar */}
        <div className="md:hidden flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-white/10">
          <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Menú
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
            className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-white/5"
          >
            <LuX className="w-5 h-5 text-slate-700 dark:text-slate-200" />
          </button>
        </div>

        {/* Perfil */}
        <div className="flex flex-col items-center border-b border-slate-200 p-4 dark:border-white/10">
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 350, damping: 20 }}
            className="w-16 h-16 rounded-full overflow-hidden mb-2 bg-slate-200 dark:bg-white/10 flex items-center justify-center ring-2 ring-white/60 dark:ring-white/10"
          >
            {imageSrc ? (
              <img
                src={imageSrc}
                alt="Profile"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback a iniciales si la imagen falla
                  e.currentTarget.style.display = "none";
                  const parent = e.currentTarget.parentNode;
                  if (parent) {
                    parent.innerHTML = `<span class="text-sm font-semibold text-slate-700 dark:text-slate-200">${getInitials(
                      user?.name
                    )}</span>`;
                  }
                }}
              />
            ) : (
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {getInitials(user?.name)}
              </span>
            )}
          </motion.div>

          {/* Oculta textos en colapsado (solo desktop) */}
          {user?.role === "admin" && (
            <div
              className={[
                "text-[10px] uppercase tracking-wide text-indigo-600 font-semibold dark:text-indigo-300",
                collapsed ? "hidden md:block md:opacity-0 md:h-0" : "",
              ].join(" ")}
            >
              Admin
            </div>
          )}

          <h5
            className={[
              "text-sm font-medium text-slate-900 mt-1 dark:text-slate-100",
              collapsed ? "hidden md:block md:opacity-0 md:h-0" : "",
            ].join(" ")}
            title={user?.name || ""}
          >
            {showLabels ? user?.name || "Anonymous" : ""}
          </h5>
          {/* <p
            className={[
              "text-xs text-slate-500 dark:text-slate-400",
              collapsed ? "hidden md:block md:opacity-0 md:h-0" : "",
            ].join(" ")}
            title={user?.email || ""}
          >
            {showLabels ? user?.email || "no-email@example.com" : ""}
          </p> */}
          <div className="mt-2">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </div>

        {/* Items */}
        <nav className="mt-3 px-2">
          {menuWithLogout.map((item) => {
            const isActive = activeMenu === item.label;
            const commonBtn =
              "group relative w-full flex items-center gap-4 text-[15px] py-3 px-3.5 mb-1 rounded-xl text-left border focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 dark:focus-visible:ring-indigo-500/40 transition-colors";
            const activeClasses =
              "text-indigo-600 dark:text-indigo-300 bg-gradient-to-r from-indigo-50/70 to-blue-50/40 dark:from-white/[0.06] dark:to-white/[0.02] border-indigo-200 dark:border-white/10 shadow-sm shadow-indigo-500/5 before:content-[''] before:absolute before:left-1 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-full before:bg-indigo-500/80";
            const inactiveClasses =
              "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/[0.06] border-transparent";

            return (
              <motion.button
                key={item.path}
                onClick={() => handleClick(item.path)}
                className={`${commonBtn} ${
                  isActive ? activeClasses : inactiveClasses
                }`}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
                title={collapsed ? item.label : undefined}
                variants={itemVariants}
                initial="initial"
                whileHover="hover"
                whileTap="tap"
                transition={{ duration: 0.15 }}
              >
                <motion.span
                  className="grid place-items-center"
                  whileHover={{
                    rotate: isActive ? 0 : 0,
                    scale: isActive ? 1 : 1.03,
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 28 }}
                >
                  <item.icon className="w-5 h-5 shrink-0 text-current" />
                </motion.span>

                {/* Etiqueta: se oculta si está colapsado en desktop */}
                <AnimatePresence initial={false}>
                  {showLabels && (
                    <motion.span
                      key="label"
                      className="truncate"
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={{ duration: 0.18 }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </nav>
      </motion.aside>
    </>
  );
};

export default SideMenu;
