// controllers/userController.js
const User = require("../models/User");

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private (Admin)
const getUsers = async (req, res) => {
  try {
    const pool = req.app.locals.db;

    // Trae usuarios role=member + contadores de tareas (sin N+1)
    const usersWithTaskCounts = await User.listWithTaskCounts(pool, {
      role: "member",
    });

    return res.json(usersWithTaskCounts);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const user = await User.findWithTaskCounts(pool, id);
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json(user);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

module.exports = { getUsers, getUserById };
