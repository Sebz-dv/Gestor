import React, { useContext } from "react";
import { UserContext } from "../../context/UserContext";
import Navbar from "../../components/layouts/Navbar"; // ajusta ruta si difiere
import SideMenu from "../../components/layouts/SideMenu"; // ajusta ruta si difiere

const DashboardLayout = ({ children, activeMenu }) => {
  const { user } = useContext(UserContext);

  return (
    <div className="">
      <Navbar activeMenu={activeMenu} />
      {user && (
        <div className="flex">
          <div className="max-[1080px]:hidden">
            <SideMenu activeMenu={activeMenu} />
          </div>
          <div className="grow mx-5">{children}</div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
