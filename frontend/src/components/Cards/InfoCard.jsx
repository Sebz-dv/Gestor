import React, { memo } from "react";
import { LuArrowUpRight, LuArrowDownRight } from "react-icons/lu";

/**
 * Props
 * - icon: React component (opcional)
 * - label: string
 * - value: ReactNode | string | number
 * - color: "bg-blue-500" | "#0ea5e9"  ← acepta clase Tailwind o hex
 * - trend?: { value: number | string, tone?: "good" | "bad" }  // muestra pill (+/-)
 * - suffix?: string                                            // ej: "hoy", "tasks"
 * - isLoading?: boolean                                        // skeleton suave
 * - className?: string
 */
const InfoCard = memo(({ icon: Icon, label = "—", value = "—", color = "bg-slate-400", trend, suffix, isLoading = false, className = "" }) => {
  const isHex = typeof color === "string" && color.trim().startsWith("#");
  const dotClass = isHex ? "" : color;
  const dotStyle = isHex ? { backgroundColor: color } : undefined;

  const TrendIcon = (typeof trend?.value === "number" && trend.value < 0) ? LuArrowDownRight : LuArrowUpRight;
  const tone = trend?.tone ?? (typeof trend?.value === "number" && trend.value < 0 ? "bad" : "good");
  const trendClasses = trend
    ? tone === "good"
      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
      : "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800"
    : "";

  return (
    <div className={`flex items-center gap-3 ${className}`} role="group" aria-label={label} title={label}>
      {/* Indicador de color / icono */}
      <div
        className={`w-3 md:w-4 h-3 md:h-4 ${dotClass} rounded-full flex items-center justify-center shadow dark:shadow-slate-900/40`}
        style={dotStyle}
      >
        {Icon && <Icon className="text-white w-2.5 h-2.5 md:w-3 md:h-3" />}
      </div>

      {/* Texto + trend */}
      <div className="flex items-center gap-2 min-w-0">
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 truncate">
          {isLoading ? (
            <span className="inline-block align-middle h-3 w-14 md:w-16 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
          ) : (
            <span className="text-sm md:text-base font-semibold text-slate-900 dark:text-slate-100" aria-live="polite">
              {value}
            </span>
          )}
          {suffix ? <span className="ml-1 text-[11px] md:text-xs text-slate-500 dark:text-slate-400">{suffix}</span> : null}
          {" "}
          {label}
        </p>

        {trend ? (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] ${trendClasses}`}>
            <TrendIcon className="w-3 h-3" />
            {typeof trend.value === "number" ? `${trend.value > 0 ? "+" : ""}${trend.value}%` : trend.value}
          </span>
        ) : null}
      </div>
    </div>
  );
});

export default InfoCard;
