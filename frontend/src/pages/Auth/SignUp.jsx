// pages/Auth/SignUp.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Input from "../../components/input/Input";
import { validateEmail } from "../../utils/helper";
import ProfilePhotoSelector from "../../components/input/ProfilePhotoSelector"; // <- usa el componente externo

const SignUp = () => {
  const [profilePic, setProfilePic] = useState(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [emailErr, setEmailErr] = useState(null);
  const [password, setPassword] = useState("");
  const [adminInviteToken, setAdminInviteToken] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) return setError("Full name is required");
    if (!validateEmail(email)) return setEmailErr("Invalid email");
    if (password.length < 8)
      return setError("Password must be at least 8 characters");

    setLoading(true);
    try {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

      // 1) Subir imagen si hay
      let profileImageUrl = null;
      if (profilePic) {
        const fd = new FormData();
        fd.append("image", profilePic);
        const upRes = await fetch(`${base}/api/upload-image`, {
          method: "POST",
          body: fd,
        });
        const upData = await upRes.json();
        if (!upRes.ok)
          throw new Error(
            upData.error || upData.message || "Image upload failed"
          );
        profileImageUrl = upData.imageUrl;
      }

      // 2) Registrar usuario
      const res = await fetch(`${base}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName.trim(),
          email,
          password,
          profileImageUrl,
          adminInviteToken: adminInviteToken || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || data.message || "Sign up failed");

      // 3) Guardar sesión y redirigir
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      const role = data.user?.role;
      navigate(role === "admin" ? "/admin/dashboard" : "/user/dashboard", {
        replace: true,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const disabled =
    loading || !fullName || !email || !password || !validateEmail(email);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcfbfc] px-4">
      <div className="w-full max-w-md mx-auto p-6 bg-white rounded-2xl shadow">
        <h3 className="text-xl font-semibold text-black">Create an Account</h3>
        <p className="text-xs text-slate-700 mt-1 mb-6">
          Join us today by entering your details below.
        </p>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-5">
          {/* Usa el componente externo */}
          <ProfilePhotoSelector
            image={profilePic}
            setImage={setProfilePic}
            disabled={loading}
          />

          <div className="grid grid-cols-1 gap-4">
            <Input
              label="Full Name"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={loading}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="john@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailErr) setEmailErr(null);
              }}
              onBlur={() =>
                setEmailErr(validateEmail(email) ? null : "Invalid email")
              }
              error={emailErr}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            disabled={loading}
          />

          <Input
            label="Admin Invite Token (optional)"
            placeholder="Enter token if you have one"
            value={adminInviteToken}
            onChange={(e) => setAdminInviteToken(e.target.value)}
            disabled={loading}
          />

          <button
            type="submit"
            disabled={disabled}
            className="w-full rounded-lg px-4 py-2 font-medium bg-[#1368EC] text-white disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Sign Up"}
          </button>
        </form>

        <div className="text-sm text-center mt-4">
          <span className="text-slate-600">Already have an account? </span>
          <Link to="/login" className="text-[#1368EC] hover:underline">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
