// models/userModel.js
// MySQL (mysql2/promise) - CRUD de usuarios + seeds y contadores de tareas

const bcrypt = require("bcryptjs");

const SELECT =
  "id, name, email, password_hash AS passwordHash, profile_image_url AS profileImageUrl, role, created_at AS createdAt, updated_at AS updatedAt";

const normEmail = (e) =>
  String(e || "")
    .trim()
    .toLowerCase();

/** Crea la tabla users si no existe */
async function ensureTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(191) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      profile_image_url VARCHAR(255) DEFAULT NULL,
      role ENUM('admin','member') NOT NULL DEFAULT 'member',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_users_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

/**
 * Crea un admin si NO existe ningún admin.
 * Usa ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME del .env si no pasas opts.
 * Retorna { id, email, tempPassword? } o null si no hizo nada.
 */
async function ensureAdmin(pool, opts = {}) {
  const [[{ c }]] = await pool.query(
    `SELECT COUNT(*) AS c FROM users WHERE role='admin'`
  );
  if (c > 0) return null; // ya hay admin

  const email = normEmail(
    opts.email || process.env.ADMIN_EMAIL || "admin@example.com"
  );
  const name = opts.name || process.env.ADMIN_NAME || "Admin";
  const rawPass =
    opts.password || process.env.ADMIN_PASSWORD || "ChangeMe!2025";
  const salt = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;

  // Evita choque por email existente
  const [exists] = await pool.execute(
    `SELECT id FROM users WHERE email=? LIMIT 1`,
    [email]
  );
  if (exists.length) return null;

  const hash = await bcrypt.hash(rawPass, salt);
  const [res] = await pool.execute(
    `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')`,
    [name, email, hash]
  );
  return {
    id: res.insertId,
    email,
    // solo mostramos la contraseña si no viene fijada por .env
    tempPassword: process.env.ADMIN_PASSWORD ? undefined : rawPass,
  };
}

/** Crea un usuario y devuelve el registro completo */
async function create(
  pool,
  { name, email, passwordHash, profileImageUrl = null, role = "member" }
) {
  const cleanEmail = normEmail(email);
  const sql = `INSERT INTO users (name, email, password_hash, profile_image_url, role)
               VALUES (?, ?, ?, ?, ?)`;
  const [res] = await pool.execute(sql, [
    String(name).trim(),
    cleanEmail,
    passwordHash,
    profileImageUrl,
    role,
  ]);
  return findById(pool, res.insertId);
}

/** Busca por email */
async function findByEmail(pool, email) {
  const cleanEmail = normEmail(email);
  const [rows] = await pool.execute(
    `SELECT ${SELECT} FROM users WHERE email = ? LIMIT 1`,
    [cleanEmail]
  );
  return rows[0] || null;
}

/** Busca por id */
async function findById(pool, id) {
  const [rows] = await pool.execute(
    `SELECT ${SELECT} FROM users WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

/** Actualiza campos básicos (name, profileImageUrl, role) y devuelve el registro */
async function updateById(pool, id, patch) {
  const fields = [];
  const values = [];
  if (patch.name !== undefined) {
    fields.push("name = ?");
    values.push(String(patch.name).trim());
  }
  if (patch.profileImageUrl !== undefined) {
    fields.push("profile_image_url = ?");
    values.push(patch.profileImageUrl);
  }
  if (patch.role !== undefined) {
    fields.push("role = ?");
    values.push(patch.role);
  }
  if (!fields.length) return findById(pool, id);
  values.push(id);
  await pool.execute(
    `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
    values
  );
  return findById(pool, id);
}

/** Cambia la contraseña (hash ya calculado) */
async function changePassword(pool, id, passwordHash) {
  await pool.execute(`UPDATE users SET password_hash = ? WHERE id = ?`, [
    passwordHash,
    id,
  ]);
  return true;
}

/** Elimina un usuario por id. Retorna true si borró 1 fila. */
async function deleteById(pool, id) {
  const [res] = await pool.execute(`DELETE FROM users WHERE id = ?`, [id]);
  return res.affectedRows === 1;
}

/** Lista usuarios con filtros simples */
async function list(pool, { role, search, limit = 20, offset = 0 } = {}) {
  const where = [];
  const args = [];
  if (role) {
    where.push("role = ?");
    args.push(role);
  }
  if (search) {
    where.push("(name LIKE ? OR email LIKE ?)");
    args.push(`%${search}%`, `%${search}%`);
  }
  const sql =
    `SELECT ${SELECT} FROM users` +
    (where.length ? ` WHERE ${where.join(" AND ")}` : "") +
    ` ORDER BY id DESC LIMIT ? OFFSET ?`;
  args.push(Number(limit), Number(offset));
  const [rows] = await pool.query(sql, args);
  return rows;
}

/** Lista usuarios + contadores de tareas (sin N+1) */
async function listWithTaskCounts(
  pool,
  { role, search, limit = 20, offset = 0 } = {}
) {
  const where = [];
  const args = [];
  if (role) {
    where.push("u.role = ?");
    args.push(role);
  }
  if (search) {
    where.push("(u.name LIKE ? OR u.email LIKE ?)");
    args.push(`%${search}%`, `%${search}%`);
  }

  const sql = `
    SELECT 
      u.id, u.name, u.email, u.role,
      u.profile_image_url AS profileImageUrl,
      u.created_at AS createdAt, u.updated_at AS updatedAt,

      COALESCE(SUM(CASE WHEN t.status='Pending' THEN 1 ELSE 0 END),0)        AS pendingTasks,
      COALESCE(SUM(CASE WHEN t.status='In Progress' THEN 1 ELSE 0 END),0)    AS inProgressTasks,
      COALESCE(SUM(CASE WHEN t.status='Completed' THEN 1 ELSE 0 END),0)      AS completedTasks,
      COALESCE(SUM(CASE WHEN t.status <> 'Completed'
                         AND DATE(t.due_date) < CURDATE() THEN 1 ELSE 0 END),0) AS overdueTasks
    FROM users u
    LEFT JOIN tasks t
      ON t.assigned_to IS NOT NULL
     AND JSON_CONTAINS(t.assigned_to, JSON_ARRAY(u.id))  -- 👈 match por JSON

    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    GROUP BY u.id, u.name, u.email, u.role, u.profile_image_url, u.created_at, u.updated_at
    ORDER BY u.id DESC
    LIMIT ? OFFSET ?
  `;
  args.push(Number(limit), Number(offset));

  const [rows] = await pool.query(sql, args);
  return rows.map((r) => ({
    ...r,
    pendingTasks: Number(r.pendingTasks) || 0,
    inProgressTasks: Number(r.inProgressTasks) || 0,
    completedTasks: Number(r.completedTasks) || 0,
    overdueTasks: Number(r.overdueTasks) || 0,
  }));
}

/** Un usuario + contadores de tareas */
async function findWithTaskCounts(pool, id) {
  const sql = `
    SELECT 
      u.id, u.name, u.email, u.role,
      u.profile_image_url AS profileImageUrl,
      u.created_at AS createdAt, u.updated_at AS updatedAt,
      COALESCE(SUM(CASE WHEN t.status='Pending' THEN 1 ELSE 0 END),0)        AS pendingTasks,
      COALESCE(SUM(CASE WHEN t.status='In Progress' THEN 1 ELSE 0 END),0)    AS inProgressTasks,
      COALESCE(SUM(CASE WHEN t.status='Completed' THEN 1 ELSE 0 END),0)      AS completedTasks,
      COALESCE(SUM(CASE WHEN t.status <> 'Completed'
                         AND DATE(t.due_date) < CURDATE() THEN 1 ELSE 0 END),0) AS overdueTasks
    FROM users u
    LEFT JOIN tasks t
      ON t.assigned_to IS NOT NULL
     AND JSON_CONTAINS(t.assigned_to, JSON_ARRAY(u.id))
    WHERE u.id = ?
    GROUP BY u.id, u.name, u.email, u.role, u.profile_image_url, u.created_at, u.updated_at
    LIMIT 1
  `;
  const [rows] = await pool.query(sql, [id]);
  const r = rows[0];
  return r
    ? {
        ...r,
        pendingTasks: Number(r.pendingTasks) || 0,
        inProgressTasks: Number(r.inProgressTasks) || 0,
        completedTasks: Number(r.completedTasks) || 0,
        overdueTasks: Number(r.overdueTasks) || 0,
      }
    : null;
}

module.exports = {
  ensureTable,
  ensureAdmin,
  create,
  findByEmail,
  findById,
  updateById,
  changePassword,
  deleteById,
  list,
  listWithTaskCounts,
  findWithTaskCounts,
};
