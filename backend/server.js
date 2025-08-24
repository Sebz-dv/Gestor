// server.js
const cors = require("cors");
require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const taskRoutes = require("./routes/taskRoutes");
const reportRoutes = require("./routes/reportRoutes");
const usersRoutes = require("./routes/usersRoutes");
const companyRoutes = require("./routes/companyRoutes");
const User = require("./models/User");
const Task = require("./models/Task");
const companyModel = require("./models/Company");
// server.js (arriba)
const taskFilesRoutes = require("./routes/taskFilesRoutes");
const TaskFile = require("./models/TaskFile");
const app = express();

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*" || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static (uploads)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// HEALTH
app.get("/health", (_req, res) => res.json({ ok: true }));

// ===== Upload image =====
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "_");
    cb(null, `${Date.now()}_${safeName}`);
  },
});
const upload = multer({ storage });

app.post("/api/upload-image", upload.single("image"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${
      req.file.filename
    }`;
    return res.json({ imageUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Upload failed" });
  }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/usersR", usersRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/company", companyRoutes);

// Sub-rutas de archivos por tarea
app.use("/api/tasks/:id/files", taskFilesRoutes);

app.use("/api/reports", reportRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: "Not found" }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res
    .status(err.status || 500)
    .json({ error: err.message || "Internal error" });
});

// Boot
// Boot
(async () => {
  const db = await connectDB();
  app.locals.db = db;

  await Promise.all([
    User.ensureTable(db),
    Task.ensureTables(db),
    TaskFile.ensureTable(db),
    companyModel.ensureTables(db),
  ]);

  // Asegura carpeta /uploads/tasks
  const tasksUploadsDir = path.join(__dirname, "uploads", "tasks");
  if (!fs.existsSync(tasksUploadsDir))
    fs.mkdirSync(tasksUploadsDir, { recursive: true });

  const seeded = await User.ensureAdmin(db);
  if (seeded) {
    console.log("✅ Admin creado:", { id: seeded.id, email: seeded.email });
    if (seeded.tempPassword)
      console.warn("⚠️ Contraseña temporal:", seeded.tempPassword);
  }

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));
})();
