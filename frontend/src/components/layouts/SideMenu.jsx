import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../context/UserContext";
import { SIDE_MENU_ADMIN_DATA, SIDE_MENU_USER_DATA } from "../../utils/data";
import { LuMenu, LuX, LuChevronLeft, LuLogOut } from "react-icons/lu";

const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "U";

const SideMenu = ({ activeMenu }) => {
  const { user, clearUser } = useContext(UserContext);
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar:collapsed");
    return saved === "true";
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  // Rutas según rol
  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    setItems(user.role === "admin" ? SIDE_MENU_ADMIN_DATA : SIDE_MENU_USER_DATA);
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

  return (
    <>
      {/* Top bar para móvil: botón hamburger */}
      <div className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-200 flex items-center justify-between px-3 h-[61px]">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
          className="p-2 rounded-md hover:bg-gray-100"
        >
          <LuMenu className="w-5 h-5" />
        </button>
        <div className="text-sm text-gray-700">
          {user?.name ? `Hola, ${user.name}` : "Hola"}
        </div>
        <div className="w-6" />
      </div>

      {/* Backdrop móvil */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar contenedor */}
      <aside
        className={[
          // Base
          "bg-white border-r border-gray-200/50 z-50",
          // Posición/altura
          "fixed md:sticky top-[61px] md:top-[61px] h-[calc(100vh-61px)]",
          // Ancho
          "w-72 md:w-auto", // móvil ancho fijo; desktop por clases condicionales
          desktopWidth,
          // Transiciones
          "transition-[width,transform] duration-200 ease-out",
          // Drawer móvil
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
        role="navigation"
        aria-label="Barra lateral"
      >
        {/* Header del sidebar (desktop): botón colapsar */}
        <div className="hidden md:flex items-center justify-between px-3 py-2 border-b border-gray-200">
          <div className="text-sm font-medium text-gray-700">
            {collapsed ? "LP" : "Logipack"}
          </div>
          <button
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
            className="p-2 rounded-md hover:bg-gray-100"
            title={collapsed ? "Expandir" : "Colapsar"}
          >
            <LuChevronLeft
              className={[
                "w-5 h-5 transition-transform",
                collapsed ? "rotate-180" : "rotate-0",
              ].join(" ")}
            />
          </button>
        </div>

        {/* Header del sidebar (móvil): botón cerrar */}
        <div className="md:hidden flex items-center justify-between px-3 py-2 border-b border-gray-200">
          <div className="text-sm font-medium text-gray-700">Menú</div>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <LuX className="w-5 h-5" />
          </button>
        </div>

        {/* Perfil */}
        <div className="flex flex-col items-center border-b border-gray-200 p-4">
          <div className="w-16 h-16 rounded-full overflow-hidden mb-2 bg-slate-200 flex items-center justify-center">
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
                    parent.innerHTML = `<span class="text-sm font-semibold text-slate-700">${getInitials(
                      user?.name
                    )}</span>`;
                  }
                }}
              />
            ) : (
              <span className="text-sm font-semibold text-slate-700">
                {getInitials(user?.name)}
              </span>
            )}
          </div>

          {/* Oculta textos en colapsado (solo desktop) */}
          {user?.role === "admin" && (
            <div
              className={[
                "text-[10px] uppercase text-blue-600 font-semibold",
                collapsed ? "hidden md:block md:opacity-0 md:h-0" : "",
              ].join(" ")}
            >
              Admin
            </div>
          )}

          <h5
            className={[
              "text-sm font-medium text-gray-900 mt-1",
              collapsed ? "hidden md:block md:opacity-0 md:h-0" : "",
            ].join(" ")}
            title={user?.name || ""}
          >
            {showLabels ? user?.name || "Anonymous" : ""}
          </h5>
          <p
            className={[
              "text-xs text-gray-500",
              collapsed ? "hidden md:block md:opacity-0 md:h-0" : "",
            ].join(" ")}
            title={user?.email || ""}
          >
            {showLabels ? user?.email || "no-email@example.com" : ""}
          </p>
        </div>

        {/* Items */}
        <nav className="mt-3">
          {menuWithLogout.map((item) => {
            const isActive = activeMenu === item.label;
            const commonBtn =
              "w-full flex items-center gap-4 text-[15px] py-3 px-4 mb-1 rounded-md text-left border-r-4 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200";
            const activeClasses =
              "text-blue-600 bg-gradient-to-r from-blue-50/40 to-blue-100/50 border-blue-600 font-medium";
            const inactiveClasses = "text-gray-600 hover:bg-gray-50 border-transparent";

            return (
              <button
                key={item.path}
                onClick={() => handleClick(item.path)}
                className={`${commonBtn} ${isActive ? activeClasses : inactiveClasses}`}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {/* Etiqueta: se oculta si está colapsado en desktop */}
                <span className={`truncate ${collapsed ? "hidden md:inline md:opacity-0 md:w-0" : ""}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default SideMenu;
