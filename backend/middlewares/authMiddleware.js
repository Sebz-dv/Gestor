// middleware/auth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");



// Protege rutas con JWT
const protect = async (req, res, next) => {
  try {
    const auth = req.headers.authorization || "";
    const m = /^Bearer\s+(.+)$/.exec(auth);
    if (!m) return res.status(401).json({ message: "Not authorized, no token" });

    const token = m[1];
    const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    const payload = jwt.verify(token, secret, { algorithms: ["HS256", "RS256"] });

    // Carga usuario desde MySQL (opcional pero útil)
    const pool = req.app.locals.db;
    const user = pool ? await User.findById(pool, payload.id) : null;
    if (!user) return res.status(401).json({ message: "User not found" });

    // Adjunta datos seguros (sin password)
    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token failed", error: error.message });
  }
};

// Solo admin
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") return next();
  return res.status(403).json({ message: "Access denied, admin only" });
};

module.exports = { protect, adminOnly };
