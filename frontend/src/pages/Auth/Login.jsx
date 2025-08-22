// pages/Auth/Login.jsx
import React, { useContext, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Input from "../../components/input/Input";
import { validateEmail } from "../../utils/helper";
import axiosInstance from "../../utils/axiosInstance"; 
import { API_PATHS } from "../../utils/apiPaths";
import { UserContext } from "../../context/UserContext"; // si separaste contexto/proveedor

const Login = () => {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { updateUser } = useContext(UserContext);

  const handleEmailBlur = () => {
    setEmailError(validateEmail(email) ? null : "Email inválido");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validateEmail(email)) {
      setEmailError("Email inválido");
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

      // Delega persistencia del token al provider
      updateUser({ ...user, role, token });

      navigate(role === "admin" ? "/admin/dashboard" : "/user/dashboard", {
        replace: true,
      });
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

  const isDisabled = loading || !email || !password || !validateEmail(email);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcfbfc]">
      <div className="w-full max-w-md p-6 bg-white rounded-2xl shadow">
        <h3 className="text-xl font-semibold text-black">Welcome Back</h3>
        <p className="text-xs text-slate-700 mt-1 mb-6">
          Please enter your details to log in
        </p>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="john@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError(null);
            }}
            onBlur={handleEmailBlur}
            error={emailError}
            required
            autoComplete="email"
            disabled={loading}
          />

          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            disabled={loading}
          />

          <button
            type="submit"
            disabled={isDisabled}
            className="w-full rounded-lg px-4 py-2 font-medium bg-[#1368EC] text-white disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Login"}
          </button>
        </form>

        <div className="text-sm text-center mt-4">
          <span className="text-slate-600">No account? </span>
          <Link to="/signUp" className="text-[#1368EC] hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
