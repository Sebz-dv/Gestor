// routes/userRoutes.js
const express = require("express");
const router = express.Router();

const {
  createUser,
  listUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require("../controllers/usersController");

const { protect } = require("../middlewares/authMiddleware");

// Si ya tienes un adminOnly, úsalo. Si no, aquí va uno minimalista:
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied, admin only" });
  }
  next();
};

// CRUD Admin
router.post("/", protect, adminOnly, createUser);
router.get("/", protect, adminOnly, listUsers);
router.get("/:id", protect, adminOnly, getUserById);
router.put("/:id", protect, adminOnly, updateUser);
router.delete("/:id", protect, adminOnly, deleteUser);

module.exports = router;
