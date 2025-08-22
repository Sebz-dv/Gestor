import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuArrowRight } from "react-icons/lu";
import { useUserAuth } from "../../hooks/useUserAuth";
import { UserContext } from "../../context/UserContext";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import moment from "moment";
import "moment/locale/es";
import { addThousandsSeparator } from "../../utils/helper";
import InfoCard from "../../components/Cards/InfoCard";
import TaskListTable from "../../components/TaskListTable";
import CustomPieChart from "../../components/Charts/CustomPieChart";
import CustomBarChart from "../../components/Charts/CustomBarChart";

const Dashboard = () => {
  useUserAuth();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pieChartData, setPieChartData] = useState([]);
  const [barChartData, setBarChartData] = useState([]);

  const COLORS = ["#8D51FF", "#00B8DB", "#7BCE00"];

  // --- Mapea los datos del backend ---
  const prepareChartData = (data = {}) => {
    const taskDistribution = data?.countsByStatus ?? {};
    const taskPriorityLevels = data?.countsByPriority ?? {};

    const getNum = (obj, ...keys) => {
      for (const k of keys) {
        const v = obj?.[k];
        if (v != null) return Number(v) || 0;
      }
      return 0;
    };

    const taskDistributionData = [
      { status: "Pending", count: getNum(taskDistribution, "Pending") },
      { status: "In Progress", count: getNum(taskDistribution, "InProgress", "In Progress") },
      { status: "Completed", count: getNum(taskDistribution, "Completed") },
    ];

    const priorityLevelData = [
      { priority: "Low", count: getNum(taskPriorityLevels, "Low") },
      { priority: "Medium", count: getNum(taskPriorityLevels, "Medium") },
      { priority: "High", count: getNum(taskPriorityLevels, "High") },
    ];

    setPieChartData(taskDistributionData);
    setBarChartData(priorityLevelData);
  };

  const getDashboardData = async () => {
    setError(null);
    setLoading(true);
    try {
      const { data } = await axiosInstance.get(API_PATHS.TASKS.GET_DASHBOARD_DATA);
      setDashboardData(data);
      prepareChartData(data);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("No se pudo cargar el dashboard. Intenta de nuevo en unos segundos.");
      setPieChartData([]);
      setBarChartData([]);
    } finally {
      setLoading(false);
    }
  };

  const onSeeMore = () => {
    navigate("/admin/tasks");
  };

  useEffect(() => {
    moment.locale("es");
    getDashboardData();
  }, []);

  // --- KPIs ---
  const counts = dashboardData?.countsByStatus ?? {};
  const totalTasks = Object.values(counts).reduce((acc, n) => acc + Number(n || 0), 0);
  const completed = Number(counts.Completed || 0);
  const pending = Number(counts.Pending || 0);
  const inProgress = Number(counts.InProgress || counts["In Progress"] || 0);

  return (
    <DashboardLayout activeMenu="Dashboard">
      {/* Contenedor principal */}
      <div className="card my-5 dark:bg-slate-900 dark:border-slate-800">
        <div className="col-span-3">
          <h2 className="text-xl md:text-2xl text-slate-900 dark:text-slate-100">
            ¡Buenos días! {user?.name}
          </h2>
          <p className="text-xs md:text-[13px] text-gray-500 dark:text-slate-400 mt-1.5">
            {moment().format("dddd, D [de] MMMM [de] YYYY")}
          </p>
        </div>

        {error && (
          <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3
                          dark:text-red-300 dark:bg-red-900/20 dark:border-red-800/50">
            {error}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mt-5">
          <InfoCard label="Tareas Totales" value={addThousandsSeparator(totalTasks)} color="bg-blue-500" />
          <InfoCard label="Pendientes" value={addThousandsSeparator(pending)} color="bg-violet-500" />
          <InfoCard label="En Progreso" value={addThousandsSeparator(inProgress)} color="bg-[#00B8DB]" />
          <InfoCard label="Completadas" value={addThousandsSeparator(completed)} color="bg-green-500" />
        </div>

        {/* Gráficas + tabla */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-4 md:my-6">
          <div>
            <div className="card dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h5 className="font-medium text-slate-800 dark:text-slate-100">Distribución de Tareas</h5>
              </div>
              <CustomPieChart data={pieChartData} colors={COLORS} />
            </div>
          </div>

          <div>
            <div className="card dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h5 className="font-medium text-slate-800 dark:text-slate-100">Niveles de Prioridad</h5>
              </div>
              <CustomBarChart data={barChartData} />
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="card dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h5 className="text-lg text-slate-800 dark:text-slate-100">Tareas Recientes</h5>
                <button
                  className="card-btn flex items-center gap-1 text-slate-700 hover:bg-slate-100
                             dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
                  onClick={onSeeMore}
                >
                  Ver todas <LuArrowRight className="text-base" />
                </button>
              </div>
              {/* El backend devuelve 'upcoming' */}
              <TaskListTable tableData={dashboardData?.upcoming || []} />
            </div>
          </div>
        </div>

        {loading && <div className="mt-3 text-sm text-gray-600 dark:text-slate-400">Cargando…</div>}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
