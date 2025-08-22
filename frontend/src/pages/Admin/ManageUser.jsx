import React, { useEffect, useState } from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { LuFileSpreadsheet } from "react-icons/lu";
import UserCard from "../../components/Cards/UserCard";

const ManageUser = () => {
  const [allUsers, setAllUsers] = useState([]);

  const getAllUsers = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS);
      setAllUsers(response?.data ?? []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  useEffect(() => {
    getAllUsers();
  }, []);

  const handleDownloadReport = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.REPORTS.EXPORT_USERS, {
        responseType: "blob",
        // Opcional: deja pasar 3xx si tu backend redirige a S3 o similar
        validateStatus: (s) => s >= 200 && s < 400,
      });

      const { data, headers } = response;
      const contentType = headers["content-type"] || "application/octet-stream";

      // A veces el backend devuelve JSON de error pero con responseType=blob.
      if (contentType.includes("application/json")) {
        const text = await new Response(data).text();
        let message = "No se pudo generar el reporte.";
        try {
          const json = JSON.parse(text);
          message = json?.message || message;
        } catch (_) {}
        throw new Error(message);
      }

      // Nombre de archivo desde Content-Disposition si existe
      let filename = "user_details.xlsx";
      const disposition = headers["content-disposition"];
      if (disposition) {
        const match = /filename\*?=(?:UTF-8'')?("?)([^\";]+)\1/.exec(
          disposition
        );
        if (match?.[2]) filename = decodeURIComponent(match[2]);
      }

      const blob = new Blob([data], { type: contentType });
      const url = URL.createObjectURL(blob); // << O mayúscula, no cero

      // Descarga “a la vieja usanza”
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();

      // Revoca el objeto URL con un pequeño delay por seguridad
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error("Error downloading report:", error);
      // Si usas toast:
      // toast.error(error?.message || "Error al descargar el reporte");
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {allUsers.map((u) => (
            <UserCard key={u.id || u.email}>{u.name || u.email}</UserCard>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManageUser;
