// routes/reportRoutes.js
const express = require("express");
const { protect, adminOnly } = require("../middlewares/authMiddleware");
const { exportTasksReport, exportUsersReport } = require("../controllers/reportController");

const router = express.Router();

router.get("/export/tasks", protect, adminOnly, exportTasksReport); // Export all tasks as Excel
router.get("/export/users", protect, adminOnly, exportUsersReport); // Export user-task report (Excel)

module.exports = router;
