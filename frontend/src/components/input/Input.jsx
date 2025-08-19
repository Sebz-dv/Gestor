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
    // ❌ id || useId() (condicional)
    // ✅ siempre llamamos useId, luego resolvemos
    const autoId = useId();
    const uid = id ?? autoId;

    const [showPassword, setShowPassword] = useState(false);
    const wantsToggle = showPasswordToggle ?? (String(type).toLowerCase() === "password");
    const inputType = wantsToggle && showPassword ? "text" : type;

    const base =
      "w-full border rounded-lg px-3 py-2 outline-none transition " +
      "focus:ring-2 focus:ring-offset-0 " +
      (error ? "border-red-400 focus:ring-red-500" : "border-slate-300 focus:ring-[#1368EC]");
    const disabledCls = disabled ? " opacity-50 cursor-not-allowed" : "";

    const hasLeft = !!leftIcon;
    const hasRight = !!rightIcon || wantsToggle;
    const paddingLeft = hasLeft ? " pl-10" : "";
    const paddingRight = hasRight ? " pr-10" : "";

    return (
      <div className={`w-full ${className}`}>
        {label && (
          <label htmlFor={uid} className="block text-sm mb-1 text-slate-800">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}

        <div className="relative">
          {hasLeft && (
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">
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
            className={base + disabledCls + paddingLeft + paddingRight}
            {...rest}
          />

          <span className="absolute right-2 top-1/2 -translate-y-1/2">
            {rightIcon && !wantsToggle ? (
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600"
                onClick={onRightIconClick}
                aria-label="action"
              >
                {rightIcon}
              </button>
            ) : wantsToggle ? (
              showPassword ? (
                <button
                  type="button"
                  className="text-primary hover:opacity-80"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label="Hide password"
                >
                  <FaRegEye size={20} className="mt-2"/>
                </button>
              ) : (
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label="Show password"
                >
                  <FaRegEyeSlash size={20} className="mt-2"/>
                </button>
              )
            ) : null}
          </span>
        </div>

        {error ? (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-slate-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

export default Input;
