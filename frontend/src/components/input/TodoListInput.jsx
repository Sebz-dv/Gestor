// src/components/input/TodoListInput.jsx
import React, { useMemo, useState } from "react";
import { HiMiniPlus, HiOutlineTrash } from "react-icons/hi2";

const normalize = (list = []) =>
  list.map((it) => {
    if (typeof it === "string") return { text: it, completed: false };
    const text = typeof it?.text === "string" ? it.text : "";
    const completed = Boolean(it?.completed ?? it?.done ?? false);
    return { text, completed };
  });

const TodoListInput = ({ todoList = [], setTodoList }) => {
  const [option, setOption] = useState("");
  const items = useMemo(() => normalize(todoList), [todoList]);

  const update = (next) => setTodoList(normalize(next));

  const handleAddOption = () => {
    const value = option.trim();
    if (!value) return;
    update([...(items || []), { text: value, completed: false }]);
    setOption("");
  };

  const handleDeleteOption = (index) => {
    const updated = (items || []).filter((_, idx) => idx !== index);
    update(updated);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddOption();
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {(items || []).map((item, index) => (
          <div
            key={`${item.text}-${index}`}
            className="flex items-center justify-between rounded-md px-3 py-2
                       border border-slate-200 bg-white
                       dark:border-slate-700 dark:bg-slate-900"
          >
            <p className="flex items-center gap-2 truncate">
              <span
                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px]
                           border border-blue-400 bg-blue-200 text-slate-600
                           dark:border-blue-500/40 dark:bg-blue-900/30 dark:text-blue-300"
              >
                {index + 1}
              </span>
              <span className="truncate text-slate-700 dark:text-slate-200">{item.text}</span>
            </p>
            <button
              type="button"
              onClick={() => handleDeleteOption(index)}
              className="card-btn-delete text-rose-600 hover:text-rose-700
                         dark:text-rose-400 dark:hover:text-rose-300"
              aria-label={`Eliminar tarea ${index + 1}`}
              title="Eliminar"
            >
              <HiOutlineTrash className="text-lg" />
            </button>
          </div>
        ))}
        {(!items || items.length === 0) && (
          <div className="text-xs text-slate-500 dark:text-slate-400">Aún no hay tareas.</div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Nueva tarea"
          value={option}
          onChange={(e) => setOption(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full text-[13px]
                     text-slate-900 dark:text-slate-100
                     outline-none border rounded-md px-3 py-2
                     border-slate-200 bg-white
                     dark:border-slate-700 dark:bg-slate-900
                     placeholder:text-slate-500 dark:placeholder:text-slate-500"
        />
        <button
          type="button"
          onClick={handleAddOption}
          className="card-btn flex items-center gap-2
                     dark:text-slate-300 dark:bg-slate-800/40 dark:border-slate-700 dark:hover:bg-slate-800/70"
          aria-label="Agregar tarea"
        >
          <HiMiniPlus className="text-lg" />
          Add
        </button>
      </div>
    </div>
  );
};

export default TodoListInput;
