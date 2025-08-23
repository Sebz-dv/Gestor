//userRoutes.js
const express = require("express");
const { adminOnly, protect } = require("../middlewares/authMiddleware"); // ajusta la ruta si es distinta
const { getUsers, getUserById } = require("../controllers/userController"); // idem

const router = express.Router();

// User Management Routes
router.get("/", protect, adminOnly, getUsers);      // Get all users (Admin only)
router.get("/:id", protect, getUserById);           // Get user by id

module.exports = router;
