import React from "react";
import { LuX } from "react-icons/lu";

const Modal = ({ children, isOpen, onClose, title }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      {/* Fondo */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Contenido */}
      <div
        className="relative w-full max-w-md p-4 rounded-lg shadow-2xl
                   border border-slate-200 bg-white
                   dark:border-slate-800 dark:bg-slate-900"
      >
        {/* Botón X */}
        <button
          className="absolute top-3 right-3 inline-flex items-center justify-center rounded
                     text-slate-500 hover:text-rose-600 focus:outline-none
                     focus-visible:ring-2 focus-visible:ring-rose-500
                     dark:text-slate-400 dark:hover:text-rose-400 dark:focus-visible:ring-rose-400"
          onClick={onClose}
          aria-label="Cerrar modal"
        >
          <LuX className="w-5 h-5" />
        </button>

        {title && (
          <h3 id="modal-title" className="text-lg font-semibold mb-3 pr-8 text-slate-900 dark:text-slate-100">
            {title}
          </h3>
        )}

        <div className="text-slate-800 dark:text-slate-200">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
