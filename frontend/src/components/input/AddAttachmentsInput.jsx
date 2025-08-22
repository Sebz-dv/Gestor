import React, { useState } from "react";
import { HiMiniPlus, HiOutlineTrash } from "react-icons/hi2";
import { LuPaperclip } from "react-icons/lu";

// --- helpers ---
const asArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const isAbsoluteUrl = (v) => /^https?:\/\//i.test(String(v || ""));
const fileNameFromUrl = (u) => {
  try {
    const p = new URL(u);
    const last = p.pathname.split("/").filter(Boolean).pop();
    return last || u;
  } catch {
    // si no es URL válida, devolvemos el texto tal cual
    return String(u || "");
  }
};

// Normaliza cualquier entrada a { name, url|null }
const normalizeItem = (x) => {
  if (!x) return null;
  if (typeof x === "string") {
    if (isAbsoluteUrl(x)) return { name: fileNameFromUrl(x), url: x };
    return { name: x, url: null };
  }
  if (typeof x === "object") {
    const url = x.url ?? x.path ?? null;
    const name =
      x.name ??
      x.filename ??
      x.title ??
      x.label ??
      (url ? fileNameFromUrl(url) : "archivo");
    return { name: String(name), url: url ? String(url) : null };
  }
  return null;
};

const AddAttachmentsInput = ({ attachments = [], setAttachments, disabled = false }) => {
  const [option, setOption] = useState("");

  // Siempre trabajamos internamente como [{name,url}]
  const items = asArray(attachments).map(normalizeItem).filter(Boolean);

  // Evita duplicados por url (si hay) o por name si no hay url
  const existsItem = (candidate) =>
    items.some((it) =>
      candidate.url
        ? it.url?.toLowerCase() === candidate.url.toLowerCase()
        : it.url == null && it.name.toLowerCase() === candidate.name.toLowerCase()
    );

  const handleAddOption = () => {
    const raw = option.trim();
    if (!raw) return;

    const candidate = normalizeItem(raw);
    if (!candidate) return;
    if (existsItem(candidate)) {
      setOption("");
      return;
    }

    setAttachments([...items, candidate]); // guardamos normalizado
    setOption("");
  };

  const handleDeleteOption = (index) => {
    const next = items.filter((_, i) => i !== index);
    setAttachments(next);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddOption();
    }
  };

  return (
    <div className="space-y-3">
      {/* Lista */}
      <div className="space-y-2">
        {items.map((att, index) => {
          const key = `${att.url ?? att.name}-${index}`;
          return (
            <div
              key={key}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <LuPaperclip className="opacity-70 shrink-0" />
                {att.url ? (
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate underline decoration-dotted hover:decoration-solid"
                    title={att.url}
                  >
                    {att.name || att.url}
                  </a>
                ) : (
                  <span className="truncate" title={att.name}>
                    {att.name}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleDeleteOption(index)}
                className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
                aria-label={`Eliminar adjunto ${index + 1}`}
                title="Eliminar"
                disabled={disabled}
              >
                <HiOutlineTrash className="text-lg" />
              </button>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="text-xs text-slate-500">Aún no hay adjuntos.</div>
        )}
      </div>

      {/* Input para agregar por texto/URL */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1 w-full text-[13px] text-black outline-none border border-gray-200 rounded-md px-3 py-2 bg-white">
          <LuPaperclip className="opacity-70" />
          <input
            type="text"
            placeholder="Pega un enlace (https://...) o escribe una descripción"
            value={option}
            onChange={(e) => setOption(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 outline-none bg-transparent"
            disabled={disabled}
          />
        </div>
        <button
          type="button"
          onClick={handleAddOption}
          className="card-btn flex items-center gap-2"
          aria-label="Agregar adjunto"
          disabled={disabled}
        >
          <HiMiniPlus className="text-lg" />
          Add
        </button>
      </div>
    </div>
  );
};

export default AddAttachmentsInput;
