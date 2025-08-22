import React, { useEffect, useRef, useState } from "react";
import { LuChevronDown } from "react-icons/lu";

/**
 * options: [{ label: string, value: string }]
 * value: string | number
 * onChange: (value) => void
 * placeholder?: string
 * className?: string
 */
const SelectDropdown = ({ options = [], value, onChange, placeholder = "Select...", className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  const selected = options.find((o) => o.value === value);

  const toggle = () => setIsOpen((v) => !v);
  const close = () => setIsOpen(false);

  const handleSelect = (val) => {
    onChange?.(val);
    close();
  };

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) close();
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const onKeyDown = (e) => {
    if (e.key === "Escape") close();
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={toggle}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="w-full form-input flex items-center justify-between cursor-pointer
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:focus-visible:ring-violet-400"
      >
        <span className={selected ? "text-slate-900 dark:text-slate-100" : "text-slate-400 dark:text-slate-500"}>
          {selected ? selected.label : placeholder}
        </span>
        <LuChevronDown
          className={`transition-transform ${isOpen ? "rotate-180" : ""} text-slate-500 dark:text-slate-400`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          tabIndex={-1}
          className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg
                     max-h-60 overflow-auto
                     dark:border-slate-700 dark:bg-slate-900 dark:shadow-slate-950/40"
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">Sin opciones</div>
          ) : (
            options.map((opt) => {
              const active = opt.value === value;
              return (
                <button
                  type="button"
                  key={opt.value}
                  role="option"
                  aria-selected={active}
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full text-left px-3 py-2 text-sm focus:outline-none
                              hover:bg-violet-50 hover:text-violet-700
                              dark:hover:bg-violet-900/30 dark:hover:text-violet-200
                    ${
                      active
                        ? "bg-violet-50 text-violet-700 font-medium dark:bg-violet-900/30 dark:text-violet-200"
                        : "text-slate-700 dark:text-slate-200"
                    }`}
                >
                  {opt.label}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default SelectDropdown;
