// pages/Auth/Login.jsx
import React, { useContext, useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { validateEmail } from "../../utils/helper";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { UserContext } from "../../context/UserContext";

const Login = ({ defaultEmail = "", defaultPassword = "" }) => {
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

  // Simula carga inicial + focus
  useEffect(() => {
    const t = setTimeout(() => {
      setInitialLoading(false);
      emailRef.current?.focus();
    }, 900);
    timers.current.push(t);
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const handleKeyEvents = (e) => {
    if (e?.getModifierState) setCapsLockOn(e.getModifierState("CapsLock"));
  };

  const handleEmailBlur = () => {
    setEmailError(validateEmail(email) ? null : "Email inválido");
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

      // Persistencia vía contexto (como ya hacías)
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

  return (
    <div className="relative min-h-screen bg-gradient-to-tr from-indigo-700 via-purple-700 to-pink-600 flex items-center justify-center px-4 overflow-hidden">
      {/* blobs suaves */}
      <div className="pointer-events-none absolute -top-20 -left-20 w-96 h-96 bg-pink-300 rounded-full opacity-20 blur-[100px] animate-pulse-slow" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-96 h-96 bg-indigo-400 rounded-full opacity-20 blur-[100px] animate-pulse-slow" />

      {/* Loader overlay (inicio/redirección) */}
      <AnimatePresence>
        {(initialLoading || redirectLoading) && (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-50"
          >
            <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card principal */}
      <AnimatePresence>
        {!initialLoading && !fadeOut && (
          <motion.div
            key="login-card"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-xl md:max-w-2xl lg:max-w-3xl bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col sm:flex-row"
          >
            {/* Formulario */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="w-full p-8 sm:p-10 flex flex-col justify-center"
            >
              <h1 className="text-3xl sm:text-4xl font-bold text-center text-white mb-8 drop-shadow-sm">
                Inicia sesión 🚀
              </h1>

              <form onSubmit={handleLogin} className="space-y-6" noValidate>
                {/* Email */}
                <div className="relative">
                  <input
                    ref={emailRef}
                    type="email"
                    inputMode="email"
                    placeholder="Correo electrónico"
                    className={`w-full bg-white/10 text-white placeholder-white/70 px-4 py-3 rounded-xl outline-none transition-all
                                focus:ring-2 focus:ring-purple-300
                                ${emailError ? "ring-2 ring-rose-400" : ""}`}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    onBlur={handleEmailBlur}
                    onKeyUp={handleKeyEvents}
                    autoComplete="email"
                    aria-label="Correo electrónico"
                    required
                  />
                  {emailError && (
                    <span className="absolute -bottom-5 left-1 text-xs text-rose-200">
                      {emailError}
                    </span>
                  )}
                </div>

                {/* Password */}
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Contraseña"
                    className="w-full bg-white/10 text-white placeholder-white/70 px-4 py-3 rounded-xl focus:ring-2 focus:ring-purple-300 outline-none transition-all pr-12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={handleKeyEvents}
                    autoComplete="current-password"
                    aria-label="Contraseña"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute top-1/2 right-4 -translate-y-1/2 text-white/70 hover:text-white transition"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
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

                {/* Mensajes */}
                {error && (
                  <p className="text-center text-rose-200 text-sm" role="alert">
                    {error}
                  </p>
                )}
                {success && (
                  <motion.p
                    className="text-center text-emerald-200 text-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    ¡Login exitoso! 🎉
                  </motion.p>
                )}

                {/* Botón */}
                <button
                  type="submit"
                  disabled={isDisabled || loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Ingresar"
                  )}
                </button>
              </form>

              {/* Links secundarios */}
              <div className="text-sm text-center mt-4 text-white/80">
                <span>¿No tienes cuenta? </span>
                <Link to="/signUp" className="underline decoration-white/40 hover:decoration-white">
                  Regístrate
                </Link>
              </div>
            </motion.div>

            {/* Lado visual */}
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="bg-white/5 backdrop-blur-lg p-6 sm:p-8 flex flex-col items-center justify-center text-white"
            >
              <img
                src="https://cdn-icons-png.flaticon.com/512/3075/3075977.png"
                alt="Task Icon"
                className="w-24 sm:w-28 mb-4 animate-bounce-slow"
                loading="lazy"
                decoding="async"
              />
              <h2 className="text-xl sm:text-2xl font-semibold text-center mb-3 drop-shadow">
                Bienvenido a tu gestor de tareas DoMore.
              </h2>
              <p className="text-sm text-white/80 text-center max-w-xs leading-relaxed">
                Organiza tus actividades, mantén el control y alcanza tus metas.
              </p>
              <span className="mt-6 text-xs text-white/60">
                © {new Date().getFullYear()} DoMore
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* utilidades de animación */}
      <style>{`
        .animate-pulse-slow { animation: pulse 8s infinite; }
        .animate-bounce-slow { animation: bounce 2.5s infinite; }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
};

export default Login;
