"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface WorkoutRecord {
  id: number;
  split: string;
  exercises: string[];
  its_done: boolean;
  created_at: string;
  days: string[];
  reps: number[];
  series: number[];
  weight: string[];
  rir: number[];
  completed_at: string[];
}

interface DailyCompletion {
  date: string;
  percentage: number;
}

interface LoadProgression {
  exercise: string;
  data: { date: string; avgWeight: number }[];
}

export default function InsightsSection() {
  const [adherence, setAdherence] = useState({
    completed: 0,
    missed: 0,
    percentage: 0,
  });
  const [loadProgression, setLoadProgression] = useState<LoadProgression[]>([]);
  const [completionHistory, setCompletionHistory] = useState<DailyCompletion[]>(
    []
  );
  const [avgSeriesTime, setAvgSeriesTime] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsightsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadInsightsData() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get last 6 months of workouts
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: workouts, error } = await supabase
        .from("workout")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", sixMonthsAgo.toISOString())
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading workouts:", error);
        return;
      }

      const records = (workouts || []) as WorkoutRecord[];

      // 1. Calculate training adherence
      calculateAdherence(records);

      // 2. Calculate load progression
      calculateLoadProgression(records);

      // 3. Calculate daily completion percentages
      calculateCompletionHistory(records);

      // 4. Calculate average series time (mock for now, would need completed_at timestamps)
      calculateAvgSeriesTime(records);

      setLoading(false);
    } catch (err) {
      console.error("Error in loadInsightsData:", err);
      setLoading(false);
    }
  }

  function calculateAdherence(records: WorkoutRecord[]) {
    const completed = records.filter((w) => w.its_done).length;
    const missed = records.filter((w) => !w.its_done).length;
    const total = records.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    setAdherence({ completed, missed, percentage });
  }

  function calculateLoadProgression(records: WorkoutRecord[]) {
    // Group by exercise and track weight progression over time
    const exerciseMap = new Map<
      string,
      { date: string; weights: number[] }[]
    >();

    records.forEach((workout) => {
      workout.exercises.forEach((exercise, idx) => {
        const weightStr = workout.weight?.[idx] || "0";
        const weight = parseFloat(weightStr) || 0;

        if (!exerciseMap.has(exercise)) {
          exerciseMap.set(exercise, []);
        }

        exerciseMap.get(exercise)!.push({
          date: workout.created_at.split("T")[0],
          weights: [weight],
        });
      });
    });

    // Calculate average weight per date for each exercise
    const progressions: LoadProgression[] = [];
    exerciseMap.forEach((entries, exercise) => {
      // Group by date and average
      const dateMap = new Map<string, number[]>();
      entries.forEach((e) => {
        if (!dateMap.has(e.date)) {
          dateMap.set(e.date, []);
        }
        dateMap.get(e.date)!.push(...e.weights);
      });

      const data = Array.from(dateMap.entries())
        .map(([date, weights]) => ({
          date,
          avgWeight: weights.reduce((sum, w) => sum + w, 0) / weights.length,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      if (data.length > 1) {
        progressions.push({ exercise, data });
      }
    });

    // Take top 3 exercises with most data
    progressions.sort((a, b) => b.data.length - a.data.length);
    setLoadProgression(progressions.slice(0, 3));
  }

  function calculateCompletionHistory(records: WorkoutRecord[]) {
    // Group by date and calculate completion percentage per day
    const dateMap = new Map<string, { total: number; completed: number }>();

    records.forEach((workout) => {
      const date = workout.created_at.split("T")[0];
      if (!dateMap.has(date)) {
        dateMap.set(date, { total: 0, completed: 0 });
      }
      const entry = dateMap.get(date)!;
      entry.total += workout.exercises.length;

      // Count completed exercises based on its_done flag
      if (workout.its_done) {
        entry.completed += workout.exercises.length;
      }
    });

    const history: DailyCompletion[] = Array.from(dateMap.entries())
      .map(([date, stats]) => ({
        date,
        percentage: Math.round((stats.completed / stats.total) * 100),
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30); // Last 30 days

    setCompletionHistory(history.reverse());
  }

  function calculateAvgSeriesTime(records: WorkoutRecord[]) {
    // Calculate average time between series using completed_at timestamps
    let totalIntervals = 0;
    let count = 0;

    records.forEach((workout) => {
      if (workout.completed_at && workout.completed_at.length > 1) {
        for (let i = 1; i < workout.completed_at.length; i++) {
          const prev = new Date(workout.completed_at[i - 1]).getTime();
          const curr = new Date(workout.completed_at[i]).getTime();
          const diffSeconds = (curr - prev) / 1000;
          if (diffSeconds > 0 && diffSeconds < 600) {
            // Max 10 min between series
            totalIntervals += diffSeconds;
            count++;
          }
        }
      }
    });

    const avg = count > 0 ? Math.round(totalIntervals / count) : 90;
    setAvgSeriesTime(avg);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-6 border border-gray-800/50 shadow-xl">
          <h2 className="text-3xl font-bold text-white mb-2">Insights</h2>
          <p className="text-gray-500">Cargando análisis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-6 border border-gray-800/50 shadow-xl">
        <h2 className="text-3xl font-bold text-white mb-2">Insights</h2>
        <p className="text-gray-500">
          Análisis detallado de tu progreso y rendimiento
        </p>
      </div>

      {/* Training Adherence */}
      <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-6 border border-gray-800/50 shadow-xl">
        <h3 className="text-xl font-semibold text-white mb-4">
          Tendencia de Entrenamiento (últimos 6 meses)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] rounded-lg border border-green-400/20">
            <p className="text-gray-400 text-sm mb-1">Días Cumplidos</p>
            <p className="text-3xl font-bold text-green-400">
              {adherence.completed}
            </p>
          </div>
          <div className="p-4 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] rounded-lg border border-red-400/20">
            <p className="text-gray-400 text-sm mb-1">Días No Cumplidos</p>
            <p className="text-3xl font-bold text-red-400">
              {adherence.missed}
            </p>
          </div>
          <div className="p-4 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] rounded-lg border border-blue-400/20">
            <p className="text-gray-400 text-sm mb-1">Tasa de Cumplimiento</p>
            <p className="text-3xl font-bold text-blue-400">
              {adherence.percentage}%
            </p>
          </div>
        </div>
        <div className="w-full bg-[#0f0f0f] rounded-lg h-8 border border-gray-800/50 overflow-hidden">
          <div
            className="bg-linear-to-r from-green-400 to-green-500 h-full flex items-center justify-center text-white text-sm font-semibold shadow-lg shadow-green-400/20 transition-all duration-500"
            style={{ width: `${adherence.percentage}%` }}
          >
            {adherence.percentage > 15 ? `${adherence.percentage}%` : ""}
          </div>
        </div>
      </div>

      {/* Load Progression & Series Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Load Progression */}
        <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-6 border border-gray-800/50 shadow-xl">
          <h3 className="text-xl font-semibold text-white mb-4">
            Progresión de Cargas (últimos 6 meses)
          </h3>
          {loadProgression.length > 0 ? (
            <div className="space-y-6">
              {loadProgression.map((prog, idx) => {
                const firstWeight = prog.data[0]?.avgWeight || 0;
                const lastWeight =
                  prog.data[prog.data.length - 1]?.avgWeight || 0;
                const increase = lastWeight - firstWeight;
                const increasePercent =
                  firstWeight > 0
                    ? Math.round((increase / firstWeight) * 100)
                    : 0;

                return (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-white font-medium text-sm truncate">
                        {prog.exercise}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs">
                          {firstWeight.toFixed(1)} kg
                        </span>
                        <svg
                          className="w-4 h-4 text-green-400"
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
                        <span className="text-green-400 text-xs font-semibold">
                          {lastWeight.toFixed(1)} kg
                        </span>
                        <span className="text-green-400 text-xs">
                          ({increasePercent > 0 ? "+" : ""}
                          {increasePercent}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-12 bg-[#0f0f0f] rounded-lg border border-gray-800/50 p-1 flex items-end gap-0.5">
                      {prog.data.slice(-12).map((point, i) => {
                        const maxWeight = Math.max(
                          ...prog.data.map((d) => d.avgWeight)
                        );
                        const height =
                          maxWeight > 0
                            ? (point.avgWeight / maxWeight) * 100
                            : 0;
                        return (
                          <div
                            key={i}
                            className="flex-1 bg-linear-to-t from-orange-400 to-orange-500 rounded-sm transition-all duration-300 hover:opacity-80"
                            style={{ height: `${height}%`, minHeight: "4px" }}
                            title={`${point.date}: ${point.avgWeight.toFixed(
                              1
                            )} kg`}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No hay suficientes datos de progresión aún
            </p>
          )}
        </div>

        {/* Series Time & Completion */}
        <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-6 border border-gray-800/50 shadow-xl">
          <h3 className="text-xl font-semibold text-white mb-4">
            Tiempo Entre Series
          </h3>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="w-32 h-32 rounded-full bg-linear-to-br from-blue-400/20 to-blue-500/20 border-4 border-blue-400 flex items-center justify-center mb-4 mx-auto">
                <div className="text-center">
                  <p className="text-4xl font-bold text-blue-400">
                    {avgSeriesTime}
                  </p>
                  <p className="text-gray-400 text-sm">segundos</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm">
                Promedio de descanso entre series
              </p>
              {avgSeriesTime < 60 && (
                <p className="text-orange-400 text-xs mt-2">
                  ⚡ Ritmo rápido - considera descansos más largos
                </p>
              )}
              {avgSeriesTime >= 60 && avgSeriesTime <= 120 && (
                <p className="text-green-400 text-xs mt-2">
                  ✓ Tiempo óptimo de recuperación
                </p>
              )}
              {avgSeriesTime > 120 && (
                <p className="text-blue-400 text-xs mt-2">
                  💪 Descansos prolongados - ideal para fuerza
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Daily Completion History */}
      <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-6 border border-gray-800/50 shadow-xl">
        <h3 className="text-xl font-semibold text-white mb-4">
          Entrenamientos Completados (últimos 30 días)
        </h3>
        {completionHistory.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-end gap-1 h-40 bg-[#0f0f0f] rounded-lg border border-gray-800/50 p-3">
              {completionHistory.map((day, idx) => (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div
                    className="w-full bg-linear-to-t from-pink-400 to-pink-500 rounded-sm transition-all duration-300 hover:opacity-80"
                    style={{ height: `${day.percentage}%`, minHeight: "4px" }}
                    title={`${day.date}: ${day.percentage}% completado`}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{completionHistory[0]?.date || ""}</span>
              <span>Porcentaje de ejercicios completados por día</span>
              <span>
                {completionHistory[completionHistory.length - 1]?.date || ""}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            No hay datos de entrenamientos aún
          </p>
        )}
      </div>

      {/* Data-Driven Recommendations */}
      <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-6 border border-gray-800/50 shadow-xl">
        <h3 className="text-xl font-semibold text-white mb-4">
          Recomendaciones Personalizadas
        </h3>
        <div className="space-y-3">
          {adherence.percentage < 70 && (
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
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">Mejora tu constancia</p>
                <p className="text-gray-500 text-sm">
                  Tu tasa de cumplimiento es {adherence.percentage}%. Intenta
                  mantener al menos 80% para ver mejores resultados.
                </p>
              </div>
            </div>
          )}

          {adherence.percentage >= 70 && (
            <div className="flex items-start gap-3 p-4 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] rounded-lg border border-green-400/20">
              <div className="w-10 h-10 rounded-full bg-green-400/10 flex items-center justify-center shrink-0 mt-1">
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
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">¡Excelente constancia!</p>
                <p className="text-gray-500 text-sm">
                  Mantienes una tasa de cumplimiento de {adherence.percentage}%.
                  ¡Sigue así para maximizar resultados!
                </p>
              </div>
            </div>
          )}

          {loadProgression.length > 0 && loadProgression[0].data.length > 3 && (
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
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">Progresión positiva</p>
                <p className="text-gray-500 text-sm">
                  Tus cargas están aumentando consistentemente. Continúa con
                  sobrecarga progresiva para seguir ganando fuerza.
                </p>
              </div>
            </div>
          )}

          {avgSeriesTime < 60 && (
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
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">Descansos cortos</p>
                <p className="text-gray-500 text-sm">
                  Tus descansos promedio son de {avgSeriesTime}s. Para
                  hipertrofia y fuerza, considera descansar 60-120 segundos.
                </p>
              </div>
            </div>
          )}

          {completionHistory.length > 0 &&
            completionHistory.slice(-7).every((d) => d.percentage >= 80) && (
              <div className="flex items-start gap-3 p-4 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] rounded-lg border border-purple-400/20">
                <div className="w-10 h-10 rounded-full bg-purple-400/10 flex items-center justify-center shrink-0 mt-1">
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
                      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium">¡Racha increíble!</p>
                  <p className="text-gray-500 text-sm">
                    Has completado más del 80% de tus ejercicios en los últimos
                    7 días. ¡Eres imparable!
                  </p>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
