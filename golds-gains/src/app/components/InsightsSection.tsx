"use client";

export default function InsightsSection() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-6 border border-gray-800/50 shadow-xl">
        <h2 className="text-3xl font-bold text-white mb-2">Insights</h2>
        <p className="text-gray-500">
          Análisis detallado de tu progreso y rendimiento
        </p>
      </div>

      {/* Weekly Progress */}
      <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-6 border border-gray-800/50 shadow-xl">
        <h3 className="text-xl font-semibold text-white mb-4">
          Progreso Semanal
        </h3>
        <div className="space-y-4">
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(
            (day, index) => {
              const progress = [85, 70, 90, 60, 95, 50, 75][index];
              return (
                <div key={day} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{day}</span>
                    <span className="text-blue-400 font-semibold">
                      {progress}%
                    </span>
                  </div>
                  <div className="w-full bg-[#0f0f0f] rounded-full h-3 border border-gray-800/50">
                    <div
                      className="bg-linear-to-r from-blue-400 to-blue-500 h-full rounded-full transition-all duration-500 shadow-lg shadow-blue-400/20"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-6 border border-gray-800/50 shadow-xl">
          <h3 className="text-xl font-semibold text-white mb-4">
            Métricas de Rendimiento
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] rounded-lg border border-gray-800/50">
              <div>
                <p className="text-gray-500 text-sm">
                  Frecuencia Cardíaca Promedio
                </p>
                <p className="text-2xl font-bold text-white">142 bpm</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-pink-400/10 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-pink-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] rounded-lg border border-gray-800/50">
              <div>
                <p className="text-gray-500 text-sm">Duración Promedio</p>
                <p className="text-2xl font-bold text-white">52 min</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-400/10 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] rounded-lg border border-gray-800/50">
              <div>
                <p className="text-gray-500 text-sm">Calorías por Sesión</p>
                <p className="text-2xl font-bold text-white">385 cal</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-orange-400/10 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-orange-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-6 border border-gray-800/50 shadow-xl">
          <h3 className="text-xl font-semibold text-white mb-4">
            Objetivos del Mes
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Entrenamientos</span>
                <span className="text-blue-400 font-semibold">12/15</span>
              </div>
              <div className="w-full bg-[#0f0f0f] rounded-full h-3 border border-gray-800/50">
                <div
                  className="bg-linear-to-r from-blue-400 to-blue-500 h-full rounded-full shadow-lg shadow-blue-400/20"
                  style={{ width: "80%" }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Calorías Quemadas</span>
                <span className="text-pink-400 font-semibold">4,850/6,000</span>
              </div>
              <div className="w-full bg-[#0f0f0f] rounded-full h-3 border border-gray-800/50">
                <div
                  className="bg-linear-to-r from-pink-400 to-pink-500 h-full rounded-full shadow-lg shadow-pink-400/20"
                  style={{ width: "81%" }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Peso Objetivo</span>
                <span className="text-orange-400 font-semibold">
                  -2.5/-5 kg
                </span>
              </div>
              <div className="w-full bg-[#0f0f0f] rounded-full h-3 border border-gray-800/50">
                <div
                  className="bg-linear-to-r from-orange-400 to-orange-500 h-full rounded-full shadow-lg shadow-orange-400/20"
                  style={{ width: "50%" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-6 border border-gray-800/50 shadow-xl">
        <h3 className="text-xl font-semibold text-white mb-4">
          Recomendaciones Personalizadas
        </h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] rounded-lg border border-orange-400/20">
            <div className="w-10 h-10 rounded-full bg-orange-400/10 flex items-center justify-center shrink-0 mt-1">
              <svg
                className="w-5 h-5 text-orange-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <p className="text-white font-medium">Aumenta tu intensidad</p>
              <p className="text-gray-500 text-sm">
                Basado en tus métricas, podrías incrementar la intensidad de tus
                entrenamientos en un 10%
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] rounded-lg border border-blue-400/20">
            <div className="w-10 h-10 rounded-full bg-blue-400/10 flex items-center justify-center shrink-0 mt-1">
              <svg
                className="w-5 h-5 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-white font-medium">Mejor horario</p>
              <p className="text-gray-500 text-sm">
                Tus entrenamientos matutinos muestran mejor rendimiento.
                Considera mantener este horario.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] rounded-lg border border-pink-400/20">
            <div className="w-10 h-10 rounded-full bg-pink-400/10 flex items-center justify-center shrink-0 mt-1">
              <svg
                className="w-5 h-5 text-pink-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-white font-medium">Nutrición</p>
              <p className="text-gray-500 text-sm">
                Considera aumentar tu ingesta de proteínas para optimizar la
                recuperación muscular.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
