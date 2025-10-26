"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Navbar from "../components/navbar";
import HomeSection from "../components/HomeSection";
import InsightsSection from "../components/InsightsSection";
import ConfigSection from "../components/ConfigSection";
import CommunitySection from "../components/CommunitySection";

type Section = "home" | "insights" | "config" | "community";

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  created_at: string;
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<Section>("home");

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

    // Obtener datos del usuario desde la tabla users
    const { data: userData, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", session.user.email)
      .maybeSingle();

    // Si el usuario no existe en la tabla, crearlo
    if (!userData && !error) {
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert([
          {
            id: session.user.id,
            name:
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.name ||
              session.user.email?.split("@")[0] ||
              "Usuario",
            email: session.user.email!,
            password: "",
            phone: session.user.user_metadata?.phone || "",
            role: "user",
          },
        ])
        .select()
        .single();

      if (insertError) {
        console.error("Error al crear usuario:", insertError);
        router.push("/login");
        return;
      }

      setUser(newUser);
      setLoading(false);
      return;
    }

    if (error) {
      console.error("Error al obtener usuario:", error);
      router.push("/login");
      return;
    }

    if (userData) {
      setUser(userData);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-400 mx-auto mb-4"></div>
          <p className="text-white text-xl">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        userName={user.name}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeSection === "home" && <HomeSection user={user} />}
        {activeSection === "insights" && <InsightsSection />}
        {activeSection === "config" && <ConfigSection user={user} />}
        {activeSection === "community" && <CommunitySection />}
      </main>

      {/* Footer */}
      <footer className="bg-linear-to-r from-[#0a0a0a] to-[#0f0f0f] border-t border-gray-800/50 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-gray-500 text-sm">
            <p>© 2025 Gold&apos;s Gains. Todos los derechos reservados.</p>
            <p className="mt-2">Diseñado para alcanzar tus metas de fitness</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
