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
            className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2"
          >
            <p className="flex items-center gap-2 truncate">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-blue-400 bg-blue-200 text-gray-600 text-[10px]">
                {index + 1}
              </span>
              <span className="truncate">{item.text}</span>
            </p>
            <button
              type="button"
              onClick={() => handleDeleteOption(index)}
              className="card-btn-delete text-red-600 hover:text-red-700"
              aria-label={`Eliminar tarea ${index + 1}`}
              title="Eliminar"
            >
              <HiOutlineTrash className="text-lg" />
            </button>
          </div>
        ))}
        {(!items || items.length === 0) && (
          <div className="text-xs text-slate-500">Aún no hay tareas.</div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Nueva tarea"
          value={option}
          onChange={(e) => setOption(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full text-[13px] text-black outline-none border border-gray-200 rounded-md px-3 py-2 bg-white"
        />
        <button
          type="button"
          onClick={handleAddOption}
          className="card-btn flex items-center gap-2"
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
