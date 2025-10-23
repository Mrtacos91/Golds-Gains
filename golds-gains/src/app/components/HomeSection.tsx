"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";

interface HomeUser {
  name: string;
  email: string;
  phone?: string;
  role: string;
  created_at: string;
}

interface HomeSectionProps {
  user: HomeUser;
}

interface Plan {
  id: number;
  user_id: string;
  split: string;
  exercises: string[];
  series: number[];
  reps: number[];
  days: string[];
  status: string[] | null;
  its_done: boolean | null;
  created_at: string;
}

interface TodayExercise {
  name: string;
  series: number;
  reps: number;
  status: string;
}

const DAYS_OF_WEEK = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

export default function HomeSection({ user }: HomeSectionProps) {
  const supabase = createClient();
  const [todayExercises, setTodayExercises] = useState<TodayExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [dayCompleted, setDayCompleted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [monthlyWorkouts, setMonthlyWorkouts] = useState(0);
  const [monthlyProgress, setMonthlyProgress] = useState(0);
  const [welcomeMessage, setWelcomeMessage] = useState("");

  useEffect(() => {
    loadUserId();
    // Seleccionar mensaje random al cargar el componente
    const messages = [
      "Hola marido",
      "Listo para dejar de ser skinny bitch?",
      "Bienvenido al plan fit me",
      "Yo y los longevos cuando:",
    ];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    setWelcomeMessage(randomMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (userId) {
      loadTodayExercises();
      loadMonthlyStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Obtener el UUID del usuario autenticado
  const loadUserId = async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser) {
        console.log("[HomeSection] User ID cargado:", authUser.id);
        setUserId(authUser.id);
      } else {
        console.error("[HomeSection] No hay usuario autenticado");
      }
    } catch (error) {
      console.error("[HomeSection] Error al cargar user ID:", error);
    }
  };

  // Función helper para obtener la fecha local del dispositivo
  const getLocalDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const loadMonthlyStats = async () => {
    if (!userId) return;

    try {
      console.log("[HomeSection] Cargando estadísticas mensuales...");

      // Obtener primer y último día del mes actual
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const firstDayStr = `${firstDay.getFullYear()}-${String(
        firstDay.getMonth() + 1
      ).padStart(2, "0")}-${String(firstDay.getDate()).padStart(2, "0")}`;
      const lastDayStr = `${lastDay.getFullYear()}-${String(
        lastDay.getMonth() + 1
      ).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;

      // Contar workouts del mes actual
      const { data: workouts, error } = await supabase
        .from("workout")
        .select("id, its_done, created_at")
        .eq("user_id", userId)
        .gte("created_at", firstDayStr)
        .lte("created_at", `${lastDayStr}T23:59:59`);

      if (error) {
        console.error(
          "[HomeSection] Error al cargar estadísticas mensuales:",
          error
        );
        return;
      }

      if (workouts) {
        // Contar workouts únicos (por día) usando Set de fechas
        const uniqueDays = new Set(
          workouts.map(
            (w: { created_at?: string }) => w.created_at?.split("T")[0]
          )
        );
        setMonthlyWorkouts(uniqueDays.size);

        // Calcular progreso (días completados / total de workouts)
        const completedWorkouts = workouts.filter(
          (w: { its_done?: boolean }) => w.its_done === true
        ).length;
        const progress =
          workouts.length > 0
            ? Math.round((completedWorkouts / workouts.length) * 100)
            : 0;
        setMonthlyProgress(progress);

        console.log("[HomeSection] Estadísticas mensuales:", {
          workouts: uniqueDays.size,
          progress: `${progress}%`,
        });
      }
    } catch (error) {
      console.error(
        "[HomeSection] ❌ Error inesperado en estadísticas:",
        error
      );
    }
  };

  const loadTodayExercises = async () => {
    if (!userId) {
      console.log("[HomeSection] No hay userId disponible");
      return;
    }

    try {
      console.log("[HomeSection] Cargando ejercicios de hoy...");

      // Obtener el plan del usuario usando el UUID
      const { data, error } = await supabase
        .from("plan")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error("[HomeSection] Error al cargar plan:", error);
        setLoading(false);
        return;
      }

      if (data) {
        console.log("[HomeSection] Plan cargado:", {
          split: data.split,
          exercises: data.exercises.length,
        });

        // Guardar el plan actual
        setCurrentPlan(data);

        const today = new Date();
        const dayIndex = today.getDay();
        const todayName = DAYS_OF_WEEK[dayIndex === 0 ? 6 : dayIndex - 1];

        console.log("[HomeSection] Día de hoy:", todayName);

        // Verificar si existe un workout para hoy
        const todayDate = getLocalDate();
        const startOfDay = new Date(todayDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(todayDate);
        endOfDay.setHours(23, 59, 59, 999);

        console.log("[HomeSection] Buscando workout para hoy:", {
          fecha: todayDate,
          dia: todayName,
          userId: userId,
        });

        const { data: workoutData, error: workoutError } = await supabase
          .from("workout")
          .select("*")
          .eq("user_id", userId)
          .contains("days", [todayName])
          .gte("created_at", todayDate)
          .lte("created_at", `${todayDate}T23:59:59`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (workoutError) {
          console.error("[HomeSection] Error al buscar workout:", workoutError);
        }

        if (workoutData) {
          console.log("[HomeSection] ✅ Workout encontrado:", {
            id: workoutData.id,
            its_done: workoutData.its_done,
            exercises_count: workoutData.exercises?.length || 0,
          });

          // Ya existe un workout registrado para hoy
          setDayCompleted(workoutData.its_done || false);

          // Agrupar los datos por ejercicio único
          const exerciseMap = new Map<
            string,
            {
              series: number;
              totalReps: number;
              completedSeries: number;
              status: string;
            }
          >();

          workoutData.exercises.forEach((exercise: string, index: number) => {
            if (!exerciseMap.has(exercise)) {
              exerciseMap.set(exercise, {
                series: 0,
                totalReps: 0,
                completedSeries: 0,
                status: "pendiente",
              });
            }
            const data = exerciseMap.get(exercise)!;
            data.series++;
            data.totalReps += workoutData.reps[index] || 0;
            if (workoutData.reps[index] > 0) {
              data.completedSeries++;
            }
          });

          // Determinar el status de cada ejercicio
          const exercises: TodayExercise[] = Array.from(
            exerciseMap.entries()
          ).map(([exerciseName, exerciseData]) => {
            const status =
              exerciseData.completedSeries === exerciseData.series
                ? "completado"
                : "pendiente";

            // Calcular reps promedio
            const avgReps =
              exerciseData.series > 0
                ? Math.round(exerciseData.totalReps / exerciseData.series)
                : 0;

            return {
              name: exerciseName,
              series: exerciseData.series,
              reps: avgReps,
              status: status,
            };
          });

          console.log("[HomeSection] Ejercicios procesados:", exercises);
          setTodayExercises(exercises);
        } else {
          console.log(
            "[HomeSection] No hay workout registrado, mostrando plan"
          );

          // No hay workout registrado, mostrar el plan
          setDayCompleted(false);
          const exercises: TodayExercise[] = [];
          data.exercises.forEach((exercise: string, index: number) => {
            if (data.days[index] === todayName) {
              exercises.push({
                name: exercise,
                series: data.series[index],
                reps: data.reps[index],
                status: "pendiente",
              });
            }
          });
          console.log("[HomeSection] Ejercicios desde plan:", exercises);
          setTodayExercises(exercises);
        }
      }
    } catch (error) {
      console.error("[HomeSection] ❌ Error inesperado:", error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-8 border border-gray-800/50 shadow-xl">
        <h2 className="text-3xl font-bold text-white mb-2">
          ¡Bienvenido, {user.name}!
        </h2>
        <p className="text-gray-400">{welcomeMessage}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-linear-to-br from-[#0a0a0a] via-[#141414] to-gray-900 rounded-xl p-6 border border-orange-400/20 hover:border-orange-400/40 transition-all shadow-lg hover:shadow-orange-400/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Entrenamientos</h3>
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
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
          </div>
          <p className="text-4xl font-bold text-orange-400 mb-2">
            {monthlyWorkouts}
          </p>
          <p className="text-gray-500 text-sm">Este mes</p>
        </div>

        <div className="bg-linear-to-br from-[#0a0a0a] via-[#141414] to-gray-900 rounded-xl p-6 border border-purple-400/20 hover:border-purple-400/40 transition-all shadow-lg hover:shadow-purple-400/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Split Actual</h3>
            <div className="w-10 h-10 rounded-full bg-purple-400/10 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
          </div>
          <p className="text-4xl font-bold text-purple-400 mb-2">
            {currentPlan?.split || "N/A"}
          </p>
          <p className="text-gray-500 text-sm">Plan de entrenamiento</p>
        </div>

        <div className="bg-linear-to-br from-[#0a0a0a] via-[#141414] to-gray-900 rounded-xl p-6 border border-blue-400/20 hover:border-blue-400/40 transition-all shadow-lg hover:shadow-blue-400/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Progreso</h3>
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
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
          </div>
          <p className="text-4xl font-bold text-blue-400 mb-2">
            {monthlyProgress}%
          </p>
          <p className="text-gray-500 text-sm">Meta mensual</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-6 border border-gray-800/50 shadow-xl">
        <h3 className="text-xl font-semibold text-white mb-4">
          Acciones Rápidas
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => (window.location.href = "/plan")}
            className="bg-linear-to-br from-[#0f0f0f] to-[#1a1a1a] hover:from-[#151515] hover:to-[#202020] border border-gray-800/50 rounded-lg p-4 text-left transition-all shadow-lg"
          >
            <div className="w-10 h-10 rounded-full bg-orange-400/10 flex items-center justify-center mb-3">
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <p className="text-white font-medium">Crear Plan</p>
            <p className="text-gray-500 text-sm">Plan de entrenamiento</p>
          </button>

          <button
            onClick={() => (window.location.href = "/progress")}
            className="bg-linear-to-br from-[#0f0f0f] to-[#1a1a1a] hover:from-[#151515] hover:to-[#202020] border border-gray-800/50 rounded-lg p-4 text-left transition-all shadow-lg"
          >
            <div className="w-10 h-10 rounded-full bg-pink-400/10 flex items-center justify-center mb-3">
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <p className="text-white font-medium">Registrar Progreso</p>
            <p className="text-gray-500 text-sm">Progreso de hoy</p>
          </button>

          <button className="bg-linear-to-br from-[#0f0f0f] to-[#1a1a1a] hover:from-[#151515] hover:to-[#202020] border border-gray-800/50 rounded-lg p-4 text-left transition-all shadow-lg">
            <div className="w-10 h-10 rounded-full bg-blue-400/10 flex items-center justify-center mb-3">
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-white font-medium">Metas</p>
            <p className="text-gray-500 text-sm">Peso e índice de grasa</p>
          </button>

          <button className="bg-linear-to-br from-[#0f0f0f] to-[#1a1a1a] hover:from-[#151515] hover:to-[#202020] border border-gray-800/50 rounded-lg p-4 text-left transition-all shadow-lg">
            <div className="w-10 h-10 rounded-full bg-purple-400/10 flex items-center justify-center mb-3">
              <svg
                className="w-5 h-5 text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-white font-medium">Ver Estadísticas</p>
            <p className="text-gray-500 text-sm">Análisis detallado</p>
          </button>
        </div>
      </div>

      {/* Progreso Hoy */}
      <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-6 border border-gray-800/50 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">Progreso Hoy</h3>
          <span className="text-sm text-gray-400">
            {
              DAYS_OF_WEEK[
                new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
              ]
            }
          </span>
        </div>

        {/* Completed Day Banner */}
        {dayCompleted && (
          <div className="mb-4 p-4 bg-linear-to-r from-green-400/10 to-emerald-500/10 border-2 border-green-400/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-400/20 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-green-400">
                  ¡Día Completado! 🎉
                </h4>
                <p className="text-xs text-gray-400">
                  Has completado todos los ejercicios de hoy
                </p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
          </div>
        ) : todayExercises.length > 0 ? (
          <div className="space-y-3">
            {todayExercises.map((exercise, index) => {
              const completed = exercise.status === "completado";

              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] rounded-lg border border-gray-800/50"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        completed ? "bg-green-400/20" : "bg-orange-400/10"
                      }`}
                    >
                      {completed ? (
                        <svg
                          className="w-5 h-5 text-green-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
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
                            d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <p
                        className={`font-medium ${
                          completed
                            ? "text-gray-500 line-through"
                            : "text-white"
                        }`}
                      >
                        {exercise.name}
                      </p>
                      <p className="text-gray-500 text-sm">
                        {exercise.series} series × {exercise.reps} reps
                      </p>
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      completed
                        ? "bg-green-400/20 text-green-400"
                        : "bg-orange-400/20 text-orange-400"
                    }`}
                  >
                    {completed ? "Completado" : "Pendiente"}
                  </div>
                </div>
              );
            })}

            {/* Progress Bar */}
            <div className="mt-6 pt-4 border-t border-gray-800/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Progreso del día</span>
                <span className="text-sm font-semibold text-orange-400">
                  {
                    todayExercises.filter((e) => e.status === "completado")
                      .length
                  }{" "}
                  / {todayExercises.length}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-orange-400 to-pink-400 transition-all duration-500"
                  style={{
                    width: `${
                      (todayExercises.filter((e) => e.status === "completado")
                        .length /
                        todayExercises.length) *
                      100
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-600"
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
            <p className="text-gray-400 mb-2">
              No tienes entrenamientos para hoy
            </p>
            <p className="text-gray-600 text-sm">
              ¡Disfruta tu día de descanso o crea un nuevo plan!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
