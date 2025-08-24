// controllers/companyController.js
// Usa req.app.locals.db como pool

const companyModel = require("../models/Company");

const getCompany = async (req, res) => {
  const pool = req.app.locals.db;
  try {
    const company = await companyModel.get(pool);
    return res.json({ company });
  } catch (err) {
    console.error("getCompany error:", err);
    return res.status(500).json({ message: "Error obteniendo la empresa" });
  }
};

const upsertCompany = async (req, res) => {
  const pool = req.app.locals.db;
  try {
    const company = await companyModel.upsert(pool, req.body || {});
    return res.json({ company, message: "Datos guardados" });
  } catch (err) {
    console.error("upsertCompany error:", err);
    return res.status(500).json({ message: "No pude guardar los datos" });
  }
};

const updateCompanyLogo = async (req, res) => {
  const pool = req.app.locals.db;
  try {
    const { logoUrl } = req.body || {};
    if (!logoUrl) return res.status(400).json({ message: "logoUrl es requerido" });
    const company = await companyModel.updateLogo(pool, logoUrl);
    return res.json({ company, message: "Logo actualizado" });
  } catch (err) {
    console.error("updateCompanyLogo error:", err);
    return res.status(500).json({ message: "No pude actualizar el logo" });
  }
};

module.exports = {
  getCompany,
  upsertCompany,
  updateCompanyLogo,
};
