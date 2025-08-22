import React, { useEffect, useMemo, useState } from "react";
import { LuUsers, LuSearch } from "react-icons/lu";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import Modal from "../Modal";
import AvatarGroup from "../AvatarGroup";

// selectedUsers: string[] | number[]
// setSelectedUsers: (ids) => void
const SelectUsers = ({ selectedUsers = [], setSelectedUsers }) => {
  const [allUsers, setAllUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempSelectedUsers, setTempSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  // ---------- utils ----------
  const resolveId = (u) => u?.id ?? u?._id ?? u?.uuid ?? u?.userId;
  const getAvatarUrl = (u) =>
    u?.profileImageUrl || u?.avatar || u?.photoURL || u?.photo || null;
  const getDisplayName = (u) =>
    u?.name ||
    u?.fullName ||
    [u?.firstName, u?.lastName].filter(Boolean).join(" ") ||
    u?.username ||
    "Usuario";

  const getInitials = (u) => {
    const name = getDisplayName(u).trim();
    return name
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  // Fallback avatar como SVG embebido (se ve nítido y no requiere assets)
  const svgAvatar = (initials) => {
    const svg = encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'>
        <rect width='100%' height='100%' fill='#0ea5e9'/>
        <text x='50%' y='54%' font-family='Inter, Arial, sans-serif' font-size='34' fill='white' text-anchor='middle' dominant-baseline='middle'>${initials}</text>
      </svg>`
    );
    return `data:image/svg+xml;utf8,${svg}`;
  };

  // ---------- data fetch ----------
  const getAllUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS);
      setAllUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("No se pudieron cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAllUsers();
  }, []);

  // buffer modal
  useEffect(() => {
    setTempSelectedUsers(Array.isArray(selectedUsers) ? selectedUsers : []);
  }, [selectedUsers]);

  // seleccionados (objetos)
  const selectedUserObjs = useMemo(() => {
    const ids = new Set((selectedUsers ?? []).map(String));
    return allUsers.filter((u) => ids.has(String(resolveId(u))));
  }, [allUsers, selectedUsers]);

  // Avatares para AvatarGroup (con fallback a SVG-iniciales)
  const selectedUserAvatars = useMemo(() => {
    return selectedUserObjs
      .map((u) => getAvatarUrl(u) || svgAvatar(getInitials(u)))
      .filter(Boolean);
  }, [selectedUserObjs]);

  // búsqueda
  const filteredUsers = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return allUsers;
    return allUsers.filter((u) => {
      const name = getDisplayName(u).toLowerCase();
      const email = (u?.email || "").toLowerCase();
      const userName = (u?.username || "").toLowerCase();
      return (
        name.includes(term) || email.includes(term) || userName.includes(term)
      );
    });
  }, [q, allUsers]);

  const toggleUserSelection = (userId) => {
    setTempSelectedUsers((prev) => {
      const has = prev.some((id) => String(id) === String(userId));
      if (has) return prev.filter((id) => String(id) !== String(userId));
      return [...prev, userId];
    });
  };

  const handleAssign = () => {
    // dedupe por si las moscas
    const dedup = Array.from(new Set(tempSelectedUsers.map(String)));
    setSelectedUsers?.(dedup);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-3 mt-2">
      {/* Si no hay selección, botón grande; si hay, muestra AvatarGroup clickeable */}
      {selectedUserAvatars.length === 0 ? (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="card-btn inline-flex items-center gap-2"
        >
          <LuUsers className="text-sm" />
          Agregar miembros
        </button>
      ) : (
        <div className="flex items-center gap-3">
          {/* Avatares */}
          <AvatarGroup
            avatars={selectedUserAvatars}
            maxVisible={3}
            onClick={() => setIsModalOpen(true)}
            className="cursor-pointer"
          />

          {/* Botón para editar usuarios */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="card-btn text-sm"
          >
            Editar usuarios
          </button>
        </div>
      )}

      {/* Modal de selección */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Seleccionar usuarios"
        >
          {/* Buscador */}
          <div className="relative mb-3">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, email o usuario..."
              className="w-full pl-9 pr-3 py-2 border rounded-md outline-none focus:ring"
              aria-label="Buscar usuario"
            />
          </div>

          {loading && (
            <p className="text-sm text-gray-500">Cargando usuarios…</p>
          )}
          {error && !loading && <p className="text-sm text-red-600">{error}</p>}

          <div className="space-y-0 divide-y h-[60vh] overflow-y-auto border rounded-md">
            {!loading && filteredUsers.length === 0 && (
              <div className="p-4 text-sm text-gray-500">
                No hay resultados.
              </div>
            )}

            {filteredUsers.map((user) => {
              const id = resolveId(user);
              const img = getAvatarUrl(user) || svgAvatar(getInitials(user));
              const checked = tempSelectedUsers.some(
                (x) => String(x) === String(id)
              );
              return (
                <label
                  key={id}
                  className="flex items-center gap-4 p-3 hover:bg-gray-50 cursor-pointer"
                >
                  <img
                    src={img}
                    alt={getDisplayName(user)}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {getDisplayName(user)}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.email || "—"}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleUserSelection(id)}
                    className="h-4 w-4"
                    aria-label={`Seleccionar a ${getDisplayName(user)}`}
                  />
                </label>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="card-btn"
              aria-label="Cerrar modal"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAssign}
              className="card-btn-fill"
              disabled={tempSelectedUsers.length === 0}
              aria-label="Asignar usuarios"
            >
              Asignar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SelectUsers;
