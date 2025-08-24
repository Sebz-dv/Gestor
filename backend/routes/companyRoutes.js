// routes/companyRoutes.js
const express = require("express");
const router = express.Router();
const {
  getCompany,
  upsertCompany,
  updateCompanyLogo,
} = require("../controllers/companyController");
const { protect } = require("../middlewares/authMiddleware");

// Si tienes un middleware admin real, úsalo.
// Aquí dejo uno simple por si acaso:
const adminOnly = (req, res, next) => {
  if (req.user?.role === "admin") return next();
  return res.status(403).json({ message: "Access denied, admin only" });
};

// Ahora las rutas son relativas al mount point "/api/company"
router.get("/", protect, getCompany);                // GET    /api/company
router.put("/", protect, adminOnly, upsertCompany);  // PUT    /api/company
router.patch("/logo", protect, adminOnly, updateCompanyLogo); // PATCH /api/company/logo

module.exports = router;
