// upload.js
const fs = require("fs");
const path = require("path");
const multer = require("multer");

// Asegura la carpeta uploads
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Configure storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);                 // .png, .jpg, ...
    const base = path.basename(file.originalname, ext)           // nombre sin extensión
      .replace(/[^a-zA-Z0-9._-]/g, "");                          // nombre seguro
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

// File filter
const fileFilter = (_req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
  if (allowedTypes.includes(file.mimetype)) return cb(null, true);
  return cb(new Error("Only jpeg, jpg and png formats are allowed"), false);
};

// Límite opcional de tamaño (10MB)
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = upload;
