// models/companyModel.js
// Requiere: mysql2/promise y un pool (req.app.locals.db)

const COMPANY_FIELDS = `
  id,
  name,
  legal_name AS legalName,
  nit,
  email,
  phone,
  website,
  logo_url AS logoUrl,
  address,
  city,
  country,
  facebook,
  instagram,
  linkedin,
  twitter,
  youtube,
  tiktok,
  meta,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

// --- helpers ---
const parseJSON = (val, fallback = {}) => {
  if (val == null || val === "") return fallback;
  if (typeof val === "object") return val; // ya es objeto
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
};

const toJsonAny = (val, fb = {}) => {
  if (val == null) return JSON.stringify(fb);
  if (typeof val === "string") {
    try {
      JSON.parse(val);
      return val; // ya es JSON válido
    } catch {
      return JSON.stringify(fb); // string simple -> fallback
    }
  }
  return JSON.stringify(val);
};

async function ensureTables(pool) {
  // Crea tabla companies si no existe
  await pool.query(`
    CREATE TABLE IF NOT EXISTS companies (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      legal_name VARCHAR(150) NULL,
      nit VARCHAR(50) NULL,
      email VARCHAR(150) NULL,
      phone VARCHAR(50) NULL,
      website VARCHAR(200) NULL,
      logo_url VARCHAR(255) NULL,
      address VARCHAR(255) NULL,
      city VARCHAR(120) NULL,
      country VARCHAR(120) NULL,
      facebook VARCHAR(200) NULL,
      instagram VARCHAR(200) NULL,
      linkedin VARCHAR(200) NULL,
      twitter VARCHAR(200) NULL,
      youtube VARCHAR(200) NULL,
      tiktok VARCHAR(200) NULL,
      meta JSON NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Migración suave si meta no es JSON (por si viene de TEXT)
  try {
    await pool.query(`ALTER TABLE companies MODIFY COLUMN meta JSON NULL`);
  } catch (_) {
    // opcional: convertir desde TEXT, si aplica
  }
}

/** Obtiene la primera (y única) ficha de empresa */
async function get(pool) {
  const [rows] = await pool.query(
    `SELECT ${COMPANY_FIELDS} FROM companies ORDER BY id ASC LIMIT 1`
  );
  const company = rows?.[0] || null;
  if (!company) return null;
  company.meta = parseJSON(company.meta, {});
  return company;
}

/** Upsert de la ficha (crea si no existe, actualiza si ya hay una) */
async function upsert(pool, payload = {}) {
  // Permite enviar redes agrupadas como { socials: { facebook, ... } }
  const socials = payload.socials || {};
  const data = {
    name: payload.name,
    legalName: payload.legalName,
    nit: payload.nit,
    email: payload.email,
    phone: payload.phone,
    website: payload.website,
    logoUrl: payload.logoUrl,
    address: payload.address,
    city: payload.city,
    country: payload.country,
    facebook: payload.facebook ?? socials.facebook,
    instagram: payload.instagram ?? socials.instagram,
    linkedin: payload.linkedin ?? socials.linkedin,
    twitter: payload.twitter ?? socials.twitter,
    youtube: payload.youtube ?? socials.youtube,
    tiktok: payload.tiktok ?? socials.tiktok,
    meta: toJsonAny(payload.meta, {}), // JSON
  };

  const exists = await get(pool);

  if (!exists) {
    const [res] = await pool.execute(
      `INSERT INTO companies
        (name, legal_name, nit, email, phone, website, logo_url, address, city, country,
         facebook, instagram, linkedin, twitter, youtube, tiktok, meta)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        data.name || "Mi Empresa",
        data.legalName || null,
        data.nit || null,
        data.email || null,
        data.phone || null,
        data.website || null,
        data.logoUrl || null,
        data.address || null,
        data.city || null,
        data.country || null,
        data.facebook || null,
        data.instagram || null,
        data.linkedin || null,
        data.twitter || null,
        data.youtube || null,
        data.tiktok || null,
        data.meta,
      ]
    );
    return findById(pool, res.insertId);
  }

  // update
  const fields = [];
  const values = [];
  const map = {
    name: "name",
    legalName: "legal_name",
    nit: "nit",
    email: "email",
    phone: "phone",
    website: "website",
    logoUrl: "logo_url",
    address: "address",
    city: "city",
    country: "country",
    facebook: "facebook",
    instagram: "instagram",
    linkedin: "linkedin",
    twitter: "twitter",
    youtube: "youtube",
    tiktok: "tiktok",
    meta: "meta",
  };

  for (const k of Object.keys(map)) {
    if (data[k] !== undefined) {
      fields.push(`${map[k]} = ?`);
      values.push(k === "meta" ? data[k] : data[k] ?? null);
    }
  }

  if (!fields.length) return exists;

  values.push(exists.id);
  await pool.execute(
    `UPDATE companies SET ${fields.join(", ")} WHERE id = ?`,
    values
  );
  return findById(pool, exists.id);
}

/** Actualiza solo el logo */
async function updateLogo(pool, logoUrl) {
  if (!logoUrl) throw new Error("logoUrl es requerido");
  const exists = await get(pool);
  if (!exists) {
    const [res] = await pool.execute(
      `INSERT INTO companies (name, logo_url) VALUES (?, ?)`,
      ["Mi Empresa", logoUrl]
    );
    return findById(pool, res.insertId);
  }
  await pool.execute(`UPDATE companies SET logo_url = ? WHERE id = ?`, [
    logoUrl,
    exists.id,
  ]);
  return findById(pool, exists.id);
}

/** findById utilitario (interno) */
async function findById(pool, id) {
  const [[row]] = await pool.query(
    `SELECT ${COMPANY_FIELDS} FROM companies WHERE id = ?`,
    [id]
  );
  if (!row) return null;
  row.meta = parseJSON(row.meta, {});
  return row;
}

module.exports = {
  ensureTables,
  get,
  upsert,
  updateLogo,
  // útil en tests
  findById,
};
