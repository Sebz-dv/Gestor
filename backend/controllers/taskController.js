// controllers/taskController.js
const Task = require("../models/Task");

// enums válidos (de tu esquema)
const VALID_PRIORITIES = new Set(["Low", "Medium", "High"]);
const VALID_STATUSES   = new Set(["Pending", "In Progress", "Completed"]);

const isAdmin = (req) => req.user?.role === "admin";
const toDate = (d) => (d ? new Date(d) : null);

/* =========================
 *  DASHBOARD (ADMIN / USER)
 * ========================= */

// @desc    Métricas globales para admin (conteos, overdue, etc.)
// @route   GET /api/tasks/dashboard-data
// @access  Private (Admin via router)
const getDashboardData = async (req, res, next) => {
  try {
    const pool = req.app.locals.db;

    // Totales por status
    const [byStatus] = await pool.query(`
      SELECT status, COUNT(*) AS cnt
      FROM tasks
      GROUP BY status
    `);

    // Totales por priority
    const [byPriority] = await pool.query(`
      SELECT priority, COUNT(*) AS cnt
      FROM tasks
      GROUP BY priority
    `);

    // Overdue (vencidas no completadas)
    const [overdue] = await pool.query(`
      SELECT COUNT(*) AS cnt
      FROM tasks
      WHERE status <> 'Completed' AND due_date < NOW()
    `);

    // Próximas 10 por vencer
    const [upcoming] = await pool.query(`
      SELECT id, title, status, priority, due_date AS dueDate, assigned_to AS assignedTo
      FROM tasks
      WHERE status <> 'Completed'
      ORDER BY due_date ASC
      LIMIT 10
    `);

    res.json({
      countsByStatus: Object.fromEntries(byStatus.map(r => [r.status, Number(r.cnt)])),
      countsByPriority: Object.fromEntries(byPriority.map(r => [r.priority, Number(r.cnt)])),
      overdue: Number(overdue[0]?.cnt || 0),
      upcoming,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Métricas para el usuario autenticado (asignadas a él)
// @route   GET /api/tasks/user-dashboard-data
// @access  Private
const getUserDashboardData = async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const uid = req.user?.id;

    // Totales por status para ese usuario
    const [byStatus] = await pool.query(`
      SELECT status, COUNT(*) AS cnt
      FROM tasks
      WHERE assigned_to = ?
      GROUP BY status
    `, [uid]);

    // Overdue para ese usuario
    const [overdue] = await pool.query(`
      SELECT COUNT(*) AS cnt
      FROM tasks
      WHERE assigned_to = ? AND status <> 'Completed' AND due_date < NOW()
    `, [uid]);

    // Próximas 10 por vencer para el usuario
    const [upcoming] = await pool.query(`
      SELECT id, title, status, priority, due_date AS dueDate
      FROM tasks
      WHERE assigned_to = ? AND status <> 'Completed'
      ORDER BY due_date ASC
      LIMIT 10
    `, [uid]);

    res.json({
      countsByStatus: Object.fromEntries(byStatus.map(r => [r.status, Number(r.cnt)])),
      overdue: Number(overdue[0]?.cnt || 0),
      upcoming,
    });
  } catch (err) {
    next(err);
  }
};

/* =============
 *  LIST / READ
 * ============= */

// @desc    Lista tareas (Admin: todas; User: solo asignadas)
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res, next) => {
  try {
    const pool = req.app.locals.db;

    // filtros opcionales
    const { status, priority, search, dueFrom, dueTo, limit = 50, offset = 0, assignedTo } = req.query;

    // Admin ve todo, user solo las asignadas a él (a menos que sea admin)
    const where = [];
    const args = [];

    if (!isAdmin(req)) {
      where.push("assigned_to = ?");
      args.push(req.user.id);
    } else if (assignedTo) { // admin puede filtrar por assignedTo
      where.push("assigned_to = ?");
      args.push(Number(assignedTo));
    }

    if (status && VALID_STATUSES.has(status)) {
      where.push("status = ?");
      args.push(status);
    }
    if (priority && VALID_PRIORITIES.has(priority)) {
      where.push("priority = ?");
      args.push(priority);
    }
    if (search) {
      where.push("(title LIKE ? OR description LIKE ?)");
      args.push(`%${search}%`, `%${search}%`);
    }
    if (dueFrom) {
      where.push("due_date >= ?");
      args.push(new Date(dueFrom));
    }
    if (dueTo) {
      where.push("due_date <= ?");
      args.push(new Date(dueTo));
    }

    const sql =
      `SELECT id, title, description, priority, status, due_date AS dueDate,
              assigned_to AS assignedTo, created_by AS createdBy, attachments,
              progress, created_at AS createdAt, updated_at AS updatedAt
       FROM tasks
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY due_date ASC
       LIMIT ? OFFSET ?`;
    args.push(Number(limit), Number(offset));

    const [rows] = await pool.query(sql, args);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// @desc    Obtener tarea por id (incluye checklist)
// @route   GET /api/tasks/:id
// @access  Private
const getTaskById = async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "ID inválido" });

    const task = await Task.findById(pool, id);
    if (!task) return res.status(404).json({ message: "Task no encontrada" });

    // Autorización: user puede leer solo si es admin o asignado/creador
    if (!isAdmin(req) && task.assignedTo !== req.user.id && task.createdBy !== req.user.id) {
      return res.status(403).json({ message: "No autorizado" });
    }

    res.json(task);
  } catch (err) {
    next(err);
  }
};

/* =============
 *  CREATE / PUT
 * ============= */

// @desc    Crear tarea (Admin)
// @route   POST /api/tasks
// @access  Private (Admin en router)
const createTask = async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const { title, description, priority = "Medium", status = "Pending", dueDate, assignedTo, attachments, todoChecklist = [] } = req.body;

    if (!title || !dueDate) {
      return res.status(400).json({ message: "title y dueDate son obligatorios" });
    }
    if (!VALID_PRIORITIES.has(priority)) {
      return res.status(400).json({ message: "priority inválida" });
    }
    if (!VALID_STATUSES.has(status)) {
      return res.status(400).json({ message: "status inválido" });
    }

    const task = await Task.create(pool, {
      title: String(title).trim(),
      description: description ?? null,
      priority,
      status,
      dueDate: toDate(dueDate),
      assignedTo: assignedTo ? Number(assignedTo) : null,
      createdBy: req.user?.id || null,
      attachments: attachments ?? null, // puedes mandar JSON.stringify([...])
      progress: 0,
      todoChecklist: Array.isArray(todoChecklist) ? todoChecklist : [],
    });

    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
};

// @desc    Actualizar campos de la tarea
// @route   PUT /api/tasks/:id
// @access  Private (admin o usuario asignado con permisos limitados)
const updateTask = async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "ID inválido" });

    const existing = await Task.findById(pool, id);
    if (!existing) return res.status(404).json({ message: "Task no encontrada" });

    const admin = isAdmin(req);
    const isAssigneeOrCreator = existing.assignedTo === req.user.id || existing.createdBy === req.user.id;

    if (!admin && !isAssigneeOrCreator) {
      return res.status(403).json({ message: "No autorizado" });
    }

    const patch = {};
    const { title, description, priority, status, dueDate, assignedTo, attachments, progress } = req.body;

    // Admin puede todo; user (miembro) solo algunos campos
    if (admin) {
      if (title !== undefined) patch.title = String(title).trim();
      if (description !== undefined) patch.description = description ?? null;
      if (priority !== undefined) {
        if (!VALID_PRIORITIES.has(priority)) return res.status(400).json({ message: "priority inválida" });
        patch.priority = priority;
      }
      if (status !== undefined) {
        if (!VALID_STATUSES.has(status)) return res.status(400).json({ message: "status inválido" });
        patch.status = status;
      }
      if (dueDate !== undefined) patch.dueDate = toDate(dueDate);
      if (assignedTo !== undefined) patch.assignedTo = assignedTo ? Number(assignedTo) : null;
      if (attachments !== undefined) patch.attachments = attachments ?? null;
      if (progress !== undefined) {
        const p = Number(progress);
        if (!(p >= 0 && p <= 100)) return res.status(400).json({ message: "progress debe ser 0..100" });
        patch.progress = p;
      }
    } else {
      // miembro: solo algunos campos
      if (description !== undefined) patch.description = description ?? null;
      if (attachments !== undefined) patch.attachments = attachments ?? null;
      if (progress !== undefined) {
        const p = Number(progress);
        if (!(p >= 0 && p <= 100)) return res.status(400).json({ message: "progress debe ser 0..100" });
        patch.progress = p;
      }
      // status y checklist tienen endpoints dedicados
    }

    const updated = await Task.updateById(pool, id, patch);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// @desc    Borrar tarea (Admin)
// @route   DELETE /api/tasks/:id
// @access  Private (Admin via router)
const deleteTask = async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "ID inválido" });

    const ok = await Task.deleteById(pool, id);
    if (!ok) return res.status(404).json({ message: "Task no encontrada" });

    res.json({ message: "Task eliminada" });
  } catch (err) {
    next(err);
  }
};

/* =================
 *  STATUS / CHECKLIST
 * ================= */

// @desc    Actualizar status (y opcional progress)
// @route   PUT /api/tasks/:id/status
// @access  Private (admin o asignado)
const updateTaskStatus = async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const id = Number(req.params.id);
    const { status, progress } = req.body || {};
    if (!Number.isFinite(id)) return res.status(400).json({ message: "ID inválido" });
    if (!status || !VALID_STATUSES.has(status)) {
      return res.status(400).json({ message: "status inválido" });
    }

    const existing = await Task.findById(pool, id);
    if (!existing) return res.status(404).json({ message: "Task no encontrada" });

    // admin o asignado
    if (!isAdmin(req) && existing.assignedTo !== req.user.id) {
      return res.status(403).json({ message: "No autorizado" });
    }

    const patch = { status };
    if (progress !== undefined) {
      const p = Number(progress);
      if (!(p >= 0 && p <= 100)) return res.status(400).json({ message: "progress debe ser 0..100" });
      patch.progress = p;
    }

    const updated = await Task.updateById(pool, id, patch);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// @desc    Reemplazar checklist (array de items)
// @route   PUT /api/tasks/:id/todo
// @access  Private (admin o asignado)
const updateTaskChecklist = async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const id = Number(req.params.id);
    const items = Array.isArray(req.body?.items) ? req.body.items : null;

    if (!Number.isFinite(id)) return res.status(400).json({ message: "ID inválido" });
    if (!items) return res.status(400).json({ message: "items debe ser un array" });

    const task = await Task.findById(pool, id);
    if (!task) return res.status(404).json({ message: "Task no encontrada" });

    // admin o asignado
    if (!isAdmin(req) && task.assignedTo !== req.user.id) {
      return res.status(403).json({ message: "No autorizado" });
    }

    // Estado actual
    const existing = task.todoChecklist || [];
    const existingMap = new Map(existing.map(t => [t.id, t]));

    // IDs recibidos
    const incomingIds = new Set(
      items.filter(i => i.id != null).map(i => Number(i.id))
    );

    // 1) Elimina los que ya no están
    for (const old of existing) {
      if (!incomingIds.has(old.id)) {
        await Task.deleteTodo(pool, old.id);
      }
    }

    // 2) Agrega/actualiza los que vienen
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const payload = {
        text: String(it.text || "").trim(),
        completed: !!it.completed,
        sortOrder: Number.isFinite(Number(it.sortOrder)) ? Number(it.sortOrder) : i,
      };
      if (!payload.text) continue;

      if (it.id && existingMap.has(Number(it.id))) {
        await Task.updateTodo(pool, Number(it.id), payload);
      } else {
        await Task.addTodo(pool, id, payload);
      }
    }

    const updated = await Task.findById(pool, id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboardData,
  getUserDashboardData,
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  updateTaskChecklist,
};
