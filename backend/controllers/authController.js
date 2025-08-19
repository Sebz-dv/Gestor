// controllers/authController.js
const User = require("../models/User"); // ajusta la ruta si tu archivo se llama distinto
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// Generate JWT Token
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT secret no configurada");
const generateToken = (userId, role) =>
  jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: "7d" });

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const { name, email, password, profileImageUrl, adminInviteToken } =
      req.body || {};

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "name, email y password son obligatorios" });
    }

    const normEmail = String(email).trim().toLowerCase();

    // ¿Existe el usuario?
    const userExists = await User.findByEmail(pool, normEmail);
    if (userExists) {
      return res.status(409).json({ message: "User already exists" });
    }

    // Rol por token de invitación (opcional)
    let role = "member";
    const expected = process.env.ADMIN_INVITE_TOKEN || "";
    if (
      adminInviteToken &&
      expected &&
      adminInviteToken.length === expected.length
    ) {
      try {
        if (
          crypto.timingSafeEqual(
            Buffer.from(adminInviteToken),
            Buffer.from(expected)
          )
        ) {
          role = "admin";
        }
      } catch {
        // si los tamaños no coinciden, timingSafeEqual lanza; ignoramos
      }
    }

    // Hash de password
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Crear usuario
    const user = await User.create(pool, {
      name: String(name).trim(),
      email: normEmail,
      passwordHash: hashedPassword,
      profileImageUrl: profileImageUrl ?? null,
      role,
    });

    // Responder con token
    const token = generateToken(user.id, user.role);
    return res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImageUrl: user.profileImageUrl,
      },
      token,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const { email, password } = req.body || {};

    if (!email || !password)
      return res.status(400).json({ error: "email y password requeridos" });

    const normEmail = String(email).trim().toLowerCase();
    const user = await User.findByEmail(pool, normEmail);
    if (!user) return res.status(401).json({ error: "Credenciales inválidas" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

    const token = generateToken(user.id, user.role);
    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImageUrl: user.profileImageUrl,
      },
      token,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private (Requires JWT)
const getUserProfile = async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "No autenticado" });

    const user = await User.findById(pool, userId);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImageUrl: user.profileImageUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (err) {
    next(err);
  }
};

const updateUserProfile = async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "No autenticado" });

    const { name, profileImageUrl, currentPassword, newPassword, role } =
      req.body;

    // Lee el usuario actual
    const user = await User.findById(pool, userId);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    // Patch básico (nombre / avatar)
    const patch = {};
    if (name !== undefined) patch.name = String(name).trim();
    if (profileImageUrl !== undefined)
      patch.profileImageUrl = profileImageUrl ?? null;

    // Cambio de rol: solo admin puede
    if (role !== undefined) {
      if (req.user.role !== "admin") {
        return res
          .status(403)
          .json({ error: "No autorizado para cambiar rol" });
      }
      if (!["admin", "member"].includes(role)) {
        return res.status(400).json({ error: "Rol inválido" });
      }
      patch.role = role;
    }

    // Cambio de contraseña (opcional): requiere currentPassword + newPassword
    let passwordChanged = false;
    if (newPassword !== undefined) {
      if (!currentPassword) {
        return res
          .status(400)
          .json({ error: "currentPassword requerido para cambiar contraseña" });
      }
      const ok = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!ok)
        return res.status(401).json({ error: "Contraseña actual incorrecta" });

      const hash = await bcrypt.hash(
        newPassword,
        Number(process.env.BCRYPT_SALT_ROUNDS) || 10
      );
      await User.changePassword(pool, userId, hash);
      passwordChanged = true;
    }

    // Aplica patch si hay cambios
    const updated =
      Object.keys(patch).length > 0
        ? await User.updateById(pool, userId, patch)
        : user;

    return res.json({
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        profileImageUrl: updated.profileImageUrl,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
      passwordChanged,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  generateToken,
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
};
