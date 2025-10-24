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

interface WorkoutDay {
  date: string;
  completed: boolean;
  hasWorkout: boolean;
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

// Función helper para manejar fechas sin problemas de timezone
// Obtiene la fecha local (sin conversión a UTC)
function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Parsea ISO string (UTC) y lo convierte a fecha local
// Ej: "2025-10-24T12:34:56.253+00" -> Date local
function parseUTCToLocalDate(isoString: string): Date {
  // Eliminar el offset de timezone (+00, -05, etc)
  const cleanIso = isoString.replace(/[+-]\d{2}$/, "");
  const utcDate = new Date(cleanIso);

  // Convertir UTC a timezone local
  const localDate = new Date(
    utcDate.getUTCFullYear(),
    utcDate.getUTCMonth(),
    utcDate.getUTCDate(),
    utcDate.getUTCHours(),
    utcDate.getUTCMinutes(),
    utcDate.getUTCSeconds()
  );

  return localDate;
}

// Parsea solo la parte de fecha (YYYY-MM-DD) y crea Date local
function parseLocalDateString(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
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
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>([]);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<string>("");

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

      // Get current plan
      const { data: planData } = await supabase
        .from("plan")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (planData) {
        setCurrentPlan(planData as Plan);
        if (planData.exercises && planData.exercises.length > 0) {
          setSelectedExercise(planData.exercises[0]);
        }
      }

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

      // 2. Calculate load progression (new logic)
      if (planData) {
        calculateLoadProgressionByPlan(records, planData as Plan);
      } else {
        calculateLoadProgression(records);
      }

      // 3. Calculate daily completion percentages
      calculateCompletionHistory(records);

      // 4. Calculate average series time
      calculateAvgSeriesTime(records);

      // 5. Generate workout calendar data
      generateWorkoutCalendar(records);

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
      const workoutDate = parseUTCToLocalDate(workout.created_at);
      const dateStr = getLocalDateString(workoutDate);

      workout.exercises.forEach((exercise, idx) => {
        const weightStr = workout.weight?.[idx] || "0";
        const weight = parseFloat(weightStr) || 0;

        if (!exerciseMap.has(exercise)) {
          exerciseMap.set(exercise, []);
        }

        exerciseMap.get(exercise)!.push({
          date: dateStr,
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

  function calculateLoadProgressionByPlan(
    records: WorkoutRecord[],
    plan: Plan
  ) {
    // Get exercises from current plan
    const planExercises = plan.exercises || [];

    if (planExercises.length === 0) {
      calculateLoadProgression(records);
      return;
    }

    // Create progression data for each exercise in the plan
    const progressions: LoadProgression[] = [];

    planExercises.forEach((exercise) => {
      const dateMap = new Map<string, number[]>();

      // Find all workouts that contain this exercise
      records.forEach((workout) => {
        // Los ejercicios pueden aparecer múltiples veces en el array (una por serie)
        workout.exercises.forEach((ex, idx) => {
          if (ex.toLowerCase() === exercise.toLowerCase()) {
            const workoutDate = parseUTCToLocalDate(workout.created_at);
            const date = getLocalDateString(workoutDate);
            const weightStr = workout.weight?.[idx] || "0";

            // Extraer solo el número del peso, sin la unidad
            const weightMatch = weightStr.match(/[\d.]+/);
            const weight = weightMatch ? parseFloat(weightMatch[0]) : 0;

            if (weight > 0) {
              if (!dateMap.has(date)) {
                dateMap.set(date, []);
              }
              dateMap.get(date)!.push(weight);
            }
          }
        });
      });

      // Calculate average weight per date
      if (dateMap.size > 0) {
        const data = Array.from(dateMap.entries())
          .map(([date, weights]) => ({
            date,
            avgWeight: weights.reduce((sum, w) => sum + w, 0) / weights.length,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        // Solo agregar si hay al menos 1 punto de datos
        if (data.length > 0) {
          progressions.push({ exercise, data });
        }
      }
    });

    // Sort by data points and take top exercises with most data
    progressions.sort((a, b) => b.data.length - a.data.length);
    setLoadProgression(progressions);

    console.log(
      "[Load Progression] Generated for",
      progressions.length,
      "exercises from plan with data:",
      progressions.map((p) => ({
        exercise: p.exercise,
        dataPoints: p.data.length,
      }))
    );
  }

  function calculateCompletionHistory(records: WorkoutRecord[]) {
    // Group by date and calculate completion percentage per day
    const dateMap = new Map<string, { total: number; completed: number }>();

    records.forEach((workout) => {
      const workoutDate = parseUTCToLocalDate(workout.created_at);
      const dateStr = getLocalDateString(workoutDate);

      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, { total: 0, completed: 0 });
      }
      const entry = dateMap.get(dateStr)!;
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

  function generateWorkoutCalendar(records: WorkoutRecord[]) {
    // Usar timezone local correctamente
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const todayDateStr = getLocalDateString(today);

    // Primer y último día del mes actual
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Mapear workouts por fecha (formato YYYY-MM-DD)
    const workoutMap = new Map<string, { completed: boolean; count: number }>();

    records.forEach((workout) => {
      const workoutDate = parseUTCToLocalDate(workout.created_at);
      const workoutDateStr = getLocalDateString(workoutDate);

      // Filtrar solo workouts del mes actual
      if (
        workoutDate.getFullYear() === year &&
        workoutDate.getMonth() === month
      ) {
        const existing = workoutMap.get(workoutDateStr);

        if (existing) {
          workoutMap.set(workoutDateStr, {
            completed: existing.completed || workout.its_done,
            count: existing.count + 1,
          });
        } else {
          workoutMap.set(workoutDateStr, {
            completed: workout.its_done,
            count: 1,
          });
        }
      }
    });

    // Generar array de días del mes actual
    const days: WorkoutDay[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = getLocalDateString(date);
      const workoutData = workoutMap.get(dateStr);

      days.push({
        date: dateStr,
        hasWorkout: !!workoutData,
        completed: workoutData?.completed || false,
      });
    }

    console.log(
      `[Calendar] ${year}-${String(month + 1).padStart(2, "0")}: ${
        days.length
      } days, ${workoutMap.size} workouts, today: ${todayDateStr}`
    );
    setWorkoutDays(days);
  }

  function renderWorkoutCalendar() {
    if (workoutDays.length === 0) {
      return (
        <p className="text-gray-500 text-center py-3">
          No hay datos de entrenamientos
        </p>
      );
    }

    // Obtener día de la semana del primer día (0=Dom, 1=Lun, ..., 6=Sáb)
    const firstDate = parseLocalDateString(workoutDays[0].date);
    let startWeekday = firstDate.getDay();
    // Convertir a sistema Lun=0, Dom=6
    startWeekday = startWeekday === 0 ? 6 : startWeekday - 1;

    // Construir grid con celdas vacías al inicio
    const cells: (WorkoutDay | null)[] = Array(startWeekday).fill(null);
    cells.push(...workoutDays);

    // Completar última semana
    const remainingCells = 7 - (cells.length % 7);
    if (remainingCells < 7) {
      cells.push(...Array(remainingCells).fill(null));
    }

    // Dividir en semanas
    const weeks: (WorkoutDay | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }

    // Nombre del mes
    const monthName = firstDate.toLocaleDateString("es-ES", {
      month: "long",
      year: "numeric",
    });

    const todayStr = getLocalDateString(new Date());
    const completedCount = workoutDays.filter((d) => d.completed).length;

    return (
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h5 className="text-sm font-semibold text-white capitalize">
            {monthName}
          </h5>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[10px] text-gray-400">
              {completedCount} completados
            </span>
          </div>
        </div>

        {/* Días de la semana */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {["L", "M", "X", "J", "V", "S", "D"].map((day, idx) => (
            <div
              key={idx}
              className="text-center text-[9px] font-bold text-gray-500 uppercase"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grid del calendario */}
        <div className="space-y-1">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-7 gap-1">
              {week.map((cell, dayIdx) => {
                if (!cell) {
                  return (
                    <div
                      key={`empty-${weekIdx}-${dayIdx}`}
                      className="aspect-square rounded-lg"
                    />
                  );
                }

                const cellDate = parseLocalDateString(cell.date);
                const dayNum = cellDate.getDate();
                const isToday = cell.date === todayStr;
                const isFuture = cellDate > new Date();

                // Estilos dinámicos
                let bg = "bg-[#0d0d0f]";
                let border = "border-[#1f1f23]";
                let text = "text-gray-600";
                let shadow = "";

                if (isFuture) {
                  bg = "bg-[#111113]";
                  text = "text-gray-700";
                  border = "border-[#1a1a1c]";
                } else if (cell.hasWorkout) {
                  if (cell.completed) {
                    bg = "bg-linear-to-br from-green-500/20 to-emerald-600/15";
                    border = "border-green-500/40";
                    text = "text-green-300";
                    shadow = "shadow-md shadow-green-500/15";
                  } else {
                    bg = "bg-linear-to-br from-red-500/20 to-rose-600/15";
                    border = "border-red-500/40";
                    text = "text-red-300";
                    shadow = "shadow-md shadow-red-500/15";
                  }
                }

                if (isToday) {
                  border = "border-blue-400/60";
                  shadow = "shadow-lg shadow-blue-400/25";
                }

                return (
                  <div
                    key={cell.date}
                    className={`aspect-square rounded-lg border ${bg} ${border} ${shadow}
                      flex items-center justify-center transition-all duration-200 cursor-pointer
                      hover:scale-105 active:scale-95 relative group`}
                    title={`${cell.date}${
                      cell.hasWorkout
                        ? ` - ${
                            cell.completed ? "✓ Completado" : "✗ No completado"
                          }`
                        : ""
                    }`}
                  >
                    {isToday && (
                      <div className="absolute top-0.5 right-0.5">
                        <div className="w-1 h-1 rounded-full bg-blue-400 animate-pulse"></div>
                      </div>
                    )}

                    <span
                      className={`text-[10px] font-bold ${text} transition-transform duration-150 group-hover:scale-110`}
                    >
                      {dayNum}
                    </span>

                    {cell.hasWorkout && (
                      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
                        <div
                          className={`w-0.5 h-0.5 rounded-full ${
                            cell.completed ? "bg-green-400" : "bg-red-400"
                          }`}
                        ></div>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-150 rounded-lg"></div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Leyenda compacta */}
        <div className="flex items-center justify-center gap-2 pt-2 border-t border-gray-800/20">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-md border bg-[#0d0d0f] border-[#1f1f23]"></div>
            <span className="text-[9px] text-gray-500">Sin datos</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-md border bg-linear-to-br from-red-500/20 to-rose-600/15 border-red-500/40"></div>
            <span className="text-[9px] text-gray-500">No completado</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-md border bg-linear-to-br from-green-500/20 to-emerald-600/15 border-green-500/40"></div>
            <span className="text-[9px] text-gray-500">Completado</span>
          </div>
        </div>
      </div>
    );
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
        <div className="w-full bg-[#0f0f0f] rounded-lg h-8 border border-gray-800/50 overflow-hidden mb-6">
          <div
            className="bg-linear-to-r from-green-400 to-green-500 h-full flex items-center justify-center text-white text-sm font-semibold shadow-lg shadow-green-400/20 transition-all duration-500"
            style={{ width: `${adherence.percentage}%` }}
          >
            {adherence.percentage > 15 ? `${adherence.percentage}%` : ""}
          </div>
        </div>

        {/* Calendario de entrenamientos */}
        <div className="mt-6">
          <h4 className="text-base font-semibold text-white mb-3">
            Historial del Mes Actual
          </h4>
          {renderWorkoutCalendar()}
        </div>
      </div>

      {/* Load Progression & Series Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Load Progression */}
        <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-4 sm:p-6 border border-gray-800/50 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="text-lg sm:text-xl font-semibold text-white">
              Progresión de Cargas
            </h3>
            {currentPlan &&
              currentPlan.exercises &&
              currentPlan.exercises.length > 1 && (
                <select
                  value={selectedExercise}
                  onChange={(e) => setSelectedExercise(e.target.value)}
                  className="bg-[#0f0f0f] text-white text-xs sm:text-sm px-3 py-2 rounded-lg border border-gray-800 focus:border-orange-400 focus:outline-none w-full sm:w-auto max-w-full truncate"
                >
                  {currentPlan.exercises.map((exercise, idx) => (
                    <option key={idx} value={exercise}>
                      {exercise}
                    </option>
                  ))}
                </select>
              )}
          </div>

          {loadProgression.length > 0 ? (
            <div className="space-y-6">
              {loadProgression
                .filter(
                  (prog) =>
                    !selectedExercise || prog.exercise === selectedExercise
                )
                .slice(0, selectedExercise ? 1 : 3)
                .map((prog, idx) => {
                  const firstWeight = prog.data[0]?.avgWeight || 0;
                  const lastWeight =
                    prog.data[prog.data.length - 1]?.avgWeight || 0;
                  const increase = lastWeight - firstWeight;
                  const increasePercent =
                    firstWeight > 0
                      ? Math.round((increase / firstWeight) * 100)
                      : 0;

                  return (
                    <div key={idx} className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        <p className="text-white font-medium text-sm sm:text-base">
                          {prog.exercise}
                        </p>
                        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                          <span className="text-gray-400 text-xs">
                            {firstWeight.toFixed(1)} kg
                          </span>
                          <svg
                            className={`w-3 h-3 sm:w-4 sm:h-4 ${
                              increase >= 0 ? "text-green-400" : "text-red-400"
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d={
                                increase >= 0
                                  ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                                  : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                              }
                            />
                          </svg>
                          <span
                            className={`text-xs font-semibold ${
                              increase >= 0 ? "text-green-400" : "text-red-400"
                            }`}
                          >
                            {lastWeight.toFixed(1)} kg
                          </span>
                          <span
                            className={`text-xs ${
                              increase >= 0 ? "text-green-400" : "text-red-400"
                            }`}
                          >
                            ({increasePercent > 0 ? "+" : ""}
                            {increasePercent}%)
                          </span>
                        </div>
                      </div>

                      {/* Real-time chart */}
                      <div className="w-full h-32 sm:h-40 bg-[#0f0f0f] rounded-lg border border-gray-800/50 p-2 sm:p-3 relative">
                        {/* Y-axis labels */}
                        <div className="absolute left-1 top-3 bottom-3 flex flex-col justify-between text-[10px] sm:text-xs text-gray-500">
                          <span>
                            {Math.max(
                              ...prog.data.map((d) => d.avgWeight)
                            ).toFixed(0)}
                          </span>
                          <span>
                            {Math.min(
                              ...prog.data.map((d) => d.avgWeight)
                            ).toFixed(0)}
                          </span>
                        </div>

                        {/* Chart */}
                        <div className="ml-6 sm:ml-8 h-full flex items-end gap-0.5 sm:gap-1 overflow-x-auto scrollbar-hide">
                          {prog.data.map((point, i) => {
                            const maxWeight = Math.max(
                              ...prog.data.map((d) => d.avgWeight)
                            );
                            const minWeight = Math.min(
                              ...prog.data.map((d) => d.avgWeight)
                            );
                            const range = maxWeight - minWeight || 1;
                            const height =
                              ((point.avgWeight - minWeight) / range) * 80 + 20;

                            return (
                              <div
                                key={i}
                                className="flex-1 min-w-5 sm:min-w-0 flex flex-col items-center"
                              >
                                <div
                                  className="w-full bg-linear-to-t from-orange-400 to-orange-500 rounded-sm transition-all duration-300 hover:opacity-80 active:opacity-70 cursor-pointer relative group"
                                  style={{
                                    height: `${height}%`,
                                    minHeight: "8px",
                                  }}
                                >
                                  {/* Tooltip */}
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 sm:mb-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-900 text-white text-[10px] sm:text-xs rounded opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                    {point.date}
                                    <br />
                                    {point.avgWeight.toFixed(1)} kg
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* X-axis label */}
                        <div className="mt-2 text-center text-xs text-gray-500">
                          {prog.data.length} entrenamientos registrados
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">
                No hay datos de progresión aún
              </p>
              {currentPlan && currentPlan.exercises && (
                <p className="text-gray-600 text-sm">
                  Completa entrenamientos con peso registrado para ver tu
                  progreso en: {currentPlan.exercises.slice(0, 3).join(", ")}
                </p>
              )}
              {!currentPlan && (
                <p className="text-gray-600 text-sm">
                  Crea un plan de entrenamiento y registra tus entrenamientos
                </p>
              )}
            </div>
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
