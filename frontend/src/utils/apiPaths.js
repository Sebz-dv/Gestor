// utils/apiPaths.js

export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const API_PATHS = {
  AUTH: {
    REGISTER: "/api/auth/register",
    LOGIN: "/api/auth/login",
    GET_PROFILE: "/api/auth/profile",
  },

  USERS: {
    GET_ALL_USERS: "/api/users",
    GET_USER_BY_ID: (userId) => `/api/users/${userId}`,
    CREATE_USER: "/api/users",
    UPDATE_USER: (userId) => `/api/users/${userId}`,
    DELETE_USER: (userId) => `/api/users/${userId}`,
  },

  TASKS: {
    GET_DASHBOARD_DATA: "/api/tasks/dashboard-data",
    GET_USER_DASHBOARD_DATA: "/api/tasks/user-dashboard-data",
    GET_ALL_TASKS: "/api/tasks",
    GET_TASK_BY_ID: (taskId) => `/api/tasks/${taskId}`,
    CREATE_TASK: "/api/tasks",
    UPDATE_TASK: (taskId) => `/api/tasks/${taskId}`,
    DELETE_TASK: (taskId) => `/api/tasks/${taskId}`,
    UPDATE_TASK_STATUS: (taskId) => `/api/tasks/${taskId}/status`,
    UPDATE_TODO_CHECKLIST: (taskId) => `/api/tasks/${taskId}/todo`,

    // --- Time Tracking ---
    START_TASK_TIMER: (taskId) => `/api/tasks/${taskId}/timer/start`,
    STOP_TASK_TIMER: (taskId) => `/api/tasks/${taskId}/timer/stop`,
    GET_TASK_TIME: (taskId) => `/api/tasks/${taskId}/timer`,
  },

  // --- Archivos por tarea ---
  TASK_FILES: {
    LIST: (taskId) => `/api/tasks/${taskId}/files`, // GET
    UPLOAD: (taskId) => `/api/tasks/${taskId}/files`, // POST (multipart, campo 'file')
    DOWNLOAD: (taskId, fileId) =>
      `/api/tasks/${taskId}/files/${fileId}/download`, // GET
    DELETE: (taskId, fileId) => `/api/tasks/${taskId}/files/${fileId}`, // DELETE
    UPDATE_TAGS: (taskId, fileId) =>
      `/api/tasks/${taskId}/files/${fileId}/tags`, // PUT (opcional)
  },

  REPORTS: {
    EXPORT_TASKS: "/api/reports/export/tasks",
    EXPORT_USERS: "/api/reports/export/users",
  },

  IMAGE: {
    UPLOAD_IMAGE: "/api/upload-image",
  },
};
