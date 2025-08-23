// controllers/taskController.js
const Task = require("../models/Task");

const VALID_PRIORITIES = new Set(["Low", "Medium", "High"]);
const VALID_STATUSES = new Set(["Pending", "In Progress", "Completed"]);

const isAdmin = (req) => req.user?.role === "admin";
const toDate = (d) => (d ? new Date(d) : null);

// --- helpers ---
const parseJSON = (v, fb = []) => {
  try {
    return Array.isArray(v) ? v : v ? JSON.parse(v) : fb;
  } catch {
    return fb;
  }
};
const isAssignee = (task, uid) => {
  const arr = Array.isArray(task.assignedTo)
    ? task.assignedTo
    : parseJSON(task.assignedTo, []);
  return arr.includes(uid);
};

/* =========================
 *  DASHBOARD (ADMIN / USER)
 * ========================= */

const getDashboardData = async (req, res, next) => {
  try {
    const pool = req.app.locals.db;

    const [byStatus] = await pool.query(`
      SELECT status, COUNT(*) AS cnt
      FROM tasks
      GROUP BY status
    `);

    const [byPriority] = await pool.query(`
      SELECT priority, COUNT(*) AS cnt
      FROM tasks
      GROUP BY priority
    `);

    const [overdue] = await pool.query(`
      SELECT COUNT(*) AS cnt
      FROM tasks
      WHERE status <> 'Completed' AND due_date < NOW()
    `);

    const [upcoming] = await pool.query(`
      SELECT id, title, status, priority, due_date AS dueDate, assigned_to AS assignedTo
      FROM tasks
      WHERE status <> 'Completed'
      ORDER BY due_date ASC
      LIMIT 10
    `);

    res.json({
      countsByStatus: Object.fromEntries(
        byStatus.map((r) => [r.status, Number(r.cnt)])
      ),
      countsByPriority: Object.fromEntries(
        byPriority.map((r) => [r.priority, Number(r.cnt)])
      ),
      overdue: Number(overdue[0]?.cnt || 0),
      upcoming,
    });
  } catch (err) {
    next(err);
  }
};

// Métricas para el usuario autenticado (asignadas a él)
const getUserDashboardData = async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const uid = Number(req.user?.id);

    const [byStatus] = await pool.query(
      `
      SELECT status, COUNT(*) AS cnt
      FROM tasks
      WHERE assigned_to IS NOT NULL
        AND JSON_CONTAINS(assigned_to, JSON_ARRAY(?))
      GROUP BY status
    `,
      [uid]
    );

    const [overdue] = await pool.query(
      `
      SELECT COUNT(*) AS cnt
      FROM tasks
      WHERE assigned_to IS NOT NULL
        AND JSON_CONTAINS(assigned_to, JSON_ARRAY(?))
        AND status <> 'Completed'
        AND due_date < NOW()
    `,
      [uid]
    );

    const [upcoming] = await pool.query(
      `
      SELECT id, title, status, priority, due_date AS dueDate
      FROM tasks
      WHERE assigned_to IS NOT NULL
        AND JSON_CONTAINS(assigned_to, JSON_ARRAY(?))
        AND status <> 'Completed'
      ORDER BY due_date ASC
      LIMIT 10
    `,
      [uid]
    );

    res.json({
      countsByStatus: Object.fromEntries(
        byStatus.map((r) => [r.status, Number(r.cnt)])
      ),
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

// Lista tareas (Admin: todas; User: solo asignadas)
const getTasks = async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const {
      status,
      priority,
      search,
      dueFrom,
      dueTo,
      limit = 50,
      offset = 0,
      assignedTo,
    } = req.query;

    const where = [];
    const args = [];

    if (!isAdmin(req)) {
      where.push(
        `t.assigned_to IS NOT NULL AND JSON_CONTAINS(t.assigned_to, JSON_ARRAY(?))`
      );
      args.push(Number(req.user.id));
    } else if (assignedTo) {
      where.push(
        `t.assigned_to IS NOT NULL AND JSON_CONTAINS(t.assigned_to, JSON_ARRAY(?))`
      );
      args.push(Number(assignedTo));
    }

    if (status && VALID_STATUSES.has(status)) {
      where.push("t.status = ?");
      args.push(status);
    }
    if (priority && VALID_PRIORITIES.has(priority)) {
      where.push("t.priority = ?");
      args.push(priority);
    }
    if (search) {
      where.push("(t.title LIKE ? OR t.description LIKE ?)");
      args.push(`%${search}%`, `%${search}%`);
    }
    if (dueFrom) {
      where.push("t.due_date >= ?");
      args.push(new Date(dueFrom));
    }
    if (dueTo) {
      where.push("t.due_date <= ?");
      args.push(new Date(dueTo));
    }

    const sql = `
      SELECT
        t.id,
        t.title,
        t.description,
        t.priority,
        t.status,
        t.due_date     AS dueDate,
        t.assigned_to  AS assignedTo,
        t.created_by   AS createdBy,
        t.attachments,
        t.progress,
        t.created_at   AS createdAt,
        t.updated_at   AS updatedAt,
        COALESCE(agg.todoCount, 0)            AS todoCount,
        COALESCE(agg.completedTodoCount, 0)   AS completedTodoCount
      FROM tasks t
      LEFT JOIN (
        SELECT
          td.task_id,
          COUNT(*) AS todoCount,
          SUM(CASE WHEN td.completed = 1 THEN 1 ELSE 0 END) AS completedTodoCount
        FROM task_todos td
        GROUP BY td.task_id
      ) agg ON agg.task_id = t.id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY t.due_date ASC
      LIMIT ? OFFSET ?
    `;
    args.push(Number(limit), Number(offset));

    const [rows] = await pool.query(sql, args);

    const normalized = rows.map((r) => ({
      ...r,
      assignedTo: parseJSON(r.assignedTo, []),
      attachments: parseJSON(r.attachments, []),
      todoTotalCount: Number(r.todoCount || 0),
      completedTodoCount: Number(r.completedTodoCount || 0),
    }));

    res.json(normalized);
  } catch (err) {
    next(err);
  }
};

// Obtener tarea por id (incluye checklist) + auth con arrays
const getTaskById = async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const id = Number(req.params.id);
    if (!Number.isFinite(id))
      return res.status(400).json({ message: "ID inválido" });

    const task = await Task.findById(pool, id);
    if (!task) return res.status(404).json({ message: "Task no encontrada" });

    const admin = isAdmin(req);
    theAssignee = isAssignee(task, Number(req.user.id));
    const assignee = theAssignee; // para consistencia
    const creator = Number(task.createdBy) === Number(req.user.id);

    if (!admin && !assignee && !creator) {
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

// Crear tarea (Admin)
const createTask = async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const {
      title,
      description,
      priority = "Medium",
      status = "Pending",
      dueDate,
      assignedTo,
      attachments,
      todoChecklist = [],
    } = req.body;

    if (!title || !dueDate) {
      return res
        .status(400)
        .json({ message: "title y dueDate son obligatorios" });
    }
    if (!VALID_PRIORITIES.has(priority)) {
      return res.status(400).json({ message: "priority inválida" });
    }
    if (!VALID_STATUSES.has(status)) {
      return res.status(400).json({ message: "status inválido" });
    }

    // 👇 acepta array, número o nada
    const assignees = Array.isArray(assignedTo)
      ? assignedTo
      : assignedTo == null
      ? []
      : [Number(assignedTo)];

    const task = await Task.create(pool, {
      title: String(title).trim(),
      description: description ?? null,
      priority,
      status,
      dueDate: toDate(dueDate),
      assignedTo: assignees, // 👈 pasa array al model
      createdBy: req.user?.id || null,
      attachments: attachments ?? null,
      progress: 0,
      todoChecklist: Array.isArray(todoChecklist) ? todoChecklist : [],
    });

    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
};

// Actualizar tarea
const updateTask = async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const id = Number(req.params.id);
    if (!Number.isFinite(id))
      return res.status(400).json({ message: "ID inválido" });

    const existing = await Task.findById(pool, id);
    if (!existing)
      return res.status(404).json({ message: "Task no encontrada" });

    const admin = isAdmin(req);
    const assignee = isAssignee(existing, Number(req.user.id));
    const creator = Number(existing.createdBy) === Number(req.user.id);

    if (!admin && !assignee && !creator) {
      return res.status(403).json({ message: "No autorizado" });
    }

    const patch = {};
    const {
      title,
      description,
      priority,
      status,
      dueDate,
      assignedTo,
      attachments,
      progress,
    } = req.body;

    if (admin) {
      if (title !== undefined) patch.title = String(title).trim();
      if (description !== undefined) patch.description = description ?? null;
      if (priority !== undefined) {
        if (!VALID_PRIORITIES.has(priority))
          return res.status(400).json({ message: "priority inválida" });
        patch.priority = priority;
      }
      if (status !== undefined) {
        if (!VALID_STATUSES.has(status))
          return res.status(400).json({ message: "status inválido" });
        patch.status = status;
      }
      if (dueDate !== undefined) patch.dueDate = toDate(dueDate);
      if (assignedTo !== undefined) {
        patch.assignedTo = Array.isArray(assignedTo)
          ? assignedTo
          : assignedTo == null
          ? []
          : [Number(assignedTo)]; // 👈 array
      }
      if (attachments !== undefined) patch.attachments = attachments ?? null;
      if (progress !== undefined) {
        const p = Number(progress);
        if (!(p >= 0 && p <= 100))
          return res.status(400).json({ message: "progress debe ser 0..100" });
        patch.progress = p;
      }
    } else {
      if (description !== undefined) patch.description = description ?? null;
      if (attachments !== undefined) patch.attachments = attachments ?? null;
      if (progress !== undefined) {
        const p = Number(progress);
        if (!(p >= 0 && p <= 100))
          return res.status(400).json({ message: "progress debe ser 0..100" });
        patch.progress = p;
      }
    }

    const updated = await Task.updateById(pool, id, patch);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// Borrar tarea (Admin)
const deleteTask = async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const id = Number(req.params.id);
    if (!Number.isFinite(id))
      return res.status(400).json({ message: "ID inválido" });

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

const updateTaskStatus = async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const id = Number(req.params.id);
    const { status, progress } = req.body || {};
    if (!Number.isFinite(id))
      return res.status(400).json({ message: "ID inválido" });
    if (!status || !VALID_STATUSES.has(status)) {
      return res.status(400).json({ message: "status inválido" });
    }

    const existing = await Task.findById(pool, id);
    if (!existing)
      return res.status(404).json({ message: "Task no encontrada" });

    const admin = isAdmin(req);
    const assignee = isAssignee(existing, Number(req.user.id));
    if (!admin && !assignee) {
      return res.status(403).json({ message: "No autorizado" });
    }

    const patch = { status };
    if (progress !== undefined) {
      const p = Number(progress);
      if (!(p >= 0 && p <= 100))
        return res.status(400).json({ message: "progress debe ser 0..100" });
      patch.progress = p;
    }

    const updated = await Task.updateById(pool, id, patch);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// helper (arriba, junto a los otros)
const deriveStatusProgress = (todos = []) => {
  const total = Array.isArray(todos) ? todos.length : 0;
  const done = Array.isArray(todos)
    ? todos.filter((t) => !!t?.completed).length
    : 0;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  let status = "Pending";
  if (total > 0 && done === total) status = "Completed";
  else if (done > 0) status = "In Progress";

  return { status, progress };
};

// =================  PATCH: updateTaskChecklist  =================
const updateTaskChecklist = async (req, res, next) => {
  let conn;
  try {
    const pool = req.app.locals.db;
    const id = Number(req.params.id);
    const itemsRaw = req.body?.items;

    if (!Number.isFinite(id))
      return res.status(400).json({ message: "ID inválido" });
    if (!Array.isArray(itemsRaw))
      return res.status(400).json({ message: "items debe ser un array" });

    const task = await Task.findById(pool, id);
    if (!task) return res.status(404).json({ message: "Task no encontrada" });

    const admin = isAdmin(req);
    const assignee = isAssignee(task, Number(req.user.id));
    if (!admin && !assignee) {
      return res.status(403).json({ message: "No autorizado" });
    }

    // IDs existentes reales en DB
    const existing = Array.isArray(task.todoChecklist)
      ? task.todoChecklist
      : [];
    const existingIdSet = new Set(existing.map((t) => Number(t.id)));

    // Normaliza entrada: SOLO conserva id si existe en DB
    const items = itemsRaw
      .map((it, i) => {
        const idNum =
          it?.id === null || it?.id === undefined || it?.id === ""
            ? null
            : Number(it.id);
        const keepId =
          Number.isFinite(idNum) && existingIdSet.has(idNum) ? idNum : null;

        return {
          id: keepId, // null si es nuevo
          text: String(it?.text ?? "").trim(),
          completed: !!it?.completed,
          sortOrder: Number.isFinite(Number(it?.sortOrder))
            ? Number(it.sortOrder)
            : i,
        };
      })
      .filter((it) => it.text.length > 0);

    const incomingExistingIds = new Set(
      items.filter((it) => it.id != null).map((it) => it.id)
    );

    const toDelete = [...existingIdSet].filter(
      (eid) => !incomingExistingIds.has(eid)
    );
    const toUpdate = items.filter((it) => it.id != null);
    const toInsert = items.filter((it) => it.id == null);

    conn = await pool.getConnection();
    await conn.beginTransaction();

    // DELETE los que ya no vienen
    for (const delId of toDelete) {
      await Task.deleteTodo(conn, Number(delId));
    }

    // UPDATE los que traen id válido
    for (const u of toUpdate) {
      await Task.updateTodo(conn, Number(u.id), {
        text: u.text,
        completed: u.completed,
        sortOrder: u.sortOrder,
      });
    }

    // INSERT nuevos
    for (const ins of toInsert) {
      await Task.addTodo(conn, id, {
        text: ins.text,
        completed: ins.completed,
        sortOrder: ins.sortOrder,
      });
    }

    // Relee, deriva y persiste status/progress
    const after = await Task.findById(conn, id);
    const todos = Array.isArray(after?.todoChecklist)
      ? after.todoChecklist
      : [];
    const { status, progress } = deriveStatusProgress(todos);
    await Task.updateById(conn, id, { status, progress });

    await conn.commit();

    // Respuesta final normalizada
    const updated = await Task.findById(pool, id);
    return res.json(updated);
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
      } catch (_) {}
    }
    console.error("[updateTaskChecklist] error:", err);
    return next(err);
  } finally {
    if (conn) {
      try {
        conn.release();
      } catch (_) {}
    }
  }
};

/* =================
 *   TIME TRACKING
 * ================= */

// START timer
const startTaskTimer = async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const taskId = Number(req.params.id);
    if (!Number.isFinite(taskId))
      return res.status(400).json({ message: "ID inválido" });

    const task = await Task.findById(pool, taskId);
    if (!task) return res.status(404).json({ message: "Task no encontrada" });

    const admin = isAdmin(req);
    const assignee = isAssignee(task, Number(req.user.id));
    const creator = Number(task.createdBy) === Number(req.user.id);
    if (!admin && !assignee && !creator)
      return res.status(403).json({ message: "No autorizado" });

    await Task.startTaskTimer(pool, taskId, Number(req.user.id));
    const summary = await Task.getTaskTimeSummary(pool, taskId);
    res.json({ message: "Timer iniciado", ...summary });
  } catch (err) {
    if (String(err.message || "").includes("temporizador activo")) {
      return res.status(409).json({ message: err.message });
    }
    next(err);
  }
};

// STOP timer
const stopTaskTimer = async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const taskId = Number(req.params.id);
    if (!Number.isFinite(taskId))
      return res.status(400).json({ message: "ID inválido" });

    const task = await Task.findById(pool, taskId);
    if (!task) return res.status(404).json({ message: "Task no encontrada" });

    const admin = isAdmin(req);
    const assignee = isAssignee(task, Number(req.user.id));
    const creator = Number(task.createdBy) === Number(req.user.id);
    if (!admin && !assignee && !creator)
      return res.status(403).json({ message: "No autorizado" });

    const secs = await Task.stopTaskTimer(pool, taskId, Number(req.user.id));
    const summary = await Task.getTaskTimeSummary(pool, taskId);
    res.json({ message: "Timer detenido", lastSpanSeconds: secs, ...summary });
  } catch (err) {
    if (String(err.message || "").includes("No hay temporizador activo")) {
      return res.status(409).json({ message: err.message });
    }
    next(err);
  }
};

// SUMMARY
const getTaskTime = async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const taskId = Number(req.params.id);
    if (!Number.isFinite(taskId))
      return res.status(400).json({ message: "ID inválido" });

    const task = await Task.findById(pool, taskId);
    if (!task) return res.status(404).json({ message: "Task no encontrada" });

    const admin = isAdmin(req);
    const assignee = isAssignee(task, Number(req.user.id));
    const creator = Number(task.createdBy) === Number(req.user.id);
    if (!admin && !assignee && !creator)
      return res.status(403).json({ message: "No autorizado" });

    const summary = await Task.getTaskTimeSummary(pool, taskId);
    res.json(summary);
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
  // time tracking
  startTaskTimer,
  stopTaskTimer,
  getTaskTime,
};
