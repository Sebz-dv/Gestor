import React, { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { LuUsers, LuUser, LuShield, LuCog, LuLandmark  } from "react-icons/lu";
import UsersManager from "./UsersManager";
import CompanyDashboard from "../Company/CompanyDashboard";

const TABS = [
  { key: "users", label: "Usuarios", icon: LuUsers },
  { key: "enterprise", label: "Empresa", icon: LuLandmark },
  // { key: "roles", label: "Roles", icon: LuShield, soon: true },
  // { key: "preferences", label: "Preferencias", icon: LuCog, soon: true },
];

const Settings = () => {
  const [params, setParams] = useSearchParams();
  const current = params.get("tab") || "users";

  const CurrentView = useMemo(() => {
    switch (current) {
      case "users":
        return <UsersManager />;
      case "enterprise":
        return <CompanyDashboard />;
      default:
        return (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {TABS.find((t) => t.key === current)?.label ?? "Sección"}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Próximamente. Por ahora, solo usuarios — que es donde vive la
              acción 💼.
            </p>
          </div>
        );
    }
  }, [current]);

  const setTab = (key) => {
    const n = new URLSearchParams(params);
    n.set("tab", key);
    setParams(n, { replace: true });
  };

  return (
    <DashboardLayout activeMenu={"Ajustes"}>
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <aside className="col-span-12 md:col-span-3 lg:col-span-3">
            <nav className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2">
              {TABS.map(({ key, label, icon: Icon, soon }) => {
                const active = current === key;
                return (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={[
                      "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm",
                      active
                        ? "bg-indigo-600 text-white"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800",
                    ].join(" ")}
                  >
                    {Icon && <Icon className="text-base" aria-hidden="true" />}
                    <span className="flex-1 text-left">{label}</span>
                    {soon && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        Próx.
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Panel */}
          <section className="col-span-12 md:col-span-9 lg:col-span-9">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
              {CurrentView}
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
