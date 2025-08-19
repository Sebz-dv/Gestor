// controllers/reportController.js
const ExcelJS = require("exceljs");
const Task = require("../models/Task");
const User = require("../models/User");

// @desc   Export all tasks as an Excel file
// @route  GET /api/reports/export/tasks
// @access Private (Admin)
const exportTasksReport = async (req, res) => {
  try {
    const pool = req.app.locals.db;

    // 1) Trae TODAS las tareas (ajusta límite si hace falta)
    const tasks = await Task.list(pool, { limit: 1_000_000, offset: 0 });

    // 2) Resuelve nombres de usuarios (assignedTo/createdBy) en una sola query
    const userIds = new Set();
    for (const t of tasks) {
      if (t.assignedTo) userIds.add(t.assignedTo);
      if (t.createdBy) userIds.add(t.createdBy);
    }

    let userMap = new Map();
    if (userIds.size > 0) {
      const ids = Array.from(userIds);
      const [rows] = await pool.query(
        `SELECT id, name FROM users WHERE id IN (${ids.map(() => "?").join(",")})`,
        ids
      );
      userMap = new Map(rows.map((u) => [u.id, u.name]));
    }

    // 3) Excel
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Tasks");

    ws.columns = [
      { header: "ID", key: "id", width: 8 },
      { header: "Title", key: "title", width: 30 },
      { header: "Description", key: "description", width: 40 },
      { header: "Priority", key: "priority", width: 12 },
      { header: "Status", key: "status", width: 14 },
      { header: "Due Date", key: "dueDate", width: 20 },
      { header: "Progress", key: "progress", width: 10 },
      { header: "Assigned To (ID)", key: "assignedTo", width: 16 },
      { header: "Assigned To (Name)", key: "assignedName", width: 22 },
      { header: "Created By (ID)", key: "createdBy", width: 16 },
      { header: "Created By (Name)", key: "createdByName", width: 22 },
      { header: "Created At", key: "createdAt", width: 20 },
      { header: "Updated At", key: "updatedAt", width: 20 },
    ];

    for (const t of tasks) {
      ws.addRow({
        ...t,
        assignedName: t.assignedTo ? userMap.get(t.assignedTo) || null : null,
        createdByName: t.createdBy ? userMap.get(t.createdBy) || null : null,
        dueDate: t.dueDate ? new Date(t.dueDate) : null,
        createdAt: t.createdAt ? new Date(t.createdAt) : null,
        updatedAt: t.updatedAt ? new Date(t.updatedAt) : null,
      });
    }
    ws.getRow(1).font = { bold: true };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="tasks_${Date.now()}.xlsx"`
    );

    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: "Error exporting tasks", error: error.message });
  }
};

// @desc   Export user-task report as an Excel file
// @route  GET /api/reports/export/users
// @access Private (Admin)
const exportUsersReport = async (req, res) => {
  try {
    const pool = req.app.locals.db;

    // Usa el modelo: users + contadores (sin N+1)
    const rows = await User.listWithTaskCounts(pool, { limit: 1_000_000, offset: 0 });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Users");

    ws.columns = [
      { header: "ID", key: "id", width: 8 },
      { header: "Name", key: "name", width: 22 },
      { header: "Email", key: "email", width: 28 },
      { header: "Role", key: "role", width: 12 },
      { header: "Pending", key: "pendingTasks", width: 10 },
      { header: "In Progress", key: "inProgressTasks", width: 12 },
      { header: "Completed", key: "completedTasks", width: 12 },
      { header: "Created At", key: "createdAt", width: 20 },
      { header: "Updated At", key: "updatedAt", width: 20 },
    ];

    for (const u of rows) {
      ws.addRow({
        ...u,
        createdAt: u.createdAt ? new Date(u.createdAt) : null,
        updatedAt: u.updatedAt ? new Date(u.updatedAt) : null,
      });
    }
    ws.getRow(1).font = { bold: true };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="users_${Date.now()}.xlsx"`
    );

    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: "Error exporting users", error: error.message });
  }
};

module.exports = {
  exportTasksReport,
  exportUsersReport,
};
