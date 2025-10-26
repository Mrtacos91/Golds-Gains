"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Phone,
  ChevronDown,
} from "lucide-react";

// Códigos de teléfono de Norteamérica y Europa
const PHONE_CODES = [
  { code: "+1", country: "us" },
  { code: "+1", country: "ca" },
  { code: "+52", country: "mx" },
  { code: "+44", country: "uk" },
  { code: "+33", country: "fr" },
  { code: "+49", country: "de" },
  { code: "+34", country: "es" },
  { code: "+39", country: "it" },
  { code: "+31", country: "nl" },
  { code: "+32", country: "be" },
  { code: "+41", country: "ch" },
  { code: "+43", country: "at" },
  { code: "+45", country: "dk" },
  { code: "+46", country: "se" },
  { code: "+47", country: "no" },
  { code: "+358", country: "fi" },
  { code: "+351", country: "pt" },
  { code: "+353", country: "ie" },
  { code: "+30", country: "gr" },
  { code: "+48", country: "pl" },
  { code: "other", country: "otro" },
];

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });
  const [phoneCode, setPhoneCode] = useState("+1");
  const [customCode, setCustomCode] = useState("");
  const [showPhoneDropdown, setShowPhoneDropdown] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validación de contraseñas en registro
    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";

      // Construir el teléfono completo
      const fullPhone =
        phoneCode === "other"
          ? customCode + formData.phone
          : phoneCode + formData.phone;

      const body = isLogin
        ? { email: formData.email, password: formData.password }
        : { ...formData, phone: fullPhone };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      // Try to parse JSON only when the response is JSON; otherwise read text
      let data: any = null;
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        try {
          data = await response.json();
        } catch (parseErr) {
          // JSON parse failed even though header said JSON
          console.error(
            "Registro: fallo al parsear JSON de la respuesta:",
            parseErr
          );
          const raw = await response.text();
          console.error(
            "Registro: cuerpo de la respuesta no válido (raw):",
            raw
          );
          setError("Respuesta inesperada del servidor. Intenta nuevamente.");
          setLoading(false);
          return;
        }
      } else {
        // Not JSON — read raw text for debugging and bail out
        const raw = await response.text();
        console.error(
          "Registro: respuesta no-JSON del servidor (status:",
          response.status,
          "):",
          raw
        );
        setError("Respuesta inesperada del servidor. Intenta nuevamente.");
        setLoading(false);
        return;
      }

      if (!response.ok) {
        // Log server error details to console for debugging
        console.error("Registro fallido (server response):", data);
        setError(data?.error || "Ha ocurrido un error");
        setLoading(false);
        return;
      }

      // Si es registro, mostrar mensaje de verificación
      if (!isLogin && data.requiresEmailVerification) {
        setMessage(data.message);
        setLoading(false);
        setFormData({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
          phone: "",
        });
        return;
      }

      // Guardar el usuario en localStorage o session storage
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      // Redirigir a la página principal
      router.push("/home");
    } catch (_err) {
      // Log network / unexpected errors to console
      console.error("Error durante el registro (network/exception):", _err);
      setError("Error de conexión. Intenta nuevamente.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        setError("Error al iniciar sesión con Google: " + error.message);
        setLoading(false);
        return;
      }

      // El usuario será redirigido a Google para autenticación
    } catch (_err) {
      setError("Error al conectar con Google. Intenta nuevamente.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 px-4 py-12">
      <div className="max-w-md w-full space-y-6 bg-linear-to-br from-[#0a0a0a] via-[#141414] to-gray-900 p-8 rounded-xl shadow-xl border border-gray-800/50">
        <div className="text-center">
          <div className="mx-auto w-20 h-20 backdrop-blur-2xl bg-linear-to-br from-black-400 to-black-300 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-gray-600/20 p-2">
            <Image
              src="/logo.png"
              alt="Golds & Gains Logo"
              width={64}
              height={64}
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            {isLogin ? "Bienvenido de nuevo" : "Únete a Golds & Gains"}
          </h2>
          <p className="text-sm text-gray-400">
            {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
                setMessage("");
                setFormData({
                  name: "",
                  email: "",
                  password: "",
                  confirmPassword: "",
                  phone: "",
                });
              }}
              className="font-medium text-orange-400 hover:text-orange-300 transition-colors"
            >
              {isLogin ? "Regístrate" : "Inicia sesión"}
            </button>
          </p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-900/20 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg text-sm">
            {message}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Nombre completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required={!isLogin}
                      value={formData.name}
                      onChange={handleInputChange}
                      className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-800/50 placeholder-gray-500 text-white bg-[#0f0f0f] rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      placeholder="Juan Pérez"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Teléfono
                  </label>
                  <div className="flex gap-2">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowPhoneDropdown(!showPhoneDropdown)}
                        className="appearance-none relative flex items-center gap-2 px-3 py-3 border border-gray-800/50 text-white bg-[#0f0f0f] rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all min-w-[100px]"
                      >
                        <span className="text-sm">
                          {phoneCode === "other" ? "Otro" : phoneCode}
                        </span>
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      </button>

                      {showPhoneDropdown && (
                        <div className="absolute z-10 mt-1 w-48 bg-[#0f0f0f] border border-gray-800/50 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                          {PHONE_CODES.map((item, index) => (
                            <button
                              key={`${item.code}-${item.country}-${index}`}
                              type="button"
                              onClick={() => {
                                setPhoneCode(item.code);
                                setShowPhoneDropdown(false);
                                if (item.code !== "other") {
                                  setCustomCode("");
                                }
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-800/50 text-white text-sm transition-colors flex items-center justify-between"
                            >
                              <span className="font-medium text-orange-400">
                                {item.code === "other" ? "Otro" : item.code}
                              </span>
                              <span className="text-gray-500 text-xs uppercase">
                                {item.country}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {phoneCode === "other" && (
                      <input
                        type="text"
                        value={customCode}
                        onChange={(e) => setCustomCode(e.target.value)}
                        placeholder="+XX"
                        className="appearance-none relative block w-20 px-3 py-3 border border-gray-800/50 placeholder-gray-500 text-white bg-[#0f0f0f] rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all"
                      />
                    )}

                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        required={!isLogin}
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-800/50 placeholder-gray-500 text-white bg-[#0f0f0f] rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all"
                        placeholder="1234567890"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-800/50 placeholder-gray-500 text-white bg-[#0f0f0f] rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="correo@ejemplo.com"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full pl-10 pr-12 py-3 border border-gray-800/50 placeholder-gray-500 text-white bg-[#0f0f0f] rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required={!isLogin}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="appearance-none relative block w-full pl-10 pr-12 py-3 border border-gray-800/50 placeholder-gray-500 text-white bg-[#0f0f0f] rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-linear-to-r from-orange-400 to-pink-400 hover:from-orange-500 hover:to-pink-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-400/20"
          >
            {loading
              ? "Procesando..."
              : isLogin
              ? "Iniciar Sesión"
              : "Registrarse"}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800/50" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-linear-to-br from-[#0a0a0a] via-[#141414] to-gray-900 text-gray-400">
                O continúa con
              </span>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-800/50 rounded-lg shadow-sm bg-[#0f0f0f] text-sm font-medium text-gray-300 hover:bg-[#1a1a1a] hover:border-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continuar con Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
