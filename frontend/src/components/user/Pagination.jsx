import React from "react";

const Pagination = ({ page, pageSize, totalItems, onPrev, onNext }) => {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
      <p className="text-xs text-slate-500">
        Mostrando <span className="font-medium">{start}</span> –{" "}
        <span className="font-medium">{end}</span> de{" "}
        <span className="font-medium">{totalItems}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          disabled={page <= 1}
          className="rounded-lg px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 disabled:opacity-50"
        >
          Anterior
        </button>
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {page} / {totalPages}
        </span>
        <button
          onClick={onNext}
          disabled={page >= totalPages}
          className="rounded-lg px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
};

export default Pagination;
