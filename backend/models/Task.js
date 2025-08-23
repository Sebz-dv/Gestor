// models/taskModel.js
// Requiere: mysql2/promise y un pool (req.app.locals.db)

const TASK_FIELDS =
  "id, title, description, priority, status, due_date AS dueDate, assigned_to AS assignedTo, created_by AS createdBy, attachments, progress, created_at AS createdAt, updated_at AS updatedAt";

// --- helpers ---
const parseJSON = (val, fallback = []) => {
  if (Array.isArray(val)) return val;
  if (val == null || val === "") return fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
};

const toJsonIds = (input) => {
  const arr = Array.isArray(input) ? input : input == null ? [] : [input];
  const ids = arr
    .map((x) =>
      typeof x === "number"
        ? x
        : typeof x === "string"
        ? Number(x)
        : typeof x === "object"
        ? Number(x?.id ?? x?.value ?? x?.userId ?? x?.user_id ?? NaN)
        : NaN
    )
    .filter((n) => Number.isFinite(n) && n > 0 && n < 1e9);
  return JSON.stringify([...new Set(ids)]);
};

const toJsonAny = (val) => {
  if (val == null) return JSON.stringify([]);
  if (typeof val === "string") {
    try {
      JSON.parse(val);
      return val; // ya es JSON válido
    } catch {
      return JSON.stringify([val]); // texto simple -> array
    }
  }
  return JSON.stringify(val);
};

async function ensureTables(pool) {
  // Crea tablas si no existen (assigned_to ya en JSON para nuevas instalaciones)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      description TEXT NULL,
      priority ENUM('Low','Medium','High') NOT NULL DEFAULT 'Medium',
      status   ENUM('Pending','In Progress','Completed') NOT NULL DEFAULT 'Pending',
      due_date DATETIME NOT NULL,
      assigned_to JSON NULL,
      created_by  BIGINT UNSIGNED NULL,
      attachments TEXT NULL, -- JSON string o rutas
      progress TINYINT UNSIGNED NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_status (status),
      INDEX idx_due_date (due_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS task_todos (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      task_id BIGINT UNSIGNED NOT NULL,
      text VARCHAR(500) NOT NULL,
      completed TINYINT(1) NOT NULL DEFAULT 0,
      sort_order INT UNSIGNED NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_task (task_id),
      CONSTRAINT fk_todos_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // --- time tracking ---
  await pool.query(`
    CREATE TABLE IF NOT EXISTS task_time_logs (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      task_id BIGINT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      start_at DATETIME NOT NULL,
      end_at   DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_task (task_id),
      INDEX idx_user_open (user_id, end_at),
      CONSTRAINT fk_time_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // --- Migración suave desde esquemas viejos (BIGINT -> JSON) ---
  // 1) Retira índice viejo si existiera
  try {
    await pool.query(`ALTER TABLE tasks DROP INDEX idx_assigned_to`);
  } catch (_) {}

  // 2) Intenta convertir a JSON directamente
  try {
    await pool.query(`ALTER TABLE tasks MODIFY COLUMN assigned_to JSON NULL`);
  } catch (e1) {
    // 3) Fallback: TEXT -> normaliza -> vuelve a JSON
    try {
      await pool.query(`ALTER TABLE tasks MODIFY COLUMN assigned_to TEXT NULL`);
      await pool.query(
        `UPDATE tasks
         SET assigned_to = JSON_ARRAY(CAST(assigned_to AS UNSIGNED))
         WHERE assigned_to REGEXP '^[0-9]+$'`
      );
      await pool.query(
        `UPDATE tasks
         SET assigned_to = '[]'
         WHERE assigned_to IS NULL OR assigned_to = '' OR assigned_to = '9223372036854775808'`
      );
      await pool.query(`ALTER TABLE tasks MODIFY COLUMN assigned_to JSON NULL`);
    } catch (e2) {
      console.warn("assigned_to migration skipped:", e2.code || e2.message);
    }
  }
}

/** Crea una tarea (y sus todos opcionales) */
async function create(
  pool,
  {
    title,
    description = null,
    priority = "Medium",
    status = "Pending",
    dueDate,
    assignedTo = [], // ahora array
    createdBy = null,
    attachments = [], // mejor JSON/array
    progress = 0,
    todoChecklist = [], // [{ text, completed? }]
  }
) {
  const [res] = await pool.execute(
    `INSERT INTO tasks (title, description, priority, status, due_date, assigned_to, created_by, attachments, progress)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title,
      description,
      priority,
      status,
      new Date(dueDate),
      toJsonIds(assignedTo), // JSON
      createdBy,
      toJsonAny(attachments), // JSON string o array
      progress,
    ]
  );
  const taskId = res.insertId;

  if (Array.isArray(todoChecklist) && todoChecklist.length) {
    const values = todoChecklist.map((t, i) => [
      taskId,
      t.text,
      !!t.completed,
      i,
    ]);
    await pool.query(
      `INSERT INTO task_todos (task_id, text, completed, sort_order) VALUES ?`,
      [values]
    );
  }
  return findById(pool, taskId);
}

/** Obtiene una tarea + sus todos */
async function findById(pool, id) {
  const [[task]] = await pool.query(
    `SELECT ${TASK_FIELDS} FROM tasks WHERE id = ?`,
    [id]
  );
  if (!task) return null;

  // normaliza JSONs
  task.assignedTo = parseJSON(task.assignedTo, []);
  task.attachments = parseJSON(task.attachments, []);

  const [todos] = await pool.query(
    `SELECT
       id,
       task_id AS taskId,
       text,
       completed,
       sort_order AS sortOrder,
       created_at AS createdAt,
       updated_at AS updatedAt
     FROM task_todos
     WHERE task_id = ?
     ORDER BY sort_order, id`,
    [id]
  );
  task.todoChecklist = todos;

  // tiempos (resumen)
  const { totalSeconds, activeTimers } = await getTaskTimeSummary(pool, id);
  task.timeTracking = { totalSeconds, activeTimers };

  return task;
}

/** Lista tareas con filtros opcionales */
async function list(
  pool,
  { status, assignedTo, search, limit = 20, offset = 0 } = {}
) {
  const where = [];
  const args = [];

  if (status) {
    where.push("status = ?");
    args.push(status);
  }
  if (assignedTo !== undefined && assignedTo !== null && assignedTo !== "") {
    where.push(
      "assigned_to IS NOT NULL AND JSON_CONTAINS(assigned_to, JSON_ARRAY(CAST(? AS UNSIGNED)))"
    );
    args.push(Number(assignedTo));
  }
  if (search) {
    where.push("(title LIKE ? OR description LIKE ?)");
    args.push(`%${search}%`, `%${search}%`);
  }

  const sql =
    `SELECT ${TASK_FIELDS} FROM tasks` +
    (where.length ? ` WHERE ${where.join(" AND ")}` : "") +
    ` ORDER BY due_date ASC LIMIT ? OFFSET ?`;
  args.push(Number(limit), Number(offset));

  const [rows] = await pool.query(sql, args);

  // parsea JSONs para respuesta coherente
  return rows.map((r) => ({
    ...r,
    assignedTo: parseJSON(r.assignedTo, []),
    attachments: parseJSON(r.attachments, []),
  }));
}

/** Actualiza campos de la tarea (parcial) */
async function updateById(pool, id, patch) {
  const fields = [];
  const values = [];
  const map = {
    title: "title",
    description: "description",
    priority: "priority",
    status: "status",
    dueDate: "due_date",
    assignedTo: "assigned_to",
    attachments: "attachments",
    progress: "progress",
  };

  for (const k of Object.keys(map)) {
    if (patch[k] !== undefined) {
      fields.push(`${map[k]} = ?`);
      if (k === "dueDate") {
        values.push(new Date(patch[k]));
      } else if (k === "assignedTo") {
        values.push(toJsonIds(patch[k])); // siempre JSON
      } else if (k === "attachments") {
        values.push(toJsonAny(patch[k])); // JSON/array/string
      } else {
        values.push(patch[k]);
      }
    }
  }

  if (!fields.length) return findById(pool, id);

  values.push(id);
  await pool.execute(
    `UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`,
    values
  );
  return findById(pool, id);
}

/** Borra tarea (cascada elimina todos) */
async function deleteById(pool, id) {
  const [res] = await pool.execute(`DELETE FROM tasks WHERE id = ?`, [id]);
  return res.affectedRows === 1;
}

/** --- Todos (checklist) --- */
async function addTodo(poolOrConn, taskId, { text, completed = false, sortOrder = 0 }) {
  const [res] = await poolOrConn.execute(
    `INSERT INTO task_todos (task_id, text, completed, sort_order) VALUES (?, ?, ?, ?)`,
    [taskId, text, !!completed, sortOrder]
  );
  return res.insertId;
}

async function updateTodo(poolOrConn, todoId, { text, completed, sortOrder }) {
  const fields = [], vals = [];
  if (text !== undefined) { fields.push("text = ?"); vals.push(text); }
  if (completed !== undefined) { fields.push("completed = ?"); vals.push(!!completed); }
  if (sortOrder !== undefined) { fields.push("sort_order = ?"); vals.push(sortOrder); }
  if (!fields.length) return false;
  vals.push(todoId);
  const [res] = await poolOrConn.execute(
    `UPDATE task_todos SET ${fields.join(", ")} WHERE id = ?`,
    vals
  );
  return res.affectedRows === 1;
}

async function deleteTodo(poolOrConn, todoId) {
  const [res] = await poolOrConn.execute(`DELETE FROM task_todos WHERE id = ?`, [todoId]);
  return res.affectedRows === 1;
}

/* =========================
 *      TIME TRACKING
 * ========================= */

// Inicia timer. Regla por defecto: 1 timer activo por usuario (en cualquier tarea).
async function startTaskTimer(pool, taskId, userId) {
  const [[open]] = await pool.query(
    `SELECT id FROM task_time_logs WHERE user_id=? AND end_at IS NULL LIMIT 1`,
    [userId]
  );
  if (open) throw new Error("Ya tienes un temporizador activo.");

  await pool.execute(
    `INSERT INTO task_time_logs (task_id, user_id, start_at) VALUES (?, ?, NOW())`,
    [taskId, userId]
  );
  return true;
}

async function stopTaskTimer(pool, taskId, userId) {
  const [[row]] = await pool.query(
    `SELECT id, start_at FROM task_time_logs
     WHERE user_id=? AND task_id=? AND end_at IS NULL
     ORDER BY id DESC LIMIT 1`,
    [userId, taskId]
  );
  if (!row) throw new Error("No hay temporizador activo para detener.");

  await pool.execute(
    `UPDATE task_time_logs SET end_at = NOW() WHERE id = ?`,
    [row.id]
  );

  const [[dur]] = await pool.query(
    `SELECT TIMESTAMPDIFF(SECOND, start_at, end_at) AS seconds
     FROM task_time_logs WHERE id=?`,
    [row.id]
  );
  return Number(dur?.seconds || 0);
}

async function getTaskTimeSummary(pool, taskId) {
  const [[sum]] = await pool.query(
    `SELECT COALESCE(SUM(TIMESTAMPDIFF(SECOND, start_at, COALESCE(end_at, NOW()))),0) AS totalSeconds
     FROM task_time_logs WHERE task_id=?`,
    [taskId]
  );
  const [active] = await pool.query(
    `SELECT id, user_id AS userId, start_at AS startAt
     FROM task_time_logs WHERE task_id=? AND end_at IS NULL`,
    [taskId]
  );
  return { totalSeconds: Number(sum?.totalSeconds || 0), activeTimers: active };
}

module.exports = {
  ensureTables,
  create,
  findById,
  list,
  updateById,
  deleteById,
  addTodo,
  updateTodo,
  deleteTodo,
  // time tracking
  startTaskTimer,
  stopTaskTimer,
  getTaskTimeSummary,
};
