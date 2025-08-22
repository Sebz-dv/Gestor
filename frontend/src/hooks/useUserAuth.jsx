import { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext"; // ajusta a tu ruta real

export const useUserAuth = () => {
  const { user, loading, clearUser } = useContext(UserContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;          // aún verificando sesión
    if (!user) {                  // no hay usuario -> al login
      clearUser?.();              // limpia token/estado por si quedó basura
      navigate("/login", { replace: true });
    }
  }, [user, loading, clearUser, navigate]);
};
