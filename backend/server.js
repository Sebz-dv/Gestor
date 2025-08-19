// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const taskRoutes = require("./routes/taskRoutes");
const reportRoutes = require("./routes/reportRoutes");

// ⬇️ AÑADE ESTO
const User = require("./models/User"); 
const Task = require("./models/Task");

const app = express();

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static (ej. uploads)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Healthcheck
app.get("/health", (_req, res) => res.json({ ok: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
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
(async () => {
  const db = await connectDB(); // ← crea la BASE si no existe (tu db.js ya lo hace)
  app.locals.db = db;

  // ⬇️ CREA TABLAS SI NO EXISTEN (idempotente)
  await Promise.all([
    User.ensureTable(db), // users
    Task.ensureTables(db), // tasks + task_todos
  ]);

  const seeded = await User.ensureAdmin(db);
  if (seeded) {
    console.log("✅ Admin creado:", { id: seeded.id, email: seeded.email });
    if (seeded.tempPassword) console.warn("⚠️ Contraseña temporal:", seeded.tempPassword);
  }
  
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));
})();
