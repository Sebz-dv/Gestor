import React, { useContext } from "react";
import { UserContext } from "../../context/UserContext";
import Navbar from "../../components/layouts/Navbar";
import SideMenu from "../../components/layouts/SideMenu";

const DashboardLayout = ({ children, activeMenu }) => {
  const { user } = useContext(UserContext);

  return (
    <div className="min-h-screen antialiased transition-colors duration-200
                    bg-slate-50 text-slate-800
                    dark:bg-slate-950 dark:text-slate-100">
      <Navbar activeMenu={activeMenu} />

      {user && (
        <div className="flex">
          <div className="max-[1080px]:hidden border-r border-slate-200 dark:border-slate-800">
            <SideMenu activeMenu={activeMenu} />
          </div>

          <div className="grow mx-5 py-6">{children}</div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
