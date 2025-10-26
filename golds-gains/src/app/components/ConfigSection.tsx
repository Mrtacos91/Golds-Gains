"use client";

import { useState } from "react";

interface ConfigUser {
  name: string;
  email: string;
  phone?: string;
  role: string;
  created_at: string;
}

interface ConfigSectionProps {
  user: ConfigUser;
}

export default function ConfigSection({ user }: ConfigSectionProps) {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    phone: user.phone || "",
  });

  const handleSave = () => {
    // Aquí implementarías la lógica para guardar los cambios
    console.log("Guardando cambios:", formData);
    setEditMode(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-6 border border-gray-800/50 shadow-xl">
        <h2 className="text-3xl font-bold text-white mb-2">Configuración</h2>
        <p className="text-gray-500">
          Personaliza tu experiencia y gestiona tu cuenta
        </p>
      </div>

      {/* Profile Information */}
      <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-6 border border-gray-800/50 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-white">
            Información Personal
          </h3>
          <button
            onClick={() => setEditMode(!editMode)}
            className="px-4 py-2 bg-pink-400 hover:bg-orange-400 text-white rounded-lg transition-colors"
          >
            {editMode ? "Cancelar" : "Editar"}
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nombre Completo
            </label>
            {editMode ? (
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] border border-gray-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
            ) : (
              <p className="text-white text-lg">{user.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Correo Electrónico
            </label>
            <p className="text-white text-lg">{user.email}</p>
            <p className="text-gray-500 text-sm mt-1">
              El correo no se puede modificar
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Teléfono
            </label>
            {editMode ? (
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full px-4 py-2 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] border border-gray-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
            ) : (
              <p className="text-white text-lg">
                {user.phone || "No especificado"}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Rol
            </label>
            <span className="inline-block px-3 py-1 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] border border-gray-800/50 rounded-full text-pink-400 text-sm font-medium">
              {user.role}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Miembro desde
            </label>
            <p className="text-white text-lg">
              {new Date(user.created_at).toLocaleDateString("es-ES", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        {editMode && (
          <div className="mt-6">
            <button
              onClick={handleSave}
              className="w-full px-4 py-3 bg-[#ff6b35] hover:bg-[#ff8555] text-white font-medium rounded-lg transition-colors"
            >
              Guardar Cambios
            </button>
          </div>
        )}
      </div>

      {/* Session Management */}
      <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-6 border border-gray-800/50">
        <h3 className="text-xl font-semibold text-white mb-4">Sesión</h3>
        <div className="space-y-3">
          <button
            onClick={async () => {
              const { supabase } = await import("@/lib/supabase");
              await supabase.auth.signOut();
              localStorage.removeItem("user");
              window.location.href = "/login";
            }}
            className="w-full px-4 py-3 bg-pink-400 hover:bg-orange-400 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-pink-400/20"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-6 border border-red-900/50">
        <h3 className="text-xl font-semibold text-red-500 mb-4">
          Zona Peligrosa
        </h3>
        <div className="space-y-3">
          <button className="w-full px-4 py-3 bg-red-900/20 hover:bg-red-900/30 border border-red-500/50 text-red-400 font-medium rounded-lg transition-colors">
            Cambiar Contraseña
          </button>
          <button className="w-full px-4 py-3 bg-red-900/20 hover:bg-red-900/30 border border-red-500/50 text-red-400 font-medium rounded-lg transition-colors">
            Eliminar Cuenta
          </button>
        </div>
      </div>
    </div>
  );
}
