// components/Input.jsx
import React, { forwardRef, useId, useState } from "react";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";

/**
 * Input reutilizable con:
 * - label + helper/error
 * - soporte de icono izquierdo/derecho
 * - toggle de visibilidad cuando type="password"
 */
const Input = forwardRef(
  (
    {
      label,
      value,
      onChange,
      placeholder = "",
      type = "text",
      id,
      name,
      error,          // string: muestra error y pinta el borde en rojo
      helperText,     // string: texto de ayuda
      required = false,
      disabled = false,
      className = "",
      leftIcon = null,
      rightIcon = null,
      onRightIconClick,
      showPasswordToggle, // si no se pasa, se activa cuando type="password"
      ...rest
    },
    ref
  ) => {
    const autoId = useId();
    const uid = id ?? autoId;

    const [showPassword, setShowPassword] = useState(false);
    const wantsToggle = showPasswordToggle ?? (String(type).toLowerCase() === "password");
    const inputType = wantsToggle && showPassword ? "text" : type;

    const base =
      [
        "w-full rounded-lg px-3 py-2 outline-none transition",
        "focus:ring-2 focus:ring-offset-0",
        error
          ? "border border-rose-400 focus:ring-rose-500 dark:border-rose-500"
          : "border border-slate-300 focus:ring-[#1368EC] dark:border-slate-700",
        "bg-white text-slate-900 placeholder:text-slate-500",
        "dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
      ].join(" ");

    const disabledCls = disabled ? " opacity-50 cursor-not-allowed" : "";

    const hasLeft = !!leftIcon;
    const hasRight = !!rightIcon || wantsToggle;
    const paddingLeft = hasLeft ? " pl-10" : "";
    const paddingRight = hasRight ? " pr-10" : "";

    return (
      <div className={`w-full ${className}`}>
        {label && (
          <label htmlFor={uid} className="block text-sm mb-1 text-slate-800 dark:text-slate-200">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
        )}

        <div className="relative">
          {hasLeft && (
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              {leftIcon}
            </span>
          )}

          <input
            id={uid}
            name={name}
            ref={ref}
            type={inputType}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            aria-invalid={!!error}
            className={base + disabledCls + paddingLeft + paddingRight}
            {...rest}
          />

          <span className="absolute right-2 top-1/2 -translate-y-1/2">
            {rightIcon && !wantsToggle ? (
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                onClick={onRightIconClick}
                aria-label="action"
              >
                {rightIcon}
              </button>
            ) : wantsToggle ? (
              showPassword ? (
                <button
                  type="button"
                  className="text-primary hover:opacity-80 dark:text-blue-400"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label="Hide password"
                >
                  <FaRegEye size={20} className="mt-2" />
                </button>
              ) : (
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label="Show password"
                >
                  <FaRegEyeSlash size={20} className="mt-2" />
                </button>
              )
            ) : null}
          </span>
        </div>

        {error ? (
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

export default Input;
