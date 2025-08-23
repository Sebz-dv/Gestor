// models/TaskFile.js
// Requiere: mysql2/promise (pool) vía req.app.locals.db

async function ensureTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS task_files (
      id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      task_id       BIGINT UNSIGNED NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      stored_name   VARCHAR(255) NOT NULL,
      mime_type     VARCHAR(150) NOT NULL,
      size_bytes    BIGINT UNSIGNED NOT NULL,
      storage_path  VARCHAR(500) NOT NULL,
      uploaded_by   BIGINT UNSIGNED NULL,
      tags          JSON NULL,
      checksum_sha1 CHAR(40) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_task (task_id),
      CONSTRAINT fk_files_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

/** Inserta un registro de archivo */
async function addFile(pool, {
  taskId, originalName, storedName, mimeType, sizeBytes,
  storagePath, uploadedBy = null, tags = null, checksumSha1 = null
}) {
  const [res] = await pool.execute(`
    INSERT INTO task_files
      (task_id, original_name, stored_name, mime_type, size_bytes, storage_path, uploaded_by, tags, checksum_sha1)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [taskId, originalName, storedName, mimeType, sizeBytes, storagePath, uploadedBy, tags, checksumSha1]);
  return res.insertId;
}

/** Lista archivos por tarea */
async function listByTask(pool, taskId) {
  const [rows] = await pool.query(`
    SELECT id,
           task_id       AS taskId,
           original_name AS originalName,
           stored_name   AS storedName,
           mime_type     AS mimeType,
           size_bytes    AS sizeBytes,
           storage_path  AS storagePath,
           uploaded_by   AS uploadedBy,
           tags,
           checksum_sha1 AS checksumSha1,
           created_at    AS createdAt,
           updated_at    AS updatedAt
    FROM task_files
    WHERE task_id = ?
    ORDER BY id DESC
  `, [taskId]);
  return rows;
}

/** Obtiene un archivo por id */
async function findById(pool, id) {
  const [[row]] = await pool.query(`
    SELECT id,
           task_id       AS taskId,
           original_name AS originalName,
           stored_name   AS storedName,
           mime_type     AS mimeType,
           size_bytes    AS sizeBytes,
           storage_path  AS storagePath,
           uploaded_by   AS uploadedBy,
           tags,
           checksum_sha1 AS checksumSha1,
           created_at    AS createdAt,
           updated_at    AS updatedAt
    FROM task_files
    WHERE id = ?
  `, [id]);
  return row || null;
}

/** Borra un archivo por id (DB) */
async function deleteById(pool, id) {
  const [res] = await pool.execute(`DELETE FROM task_files WHERE id = ?`, [id]);
  return res.affectedRows === 1;
}

/** Actualiza tags (JSON string) */
async function updateTags(pool, id, tagsJSON) {
  const [res] = await pool.execute(
    `UPDATE task_files SET tags = ? WHERE id = ?`,
    [tagsJSON, id]
  );
  return res.affectedRows === 1;
}

module.exports = {
  ensureTable,
  addFile,
  listByTask,
  findById,
  deleteById,
  updateTags,
};
