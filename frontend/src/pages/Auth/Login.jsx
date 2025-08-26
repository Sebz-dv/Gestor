// pages/Auth/Login.jsx — diseño mejorado (logo empresa + fallbacks + UI pulida)
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { validateEmail } from "../../utils/helper";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { UserContext } from "../../context/UserContext";

/* =====================================================
 *   Config / helpers
 * ===================================================== */
const DEFAULT_ICON = "https://cdn-icons-png.flaticon.com/512/3075/3075977.png";
const COMPANY_TTL_MS = 1000 * 60 * 60 * 24; // 24h

const isHttpUrl = (v = "") => /^https?:\/\//i.test(v?.trim?.() || "");
const safeJSON = (s, fb) => {
  try {
    return JSON.parse(s);
  } catch {
    return fb;
  }
};

const normalizeCompany = (c = null) => {
  if (!c) return null;
  return {
    name: c.name ?? c.legalName ?? "Mi Empresa",
    logoUrl: c.logoUrl ?? "",
  };
};

const pickCompanyEndpoint = () => {
  return (
    API_PATHS?.COMPANY?.GET_PUBLIC ||
    API_PATHS?.COMPANY?.GET_COMPANY ||
    API_PATHS?.COMPANY?.GET ||
    null
  );
};

function useCompanyLogo() {
  const [company, setCompany] = useState(null);

  useEffect(() => {
    const ctrl = new AbortController();

    // cache local
    const cached = safeJSON(localStorage.getItem("companyCache"), null);
    const fresh = cached && Date.now() - (cached?.ts || 0) < COMPANY_TTL_MS;
    if (fresh && cached?.data) setCompany(cached.data);

    const endpoint = pickCompanyEndpoint();
    if (!endpoint) return;

    (async () => {
      try {
        const { data } = await axiosInstance.get(endpoint, {
          signal: ctrl.signal,
        });
        const n = normalizeCompany(data?.company || data);
        if (n) {
          setCompany(n);
          localStorage.setItem(
            "companyCache",
            JSON.stringify({ ts: Date.now(), data: n })
          );
        }
      } catch {
        // silencioso
      }
    })();

    return () => ctrl.abort();
  }, []);

  const dicebear = company?.name
    ? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
        company.name
      )}`
    : DEFAULT_ICON;

  const preferred = isHttpUrl(company?.logoUrl) ? company.logoUrl : "";
  const src = preferred || dicebear || DEFAULT_ICON;

  return {
    name: company?.name || "DoMore",
    src,
  };
}

// Gradiente de fondo en función del nombre (opcional, estable por hash simple)
const brandGradients = [
  "from-indigo-700 via-purple-700 to-pink-600",
  "from-sky-700 via-blue-700 to-indigo-700",
  "from-emerald-700 via-teal-700 to-cyan-700",
  "from-fuchsia-700 via-rose-700 to-orange-600",
  "from-amber-700 via-orange-700 to-rose-700",
  "from-slate-800 via-slate-700 to-zinc-700",
];
const strHash = (s = "") =>
  s.split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
const pickGradient = (name = "DoMore") =>
  brandGradients[Math.abs(strHash(name)) % brandGradients.length];

/* =====================================================
 *   Subcomponentes UI
 * ===================================================== */
const InputFL = ({
  id,
  type = "text",
  label,
  value,
  onChange,
  onKeyUp,
  autoComplete,
  icon: Icon,
  error,
}) => {
  const hasIcon = !!Icon;

  return (
    <div className="relative">
      {hasIcon ? (
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black pointer-events-none" />
      ) : null}

      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        onKeyUp={onKeyUp}
        autoComplete={autoComplete}
        required
        placeholder=" "
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={[
          "peer w-full bg-white/10 text-white py-3 rounded-xl outline-none transition-all",
          hasIcon ? "pl-10 pr-3" : "px-4",
          "focus:ring-2 focus:ring-purple-300 placeholder-transparent",
          error ? "ring-2 ring-rose-400" : "",
        ].join(" ")}
      />

      <label
        htmlFor={id}
        className={[
          "absolute -top-6.5 ml-10 mt-2.5 text-xs left-0 cursor-text peer-focus:text-xs peer-focus:-bottom-1 transition-all peer-focus:text-white peer-placeholder-shown:top-1 peer-placeholder-shown:text-sm",
        ].join(" ")}
      >
        {label}
      </label>

      {error ? (
        <span
          id={`${id}-error`}
          className="absolute -bottom-5 left-1 text-xs text-rose-200"
        >
          {error}
        </span>
      ) : null}
    </div>
  );
};

/* =====================================================
 *   Componente principal
 * ===================================================== */
const Login = ({
  defaultEmail = "admin@example.com",
  defaultPassword = "ChangeMe!2025",
}) => {
  const [initialLoading, setInitialLoading] = useState(true);
  const [redirectLoading, setRedirectLoading] = useState(false);

  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState(defaultPassword);

  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  const [emailError, setEmailError] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const emailRef = useRef(null);
  const timers = useRef([]);
  const navigate = useNavigate();
  const { updateUser } = useContext(UserContext);

  // Logo y marca
  const { name: companyName, src: initialLogoSrc } = useCompanyLogo();
  const [logoSrc, setLogoSrc] = useState(initialLogoSrc);
  useEffect(() => setLogoSrc(initialLogoSrc), [initialLogoSrc]);

  // Simula carga inicial + focus
  useEffect(() => {
    const t = setTimeout(() => {
      setInitialLoading(false);
      emailRef.current?.focus();
    }, 700);
    timers.current.push(t);
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const handleKeyEvents = (e) => {
    if (e?.getModifierState) setCapsLockOn(e.getModifierState("CapsLock"));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setSuccess(false);

    if (!validateEmail(email)) {
      setEmailError("Email inválido");
      return;
    }
    if (!password) {
      setError("La contraseña es obligatoria.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await axiosInstance.post(API_PATHS.AUTH.LOGIN, {
        email,
        password,
      });
      const token = data?.token;
      const user = data?.user;
      const role = data?.role ?? user?.role;
      if (!token) throw new Error("No se recibió token");
      if (!user) throw new Error("No se recibió el usuario");

      updateUser({ ...user, role, token });

      setSuccess(true);
      setFadeOut(true);
      setRedirectLoading(true);

      const t = setTimeout(() => {
        navigate(role === "admin" ? "/admin/dashboard" : "/user/dashboard", {
          replace: true,
        });
      }, 850);
      timers.current.push(t);
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Login failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = loading || !email || !password || !!emailError;

  const gradient = pickGradient(companyName);

  return (
    <div
      className={`relative min-h-screen bg-gradient-to-tr ${gradient} flex items-center justify-center px-4 overflow-hidden`}
    >
      {/* Patrón de fondo sutil */}
      <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(circle_at_center,white,transparent_70%)]">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)",
            backgroundSize: "28px 28px, 28px 28px",
            backgroundPosition: "-14px -14px, -14px -14px",
          }}
        />
      </div>

      {/* Loader overlay (inicio/redirección) */}
      <AnimatePresence>
        {(initialLoading || redirectLoading) && (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-md z-50"
          >
            <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card principal con borde degradado */}
      <AnimatePresence>
        {!initialLoading && !fadeOut && (
          <motion.div
            key="login-card"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.45 }}
            className="w-full max-w-xl md:max-w-2xl lg:max-w-3xl p-[1px] rounded-3xl bg-gradient-to-br from-white/50 via-white/20 to-white/10 shadow-[0_20px_60px_rgba(0,0,0,.35)]"
          >
            <div className="rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 overflow-hidden flex flex-col sm:flex-row">
              {/* Panel visual */}
              <div className="bg-white/5 backdrop-blur-lg p-6 sm:p-8 flex flex-col items-center justify-center text-white sm:w-1/2 order-1 sm:order-none">
                <div className="relative">
                  <img
                    src={logoSrc}
                    alt={`Logo ${companyName}`}
                    className="w-24 sm:w-28 mb-4 rounded-2xl ring-1 ring-white/30 object-cover bg-white/20 shadow-lg animate-bounce-slow"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      if (e.currentTarget.src !== DEFAULT_ICON)
                        e.currentTarget.src = DEFAULT_ICON;
                    }}
                  />
                  <div
                    className="absolute inset-0 -z-10 blur-2xl opacity-40 rounded-3xl"
                    style={{
                      background:
                        "radial-gradient(60px 60px at 50% 50%, rgba(255,255,255,.25), transparent)",
                    }}
                  />
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold text-center mb-2 drop-shadow">
                  Bienvenido a {companyName}
                </h2>
                <p className="text-sm text-white/80 text-center max-w-xs leading-relaxed">
                  Organiza tus actividades, mantén el control y alcanza tus
                  metas.
                </p>
                <span className="mt-6 text-xs text-white/60">
                  © {new Date().getFullYear()} DoMore
                </span>
              </div>

              {/* Formulario */}
              <div className="w-full sm:w-1/2 p-8 sm:p-10 flex flex-col justify-center">
                <h1 className="text-3xl sm:text-4xl font-bold text-center text-white mb-8 drop-shadow-sm">
                  Inicia sesión 🚀
                </h1>

                <form onSubmit={handleLogin} className="space-y-6" noValidate>
                  <InputFL
                    id="email"
                    type="email"
                    label="Correo electrónico"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    onKeyUp={(e) => {
                      if (e?.getModifierState)
                        setCapsLockOn(e.getModifierState("CapsLock"));
                    }}
                    autoComplete="email"
                    icon={Mail}
                    error={emailError || undefined}
                  />

                  <div className="relative">
                    <InputFL
                      id="password"
                      type={showPassword ? "text" : "password"}
                      label="Contraseña"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyUp={handleKeyEvents}
                      autoComplete="current-password"
                      icon={Lock}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute top-1/2 right-4 -translate-y-1/2 text-white/70 hover:text-white transition"
                      aria-label={
                        showPassword
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                    {capsLockOn && (
                      <span className="absolute -bottom-5 left-1 text-xs text-yellow-200">
                        Bloq Mayús activado
                      </span>
                    )}
                  </div>

                  {error && (
                    <div className="rounded-lg bg-rose-500/20 text-rose-50 px-3 py-2 text-sm border border-rose-300/30">
                      {error}
                    </div>
                  )}
                  {success && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="rounded-lg bg-emerald-500/20 text-emerald-50 px-3 py-2 text-sm border border-emerald-300/30"
                    >
                      ¡Login exitoso! 🎉
                    </motion.div>
                  )}

                  <div className="flex items-center justify-between text-white/80 text-sm">
                    <label className="inline-flex items-center gap-2 select-none">
                      <input type="checkbox" className="accent-white/80" />{" "}
                      Recuérdame
                    </label>
                    <Link
                      to="/forgot-password"
                      className="underline decoration-white/40 hover:decoration-white"
                    >
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>

                  <button
                    type="submit"
                    disabled={isDisabled || loading}
                    className={[
                      "w-full text-white font-semibold py-3 rounded-xl transition-all duration-300",
                      "bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500",
                      "transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed",
                      "shadow-[0_10px_25px_-10px_rgba(0,0,0,.6)]",
                    ].join(" ")}
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                    ) : (
                      "Ingresar"
                    )}
                  </button>
                </form>

                <div className="text-sm text-center mt-4 text-white/80">
                  <span>¿No tienes cuenta? </span>
                  <Link
                    to="/signUp"
                    className="underline decoration-white/40 hover:decoration-white"
                  >
                    Regístrate
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* utilidades de animación */}
      <style>{`
        .animate-pulse-slow { animation: pulse 8s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.05); } }
        @media (prefers-reduced-motion: reduce) { .animate-pulse-slow { animation: none !important; } }
      `}</style>
    </div>
  );
};

export default Login;
