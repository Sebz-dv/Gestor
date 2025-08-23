// controllers/userController.js
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;

const isAdmin = (req) => req.user?.role === "admin";
const sanitizeUser = (u = {}) => {
  if (!u) return u;
  const { passwordHash, ...rest } = u;
  return rest;
};

// ¿Quedaría la base sin admins si excluimos a cierto ID?
const isLastAdmin = async (pool, excludeUserId = null) => {
  const sql = excludeUserId
    ? "SELECT COUNT(*) AS c FROM users WHERE role='admin' AND id <> ?"
    : "SELECT COUNT(*) AS c FROM users WHERE role='admin'";
  const args = excludeUserId ? [excludeUserId] : [];
  const [[{ c }]] = await pool.query(sql, args);
  return Number(c) === 0;
};

/**
 * Elimina al userId de tasks.assigned_to (array JSON).
 * Seguro y simple: lee filas afectadas y reescribe el array filtrado.
 */
const removeUserFromTasks = async (pool, userId) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `
      SELECT id, assigned_to AS assignedTo
      FROM tasks
      WHERE assigned_to IS NOT NULL
        AND JSON_CONTAINS(assigned_to, JSON_ARRAY(?))
    `,
      [Number(userId)]
    );

    for (const r of rows) {
      let arr = [];
      try {
        arr = Array.isArray(r.assignedTo)
          ? r.assignedTo
          : r.assignedTo
          ? JSON.parse(r.assignedTo)
          : [];
      } catch (_) {
        arr = [];
      }
      const next = arr.filter((x) => Number(x) !== Number(userId));
      // Mantén array JSON (no null) para consistencia
      await conn.query(
        `UPDATE tasks SET assigned_to = ? WHERE id = ?`,
        [JSON.stringify(next), r.id]
      );
    }

    await conn.commit();
  } catch (err) {
    if (conn) {
      try { await conn.rollback(); } catch (_) {}
    }
    throw err;
  } finally {
    if (conn) {
      try { conn.release(); } catch (_) {}
    }
  }
};

/* ================
 *     CREATE
 * ================ */
const createUser = async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    if (!isAdmin(req)) return res.status(403).json({ message: "No autorizado" });

    const { name, email, password, role = "member", profileImageUrl = null } =
      req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email y password son obligatorios" });
    }
    if (!["admin", "member"].includes(role)) {
      return res.status(400).json({ message: "role inválido" });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres" });
    }

    const exists = await User.findByEmail(pool, email);
    if (exists) {
      return res.status(409).json({ message: "El email ya está registrado" });
    }

    const passwordHash = await bcrypt.hash(String(password), SALT_ROUNDS);
    const created = await User.create(pool, {
      name: String(name).trim(),
      email,
      passwordHash,
      profileImageUrl,
      role,
    });

    res.status(201).json(sanitizeUser(created));
  } catch (err) {
    next(err);
  }
};

/* ================
 *   LIST / READ
 * ================ */
const listUsers = async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    if (!isAdmin(req)) return res.status(403).json({ message: "No autorizado" });

    const { role, search, limit = 20, offset = 0, withCounts = "0" } = req.query || {};
    const params = {
      role: role || undefined,
      search: search || undefined,
      limit: Number(limit),
      offset: Number(offset),
    };

    const rows =
      String(withCounts) === "1"
        ? await User.listWithTaskCounts(pool, params)
        : await User.list(pool, params);

    res.json(rows.map(sanitizeUser));
  } catch (err) {
    next(err);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    if (!isAdmin(req)) return res.status(403).json({ message: "No autorizado" });

    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "ID inválido" });

    const { withCounts = "0" } = req.query || {};
    const user =
      String(withCounts) === "1"
        ? await User.findWithTaskCounts(pool, id)
        : await User.findById(pool, id);

    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    res.json(sanitizeUser(user));
  } catch (err) {
    next(err);
  }
};

/* ================
 *     UPDATE
 * ================ */
// Admin: puede editar name, role, profileImageUrl y password
const updateUser = async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    if (!isAdmin(req)) return res.status(403).json({ message: "No autorizado" });

    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "ID inválido" });

    const current = await User.findById(pool, id);
    if (!current) return res.status(404).json({ message: "Usuario no encontrado" });

    const { name, role, profileImageUrl, password } = req.body || {};

    // No degradar al último admin
    if (role && role !== current.role) {
      if (!["admin", "member"].includes(role)) {
        return res.status(400).json({ message: "role inválido" });
      }
      if (current.role === "admin" && role === "member") {
        const last = await isLastAdmin(pool, current.id);
        if (last) return res.status(400).json({ message: "No puedes degradar al último admin" });
      }
    }

    // Evita que el propio admin se degrade
    if (String(req.user?.id) === String(id) && role === "member") {
      return res.status(400).json({ message: "No puedes degradar tu propio usuario" });
    }

    // Básicos
    const patch = {};
    if (name !== undefined) patch.name = String(name).trim();
    if (profileImageUrl !== undefined) patch.profileImageUrl = profileImageUrl;
    if (role !== undefined) patch.role = role;

    let updated = await User.updateById(pool, id, patch);

    // Password (opcional)
    if (password !== undefined) {
      if (String(password).length < 8) {
        return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres" });
      }
      const passwordHash = await bcrypt.hash(String(password), SALT_ROUNDS);
      await User.changePassword(pool, id, passwordHash);
      updated = await User.findById(pool, id);
    }

    res.json(sanitizeUser(updated));
  } catch (err) {
    next(err);
  }
};

/* ================
 *     DELETE
 * ================ */
const deleteUser = async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    if (!isAdmin(req)) return res.status(403).json({ message: "No autorizado" });

    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "ID inválido" });

    const current = await User.findById(pool, id);
    if (!current) return res.status(404).json({ message: "Usuario no encontrado" });

    // No eliminar al último admin
    if (current.role === "admin") {
      const last = await isLastAdmin(pool, current.id);
      if (last) return res.status(400).json({ message: "No puedes eliminar al último admin" });
    }

    // No auto-eliminarse (por salud mental del equipo 😅)
    if (String(req.user?.id) === String(id)) {
      return res.status(400).json({ message: "No puedes eliminar tu propio usuario" });
    }

    // (Opcional) desasigna al usuario de tasks.assigned_to
    try {
      await removeUserFromTasks(pool, id);
    } catch (e) {
      // No falles el delete por esto; loguea y sigue
      console.warn("[deleteUser] warning removeUserFromTasks:", e?.message || e);
    }

    const ok = await User.deleteById(pool, id);
    if (!ok) return res.status(500).json({ message: "No se pudo eliminar" });

    res.json({ message: "Usuario eliminado" });
  } catch (err) {
    next(err);
  }
};

/* ================
 *   MI PERFIL
 * ================ */
// GET /api/users/me
const getMyProfile = async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const me = await User.findById(pool, req.user?.id);
    if (!me) return res.status(404).json({ message: "Usuario no encontrado" });
    res.json(sanitizeUser(me));
  } catch (err) {
    next(err);
  }
};

// PUT /api/users/me  (name, profileImageUrl)
const updateMyProfile = async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const { name, profileImageUrl } = req.body || {};
    const patch = {};
    if (name !== undefined) patch.name = String(name).trim();
    if (profileImageUrl !== undefined) patch.profileImageUrl = profileImageUrl;

    const updated = await User.updateById(pool, req.user?.id, patch);
    res.json(sanitizeUser(updated));
  } catch (err) {
    next(err);
  }
};

// PUT /api/users/me/password  (password)
const changeMyPassword = async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const { password } = req.body || {};
    if (!password || String(password).length < 8) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres" });
    }
    const passwordHash = await bcrypt.hash(String(password), SALT_ROUNDS);
    await User.changePassword(pool, req.user?.id, passwordHash);
    const me = await User.findById(pool, req.user?.id);
    res.json(sanitizeUser(me));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createUser,
  listUsers,
  getUserById,
  updateUser,
  deleteUser,
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
};
