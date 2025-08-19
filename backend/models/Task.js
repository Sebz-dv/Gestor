// models/taskModel.js
// Requiere: mysql2/promise y un pool (req.app.locals.db)

const TASK_FIELDS =
  "id, title, description, priority, status, due_date AS dueDate, assigned_to AS assignedTo, created_by AS createdBy, attachments, progress, created_at AS createdAt, updated_at AS updatedAt";

async function ensureTables(pool) {
  // tasks + task_todos
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      description TEXT NULL,
      priority ENUM('Low','Medium','High') NOT NULL DEFAULT 'Medium',
      status   ENUM('Pending','In Progress','Completed') NOT NULL DEFAULT 'Pending',
      due_date DATETIME NOT NULL,
      assigned_to BIGINT UNSIGNED NULL,
      created_by  BIGINT UNSIGNED NULL,
      attachments TEXT NULL, -- JSON string o ruta(s)
      progress TINYINT UNSIGNED NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_assigned_to (assigned_to),
      INDEX idx_status (status),
      INDEX idx_due_date (due_date)
      -- Opcional: FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
      -- Opcional: FOREIGN KEY (created_by ) REFERENCES users(id) ON DELETE SET NULL
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
    assignedTo = null,
    createdBy = null,
    attachments = null, // puedes pasar JSON.stringify([...])
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
      assignedTo,
      createdBy,
      attachments,
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
  const [todos] = await pool.query(
    `SELECT id, task_id AS taskId, text, completed, sort_order AS sortOrder, created_at AS createdAt, updated_at AS updatedAt
     FROM task_todos WHERE task_id = ? ORDER BY sort_order, id`,
    [id]
  );
  task.todoChecklist = todos;
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
  if (assignedTo) {
    where.push("assigned_to = ?");
    args.push(assignedTo);
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
  return rows;
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
      values.push(k === "dueDate" ? new Date(patch[k]) : patch[k]);
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
async function addTodo(
  pool,
  taskId,
  { text, completed = false, sortOrder = 0 }
) {
  const [res] = await pool.execute(
    `INSERT INTO task_todos (task_id, text, completed, sort_order) VALUES (?, ?, ?, ?)`,
    [taskId, text, !!completed, sortOrder]
  );
  return res.insertId;
}

async function updateTodo(pool, todoId, { text, completed, sortOrder }) {
  const fields = [],
    vals = [];
  if (text !== undefined) {
    fields.push("text = ?");
    vals.push(text);
  }
  if (completed !== undefined) {
    fields.push("completed = ?");
    vals.push(!!completed);
  }
  if (sortOrder !== undefined) {
    fields.push("sort_order = ?");
    vals.push(sortOrder);
  }
  if (!fields.length) return false;
  vals.push(todoId);
  const [res] = await pool.execute(
    `UPDATE task_todos SET ${fields.join(", ")} WHERE id = ?`,
    vals
  );
  return res.affectedRows === 1;
}

async function deleteTodo(pool, todoId) {
  const [res] = await pool.execute(`DELETE FROM task_todos WHERE id = ?`, [
    todoId,
  ]);
  return res.affectedRows === 1;
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
};
