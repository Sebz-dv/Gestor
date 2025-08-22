import React, { createContext, useState, useEffect } from "react";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";

export const UserContext = createContext();

const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Función para obtener usuario
  const fetchUser = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.AUTH.GET_PROFILE);
      setUser(response.data);
    } catch (error) {
      console.error("User not authenticated", error);
      clearUser();
    } finally {
      setLoading(false);
    }
  };

  // Cargar usuario al inicio
  useEffect(() => {
    const accessToken = localStorage.getItem("token");

    if (!accessToken) {
      setLoading(false);
      return;
    }

    fetchUser();
  }, []);

  // Actualizar usuario
  const updateUser = (userData) => {
    setUser(userData);
    if (userData?.token) {
      localStorage.setItem("token", userData.token);
    }
    setLoading(false);
  };

  // Limpiar sesión
  const clearUser = () => {
    setUser(null);
    localStorage.removeItem("token");
  };

  return (
    <UserContext.Provider value={{ user, loading, updateUser, clearUser }}>
      {children}
    </UserContext.Provider>
  );
};

export default UserProvider;
