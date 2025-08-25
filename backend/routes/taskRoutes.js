// routes/taskRoutes.js
const express = require("express");
const { protect, adminOnly } = require("../middlewares/authMiddleware");
const {
  // Dashboard
  getDashboardData,
  getUserDashboardData,
  // CRUD & listing
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  updateTaskChecklist,
  // Time tracking
  startTaskTimer,
  stopTaskTimer,
  getTaskTime,
  getTaskHistory
} = require("../controllers/taskController");

const router = express.Router();

/* =========================
 *        DASHBOARD
 * ========================= */
router.get("/dashboard-data", protect, getDashboardData);
router.get("/user-dashboard-data", protect, getUserDashboardData);

/* =========================
 *      TASK MANAGEMENT
 * ========================= */
router.get("/", protect, getTasks);                // List (Admin: todas; User: asignadas)
router.get("/:id", protect, getTaskById);          // Get por ID
router.post("/", protect, adminOnly, createTask);  // Crear (solo Admin)
router.put("/:id", protect, updateTask);           // Update parcial
router.delete("/:id", protect, adminOnly, deleteTask); // Borrar (solo Admin)
router.put("/:id/status", protect, updateTaskStatus);  // Cambiar estado
router.put("/:id/todo", protect, updateTaskChecklist); // Actualizar checklist
router.get("/:id/history", protect, getTaskHistory);
/* =========================
 *       TIME TRACKING
 * ========================= */
// Inicia tu timer en una tarea
router.post("/:id/timer/start", protect, startTaskTimer);
// Detiene tu timer activo para esa tarea
router.post("/:id/timer/stop", protect, stopTaskTimer);
// Resumen de tiempo: totalSeconds y timers activos
router.get("/:id/timer", protect, getTaskTime);

module.exports = router;
