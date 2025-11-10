"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  exerciseService,
  Exercise as CustomExercise,
} from "@/services/exerciseService";

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

interface Exercise {
  name: string;
  series: number;
  reps: number;
}

interface DayExercises {
  dayName: string;
  weekDay: string;
  exercises: Exercise[];
}

const DAYS_OF_WEEK = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

const SPLITS = {
  PPL: {
    name: "Push/Pull/Legs",
    description: "Empuje, Jalón y Piernas - 3-6 días/semana",
    days: [
      { name: "Push (Empuje)", muscles: ["pecho", "hombros", "triceps"] },
      { name: "Pull (Jalón)", muscles: ["espalda", "biceps"] },
      { name: "Legs (Piernas)", muscles: ["piernas", "abdomen"] },
    ],
  },
  "Upper/Lower": {
    name: "Torso/Pierna",
    description: "División entre parte superior e inferior - 4 días/semana",
    days: [
      {
        name: "Upper (Torso)",
        muscles: ["pecho", "espalda", "hombros", "biceps", "triceps"],
      },
      { name: "Lower (Pierna)", muscles: ["piernas", "abdomen"] },
    ],
  },
  "Full Body": {
    name: "Cuerpo Completo",
    description: "Todos los grupos musculares - 3 días/semana",
    days: [
      {
        name: "Full Body",
        muscles: [
          "pecho",
          "espalda",
          "piernas",
          "hombros",
          "biceps",
          "triceps",
          "abdomen",
        ],
      },
    ],
  },
  "Bro Split": {
    name: "Bro Split (5 días)",
    description: "Un grupo muscular por día - 5 días/semana",
    days: [
      { name: "Pecho", muscles: ["pecho"] },
      { name: "Espalda", muscles: ["espalda"] },
      { name: "Piernas", muscles: ["piernas", "abdomen"] },
      { name: "Hombros", muscles: ["hombros"] },
      { name: "Brazos", muscles: ["biceps", "triceps"] },
    ],
  },
  "Arnold Split": {
    name: "Arnold Split",
    description: "Pecho/Espalda, Hombros/Brazos, Piernas - 6 días/semana",
    days: [
      { name: "Pecho + Espalda", muscles: ["pecho", "espalda"] },
      { name: "Hombros + Brazos", muscles: ["hombros", "biceps", "triceps"] },
      { name: "Piernas", muscles: ["piernas", "abdomen"] },
    ],
  },
  "PPL x Upper/Lower": {
    name: "PPL x Upper/Lower",
    description: "Híbrido PPL y Torso/Pierna - 5-6 días/semana",
    days: [
      { name: "Push (Empuje)", muscles: ["pecho", "hombros", "triceps"] },
      { name: "Pull (Jalón)", muscles: ["espalda", "biceps"] },
      { name: "Legs (Piernas)", muscles: ["piernas"] },
      { name: "Upper (Torso)", muscles: ["pecho", "espalda", "hombros"] },
      { name: "Lower (Pierna)", muscles: ["piernas", "abdomen"] },
    ],
  },
  PHAT: {
    name: "PHAT (Power Hypertrophy)",
    description: "Fuerza e Hipertrofia - 5 días/semana",
    days: [
      { name: "Upper Power", muscles: ["pecho", "espalda", "hombros"] },
      { name: "Lower Power", muscles: ["piernas"] },
      { name: "Back + Shoulders", muscles: ["espalda", "hombros"] },
      { name: "Chest + Arms", muscles: ["pecho", "biceps", "triceps"] },
      { name: "Legs", muscles: ["piernas", "abdomen"] },
    ],
  },
};

const EXERCISES_BY_MUSCLE = {
  pecho: [
    "Press banca plano",
    "Press banca inclinado",
    "Aperturas con mancuernas",
    "Fondos en paralelas",
    "Press con mancuernas",
    "Cruces en polea",
    "Flexiones",
  ],
  espalda: [
    "Dominadas",
    "Remo con barra",
    "Peso muerto",
    "Remo con mancuerna",
    "Jalón al pecho",
    "Remo en polea baja",
    "Pull over",
  ],
  piernas: [
    "Sentadilla",
    "Peso muerto rumano",
    "Prensa de piernas",
    "Zancadas",
    "Extensiones de cuádriceps",
    "Curl femoral",
    "Elevaciones de gemelos",
  ],
  hombros: [
    "Press militar",
    "Elevaciones laterales",
    "Elevaciones frontales",
    "Pájaros",
    "Press Arnold",
    "Face pulls",
  ],
  biceps: [
    "Curl con barra",
    "Curl martillo",
    "Curl concentrado",
    "Curl en predicador",
    "Curl en polea",
  ],
  triceps: [
    "Press francés",
    "Extensiones en polea",
    "Fondos entre bancos",
    "Patada de triceps",
    "Press cerrado",
  ],
  abdomen: [
    "Plancha",
    "Crunches",
    "Elevaciones de piernas",
    "Russian twists",
    "Mountain climbers",
  ],
};

export default function PlanPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [existingPlan, setExistingPlan] = useState<Plan | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form states
  const [selectedSplit, setSelectedSplit] = useState<keyof typeof SPLITS | "">(
    ""
  );
  const [dayExercises, setDayExercises] = useState<DayExercises[]>([]);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [step, setStep] = useState(1); // 1: Split, 2: Asignar días, 3: Ejercicios por día

  // My Exercises states
  const [showMyExercises, setShowMyExercises] = useState(false);
  const [myExercises, setMyExercises] = useState<CustomExercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [exerciseFormData, setExerciseFormData] = useState<
    Partial<CustomExercise>
  >({
    name: "",
    muscle_group: "pecho",
    default_series: 3,
    default_reps: 10,
    notes: "",
  });
  const [editingExerciseId, setEditingExerciseId] = useState<number | null>(
    null
  );
  const [filterMuscleGroup, setFilterMuscleGroup] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const loadMyExercises = async () => {
    try {
      setLoadingExercises(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const exercises = await exerciseService.getUserExercises(user.id, {
        muscle_group: filterMuscleGroup || undefined,
        search: searchTerm || undefined,
      });

      setMyExercises(exercises);
    } catch (error) {
      console.error("Error loading exercises:", error);
    } finally {
      setLoadingExercises(false);
    }
  };

  useEffect(() => {
    checkExistingPlan();
    loadMyExercises();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkExistingPlan = async () => {
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
        setExistingPlan(data);
      }
    } catch (error) {
      console.error("Error checking plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveExercise = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      if (!exerciseFormData.name || !exerciseFormData.muscle_group) {
        alert("Por favor completa el nombre y grupo muscular");
        return;
      }

      if (editingExerciseId) {
        // Actualizar
        await exerciseService.updateExercise(
          editingExerciseId,
          exerciseFormData
        );
        alert("Ejercicio actualizado exitosamente");
      } else {
        // Crear
        await exerciseService.createExercise({
          ...exerciseFormData,
          user_id: user.id,
        } as CustomExercise);
        alert("Ejercicio creado exitosamente");
      }

      setShowExerciseForm(false);
      setEditingExerciseId(null);
      setExerciseFormData({
        name: "",
        muscle_group: "pecho",
        default_series: 3,
        default_reps: 10,
        notes: "",
      });
      await loadMyExercises();
    } catch (error) {
      console.error("Error saving exercise:", error);
      alert("Error al guardar el ejercicio");
    }
  };

  const handleEditExercise = (exercise: CustomExercise) => {
    setEditingExerciseId(exercise.id || null);
    setExerciseFormData({
      name: exercise.name,
      muscle_group: exercise.muscle_group,
      default_series: exercise.default_series,
      default_reps: exercise.default_reps,
      notes: exercise.notes || "",
    });
    setShowExerciseForm(true);
  };

  const handleDeleteExercise = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este ejercicio?")) return;

    try {
      await exerciseService.deleteExercise(id);
      alert("Ejercicio eliminado exitosamente");
      await loadMyExercises();
    } catch (error) {
      console.error("Error deleting exercise:", error);
      alert("Error al eliminar el ejercicio");
    }
  };

  const handleImportFromPlan = async () => {
    if (!existingPlan) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const imported = await exerciseService.importExercisesFromPlan(
        user.id,
        existingPlan.exercises
      );

      if (imported > 0) {
        alert(`${imported} ejercicio(s) importado(s) exitosamente`);
        await loadMyExercises();
      } else {
        alert("Todos los ejercicios del plan ya están guardados");
      }
    } catch (error) {
      console.error("Error importing exercises:", error);
      alert("Error al importar ejercicios");
    }
  };

  useEffect(() => {
    if (showMyExercises) {
      loadMyExercises();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMuscleGroup, searchTerm]);

  const generateExercisesForMuscles = (muscles: string[]): Exercise[] => {
    const exercises: Exercise[] = [];

    muscles.forEach((muscle) => {
      const muscleExercises =
        EXERCISES_BY_MUSCLE[muscle as keyof typeof EXERCISES_BY_MUSCLE];
      if (muscleExercises) {
        const count =
          muscle === "piernas"
            ? 4
            : muscle === "pecho" || muscle === "espalda"
            ? 3
            : 2;
        muscleExercises.slice(0, count).forEach((ex) => {
          exercises.push({
            name: ex,
            series: muscle === "piernas" ? 4 : 3,
            reps: muscle === "piernas" ? 12 : 10,
          });
        });
      }
    });

    return exercises;
  };

  const handleSplitSelect = (splitKey: keyof typeof SPLITS) => {
    setSelectedSplit(splitKey);

    // Inicializar días con ejercicios vacíos
    const splitConfig = SPLITS[splitKey];
    const initialDays: DayExercises[] = splitConfig.days.map((day) => ({
      dayName: day.name,
      weekDay: "",
      exercises: generateExercisesForMuscles(day.muscles),
    }));

    setDayExercises(initialDays);
    setCurrentDayIndex(0);
    setStep(2);
  };

  const handleAssignWeekDay = (dayIndex: number, weekDay: string) => {
    const newDayExercises = [...dayExercises];
    newDayExercises[dayIndex].weekDay = weekDay;
    setDayExercises(newDayExercises);
  };

  const handleDaysConfirm = () => {
    // Validar que todos los días tengan un día de la semana asignado
    const unassigned = dayExercises.filter((d) => !d.weekDay);
    if (unassigned.length > 0) {
      alert(
        `Debes asignar días de la semana a: ${unassigned
          .map((d) => d.dayName)
          .join(", ")}`
      );
      return;
    }
    setStep(3);
  };

  const handleExerciseChange = (
    exerciseIndex: number,
    field: keyof Exercise,
    value: string | number
  ) => {
    const newDayExercises = [...dayExercises];
    const currentExercises = [...newDayExercises[currentDayIndex].exercises];

    if (field === "name") {
      currentExercises[exerciseIndex].name = value as string;
    } else if (field === "series" || field === "reps") {
      currentExercises[exerciseIndex][field] = parseInt(value as string) || 1;
    }

    newDayExercises[currentDayIndex].exercises = currentExercises;
    setDayExercises(newDayExercises);
  };

  const handleAddExercise = (muscleGroup?: string) => {
    const newDayExercises = [...dayExercises];
    const newExercise: Exercise =
      muscleGroup &&
      EXERCISES_BY_MUSCLE[muscleGroup as keyof typeof EXERCISES_BY_MUSCLE]
        ? {
            name: EXERCISES_BY_MUSCLE[
              muscleGroup as keyof typeof EXERCISES_BY_MUSCLE
            ][0],
            series: 3,
            reps: 10,
          }
        : { name: "", series: 3, reps: 10 };

    newDayExercises[currentDayIndex].exercises.push(newExercise);
    setDayExercises(newDayExercises);
  };

  const handleRemoveExercise = (exerciseIndex: number) => {
    const newDayExercises = [...dayExercises];
    newDayExercises[currentDayIndex].exercises = newDayExercises[
      currentDayIndex
    ].exercises.filter((_, i) => i !== exerciseIndex);
    setDayExercises(newDayExercises);
  };

  const handleSelectExerciseFromList = (
    exerciseIndex: number,
    exerciseName: string
  ) => {
    const newDayExercises = [...dayExercises];
    newDayExercises[currentDayIndex].exercises[exerciseIndex].name =
      exerciseName;
    setDayExercises(newDayExercises);
  };

  const handleEditPlan = () => {
    if (!existingPlan) return;

    // Agrupar ejercicios por día
    const exercisesByDay: {
      [key: string]: Array<{
        exercise: string;
        series: number;
        reps: number;
      }>;
    } = {};

    existingPlan.exercises.forEach((exercise, index) => {
      const day = existingPlan.days[index];
      if (!exercisesByDay[day]) {
        exercisesByDay[day] = [];
      }
      exercisesByDay[day].push({
        exercise,
        series: existingPlan.series[index],
        reps: existingPlan.reps[index],
      });
    });

    // Convertir a formato DayExercises
    const editDays: DayExercises[] = Object.entries(exercisesByDay).map(
      ([weekDay, exercises]) => ({
        dayName: "", // No necesitamos el nombre del día en edición
        weekDay: weekDay,
        exercises: exercises.map((ex) => ({
          name: ex.exercise,
          series: ex.series,
          reps: ex.reps,
        })),
      })
    );

    setDayExercises(editDays);
    setSelectedSplit(""); // No necesitamos el split en edición
    setIsEditing(true);
    setShowForm(true);
    setStep(3); // Ir directamente al paso de edición de ejercicios
    setCurrentDayIndex(0);
  };

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !existingPlan) return;

    // Consolidar todos los ejercicios de todos los días
    const allExercises: string[] = [];
    const allSeries: number[] = [];
    const allReps: number[] = [];
    const allDays: string[] = [];

    dayExercises.forEach((day) => {
      const validExercises = day.exercises.filter(
        (ex) => ex.name.trim() !== ""
      );
      validExercises.forEach((ex) => {
        allExercises.push(ex.name);
        allSeries.push(ex.series);
        allReps.push(ex.reps);
        allDays.push(day.weekDay);
      });
    });

    if (allExercises.length === 0) {
      alert("Debes agregar al menos un ejercicio");
      return;
    }

    const statusArray = allExercises.map(() => "pendiente");

    const { error } = await supabase
      .from("plan")
      .update({
        exercises: allExercises,
        series: allSeries,
        reps: allReps,
        days: allDays,
        status: statusArray,
      })
      .eq("id", existingPlan.id);

    if (error) {
      console.error("Error updating plan:", error);
      alert("Error al actualizar el plan: " + error.message);
    } else {
      alert("Plan actualizado exitosamente");
      await checkExistingPlan();
      setShowForm(false);
      setIsEditing(false);
      setStep(1);
      setSelectedSplit("");
      setDayExercises([]);
      setCurrentDayIndex(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Consolidar todos los ejercicios de todos los días
    const allExercises: string[] = [];
    const allSeries: number[] = [];
    const allReps: number[] = [];
    const allDays: string[] = [];

    dayExercises.forEach((day) => {
      const validExercises = day.exercises.filter(
        (ex) => ex.name.trim() !== ""
      );
      validExercises.forEach((ex) => {
        allExercises.push(ex.name);
        allSeries.push(ex.series);
        allReps.push(ex.reps);
        allDays.push(day.weekDay);
      });
    });

    if (allExercises.length === 0) {
      alert("Debes agregar al menos un ejercicio");
      return;
    }

    const statusArray = allExercises.map(() => "pendiente");

    const { error } = await supabase.from("plan").insert({
      user_id: user.id,
      split: selectedSplit ? SPLITS[selectedSplit].name : "Plan Personalizado",
      exercises: allExercises,
      series: allSeries,
      reps: allReps,
      days: allDays,
      status: statusArray,
      its_done: false,
    });

    if (error) {
      console.error("Error creating plan:", error);
      alert("Error al crear el plan: " + error.message);
    } else {
      alert("Plan creado exitosamente");
      checkExistingPlan();
      setShowForm(false);
      setStep(1);
      setSelectedSplit("");
      setDayExercises([]);
      setCurrentDayIndex(0);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <button
            onClick={() => router.push("/home")}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
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
            <span className="hidden sm:inline">Volver</span>
          </button>
          {existingPlan && !showForm && !showMyExercises && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowMyExercises(true)}
                className="px-3 sm:px-4 py-2 bg-purple-400 hover:bg-purple-500 text-white rounded-lg transition-colors text-sm sm:text-base"
              >
                Mis Ejercicios
              </button>
              <button
                onClick={handleEditPlan}
                className="px-3 sm:px-4 py-2 bg-blue-400 hover:bg-blue-500 text-white rounded-lg transition-colors text-sm sm:text-base"
              >
                Editar
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="px-3 sm:px-4 py-2 bg-orange-400 hover:bg-orange-500 text-white rounded-lg transition-colors text-sm sm:text-base"
              >
                Nuevo Plan
              </button>
            </div>
          )}
          {showMyExercises && (
            <button
              onClick={() => {
                setShowMyExercises(false);
                setShowExerciseForm(false);
              }}
              className="px-3 sm:px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm sm:text-base"
            >
              Volver al Plan
            </button>
          )}
        </div>

        {/* My Exercises Section */}
        {showMyExercises ? (
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-4 sm:p-8 border border-gray-800/50 shadow-xl">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-400/10 flex items-center justify-center">
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
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white">
                      Mis Ejercicios
                    </h2>
                    <p className="text-gray-500 text-xs sm:text-sm">
                      {myExercises.length} ejercicio(s) guardado(s)
                    </p>
                  </div>
                </div>
                {existingPlan && (
                  <button
                    onClick={handleImportFromPlan}
                    className="px-3 sm:px-4 py-2 bg-green-400 hover:bg-green-500 text-white rounded-lg transition-colors text-sm sm:text-base"
                  >
                    Importar del Plan
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <input
                  type="text"
                  placeholder="Buscar ejercicio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 bg-[#0f0f0f] border border-gray-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm sm:text-base"
                />
                <select
                  value={filterMuscleGroup}
                  onChange={(e) => setFilterMuscleGroup(e.target.value)}
                  className="px-4 py-2 bg-[#0f0f0f] border border-gray-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm sm:text-base"
                >
                  <option value="">Todos los grupos</option>
                  <option value="pecho">Pecho</option>
                  <option value="espalda">Espalda</option>
                  <option value="piernas">Piernas</option>
                  <option value="hombros">Hombros</option>
                  <option value="biceps">Bíceps</option>
                  <option value="triceps">Tríceps</option>
                  <option value="abdomen">Abdomen</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              {/* Exercise Form */}
              {showExerciseForm ? (
                <div className="bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-4 sm:p-6 border border-purple-400/30 mb-4">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    {editingExerciseId ? "Editar Ejercicio" : "Nuevo Ejercicio"}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Nombre del Ejercicio
                      </label>
                      <input
                        type="text"
                        value={exerciseFormData.name}
                        onChange={(e) =>
                          setExerciseFormData({
                            ...exerciseFormData,
                            name: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm sm:text-base"
                        placeholder="Ej: Press banca plano"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Grupo Muscular
                        </label>
                        <select
                          value={exerciseFormData.muscle_group}
                          onChange={(e) =>
                            setExerciseFormData({
                              ...exerciseFormData,
                              muscle_group: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm sm:text-base"
                        >
                          <option value="pecho">Pecho</option>
                          <option value="espalda">Espalda</option>
                          <option value="piernas">Piernas</option>
                          <option value="hombros">Hombros</option>
                          <option value="biceps">Bíceps</option>
                          <option value="triceps">Tríceps</option>
                          <option value="abdomen">Abdomen</option>
                          <option value="otro">Otro</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Series
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={exerciseFormData.default_series}
                          onChange={(e) =>
                            setExerciseFormData({
                              ...exerciseFormData,
                              default_series: parseInt(e.target.value) || 1,
                            })
                          }
                          className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm sm:text-base"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Repeticiones
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={exerciseFormData.default_reps}
                          onChange={(e) =>
                            setExerciseFormData({
                              ...exerciseFormData,
                              default_reps: parseInt(e.target.value) || 1,
                            })
                          }
                          className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm sm:text-base"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Notas (opcional)
                      </label>
                      <textarea
                        value={exerciseFormData.notes}
                        onChange={(e) =>
                          setExerciseFormData({
                            ...exerciseFormData,
                            notes: e.target.value,
                          })
                        }
                        rows={2}
                        className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm sm:text-base resize-none"
                        placeholder="Técnica, consejos, etc."
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleSaveExercise}
                        className="flex-1 px-4 py-2 bg-purple-400 hover:bg-purple-500 text-white rounded-lg transition-colors text-sm sm:text-base"
                      >
                        {editingExerciseId
                          ? "Guardar Cambios"
                          : "Crear Ejercicio"}
                      </button>
                      <button
                        onClick={() => {
                          setShowExerciseForm(false);
                          setEditingExerciseId(null);
                          setExerciseFormData({
                            name: "",
                            muscle_group: "pecho",
                            default_series: 3,
                            default_reps: 10,
                            notes: "",
                          });
                        }}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm sm:text-base"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowExerciseForm(true)}
                  className="w-full mb-4 px-4 py-3 bg-purple-400/10 border border-purple-400/30 rounded-lg text-purple-400 hover:bg-purple-400/20 transition-colors text-sm sm:text-base"
                >
                  + Agregar Nuevo Ejercicio
                </button>
              )}

              {/* Exercises List */}
              {loadingExercises ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto"></div>
                </div>
              ) : myExercises.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No hay ejercicios guardados</p>
                  <p className="text-gray-600 text-sm mt-2">
                    Agrega ejercicios manualmente o importa desde tu plan
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {myExercises.map((exercise) => (
                    <div
                      key={exercise.id}
                      className="bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] rounded-lg p-3 sm:p-4 border border-gray-800/50 hover:border-purple-400/30 transition-all"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-white font-semibold text-sm sm:text-base truncate">
                              {exercise.name}
                            </h4>
                            <span className="px-2 py-0.5 bg-purple-400/20 border border-purple-400/30 rounded-full text-purple-400 text-xs capitalize shrink-0">
                              {exercise.muscle_group}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs sm:text-sm">
                            <span className="text-pink-400">
                              {exercise.default_series} series
                            </span>
                            <span className="text-gray-600">×</span>
                            <span className="text-blue-400">
                              {exercise.default_reps} reps
                            </span>
                          </div>
                          {exercise.notes && (
                            <p className="text-gray-500 text-xs mt-1 line-clamp-1">
                              {exercise.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleEditExercise(exercise)}
                            className="p-2 bg-blue-400/10 border border-blue-400/20 rounded-lg text-blue-400 hover:bg-blue-400/20 transition-colors"
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
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteExercise(exercise.id!)}
                            className="p-2 bg-red-400/10 border border-red-400/20 rounded-lg text-red-400 hover:bg-red-400/20 transition-colors"
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
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : /* Existing Plan View */
        existingPlan && !showForm ? (
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-4 sm:p-8 border border-gray-800/50 shadow-xl">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-400/10 flex items-center justify-center">
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
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    {existingPlan.split}
                  </h2>
                  <p className="text-gray-500 text-xs sm:text-sm">
                    Creado el{" "}
                    {new Date(existingPlan.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Exercises by Day */}
              <div className="mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">
                  Ejercicios por Día
                </h3>
                <div className="space-y-3 sm:space-y-4">
                  {(() => {
                    // Agrupar ejercicios por día
                    const exercisesByDay: {
                      [key: string]: Array<{
                        exercise: string;
                        series: number;
                        reps: number;
                      }>;
                    } = {};
                    existingPlan.exercises.forEach((exercise, index) => {
                      const day = existingPlan.days[index];
                      if (!exercisesByDay[day]) {
                        exercisesByDay[day] = [];
                      }
                      exercisesByDay[day].push({
                        exercise,
                        series: existingPlan.series[index],
                        reps: existingPlan.reps[index],
                      });
                    });

                    return Object.entries(exercisesByDay).map(
                      ([day, exercises]) => (
                        <div
                          key={day}
                          className="bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] rounded-lg p-3 sm:p-4 border border-gray-800/50"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <span className="px-2 sm:px-3 py-1 bg-orange-400/20 border border-orange-400/30 rounded-full text-orange-400 text-xs sm:text-sm font-semibold">
                              {day}
                            </span>
                            <span className="text-gray-500 text-xs sm:text-sm">
                              {exercises.length} ejercicios
                            </span>
                          </div>
                          <div className="space-y-2">
                            {exercises.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between gap-2 sm:gap-3 p-2 bg-[#0a0a0a] rounded-lg"
                              >
                                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-400/10 flex items-center justify-center shrink-0">
                                    <span className="text-blue-400 font-semibold text-xs">
                                      {idx + 1}
                                    </span>
                                  </div>
                                  <span className="text-white text-xs sm:text-sm truncate">
                                    {item.exercise}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3 text-xs shrink-0">
                                  <span className="text-pink-400 font-semibold">
                                    {item.series}×
                                  </span>
                                  <span className="text-purple-400 font-semibold">
                                    {item.reps}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    );
                  })()}
                </div>
              </div>

              {/* Status */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">
                  Estado del Plan
                </h3>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      existingPlan.its_done ? "bg-green-400" : "bg-yellow-400"
                    }`}
                  ></div>
                  <span className="text-gray-400">
                    {existingPlan.its_done ? "Completado" : "En progreso"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Create Plan Form */
          <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-4 sm:p-8 border border-gray-800/50 shadow-xl">
            {/* Header with Steps */}
            <div className="mb-6 sm:mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-400/10 flex items-center justify-center">
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  {isEditing ? "Editar Plan" : "Crear Plan de Entrenamiento"}
                </h2>
              </div>

              {/* Progress Steps - Only show if not editing */}
              {!isEditing && (
                <div className="flex items-center gap-2">
                  {[1, 2, 3].map((s) => (
                    <div key={s} className="flex items-center flex-1">
                      <div
                        className={`h-1 flex-1 rounded-full ${
                          s <= step ? "bg-orange-400" : "bg-gray-800"
                        }`}
                      ></div>
                      {s < 3 && (
                        <div
                          className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center mx-1 sm:mx-2 text-xs sm:text-base ${
                            s < step
                              ? "bg-orange-400 text-white"
                              : s === step
                              ? "bg-orange-400/20 text-orange-400 border-2 border-orange-400"
                              : "bg-gray-800 text-gray-500"
                          }`}
                        >
                          {s}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Step 1: Select Split */}
            {step === 1 && !isEditing && (
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-4">
                  Selecciona tu tipo de rutina
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {(Object.keys(SPLITS) as Array<keyof typeof SPLITS>).map(
                    (key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSplitSelect(key)}
                        className="p-4 sm:p-6 bg-linear-to-br from-[#0f0f0f] to-[#1a1a1a] hover:from-[#151515] hover:to-[#202020] border border-gray-800/50 hover:border-orange-400/50 rounded-xl text-left transition-all group"
                      >
                        <h4 className="text-lg sm:text-xl font-bold text-white mb-2 group-hover:text-orange-400 transition-colors">
                          {SPLITS[key].name}
                        </h4>
                        <p className="text-gray-400 text-xs sm:text-sm">
                          {SPLITS[key].description}
                        </p>
                      </button>
                    )
                  )}
                </div>
                {existingPlan && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setStep(1);
                    }}
                    className="w-full mt-4 px-4 sm:px-6 py-3 bg-[#0f0f0f] border border-gray-800/50 text-gray-400 hover:text-white rounded-lg transition-colors text-sm sm:text-base"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            )}

            {/* Step 2: Assign Week Days */}
            {step === 2 && !isEditing && (
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-2">
                    Asignar Días de la Semana
                  </h3>
                  <p className="text-gray-400 text-xs sm:text-sm mb-4">
                    Asigna qué día de la semana harás cada entrenamiento de{" "}
                    {selectedSplit && SPLITS[selectedSplit].name}
                  </p>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  {dayExercises.map((day, index) => (
                    <div
                      key={index}
                      className="p-3 sm:p-4 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] rounded-lg border border-gray-800/50"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                        <div className="flex-1">
                          <h4 className="text-white font-semibold mb-1 text-sm sm:text-base">
                            {day.dayName}
                          </h4>
                          <p className="text-gray-500 text-xs sm:text-sm">
                            {day.exercises.length} ejercicios
                          </p>
                        </div>
                        <select
                          value={day.weekDay}
                          onChange={(e) =>
                            handleAssignWeekDay(index, e.target.value)
                          }
                          className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-[#0a0a0a] border border-gray-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm sm:text-base"
                        >
                          <option value="">Seleccionar día</option>
                          {DAYS_OF_WEEK.map((weekDay) => (
                            <option key={weekDay} value={weekDay}>
                              {weekDay}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 sm:px-6 py-3 bg-[#0f0f0f] border border-gray-800/50 text-gray-400 hover:text-white rounded-lg transition-colors text-sm sm:text-base"
                  >
                    Atrás
                  </button>
                  <button
                    type="button"
                    onClick={handleDaysConfirm}
                    className="flex-1 px-4 sm:px-6 py-3 bg-orange-400 hover:bg-orange-500 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-orange-400/20 text-sm sm:text-base"
                  >
                    Continuar a Ejercicios
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Edit Exercises by Day */}
            {step === 3 && (
              <div className="space-y-4 sm:space-y-6">
                {/* Day Navigation */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">
                    {isEditing
                      ? "Editar Ejercicios"
                      : "Editar Ejercicios por Día"}
                  </h3>
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                    {dayExercises.map((day, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setCurrentDayIndex(index)}
                        className={`px-3 sm:px-4 py-2 rounded-lg border transition-all whitespace-nowrap text-xs sm:text-sm ${
                          currentDayIndex === index
                            ? "bg-orange-400 border-orange-400 text-white font-semibold"
                            : "bg-[#0f0f0f] border-gray-800/50 text-gray-400 hover:border-orange-400/50"
                        }`}
                      >
                        <div className="text-sm sm:text-base">
                          {day.weekDay}
                        </div>
                        {day.dayName && (
                          <div className="text-xs opacity-75">
                            {day.dayName}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Current Day Exercises */}
                <div className="bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-4 sm:p-6 border border-gray-800/50">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      {dayExercises[currentDayIndex].dayName && (
                        <h4 className="text-white font-semibold text-sm sm:text-base">
                          {dayExercises[currentDayIndex].dayName}
                        </h4>
                      )}
                      <p className="text-gray-500 text-xs sm:text-sm">
                        {dayExercises[currentDayIndex].weekDay}
                      </p>
                    </div>
                    <span className="text-orange-400 text-xs sm:text-sm font-semibold">
                      {dayExercises[currentDayIndex].exercises.length}{" "}
                      ejercicios
                    </span>
                  </div>

                  <div className="space-y-2 sm:space-y-3 max-h-96 overflow-y-auto pr-2">
                    {dayExercises[currentDayIndex].exercises.map(
                      (exercise, index) => (
                        <div
                          key={index}
                          className="flex gap-2 items-start p-2 sm:p-3 bg-[#0a0a0a] rounded-lg border border-gray-800/50"
                        >
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-400/10 flex items-center justify-center shrink-0">
                            <span className="text-blue-400 font-semibold text-xs sm:text-sm">
                              {index + 1}
                            </span>
                          </div>
                          <div className="flex-1 space-y-2 min-w-0">
                            <input
                              type="text"
                              value={exercise.name}
                              onChange={(e) =>
                                handleExerciseChange(
                                  index,
                                  "name",
                                  e.target.value
                                )
                              }
                              placeholder="Nombre del ejercicio"
                              className="w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-xs sm:text-sm"
                            />
                            {/* Exercise Selector */}
                            <details className="text-xs sm:text-sm">
                              <summary className="text-gray-400 hover:text-white cursor-pointer">
                                Seleccionar de la lista
                              </summary>
                              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 bg-[#0f0f0f] rounded-lg border border-gray-800/50 max-h-60 overflow-y-auto">
                                {Object.entries(EXERCISES_BY_MUSCLE).map(
                                  ([muscle, exercises]) => (
                                    <div key={muscle} className="space-y-1">
                                      <p className="text-xs font-semibold text-orange-400 capitalize">
                                        {muscle}
                                      </p>
                                      {exercises.slice(0, 5).map((ex) => (
                                        <button
                                          key={ex}
                                          type="button"
                                          onClick={() =>
                                            handleSelectExerciseFromList(
                                              index,
                                              ex
                                            )
                                          }
                                          className="w-full text-left px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-800/50 rounded transition-colors"
                                        >
                                          {ex}
                                        </button>
                                      ))}
                                    </div>
                                  )
                                )}
                              </div>
                            </details>
                          </div>
                          <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
                            <input
                              type="number"
                              value={exercise.series}
                              onChange={(e) =>
                                handleExerciseChange(
                                  index,
                                  "series",
                                  e.target.value
                                )
                              }
                              min="1"
                              className="w-12 sm:w-16 px-2 sm:px-3 py-2 bg-[#0f0f0f] border border-gray-800/50 rounded-lg text-pink-400 text-center focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent text-xs sm:text-sm font-semibold"
                              title="Series"
                            />
                            <span className="text-gray-500 text-xs hidden sm:inline">
                              ×
                            </span>
                            <input
                              type="number"
                              value={exercise.reps}
                              onChange={(e) =>
                                handleExerciseChange(
                                  index,
                                  "reps",
                                  e.target.value
                                )
                              }
                              min="1"
                              className="w-12 sm:w-16 px-2 sm:px-3 py-2 bg-[#0f0f0f] border border-gray-800/50 rounded-lg text-purple-400 text-center focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-xs sm:text-sm font-semibold"
                              title="Repeticiones"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveExercise(index)}
                            className="p-2 bg-red-400/10 border border-red-400/20 rounded-lg text-red-400 hover:bg-red-400/20 transition-colors shrink-0"
                          >
                            <svg
                              className="w-3 h-3 sm:w-4 sm:h-4"
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
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddExercise()}
                    className="w-full mt-4 px-4 py-3 bg-[#0f0f0f] border border-gray-800/50 rounded-lg text-gray-400 hover:text-white hover:border-orange-400/50 transition-all text-sm sm:text-base"
                  >
                    + Agregar Ejercicio
                  </button>
                </div>

                {/* Navigation */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-4 sm:px-6 py-3 bg-[#0f0f0f] border border-gray-800/50 text-gray-400 hover:text-white rounded-lg transition-colors text-sm sm:text-base"
                    >
                      Atrás
                    </button>
                  )}
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setIsEditing(false);
                        setStep(1);
                      }}
                      className="px-4 sm:px-6 py-3 bg-[#0f0f0f] border border-gray-800/50 text-gray-400 hover:text-white rounded-lg transition-colors text-sm sm:text-base"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={isEditing ? handleUpdatePlan : handleSubmit}
                    className="flex-1 px-4 sm:px-6 py-3 bg-orange-400 hover:bg-orange-500 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-orange-400/20 text-sm sm:text-base"
                  >
                    {isEditing ? "Guardar Cambios" : "Crear Plan"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
