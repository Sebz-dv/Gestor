// routes/taskFilesRoutes.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs/promises");
const { protect } = require("../middlewares/authMiddleware");
const {
  listTaskFiles,
  uploadTaskFile,
  downloadTaskFile,
  deleteTaskFile,
  updateTaskFileTags,
  UPLOADS_ROOT,
} = require("../controllers/taskFileController"); 

const router = express.Router({ mergeParams: true });

// Multer storage por tarea
const storage = multer.diskStorage({
  destination: async (req, _file, cb) => {
    const dir = path.join(UPLOADS_ROOT, String(req.params.id || "unknown"));
    await fs.mkdir(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^\w.\-]+/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});

// Límites y filtro básicos
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/\.(exe|bat|sh|cmd|msi)$/i.test(file.originalname)) {
      return cb(new Error("Tipo de archivo no permitido"));
    }
    cb(null, true);
  },
});

// Rutas
router.get("/", protect, listTaskFiles);
router.post("/", protect, upload.single("file"), uploadTaskFile);
router.get("/:fileId/download", protect, downloadTaskFile);
router.delete("/:fileId", protect, deleteTaskFile);
router.put("/:fileId/tags", protect, updateTaskFileTags);

module.exports = router;
