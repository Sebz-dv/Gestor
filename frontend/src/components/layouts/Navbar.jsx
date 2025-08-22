import React, { useState } from "react";
import { HiOutlineMenu, HiOutlineX } from "react-icons/hi";
import SideMenu from "./SideMenu";

const Navbar = ({ activeMenu }) => {
  const [openSideMenu, setOpenSideMenu] = useState(false);

  return (
    <div
      className="flex items-center gap-5 sticky top-0 z-30
                 bg-white/85 backdrop-blur supports-[backdrop-filter]:backdrop-blur
                 border-b border-slate-200/50
                 py-4 px-7
                 transition-colors
                 dark:bg-[#0b1220]/80 dark:border-white/10"
    >
      {/* Botón hamburguesa */}
      <button
        className="block lg:hidden p-2 rounded-md
                   text-slate-800 hover:bg-slate-100
                   transition-colors
                   dark:text-slate-200 dark:hover:bg-white/5"
        onClick={() => setOpenSideMenu((prev) => !prev)}
        aria-label={openSideMenu ? "Cerrar menú" : "Abrir menú"}
      >
        {openSideMenu ? (
          <HiOutlineX className="text-2xl" />
        ) : (
          <HiOutlineMenu className="text-2xl" />
        )}
      </button>

      {/* Título */}
      <h2
        className="text-lg font-semibold
                   text-slate-900
                   transition-colors
                   dark:text-slate-100"
      >
        Gestor de Tareas
      </h2>

      {/* Menú lateral móvil */}
      {openSideMenu && (
        <div
          className="fixed top-[61px] left-0 right-0 -m-4
                     bg-white shadow-sm
                     border-t border-slate-200
                     transition-colors
                     dark:bg-[#0b1220] dark:border-white/10"
        >
          <SideMenu activeMenu={activeMenu} />
        </div>
      )}
    </div>
  );
};

export default Navbar;
