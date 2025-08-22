import React, { useState } from "react";
import { HiMiniPlus, HiOutlineTrash } from "react-icons/hi2";
import { LuPaperclip } from "react-icons/lu";

const AddAttachmentsInput = ({ attachments = [], setAttachments }) => {
  const [option, setOption] = useState("");

  const isValidUrl = (value) => {
    try {
      // Permite URL absolutas y también rutas/archivos simples
      new URL(value); 
      return true;
    } catch {
      // Si no es URL absoluta, aceptamos texto no vacío como “adjunto”
      return value.trim().length > 0;
    }
  };

  const handleAddOption = () => {
    const value = option.trim();
    if (!value) return;
    if (!isValidUrl(value)) return;

    const next = [...attachments];
    // evita duplicados exactos (case-insensitive)
    const exists = next.some((x) => String(x).toLowerCase() === value.toLowerCase());
    if (exists) {
      setOption("");
      return;
    }

    next.push(value);
    setAttachments(next);
    setOption("");
  };

  const handleDeleteOption = (index) => {
    const updated = attachments.filter((_, idx) => idx !== index);
    setAttachments(updated);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddOption();
    }
  };

  return (
    <div className="space-y-3">
      {/* Lista de adjuntos */}
      <div className="space-y-2">
        {attachments.map((item, index) => (
          <div
            key={`${item}-${index}`}
            className="flex items-center justify-between rounded-md border px-3 py-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <LuPaperclip className="opacity-70" />
              {/^https?:\/\//i.test(item) ? (
                <a
                  href={item}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate underline decoration-dotted hover:decoration-solid"
                  title={item}
                >
                  {item}
                </a>
              ) : (
                <span className="truncate" title={item}>
                  {item}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleDeleteOption(index)}
              className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
              aria-label={`Eliminar adjunto ${index + 1}`}
              title="Eliminar"
            >
              <HiOutlineTrash className="text-lg" />
            </button>
          </div>
        ))}
        {attachments.length === 0 && (
          <div className="text-xs text-slate-500">Aún no hay adjuntos.</div>
        )}
      </div>

      {/* Input para agregar */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1 w-full text-[13px] text-black outline-none border border-gray-200 rounded-md px-3 py-2 bg-white">
          <LuPaperclip className="opacity-70" />
          <input
            type="text"
            placeholder="Add File Link o descripción"
            value={option}
            onChange={(e) => setOption(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 outline-none bg-transparent"
          />
        </div>
        <button
          type="button"
          onClick={handleAddOption}
          className="card-btn flex items-center gap-2"
          aria-label="Agregar adjunto"
        >
          <HiMiniPlus className="text-lg" />
          Add
        </button>
      </div>
    </div>
  );
};

export default AddAttachmentsInput;
