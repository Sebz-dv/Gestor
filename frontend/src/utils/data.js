import {
  LuLayoutDashboard,
  LuUsers,
  LuClipboardCheck,
  LuSquarePlus,
  LuLogOut,
  LuSettings
} from "react-icons/lu";

export const SIDE_MENU_ADMIN_DATA = [
  {
    id: "01",
    label: "Dashboard",
    icon: LuLayoutDashboard,
    path: "/admin/dashboard",
  },
  {
    id: "02",
    label: "Administrador de Tareas",
    icon: LuClipboardCheck,
    path: "/admin/tasks",
  },
  {
    id: "03",
    label: "Crear Tareas",
    icon: LuSquarePlus,
    path: "/admin/create-tasks",
  },
  {
    id: "04",
    label: "Miembros del Equipo",
    icon: LuUsers,
    path: "/admin/users",
  },
  {
    id: "06",
    label: "Ajustes",
    icon: LuSettings ,
    path: "/admin/settings",
  },
  {
    id: "05",
    label: "Cerrar Sesión",
    icon: LuLogOut,
    path: "logout",
  },
];

export const SIDE_MENU_USER_DATA = [
  {
    id: "01",
    label: "Dashboard",
    icon: LuLayoutDashboard,
    path: "/user/dashboard",
  },
  {
    id: "02",
    label: "Mis Tareas",
    icon: LuClipboardCheck,
    path: "/user/tasks",
  },
  {
    id: "03",
    label: "Cerrar Sesión",
    icon: LuLogOut,
    path: "logout",
  },
];

export const PRIORITY_DATA = [
  { label: "Bajo", value: "Low" },
  { label: "Medio", value: "Medium" },
  { label: "Alto", value: "High" },
];

export const STATUS_DATA = [
  { label: "Pendiente", value: "Pending" },
  { label: "En Progreso", value: "In Progress" },
  { label: "Completado", value: "Completed" },
];
