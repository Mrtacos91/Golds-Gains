"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface User {
  name: string;
  email: string;
  phone?: string;
  role: string;
  created_at: string;
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkUser() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .eq("email", session.user.email)
      .single();

    setUser(userData);
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    localStorage.removeItem("user");
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a]">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#2d2d2d] rounded-2xl shadow-2xl border border-[#3d3d3d] p-8">
          <h1 className="text-3xl font-bold text-white mb-6">
            Bienvenido a Gold&apos;s Gains
          </h1>

          {user && (
            <div className="space-y-4">
              <div className="bg-[#1a1a1a] p-6 rounded-lg border border-[#3d3d3d]">
                <h2 className="text-xl font-semibold text-[#ff6b35] mb-4">
                  Información del Usuario
                </h2>
                <div className="space-y-2 text-gray-300">
                  <p>
                    <span className="text-gray-400">Nombre:</span> {user.name}
                  </p>
                  <p>
                    <span className="text-gray-400">Email:</span> {user.email}
                  </p>
                  <p>
                    <span className="text-gray-400">Teléfono:</span>{" "}
                    {user.phone || "No proporcionado"}
                  </p>
                  <p>
                    <span className="text-gray-400">Rol:</span> {user.role}
                  </p>
                  <p>
                    <span className="text-gray-400">Miembro desde:</span>{" "}
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
