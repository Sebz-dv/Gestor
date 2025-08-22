import React, { useEffect, useState } from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { LuFileSpreadsheet } from "react-icons/lu";
import UserCard from "../../components/Cards/UserCard";

// Normaliza un usuario del backend a lo que UserCard espera en userInfo
const normalizeUser = (u = {}) => ({
  id: u.id ?? u.user_id ?? u.uid ?? u.email ?? Math.random().toString(36),
  name: u.name ?? u.full_name ?? u.username ?? "—",
  email: u.email ?? "—",
  profileImageUrl: u.avatar ?? u.photoURL ?? u.profileImageUrl ?? "",
  // Contadores: soporta camelCase, snake_case y estructuras típicas
  pendingTasks:     u.pendingTasks     ?? u.pending     ?? u.stats?.pending     ?? u.tasks?.pending     ?? 0,
  inProgressTasks:  u.inProgressTasks  ?? u.in_progress ?? u.stats?.inProgress  ?? u.tasks?.in_progress ?? 0,
  completedTasks:   u.completedTasks   ?? u.completed   ?? u.stats?.completed   ?? u.tasks?.completed   ?? 0,
  overdueTasks:     u.overdueTasks     ?? u.overdue     ?? u.stats?.overdue     ?? u.tasks?.overdue     ?? 0,
});

const ManageUser = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const getAllUsers = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS);
      const raw = res?.data;

      // Detecta dónde viene la lista
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.users)
        ? raw.users
        : Array.isArray(raw?.data)
        ? raw.data
        : [];

      const normalized = list.map(normalizeUser);

      // 🔎 Consola ultra clara
      console.groupCollapsed("%c[ManageUser] GET_ALL_USERS", "color:#2563eb");
      console.log("raw data ➜", raw);
      console.log("shape ➜", {
        isArray: Array.isArray(raw),
        hasUsersArray: Array.isArray(raw?.users),
        hasDataArray: Array.isArray(raw?.data),
        chosenLength: list.length,
      });
      if (list[0]) {
        console.log("first raw item ➜", list[0]);
        console.log("first normalized ➜", normalized[0]);
      }
      console.table(
        normalized.map(({ id, name, email, pendingTasks, inProgressTasks, completedTasks, overdueTasks }) => ({
          id, name, email, pendingTasks, inProgressTasks, completedTasks, overdueTasks,
        }))
      );
      console.groupEnd();

      setAllUsers(normalized);
    } catch (error) {
      console.error("Error fetching users:", error);
      setErr("No se pudieron cargar los usuarios.");
      setAllUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAllUsers();
  }, []);

  const handleDownloadReport = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.REPORTS.EXPORT_USERS, {
        responseType: "blob",
        validateStatus: (s) => s >= 200 && s < 400,
      });

      const { data, headers } = response;
      const contentType = headers["content-type"] || "application/octet-stream";

      if (contentType.includes("application/json")) {
        const text = await new Response(data).text();
        let message = "No se pudo generar el reporte.";
        try {
          const json = JSON.parse(text);
          message = json?.message || message;
        } catch (error){
          console.error("Error parsing JSON:", error);
        }
        throw new Error(message);
      }

      let filename = "user_details.xlsx";
      const disp = headers["content-disposition"];
      if (disp) {
        const rx = /filename\*=(?:UTF-8'')?([^;]+)|filename=(?:"([^"]+)"|([^;]+))/i;
        const m = rx.exec(disp);
        const picked = m?.[1] || m?.[2] || m?.[3];
        if (picked) filename = decodeURIComponent(picked.trim());
      } else if (contentType.includes("text/csv")) {
        filename = "user_details.csv";
      }

      const blob = new Blob([data], { type: contentType });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error("Error downloading report:", error);
      alert(error?.message || "Error al descargar el reporte");
    }
  };

  return (
    <DashboardLayout activeMenu="Team Members">
      <div className="mt-5 mb-10">
        <div className="flex md:flex-row md:items-center justify-between">
          <h2 className="text-xl md:text-xl font-medium">Team Members</h2>
          <button className="flex download-btn" onClick={handleDownloadReport}>
            <LuFileSpreadsheet className="text-lg" />
            Download Report
          </button>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-slate-200/70 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && err && (
          <div className="mt-6 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
            {err}
          </div>
        )}

        {!loading && !err && allUsers.length === 0 && (
          <div className="mt-6 text-sm text-slate-600 border border-dashed border-slate-300 rounded-lg p-4">
            No hay usuarios aún. Agrega usuarios para verlos aquí.
          </div>
        )}

        {!loading && !err && allUsers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {allUsers.map((u) => (
              <UserCard key={u.id} userInfo={u} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ManageUser;
