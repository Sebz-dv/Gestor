import React from "react";
import { LuX } from "react-icons/lu";

const Modal = ({ children, isOpen, onClose, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Fondo */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      {/* Contenido */}
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md p-4">
        {/* Botón X */}
        <button
          className="absolute top-3 right-3 text-slate-500 hover:text-red-500"
          onClick={onClose}
          aria-label="Cerrar modal"
        >
          <LuX className="w-5 h-5" />
        </button>

        {title && (
          <h3 className="text-lg font-semibold mb-3 pr-8">{title}</h3>
        )}
        {children}
      </div>
    </div>
  );
};

export default Modal;
