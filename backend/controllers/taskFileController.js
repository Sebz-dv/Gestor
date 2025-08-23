// controllers/taskFilesController.js
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const Task = require("../models/Task");
const TaskFile = require("../models/TaskFile");

const UPLOADS_ROOT = path.resolve(__dirname, "..", "uploads", "tasks");

const isAdmin = (req) => req.user?.role === "admin";
const parseJSON = (v, fb = []) => {
  try {
    return Array.isArray(v) ? v : v ? JSON.parse(v) : fb;
  } catch {
    return fb;
  }
};
const isAssignee = (task, uid) => {
  const arr = Array.isArray(task.assignedTo)
    ? task.assignedTo
    : parseJSON(task.assignedTo, []);
  return arr.includes(uid);
};

async function ensureTaskFilesTable(pool) {
  try {
    await TaskFile.ensureTable(pool);
  } catch (e) {
    console.warn("[task_files] ensureTable warning:", e.message || e);
  }
}

async function listTaskFiles(req, res, next) {
  try {
    const pool = req.app.locals.db;
    const taskId = Number(req.params.id);
    if (!Number.isFinite(taskId))
      return res.status(400).json({ message: "ID inválido" });

    const task = await Task.findById(pool, taskId);
    if (!task) return res.status(404).json({ message: "Task no encontrada" });

    const admin = isAdmin(req);
    const assignee = isAssignee(task, Number(req.user.id));
    const creator = Number(task.createdBy) === Number(req.user.id);
    if (!admin && !assignee && !creator)
      return res.status(403).json({ message: "No autorizado" });

    const files = await TaskFile.listByTask(pool, taskId);
    res.json(files);
  } catch (e) {
    next(e);
  }
}

async function uploadTaskFile(req, res, next) {
  try {
    const pool = req.app.locals.db;
    const taskId = Number(req.params.id);
    if (!Number.isFinite(taskId))
      return res.status(400).json({ message: "ID inválido" });

    const task = await Task.findById(pool, taskId);
    if (!task) return res.status(404).json({ message: "Task no encontrada" });

    const admin = isAdmin(req);
    const assignee = isAssignee(task, Number(req.user.id));
    const creator = Number(task.createdBy) === Number(req.user.id);
    if (!admin && !assignee && !creator)
      return res.status(403).json({ message: "No autorizado" });

    const file = req.file;
    if (!file)
      return res
        .status(400)
        .json({ message: "Archivo requerido (campo 'file')" });

    let sha1 = null;
    try {
      sha1 = crypto
        .createHash("sha1")
        .update(await fsp.readFile(file.path))
        .digest("hex");
    } catch (_) {}

    const id = await TaskFile.addFile(pool, {
      taskId,
      originalName: file.originalname,
      storedName: file.filename,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storagePath: file.path,
      uploadedBy: Number(req.user.id),
      tags: null,
      checksumSha1: sha1,
    });

    const saved = await TaskFile.findById(pool, id);
    res.status(201).json(saved);
  } catch (e) {
    next(e);
  }
}

async function downloadTaskFile(req, res, next) {
  try {
    const pool = req.app.locals.db;
    const taskId = Number(req.params.id);
    const fileId = Number(req.params.fileId);
    if (!Number.isFinite(taskId) || !Number.isFinite(fileId))
      return res.status(400).json({ message: "ID inválido" });

    const task = await Task.findById(pool, taskId);
    if (!task) return res.status(404).json({ message: "Task no encontrada" });

    const admin = isAdmin(req);
    const assignee = isAssignee(task, Number(req.user.id));
    const creator = Number(task.createdBy) === Number(req.user.id);
    if (!admin && !assignee && !creator)
      return res.status(403).json({ message: "No autorizado" });

    const fileRow = await TaskFile.findById(pool, fileId);
    if (!fileRow || Number(fileRow.taskId) !== taskId)
      return res.status(404).json({ message: "Archivo no encontrado" });

    res.setHeader(
      "Content-Type",
      fileRow.mimeType || "application/octet-stream"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(fileRow.originalName)}"`
    );
    fs.createReadStream(fileRow.storagePath).pipe(res);
  } catch (e) {
    next(e);
  }
}

async function deleteTaskFile(req, res, next) {
  try {
    const pool = req.app.locals.db;
    const taskId = Number(req.params.id);
    const fileId = Number(req.params.fileId);
    if (!Number.isFinite(taskId) || !Number.isFinite(fileId))
      return res.status(400).json({ message: "ID inválido" });

    const task = await Task.findById(pool, taskId);
    if (!task) return res.status(404).json({ message: "Task no encontrada" });

    const admin = isAdmin(req);
    const assignee = isAssignee(task, Number(req.user.id));
    const creator = Number(task.createdBy) === Number(req.user.id);
    if (!admin && !assignee && !creator)
      return res.status(403).json({ message: "No autorizado" });

    const fileRow = await TaskFile.findById(pool, fileId);
    if (!fileRow || Number(fileRow.taskId) !== taskId)
      return res.status(404).json({ message: "Archivo no encontrado" });

    try {
      await fsp.unlink(fileRow.storagePath);
    } catch (_) {}
    await TaskFile.deleteById(pool, fileId);
    res.json({ message: "Archivo eliminado" });
  } catch (e) {
    next(e);
  }
}

async function updateTaskFileTags(req, res, next) {
  try {
    const pool = req.app.locals.db;
    const taskId = Number(req.params.id);
    const fileId = Number(req.params.fileId);
    const tags = req.body?.tags;

    if (!Number.isFinite(taskId) || !Number.isFinite(fileId))
      return res.status(400).json({ message: "ID inválido" });

    const task = await Task.findById(pool, taskId);
    if (!task) return res.status(404).json({ message: "Task no encontrada" });

    const admin = isAdmin(req);
    const assignee = isAssignee(task, Number(req.user.id));
    const creator = Number(task.createdBy) === Number(req.user.id);
    if (!admin && !assignee && !creator)
      return res.status(403).json({ message: "No autorizado" });

    const fileRow = await TaskFile.findById(pool, fileId);
    if (!fileRow || Number(fileRow.taskId) !== taskId)
      return res.status(404).json({ message: "Archivo no encontrado" });

    const tagsJSON = tags == null ? null : JSON.stringify(tags);
    await TaskFile.updateTags(pool, fileId, tagsJSON);

    const updated = await TaskFile.findById(pool, fileId);
    res.json(updated);
  } catch (e) {
    next(e);
  }
}

module.exports = {
  ensureTaskFilesTable,
  UPLOADS_ROOT,
  listTaskFiles,
  uploadTaskFile,
  downloadTaskFile,
  deleteTaskFile,
  updateTaskFileTags,
};
