import React, { useEffect, useState } from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
// import { LuFileSpreadsheet } from "react-icons/lu"; // <- quítalo si no lo usas
import TaskStatusTabs from "../../components/TaskStatusTabs";
import TaskCard from "../../components/Cards/TaskCard";

const safeParseJSON = (val, fallback) => {
  if (Array.isArray(val)) return val;
  if (typeof val !== "string") return fallback;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const toArray = (val) => {
  if (Array.isArray(val)) return val;
  if (val === null || val === undefined || val === "") return [];
  return [val];
};

const normalizeTask = (raw) => {
  const attachmentsArr = safeParseJSON(raw.attachments, []);
  const assignedArr = toArray(raw.assignedTo);

  return {
    id: raw.id ?? raw._id, // <-- aquí ya resolvemos el id
    title: raw.title ?? "",
    description: raw.description ?? "",
    priority: raw.priority ?? "Low",
    status: raw.status ?? "Pending",
    progress: Number(raw.progress ?? 0),
    createdAt: raw.createdAt ?? raw.created_at ?? null,
    dueDate: raw.dueDate ?? raw.due_date ?? null,
    assignedTo: assignedArr,
    attachments: attachmentsArr,
    completedTodoCount: Number(raw.completedTodoCount ?? 0),
    todoChecklist: safeParseJSON(raw.todoChecklist, []),
  };
};

const MyTasks = () => {
  const [allTasks, setAllTasks] = useState([]);
  const [tabs, setTabs] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All");
  const navigate = useNavigate();

  const getAllTasks = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.TASKS.GET_ALL_TASKS, {
        params: { status: filterStatus === "All" ? undefined : filterStatus },
      });

      const payload = response.data;
      const list = Array.isArray(payload?.task)
        ? payload.task
        : Array.isArray(payload)
        ? payload
        : [];

      const normalized = list.map(normalizeTask);
      setAllTasks(normalized);

      // LOG para validar IDs normalizados
      console.groupCollapsed("[MyTasks] Tareas normalizadas");
      console.table(
        normalized.map((t) => ({ id: t.id, title: t.title, status: t.status }))
      );
      console.groupEnd();

      const ss = payload?.statusSummary ?? null;
      const computedTabs = [
        { label: "All", count: ss?.all ?? normalized.length },
        {
          label: "Pending",
          count:
            ss?.pending ??
            normalized.filter((t) => t.status === "Pending").length,
        },
        {
          label: "In Progress",
          count:
            ss?.inProgress ??
            normalized.filter((t) => t.status === "In Progress").length,
        },
        {
          label: "Completed",
          count:
            ss?.completed ??
            normalized.filter((t) => t.status === "Completed").length,
        },
      ];
      setTabs(computedTabs);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const handleClick = (taskId) => {
    console.groupCollapsed("[MyTasks] Click en TaskCard");
    console.log("taskId recibido =>", taskId, "| typeof:", typeof taskId);
    const url = `/user/tasks-details/${taskId}`;
    console.log("navigate URL =>", url);
    console.groupEnd();

    if (
      taskId === undefined ||
      taskId === null ||
      String(taskId).trim() === "" ||
      String(taskId) === "undefined"
    ) {
      console.warn("[MyTasks] taskId inválido, no navegamos.");
      return;
    }

    navigate(url, { state: { taskId } });
  };

  useEffect(() => {
    getAllTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  return (
    <DashboardLayout activeMenu="My Tasks">
      <div className="my-5">
        <h2 className="text-xl font-semibold">My Tasks</h2>

        {tabs?.length > 0 && (
          <TaskStatusTabs
            tabs={tabs}
            activeTab={filterStatus}
            setActiveTab={setFilterStatus}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          {allTasks?.map((item) => (
            <TaskCard
              key={item.id}
              title={item.title}
              description={item.description}
              priority={item.priority}
              status={item.status}
              progress={item.progress}
              createdAt={item.createdAt}
              dueDate={item.dueDate}
              assignedTo={item.assignedTo}
              attachmentCount={item.attachments?.length || 0}
              completedTodoCount={item.completedTodoCount || 0}
              todoChecklist={item.todoChecklist || []}
              onClick={() => handleClick(item.id)}
            />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MyTasks;
