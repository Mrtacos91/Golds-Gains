"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { exerciseService } from "@/services/exerciseService";

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

interface SeriesData {
  reps: number;
  weight: string;
  rir: number;
  completedAt: string | null;
}

interface ExerciseProgress {
  name: string;
  plannedSeries: number;
  plannedReps: number;
  seriesData: SeriesData[];
  status: string;
}

interface Workout {
  id: number;
  user_id: string;
  split: string;
  exercises: string[];
  series: number[];
  reps: number[];
  days: string[];
  status: string[];
  weight: string[];
  rir: number[];
  completed_at: (string | null)[];
  its_done: boolean;
  created_at: string;
}

interface WorkoutRecordPayload {
  user_id: string;
  split: string;
  exercises: string[];
  series: number[];
  reps: number[];
  days: string[];
  status: string[];
  weight: string[];
  rir: number[];
  completed_at: (string | null)[];
  its_done: boolean;
  created_at: string;
  id?: number;
}

type OfflineActionType = "create" | "update";

interface OfflineWorkoutEntry {
  id: string;
  type: OfflineActionType;
  payload: WorkoutRecordPayload;
  savedAt: string;
  meta: {
    day: string;
    date: string;
    time: string;
  };
}

const OFFLINE_WORKOUT_KEY = "gg-offline-workouts";

const canUseStorage = () =>
  typeof window !== "undefined" && !!window.localStorage;

const readOfflineQueue = (): OfflineWorkoutEntry[] => {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(OFFLINE_WORKOUT_KEY);
    return raw ? (JSON.parse(raw) as OfflineWorkoutEntry[]) : [];
  } catch (error) {
    console.error("[offlineQueue] Error leyendo storage", error);
    return [];
  }
};

const writeOfflineQueue = (queue: OfflineWorkoutEntry[]) => {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(OFFLINE_WORKOUT_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error("[offlineQueue] Error guardando storage", error);
  }
};

const enqueueOfflineWorkout = (
  entry: Omit<OfflineWorkoutEntry, "id" | "savedAt">
): OfflineWorkoutEntry[] => {
  const queue = readOfflineQueue();
  const newEntry: OfflineWorkoutEntry = {
    ...entry,
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    savedAt: new Date().toISOString(),
  };
  queue.push(newEntry);
  writeOfflineQueue(queue);
  return queue;
};

const removeOfflineWorkout = (entryId: string): OfflineWorkoutEntry[] => {
  const queue = readOfflineQueue().filter((item) => item.id !== entryId);
  writeOfflineQueue(queue);
  return queue;
};

const DAYS_OF_WEEK = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

export default function ProgressPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>("");

  // Función helper para obtener la fecha local del dispositivo
  const getLocalDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Función helper para obtener la hora local del dispositivo
  const getLocalTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getLocalDate());
  const [selectedTime, setSelectedTime] = useState<string>(getLocalTime());
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
  const [exercises, setExercises] = useState<ExerciseProgress[]>([]);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [existingWorkout, setExistingWorkout] = useState<Workout | null>(null);
  const [isToday, setIsToday] = useState(true);
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof window !== "undefined" ? !navigator.onLine : false
  );
  const [offlineQueue, setOfflineQueue] = useState<OfflineWorkoutEntry[]>([]);
  const [syncingOffline, setSyncingOffline] = useState(false);
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);

  // Replace exercise states
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [replaceExerciseIndex, setReplaceExerciseIndex] = useState<
    number | null
  >(null);
  const [replaceMode, setReplaceMode] = useState<"custom" | "saved" | null>(
    null
  );
  const [customExerciseName, setCustomExerciseName] = useState("");
  const [savedExercises, setSavedExercises] = useState<any[]>([]);
  const [loadingSavedExercises, setLoadingSavedExercises] = useState(false);
  const refreshOfflineQueue = () => {
    const queue = readOfflineQueue();
    setOfflineQueue(queue);
    return queue;
  };

  const showOfflineToast = (message: string) => {
    setOfflineNotice(message);
    setTimeout(() => setOfflineNotice(null), 4000);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOffline(!navigator.onLine);
    refreshOfflineQueue();

    const handleOnline = () => {
      setIsOffline(false);
      showOfflineToast("Conexión restaurada. Sincronizando registros...");
      syncOfflineWorkouts();
    };

    const handleOffline = () => {
      setIsOffline(true);
      showOfflineToast(
        "Modo offline activo. Guardaremos tus registros localmente."
      );
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (plan && selectedDay && selectedDate) {
      checkIfToday();
      loadExercisesForDay();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, selectedDay, selectedDate]);

  const loadPlan = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }

      const { data, error } = await supabase
        .from("plan")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data && !error) {
        setPlan(data);
        // Auto-seleccionar el día actual basado en la zona horaria local
        const today = new Date();
        const dayIndex = today.getDay();
        const todayName = DAYS_OF_WEEK[dayIndex === 0 ? 6 : dayIndex - 1];
        setSelectedDay(todayName);
      }
    } catch (error) {
      console.error("Error loading plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkIfToday = () => {
    const today = getLocalDate();
    setIsToday(selectedDate === today);
  };

  const loadExercisesForDay = async () => {
    if (!plan) {
      console.log("[loadExercisesForDay] No hay plan disponible");
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error("[loadExercisesForDay] Usuario no autenticado");
        return;
      }

      console.log(
        `[loadExercisesForDay] Buscando workout para: día=${selectedDay}, fecha=${selectedDate}, user=${user.id}`
      );

      // Buscar workout existente para este día y fecha
      // Usar formato de fecha simple sin conversión a UTC
      const { data: workoutData, error } = await supabase
        .from("workout")
        .select("*")
        .eq("user_id", user.id)
        .contains("days", [selectedDay])
        .gte("created_at", selectedDate)
        .lte("created_at", `${selectedDate}T23:59:59`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error(
          "[loadExercisesForDay] Error en query de workout:",
          error
        );
      }

      if (workoutData) {
        console.log("[loadExercisesForDay] ✅ Workout encontrado:", {
          id: workoutData.id,
          its_done: workoutData.its_done,
          exercises_count: workoutData.exercises?.length || 0,
          series_count: workoutData.series?.length || 0,
          reps_count: workoutData.reps?.length || 0,
        });

        // Ya existe un registro para este día
        setExistingWorkout(workoutData);

        // Agrupar los datos por ejercicio único
        const exerciseMap = new Map<
          string,
          {
            series: number[];
            reps: number[];
            weight: string[];
            rir: number[];
            completedAt: (string | null)[];
          }
        >();

        // Agrupar todos los datos por nombre de ejercicio
        workoutData.exercises.forEach((exercise: string, index: number) => {
          if (!exerciseMap.has(exercise)) {
            exerciseMap.set(exercise, {
              series: [],
              reps: [],
              weight: [],
              rir: [],
              completedAt: [],
            });
          }
          const data = exerciseMap.get(exercise)!;
          data.series.push(workoutData.series[index]);
          data.reps.push(workoutData.reps[index]);
          data.weight.push(workoutData.weight[index]);
          data.rir.push(workoutData.rir[index]);
          data.completedAt.push(workoutData.completed_at[index]);
        });

        console.log(
          "[loadExercisesForDay] Ejercicios únicos encontrados:",
          Array.from(exerciseMap.keys())
        );

        // Convertir el mapa a array de ExerciseProgress
        const loadedExercises: ExerciseProgress[] = Array.from(
          exerciseMap.entries()
        ).map(([exerciseName, data]) => {
          const planIndex = plan.exercises.findIndex(
            (ex) => ex === exerciseName
          );
          const plannedSeriesCount = plan.series[planIndex] || 0;
          const plannedReps = plan.reps[planIndex] || 0;

          // Crear array de series con los datos guardados
          const seriesData: SeriesData[] = data.series.map((_, idx) => ({
            reps: data.reps[idx] || 0,
            weight: data.weight[idx]?.split(" ")[0] || "",
            rir: data.rir[idx] || 0,
            completedAt: data.completedAt[idx] || null,
          }));

          // Determinar si el ejercicio está completado
          const allSeriesCompleted = seriesData.every((s) => s.reps > 0);

          console.log(`[loadExercisesForDay] ${exerciseName}:`, {
            series: seriesData.length,
            completadas: seriesData.filter((s) => s.reps > 0).length,
            status: allSeriesCompleted ? "completado" : "pendiente",
          });

          return {
            name: exerciseName,
            plannedSeries: plannedSeriesCount,
            plannedReps: plannedReps,
            seriesData: seriesData,
            status: allSeriesCompleted ? "completado" : "pendiente",
          };
        });

        setExercises(loadedExercises);

        // Extraer unidad de peso del primer ejercicio que tenga peso
        const firstWeight = workoutData.weight.find((w: string) => w);
        if (firstWeight) {
          const unit = firstWeight.includes("kg") ? "kg" : "lb";
          setWeightUnit(unit);
          console.log("[loadExercisesForDay] Unidad de peso:", unit);
        }

        console.log(
          `[loadExercisesForDay] ✅ ${loadedExercises.length} ejercicios cargados correctamente`
        );
      } else {
        console.log(
          "[loadExercisesForDay] No hay workout registrado, cargando desde plan"
        );

        // No hay registro, cargar ejercicios del plan
        setExistingWorkout(null);
        const dayExercises: ExerciseProgress[] = [];
        plan.exercises.forEach((exercise, index) => {
          if (plan.days[index] === selectedDay) {
            const plannedSeriesCount = plan.series[index];
            const seriesData: SeriesData[] = [];

            // Crear series vacías basadas en el plan
            for (let i = 0; i < plannedSeriesCount; i++) {
              seriesData.push({
                reps: 0,
                weight: "",
                rir: 0,
                completedAt: null,
              });
            }

            dayExercises.push({
              name: exercise,
              plannedSeries: plannedSeriesCount,
              plannedReps: plan.reps[index],
              seriesData: seriesData,
              status: "pendiente",
            });
          }
        });
        setExercises(dayExercises);
        console.log(
          `[loadExercisesForDay] ✅ ${dayExercises.length} ejercicios cargados desde plan`
        );
      }
    } catch (error) {
      console.error("[loadExercisesForDay] ❌ Error inesperado:", error);
      // Si hay error, cargar ejercicios del plan por defecto
      setExistingWorkout(null);
      const dayExercises: ExerciseProgress[] = [];
      plan.exercises.forEach((exercise, index) => {
        if (plan.days[index] === selectedDay) {
          const plannedSeriesCount = plan.series[index];
          const seriesData: SeriesData[] = [];

          // Crear series vacías basadas en el plan
          for (let i = 0; i < plannedSeriesCount; i++) {
            seriesData.push({
              reps: 0,
              weight: "",
              rir: 0,
              completedAt: null,
            });
          }

          dayExercises.push({
            name: exercise,
            plannedSeries: plannedSeriesCount,
            plannedReps: plan.reps[index],
            seriesData: seriesData,
            status: "pendiente",
          });
        }
      });
      setExercises(dayExercises);
      console.log(
        `[loadExercisesForDay] Cargados ${dayExercises.length} ejercicios desde plan (después de error)`
      );
    }
  };

  const syncOfflineWorkouts = async () => {
    if (typeof window === "undefined" || !navigator.onLine) return;

    const currentQueue = readOfflineQueue();
    if (currentQueue.length === 0) return;

    setSyncingOffline(true);
    let remainingQueue = currentQueue;

    for (const entry of currentQueue) {
      try {
        if (entry.type === "update" && entry.payload.id) {
          const { error: updateError } = await supabase
            .from("workout")
            .update({
              exercises: entry.payload.exercises,
              series: entry.payload.series,
              reps: entry.payload.reps,
              days: entry.payload.days,
              status: entry.payload.status,
              weight: entry.payload.weight,
              rir: entry.payload.rir,
              completed_at: entry.payload.completed_at,
              its_done: entry.payload.its_done,
            })
            .eq("id", entry.payload.id);

          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase.from("workout").insert({
            user_id: entry.payload.user_id,
            split: entry.payload.split,
            exercises: entry.payload.exercises,
            series: entry.payload.series,
            reps: entry.payload.reps,
            days: entry.payload.days,
            status: entry.payload.status,
            weight: entry.payload.weight,
            rir: entry.payload.rir,
            completed_at: entry.payload.completed_at,
            its_done: entry.payload.its_done,
            created_at: entry.payload.created_at,
          });

          if (insertError) throw insertError;
        }

        remainingQueue = removeOfflineWorkout(entry.id);
        setOfflineQueue(remainingQueue);
      } catch (error) {
        console.error(
          "[syncOfflineWorkouts] Error sincronizando registro:",
          error
        );
        showOfflineToast(
          "No se pudo sincronizar uno de tus registros offline. Reintentaremos automáticamente."
        );
        break;
      }
    }

    setSyncingOffline(false);

    if (remainingQueue.length === 0) {
      showOfflineToast(
        "Todos tus registros offline se sincronizaron correctamente."
      );
      await loadExercisesForDay();
    }
  };

  const persistWorkoutOffline = (
    payload: WorkoutRecordPayload,
    type: OfflineActionType
  ) => {
    const queue = enqueueOfflineWorkout({
      type,
      payload,
      meta: {
        day: selectedDay,
        date: selectedDate,
        time: selectedTime,
      },
    });
    setOfflineQueue(queue);
    showOfflineToast(
      "Registro guardado offline. Se sincronizará automáticamente cuando vuelvas a conectarte."
    );
  };

  const shouldQueueOfflineForError = (error: any) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return true;
    }

    const rawMessage = (error?.message || "").toString().toLowerCase();
    return (
      rawMessage.includes("fetch") ||
      rawMessage.includes("network") ||
      rawMessage.includes("timeout")
    );
  };

  const handleSeriesDataChange = (
    exerciseIndex: number,
    seriesIndex: number,
    field: "reps" | "weight" | "rir",
    value: string
  ) => {
    const newExercises = [...exercises];
    const exercise = newExercises[exerciseIndex];

    if (field === "reps") {
      exercise.seriesData[seriesIndex].reps = parseInt(value) || 0;
    } else if (field === "weight") {
      exercise.seriesData[seriesIndex].weight = value;
    } else if (field === "rir") {
      exercise.seriesData[seriesIndex].rir = parseInt(value) || 0;
    }

    // Auto-actualizar completedAt si hay reps
    if (exercise.seriesData[seriesIndex].reps > 0) {
      if (!exercise.seriesData[seriesIndex].completedAt) {
        exercise.seriesData[seriesIndex].completedAt = new Date().toISOString();
      }
    } else {
      exercise.seriesData[seriesIndex].completedAt = null;
    }

    // Actualizar estado del ejercicio
    const allSeriesCompleted = exercise.seriesData.every((s) => s.reps > 0);
    exercise.status = allSeriesCompleted ? "completado" : "pendiente";

    setExercises(newExercises);
  };

  const handleMarkSeriesAsCompleted = (
    exerciseIndex: number,
    seriesIndex: number
  ) => {
    const newExercises = [...exercises];
    const exercise = newExercises[exerciseIndex];
    const series = exercise.seriesData[seriesIndex];

    if (series.reps > 0) {
      // Limpiar serie
      series.reps = 0;
      series.weight = "";
      series.rir = 0;
      series.completedAt = null;
    } else {
      // Auto-completar con valores del plan
      series.reps = exercise.plannedReps;
      series.completedAt = new Date().toISOString();
    }

    // Actualizar estado del ejercicio
    const allSeriesCompleted = exercise.seriesData.every((s) => s.reps > 0);
    exercise.status = allSeriesCompleted ? "completado" : "pendiente";

    setExercises(newExercises);
  };

  const handleMarkAllSeriesAsCompleted = (exerciseIndex: number) => {
    const newExercises = [...exercises];
    const exercise = newExercises[exerciseIndex];
    const now = new Date().toISOString();

    if (exercise.status === "completado") {
      // Limpiar todas las series
      exercise.seriesData.forEach((series) => {
        series.reps = 0;
        series.weight = "";
        series.rir = 0;
        series.completedAt = null;
      });
      exercise.status = "pendiente";
    } else {
      // Completar todas las series
      exercise.seriesData.forEach((series) => {
        series.reps = exercise.plannedReps;
        series.completedAt = now;
      });
      exercise.status = "completado";
    }

    setExercises(newExercises);
  };

  const handleOpenReplaceModal = async (exerciseIndex: number) => {
    setReplaceExerciseIndex(exerciseIndex);
    setShowReplaceModal(true);
    setReplaceMode(null);
    setCustomExerciseName("");

    // Cargar ejercicios guardados
    setLoadingSavedExercises(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const exercises = await exerciseService.getUserExercises(user.id);
        setSavedExercises(exercises);
      }
    } catch (error) {
      console.error("Error loading saved exercises:", error);
    } finally {
      setLoadingSavedExercises(false);
    }
  };

  const handleReplaceWithCustom = () => {
    if (!customExerciseName.trim() || replaceExerciseIndex === null) return;

    const newExercises = [...exercises];
    const exercise = newExercises[replaceExerciseIndex];

    // Guardar referencia al ejercicio original en las notas
    const originalName = exercise.name;

    // Reemplazar nombre
    exercise.name = customExerciseName.trim();

    // Marcar que fue reemplazado (esto se podría usar para mostrar en la UI)
    exercise.status = "pendiente"; // Reset status

    setExercises(newExercises);
    setShowReplaceModal(false);
    setReplaceExerciseIndex(null);
    setCustomExerciseName("");
    setReplaceMode(null);

    console.log(
      `[handleReplaceWithCustom] Ejercicio "${originalName}" reemplazado por "${customExerciseName}"`
    );
  };

  const handleReplaceWithSaved = (savedExercise: any) => {
    if (replaceExerciseIndex === null) return;

    const newExercises = [...exercises];
    const exercise = newExercises[replaceExerciseIndex];

    // Guardar referencia al ejercicio original
    const originalName = exercise.name;

    // Reemplazar con ejercicio guardado
    exercise.name = savedExercise.name;
    exercise.plannedReps = savedExercise.default_reps;

    // Ajustar series si el ejercicio guardado tiene diferente cantidad
    const currentSeriesCount = exercise.seriesData.length;
    const targetSeriesCount = savedExercise.default_series;

    if (targetSeriesCount > currentSeriesCount) {
      // Agregar series faltantes
      for (let i = currentSeriesCount; i < targetSeriesCount; i++) {
        exercise.seriesData.push({
          reps: 0,
          weight: "",
          rir: 0,
          completedAt: null,
        });
      }
    } else if (targetSeriesCount < currentSeriesCount) {
      // Remover series sobrantes
      exercise.seriesData = exercise.seriesData.slice(0, targetSeriesCount);
    }

    exercise.plannedSeries = targetSeriesCount;
    exercise.status = "pendiente"; // Reset status

    setExercises(newExercises);
    setShowReplaceModal(false);
    setReplaceExerciseIndex(null);
    setReplaceMode(null);

    console.log(
      `[handleReplaceWithSaved] Ejercicio "${originalName}" reemplazado por "${savedExercise.name}"`
    );
  };

  const handleCancelReplace = () => {
    setShowReplaceModal(false);
    setReplaceExerciseIndex(null);
    setReplaceMode(null);
    setCustomExerciseName("");
  };

  const handleSubmit = async () => {
    if (!plan) {
      console.error("[handleSubmit] No hay plan disponible");
      return;
    }

    console.log("[handleSubmit] Iniciando guardado de registro...", {
      isToday,
      existingWorkout: existingWorkout?.id,
      exercisesCount: exercises.length,
    });

    // Validar que solo se pueda guardar registros de hoy
    if (!isToday && !existingWorkout) {
      console.warn(
        "[handleSubmit] Intento de crear registro para día pasado rechazado"
      );
      alert(
        "Solo puedes crear registros para el día de hoy. Para días anteriores, debes haberlos registrado en su momento."
      );
      return;
    }

    // Si ya existe un registro completado de un día pasado, no permitir modificaciones
    if (existingWorkout && existingWorkout.its_done && !isToday) {
      console.warn(
        "[handleSubmit] Intento de editar día completado pasado rechazado"
      );
      alert(
        "Este día ya está completado y no puede ser modificado. Solo puedes editar registros del día de hoy."
      );
      return;
    }

    setSaving(true);
    let lastPayload: WorkoutRecordPayload | null = null;
    let lastAction: OfflineActionType = existingWorkout ? "update" : "create";
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error("[handleSubmit] Usuario no autenticado");
        setSaving(false);
        return;
      }

      // Preparar datos para la tabla workout
      // Aplanar todas las series de todos los ejercicios en arrays lineales
      const exerciseNames: string[] = [];
      const seriesNumbers: number[] = [];
      const repsArray: number[] = [];
      const weightArray: string[] = [];
      const rirArray: number[] = [];
      const completedAtArray: (string | null)[] = [];
      const statusArray: string[] = [];
      const daysArray: string[] = [];

      exercises.forEach((exercise) => {
        exercise.seriesData.forEach((series, seriesIndex) => {
          exerciseNames.push(exercise.name);
          seriesNumbers.push(seriesIndex + 1);
          repsArray.push(series.reps);
          weightArray.push(
            series.weight ? `${series.weight} ${weightUnit}` : ""
          );
          rirArray.push(series.rir);
          completedAtArray.push(series.completedAt);
          statusArray.push(series.reps > 0 ? "completado" : "pendiente");
          daysArray.push(selectedDay);
        });
      });

      // Verificar si todos los ejercicios están completados
      const allDone = exercises.every((ex) => ex.status === "completado");

      console.log("[handleSubmit] Datos preparados:", {
        totalSeriesCount: exerciseNames.length,
        allDone,
        exercisesStatus: exercises.map((ex) => ({
          name: ex.name,
          status: ex.status,
        })),
      });

      // Combinar fecha y hora seleccionadas MANTENIENDO la zona horaria local
      // No usar Date() porque convierte a UTC, usar string ISO directamente
      const workoutDateTimeISO = `${selectedDate}T${selectedTime}:00.000`;

      console.log("[handleSubmit] Fecha y hora del workout:", {
        selectedDate,
        selectedTime,
        workoutDateTimeISO,
      });

      // Preparar datos del workout
      const workoutData: WorkoutRecordPayload = {
        user_id: user.id,
        split: plan.split,
        exercises: exerciseNames,
        series: seriesNumbers,
        reps: repsArray,
        days: daysArray,
        status: statusArray,
        weight: weightArray,
        rir: rirArray,
        completed_at: completedAtArray,
        its_done: allDone,
        created_at: workoutDateTimeISO,
        id: existingWorkout?.id,
      };

      const actionType: OfflineActionType = existingWorkout
        ? "update"
        : "create";

      lastPayload = workoutData;
      lastAction = actionType;

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        console.warn("[handleSubmit] Guardando registro en modo offline");
        persistWorkoutOffline(workoutData, actionType);
        setSaving(false);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 2000);
        return;
      }

      // Guardar directamente en Supabase
      let error;
      let savedWorkoutId = existingWorkout?.id;

      if (existingWorkout) {
        // Actualizar registro existente (solo si es hoy)
        console.log(
          `[handleSubmit] Actualizando workout existente ID: ${existingWorkout.id}`
        );
        const result = await supabase
          .from("workout")
          .update({
            exercises: workoutData.exercises,
            series: workoutData.series,
            reps: workoutData.reps,
            days: workoutData.days,
            status: workoutData.status,
            weight: workoutData.weight,
            rir: workoutData.rir,
            completed_at: workoutData.completed_at,
            its_done: workoutData.its_done,
          })
          .eq("id", existingWorkout.id)
          .select();

        error = result.error;

        if (result.data && result.data.length > 0) {
          console.log("[handleSubmit] ✅ Workout actualizado:", result.data[0]);
        }
      } else {
        // Crear nuevo registro
        console.log("[handleSubmit] Creando nuevo workout");
        const { id: _omitId, ...insertPayload } = workoutData;
        const result = await supabase
          .from("workout")
          .insert(insertPayload)
          .select();

        error = result.error;

        if (result.data && result.data.length > 0) {
          savedWorkoutId = result.data[0].id;
          console.log(
            "[handleSubmit] ✅ Nuevo workout creado, ID:",
            savedWorkoutId
          );
        }
      }

      if (error) {
        console.error("[handleSubmit] ❌ Error al guardar workout:", error);

        if (shouldQueueOfflineForError(error)) {
          console.warn(
            "[handleSubmit] Guardando registro en cola offline por error de red"
          );
          persistWorkoutOffline(workoutData, actionType);
          setSaving(false);
          setShowSuccessMessage(true);
          setTimeout(() => setShowSuccessMessage(false), 2000);
          return;
        } else {
          alert("Error al guardar el registro: " + error.message);
        }
      } else {
        console.log(
          `[handleSubmit] ✅ Registro guardado exitosamente. its_done=${allDone}`
        );

        // Mostrar mensaje de éxito animado
        setShowSuccessMessage(true);

        // Recargar datos después de un breve delay
        setTimeout(async () => {
          setShowSuccessMessage(false);
          console.log("[handleSubmit] Recargando datos...");
          await loadExercisesForDay();
          console.log("[handleSubmit] ✅ Datos recargados");
        }, 2000);
      }
    } catch (error) {
      console.error("[handleSubmit] ❌ Error inesperado:", error);
      if (shouldQueueOfflineForError(error) && lastPayload) {
        persistWorkoutOffline(lastPayload, lastAction);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 2000);
      } else {
        alert("Error al guardar el registro");
      }
    } finally {
      setSaving(false);
    }
  };

  const getProgressPercentage = () => {
    if (exercises.length === 0) return 0;
    const completed = exercises.filter(
      (ex) => ex.status === "completado"
    ).length;
    return Math.round((completed / exercises.length) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400"></div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push("/home")}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Volver
          </button>

          <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-12 border border-gray-800/50 shadow-xl text-center">
            <div className="w-20 h-20 rounded-full bg-orange-400/10 flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-orange-400"
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
            <h2 className="text-2xl font-bold text-white mb-3">
              No tienes un plan de entrenamiento
            </h2>
            <p className="text-gray-400 mb-6">
              Primero debes crear un plan de entrenamiento para poder registrar
              tu progreso
            </p>
            <button
              onClick={() => router.push("/plan")}
              className="px-6 py-3 bg-orange-400 hover:bg-orange-500 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-orange-400/20"
            >
              Crear Plan
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-3 sm:p-4 lg:p-6">
      {/* Offline Status Indicator - Solo visible cuando está offline */}
      {isOffline && (
        <div className="fixed top-4 left-4 sm:top-6 sm:left-6 z-50 animate-fadeIn">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-linear-to-r from-red-500/20 to-orange-500/20 border border-red-500/50 backdrop-blur-md shadow-lg shadow-red-500/20">
            <div className="relative">
              <div className="w-3 h-3 rounded-full bg-red-400 animate-pulse" />
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-red-400 animate-ping opacity-75" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-red-300">
                Modo Offline
              </span>
              {offlineQueue.length > 0 && (
                <span className="text-[10px] text-red-400/80">
                  {offlineQueue.length} registro
                  {offlineQueue.length === 1 ? "" : "s"} pendiente
                  {offlineQueue.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 animate-slideIn w-[calc(100%-2rem)] sm:w-auto">
          <div className="bg-linear-to-r from-green-400 to-emerald-500 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-lg shadow-2xl shadow-green-400/50 flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6 animate-checkmark shrink-0"
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
            <div>
              <p className="font-bold">¡Registro guardado!</p>
              <p className="opacity-90">
                Tu progreso ha sido registrado exitosamente
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {isOffline && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-linear-to-r from-orange-500/10 to-red-500/10 border border-orange-500/40 rounded-lg flex items-center gap-3 animate-fadeIn">
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400"
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
            <div className="text-xs sm:text-sm text-gray-300">
              <p className="font-semibold text-orange-300">
                Modo Offline Activo
              </p>
              <p className="text-gray-400">
                Tus registros se guardarán localmente y se sincronizarán
                automáticamente ({offlineQueue.length} pendiente
                {offlineQueue.length === 1 ? "" : "s"}).
              </p>
            </div>
          </div>
        )}

        {!isOffline && offlineQueue.length > 0 && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-linear-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/40 rounded-lg flex items-center justify-between gap-3 animate-fadeIn">
            <div>
              <p className="text-xs sm:text-sm text-blue-200 font-semibold">
                Registros offline pendientes: {offlineQueue.length}
              </p>
              <p className="text-xs text-gray-400">
                Se sincronizarán automáticamente o puedes hacerlo manualmente.
              </p>
            </div>
            <button
              onClick={syncOfflineWorkouts}
              disabled={syncingOffline}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue-400/60 text-blue-200 hover:bg-blue-400/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {syncingOffline ? "Sincronizando..." : "Sincronizar"}
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <button
            onClick={() => router.push("/home")}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm sm:text-base"
          >
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="hidden sm:inline">Volver</span>
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-4 sm:p-6 lg:p-8 border border-gray-800/50 shadow-xl animate-fadeIn">
          {/* Title */}
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-pink-400/10 flex items-center justify-center animate-pulse shrink-0">
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 text-pink-400"
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
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold text-white">
                Registrar Progreso
              </h2>
              <p className="text-gray-400 text-xs sm:text-sm truncate">
                {plan.split}
              </p>
            </div>
          </div>

          {/* Day, Date, Time and Weight Unit Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="animate-fadeIn">
              <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1.5 sm:mb-2">
                Día de Entrenamiento
              </label>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-[#0f0f0f] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all"
              >
                {DAYS_OF_WEEK.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            <div className="animate-fadeIn" style={{ animationDelay: "0.1s" }}>
              <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1.5 sm:mb-2">
                Fecha del Entrenamiento
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={getLocalDate()}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-[#0f0f0f] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all"
              />
            </div>

            <div className="animate-fadeIn" style={{ animationDelay: "0.2s" }}>
              <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1.5 sm:mb-2">
                Hora del Entrenamiento
              </label>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-[#0f0f0f] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all"
              />
            </div>

            <div className="animate-fadeIn" style={{ animationDelay: "0.3s" }}>
              <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1.5 sm:mb-2">
                Unidad de Peso
              </label>
              <select
                value={weightUnit}
                onChange={(e) => setWeightUnit(e.target.value as "kg" | "lb")}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-[#0f0f0f] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
              >
                <option value="kg">Kilogramos (kg)</option>
                <option value="lb">Libras (lb)</option>
              </select>
            </div>
          </div>

          {/* Completed Day Banner */}
          {existingWorkout && existingWorkout.its_done && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-linear-to-r from-green-400/10 to-emerald-500/10 border-2 border-green-400/50 rounded-lg animate-fadeIn">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-400/20 flex items-center justify-center shrink-0">
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6 text-green-400"
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
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-lg font-bold text-green-400">
                    ¡Día Completado! 🎉
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-400">
                    Completaste todos los ejercicios de este día
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Warning for Past Days */}
          {!isToday && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-linear-to-r from-orange-400/10 to-yellow-500/10 border-2 border-orange-400/50 rounded-lg animate-fadeIn">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-orange-400/20 flex items-center justify-center shrink-0">
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400"
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
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-orange-400">
                    Día Anterior - Solo Lectura
                  </h3>
                  <p className="text-xs text-gray-400">
                    {existingWorkout
                      ? "Visualizando registro anterior. No se puede modificar."
                      : "No puedes crear registros para días pasados."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {exercises.length > 0 && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] rounded-lg border border-gray-800/50 animate-fadeIn">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm font-medium text-gray-400">
                  Progreso del Día
                </span>
                <span className="text-xs sm:text-sm font-semibold text-pink-400 animate-pulse">
                  {exercises.filter((e) => e.status === "completado").length} /{" "}
                  {exercises.length}
                </span>
              </div>
              <div className="w-full h-2 sm:h-3 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-pink-400 to-purple-400 transition-all duration-700 ease-out"
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>
              <div className="mt-2 text-center">
                <span className="text-xl sm:text-2xl font-bold text-pink-400 animate-bounce">
                  {getProgressPercentage()}%
                </span>
              </div>
            </div>
          )}

          {/* Exercises List */}
          {exercises.length > 0 ? (
            <div className="space-y-3 sm:space-y-6 mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-semibold text-white animate-fadeIn">
                Ejercicios de {selectedDay}
              </h3>
              {exercises.map((exercise, exerciseIndex) => (
                <div
                  key={exerciseIndex}
                  className={`p-3 sm:p-6 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] rounded-lg border transition-all duration-300 animate-slideIn ${
                    exercise.status === "completado"
                      ? "border-green-400/50 bg-green-400/5"
                      : "border-gray-800/50 hover:border-pink-400/50"
                  }`}
                  style={{ animationDelay: `${exerciseIndex * 0.05}s` }}
                >
                  {/* Exercise Header */}
                  <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
                    <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                      <button
                        onClick={() =>
                          handleMarkAllSeriesAsCompleted(exerciseIndex)
                        }
                        disabled={
                          !isToday ||
                          (existingWorkout && existingWorkout.its_done) ||
                          false
                        }
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 transform ${
                          !isToday ||
                          (existingWorkout && existingWorkout.its_done)
                            ? "cursor-not-allowed opacity-50"
                            : "hover:scale-110"
                        } ${
                          exercise.status === "completado"
                            ? "bg-green-400/20 border-2 border-green-400"
                            : "bg-gray-800/50 border-2 border-gray-700 hover:border-pink-400"
                        }`}
                      >
                        {exercise.status === "completado" && (
                          <svg
                            className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 animate-checkmark"
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
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <h4
                          className={`font-semibold text-sm sm:text-lg transition-all duration-300 truncate ${
                            exercise.status === "completado"
                              ? "text-gray-500 line-through"
                              : "text-white"
                          }`}
                        >
                          {exercise.name}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {exercise.plannedSeries} × {exercise.plannedReps}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleOpenReplaceModal(exerciseIndex)}
                      disabled={
                        !isToday ||
                        (existingWorkout && existingWorkout.its_done) ||
                        false
                      }
                      className="px-3 py-1.5 bg-blue-400/10 hover:bg-blue-400/20 border border-blue-400/40 hover:border-blue-400/60 text-blue-300 rounded-lg text-xs font-medium transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shrink-0"
                      title="Cambiar ejercicio solo para hoy"
                    >
                      <span className="hidden sm:inline">
                        Cambiar Ejercicio
                      </span>
                      <span className="sm:hidden">Cambiar</span>
                    </button>
                  </div>

                  {/* Series List */}
                  <div className="space-y-2 sm:space-y-3">
                    {exercise.seriesData.map((series, seriesIndex) => (
                      <div
                        key={seriesIndex}
                        className={`p-2 sm:p-4 bg-[#0a0a0a] rounded-lg border transition-all ${
                          series.reps > 0
                            ? "border-green-400/30 bg-green-400/5"
                            : "border-gray-800/50"
                        }`}
                      >
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                          {/* Series Number & Checkbox */}
                          <button
                            onClick={() =>
                              handleMarkSeriesAsCompleted(
                                exerciseIndex,
                                seriesIndex
                              )
                            }
                            disabled={
                              !isToday ||
                              (existingWorkout && existingWorkout.its_done) ||
                              false
                            }
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                              !isToday ||
                              (existingWorkout && existingWorkout.its_done)
                                ? "cursor-not-allowed opacity-50"
                                : "hover:scale-110"
                            } ${
                              series.reps > 0
                                ? "bg-green-400/20 border-2 border-green-400"
                                : "bg-gray-800/50 border-2 border-gray-700 hover:border-pink-400"
                            }`}
                          >
                            {series.reps > 0 ? (
                              <svg
                                className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400"
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
                            ) : (
                              <span className="text-xs font-semibold text-gray-500">
                                {seriesIndex + 1}
                              </span>
                            )}
                          </button>

                          {/* Series Data Inputs */}
                          <div className="flex-1 grid grid-cols-3 gap-1.5 sm:gap-2 min-w-0">
                            {/* Reps */}
                            <div className="min-w-0">
                              <label className="block text-xs text-gray-500 mb-0.5">
                                Reps
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={series.reps || ""}
                                onChange={(e) =>
                                  handleSeriesDataChange(
                                    exerciseIndex,
                                    seriesIndex,
                                    "reps",
                                    e.target.value
                                  )
                                }
                                placeholder={exercise.plannedReps.toString()}
                                disabled={
                                  !isToday ||
                                  (existingWorkout &&
                                    existingWorkout.its_done) ||
                                  false
                                }
                                className="w-full px-1.5 sm:px-2 py-1 sm:py-1.5 bg-[#0f0f0f] border border-gray-800/50 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </div>

                            {/* Weight */}
                            <div className="min-w-0">
                              <label className="block text-xs text-gray-500 mb-0.5">
                                {weightUnit}
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={series.weight || ""}
                                onChange={(e) =>
                                  handleSeriesDataChange(
                                    exerciseIndex,
                                    seriesIndex,
                                    "weight",
                                    e.target.value
                                  )
                                }
                                placeholder="0"
                                disabled={
                                  !isToday ||
                                  (existingWorkout &&
                                    existingWorkout.its_done) ||
                                  false
                                }
                                className="w-full px-1.5 sm:px-2 py-1 sm:py-1.5 bg-[#0f0f0f] border border-gray-800/50 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-orange-400 disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </div>

                            {/* RIR */}
                            <div className="min-w-0">
                              <label className="block text-xs text-gray-500 mb-0.5">
                                RIR
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="10"
                                value={series.rir || ""}
                                onChange={(e) =>
                                  handleSeriesDataChange(
                                    exerciseIndex,
                                    seriesIndex,
                                    "rir",
                                    e.target.value
                                  )
                                }
                                placeholder="0"
                                disabled={
                                  !isToday ||
                                  (existingWorkout &&
                                    existingWorkout.its_done) ||
                                  false
                                }
                                className="w-full px-1.5 sm:px-2 py-1 sm:py-1.5 bg-[#0f0f0f] border border-gray-800/50 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </div>
                          </div>

                          {/* Completion Time */}
                          {series.completedAt && (
                            <div className="text-xs text-green-400 whitespace-nowrap ml-auto">
                              {new Date(series.completedAt).toLocaleTimeString(
                                "es-ES",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12 animate-fadeIn">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-800/50 flex items-center justify-center mx-auto mb-3 sm:mb-4 animate-pulse">
                <svg
                  className="w-6 h-6 sm:w-8 sm:h-8 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
              </div>
              <p className="text-gray-400 text-sm">
                No hay ejercicios programados para {selectedDay}
              </p>
              <p className="text-gray-600 text-xs mt-1 sm:mt-2">
                Selecciona otro día de la semana
              </p>
            </div>
          )}

          {/* Submit Button */}
          {exercises.length > 0 && (
            <div className="animate-fadeIn">
              <div className="flex gap-3 sm:gap-4">
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-linear-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg shadow-pink-400/20 hover:shadow-pink-400/40 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm sm:text-base"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                      <span className="hidden sm:inline">Guardando...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="w-4 h-4 sm:w-5 sm:h-5"
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
                      <span className="hidden sm:inline">
                        {isOffline ? "Guardar Offline" : "Guardar Registro"}
                      </span>
                      <span className="sm:hidden">
                        {isOffline ? "Offline" : "Guardar"}
                      </span>
                    </span>
                  )}
                </button>
              </div>
              {(isOffline || offlineQueue.length > 0) && (
                <p className="text-xs text-center text-gray-400 mt-2">
                  {isOffline
                    ? "Sin conexión: guardaremos tu progreso en este dispositivo."
                    : offlineQueue.length > 0
                    ? `Pendientes por sincronizar: ${offlineQueue.length}`
                    : null}
                  {!isOffline && offlineQueue.length > 0 && (
                    <button
                      onClick={syncOfflineWorkouts}
                      disabled={syncingOffline}
                      className="ml-2 text-blue-300 underline disabled:no-underline disabled:opacity-60"
                    >
                      {syncingOffline
                        ? "Sincronizando..."
                        : "Sincronizar ahora"}
                    </button>
                  )}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Replace Exercise Modal */}
      {showReplaceModal && replaceExerciseIndex !== null && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl border border-gray-800/50 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
            {/* Modal Header */}
            <div className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-gray-800/50 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-400/10 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-white">
                      Reemplazar Ejercicio
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-400">
                      Ejercicio actual: {exercises[replaceExerciseIndex].name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCancelReplace}
                  className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6">
              {!replaceMode ? (
                /* Mode Selection */
                <div className="space-y-3 sm:space-y-4">
                  <p className="text-gray-400 text-sm sm:text-base mb-4">
                    Selecciona cómo deseas reemplazar el ejercicio:
                  </p>

                  <button
                    onClick={() => setReplaceMode("custom")}
                    className="w-full p-4 sm:p-6 bg-linear-to-br from-[#0f0f0f] to-[#1a1a1a] hover:from-[#151515] hover:to-[#202020] border border-gray-800/50 hover:border-blue-400/50 rounded-xl text-left transition-all group"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-400/10 flex items-center justify-center shrink-0 group-hover:bg-blue-400/20 transition-colors">
                        <svg
                          className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base sm:text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">
                          Ejercicio Personalizado
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-400">
                          Escribe el nombre de un ejercicio diferente
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setReplaceMode("saved")}
                    className="w-full p-4 sm:p-6 bg-linear-to-br from-[#0f0f0f] to-[#1a1a1a] hover:from-[#151515] hover:to-[#202020] border border-gray-800/50 hover:border-purple-400/50 rounded-xl text-left transition-all group"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-400/10 flex items-center justify-center shrink-0 group-hover:bg-purple-400/20 transition-colors">
                        <svg
                          className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base sm:text-lg font-bold text-white mb-1 group-hover:text-purple-400 transition-colors">
                          Mis Ejercicios Guardados
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-400">
                          Selecciona de tu biblioteca de ejercicios
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              ) : replaceMode === "custom" ? (
                /* Custom Exercise Form */
                <div className="space-y-4">
                  <button
                    onClick={() => setReplaceMode(null)}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    Volver
                  </button>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Nombre del ejercicio
                    </label>
                    <input
                      type="text"
                      value={customExerciseName}
                      onChange={(e) => setCustomExerciseName(e.target.value)}
                      placeholder="Ej: Peck Deck, Leg Extension, etc."
                      className="w-full px-4 py-3 bg-[#0f0f0f] border border-gray-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm sm:text-base"
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleCancelReplace}
                      className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm sm:text-base"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleReplaceWithCustom}
                      disabled={!customExerciseName.trim()}
                      className="flex-1 px-4 py-3 bg-blue-400 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-lg transition-colors text-sm sm:text-base"
                    >
                      Reemplazar
                    </button>
                  </div>
                </div>
              ) : (
                /* Saved Exercises List */
                <div className="space-y-4">
                  <button
                    onClick={() => setReplaceMode(null)}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    Volver
                  </button>

                  {loadingSavedExercises ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto"></div>
                      <p className="text-gray-500 text-sm mt-3">
                        Cargando ejercicios...
                      </p>
                    </div>
                  ) : savedExercises.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mx-auto mb-3">
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
                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                          />
                        </svg>
                      </div>
                      <p className="text-gray-400 text-sm">
                        No tienes ejercicios guardados
                      </p>
                      <p className="text-gray-600 text-xs mt-1">
                        Ve a "Mis Ejercicios" para agregar algunos
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {savedExercises.map((exercise) => (
                        <button
                          key={exercise.id}
                          onClick={() => handleReplaceWithSaved(exercise)}
                          className="w-full p-3 sm:p-4 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] hover:from-[#151515] hover:to-[#202020] border border-gray-800/50 hover:border-purple-400/50 rounded-lg text-left transition-all group"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-white font-semibold text-sm sm:text-base truncate group-hover:text-purple-400 transition-colors">
                                  {exercise.name}
                                </h4>
                                <span className="px-2 py-0.5 bg-purple-400/20 border border-purple-400/30 rounded-full text-purple-400 text-xs capitalize shrink-0">
                                  {exercise.muscle_group}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-400">
                                <span>{exercise.default_series} series</span>
                                <span>×</span>
                                <span>{exercise.default_reps} reps</span>
                              </div>
                            </div>
                            <svg
                              className="w-5 h-5 text-gray-600 group-hover:text-purple-400 transition-colors shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {offlineNotice && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#121212] border border-gray-800/60 text-gray-200 px-4 py-2 rounded-lg shadow-lg text-xs sm:text-sm">
          {offlineNotice}
        </div>
      )}
    </div>
  );
}
