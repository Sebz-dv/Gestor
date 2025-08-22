import React, { useState } from "react";
import { HiOutlineMenu, HiOutlineX } from "react-icons/hi";
import SideMenu from "./SideMenu";

const Navbar = ({ activeMenu }) => {
  const [openSideMenu, setOpenSideMenu] = useState(false);
  return (
    <div className="flex gap-5 bg-white border boredr-b @border-gray-200/50 backdrop-blur-[2px] py-4 px-7 sticky top-0 z-30">
      {/* Botón hamburguesa */}
      <button
        className="block lg:hidden text-black"
        onClick={() => setOpenSideMenu((prev) => !prev)}
      >
        {openSideMenu ? (
          <HiOutlineX className="text-2xl" />
        ) : (
          <HiOutlineMenu className="text-2xl" />
        )}
      </button>

      {/* Título */}
      <h2 className="text-lg font-semibold text-black">Expense Tracker</h2>

      {/* Menú lateral móvil */}
      {openSideMenu && (
        <div className="fixed top-[61px] -m-4 bg-white">
          <SideMenu activeMenu={activeMenu} />
        </div>
      )}
    </div>
  );
};

export default Navbar;
