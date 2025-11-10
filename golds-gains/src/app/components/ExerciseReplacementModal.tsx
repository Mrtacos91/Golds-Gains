"use client";

import { useState, useEffect } from "react";
import {
  exerciseService,
  ExerciseReplacement,
  Exercise as CustomExercise,
} from "@/services/exerciseService";

interface ExerciseReplacementModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  planId: number;
  originalExercise: string;
  workoutDate: string; // YYYY-MM-DD
  dayOfWeek: string;
  onSuccess?: () => void;
}

export default function ExerciseReplacementModal({
  isOpen,
  onClose,
  userId,
  planId,
  originalExercise,
  workoutDate,
  dayOfWeek,
  onSuccess,
}: ExerciseReplacementModalProps) {
  const [replacementExercise, setReplacementExercise] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [myExercises, setMyExercises] = useState<CustomExercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadMyExercises();
      setReplacementExercise("");
      setNotes("");
      setShowCustomInput(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadMyExercises = async () => {
    try {
      setLoadingExercises(true);
      const exercises = await exerciseService.getUserExercises(userId);
      setMyExercises(exercises);
    } catch (error) {
      console.error("Error loading exercises:", error);
    } finally {
      setLoadingExercises(false);
    }
  };

  const handleSave = async () => {
    if (!replacementExercise.trim()) {
      alert("Por favor selecciona o escribe un ejercicio de reemplazo");
      return;
    }

    setSaving(true);

    try {
      const replacement: ExerciseReplacement = {
        user_id: userId,
        plan_id: planId,
        original_exercise: originalExercise,
        replacement_exercise: replacementExercise,
        workout_date: workoutDate,
        day_of_week: dayOfWeek,
        notes: notes || undefined,
      };

      const result = await exerciseService.registerReplacement(replacement);

      if (result) {
        alert("Reemplazo registrado exitosamente");
        onSuccess?.();
        onClose();
      } else {
        alert("Error al registrar el reemplazo");
      }
    } catch (error) {
      console.error("Error saving replacement:", error);
      alert("Error al guardar el reemplazo");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-4 sm:p-6 border border-gray-800/50 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
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
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Reemplazar Ejercicio
              </h3>
              <p className="text-xs text-gray-500">
                {new Date(workoutDate).toLocaleDateString("es-ES", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
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

        {/* Original Exercise */}
        <div className="mb-4 p-3 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] rounded-lg border border-gray-800/50">
          <p className="text-xs text-gray-400 mb-1">Ejercicio Original:</p>
          <p className="text-white font-semibold">{originalExercise}</p>
        </div>

        {/* Selection Method */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            ¿Cómo deseas elegir el reemplazo?
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCustomInput(false)}
              className={`flex-1 px-3 py-2 rounded-lg border transition-all text-sm ${
                !showCustomInput
                  ? "bg-orange-400 border-orange-400 text-white"
                  : "bg-[#0f0f0f] border-gray-800/50 text-gray-400 hover:border-orange-400/50"
              }`}
            >
              Mis Ejercicios
            </button>
            <button
              onClick={() => setShowCustomInput(true)}
              className={`flex-1 px-3 py-2 rounded-lg border transition-all text-sm ${
                showCustomInput
                  ? "bg-orange-400 border-orange-400 text-white"
                  : "bg-[#0f0f0f] border-gray-800/50 text-gray-400 hover:border-orange-400/50"
              }`}
            >
              Escribir Manualmente
            </button>
          </div>
        </div>

        {/* Replacement Exercise Selection */}
        {showCustomInput ? (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Ejercicio de Reemplazo
            </label>
            <input
              type="text"
              value={replacementExercise}
              onChange={(e) => setReplacementExercise(e.target.value)}
              placeholder="Ej: Peck Deck"
              className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
            />
          </div>
        ) : (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Selecciona de Mis Ejercicios
            </label>
            {loadingExercises ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-400 mx-auto"></div>
              </div>
            ) : myExercises.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">
                  No tienes ejercicios guardados
                </p>
                <button
                  onClick={() => setShowCustomInput(true)}
                  className="mt-2 text-orange-400 text-sm hover:underline"
                >
                  Escribir manualmente
                </button>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-800/50 rounded-lg p-2 bg-[#0f0f0f]">
                {myExercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    onClick={() => setReplacementExercise(exercise.name)}
                    className={`w-full text-left p-2 rounded-lg transition-all ${
                      replacementExercise === exercise.name
                        ? "bg-orange-400 text-white"
                        : "bg-[#0a0a0a] text-gray-300 hover:bg-gray-800/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {exercise.name}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          replacementExercise === exercise.name
                            ? "bg-white/20 text-white"
                            : "bg-gray-700 text-gray-400"
                        }`}
                      >
                        {exercise.muscle_group}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Notas (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ej: Por lesión, cambio de gimnasio, etc."
            className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-[#0f0f0f] border border-gray-800/50 text-gray-400 hover:text-white rounded-lg transition-colors text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !replacementExercise.trim()}
            className="flex-1 px-4 py-2 bg-orange-400 hover:bg-orange-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
          >
            {saving ? "Guardando..." : "Registrar Reemplazo"}
          </button>
        </div>

        {/* Info */}
        <div className="mt-4 p-3 bg-blue-400/10 border border-blue-400/20 rounded-lg">
          <p className="text-xs text-blue-400">
            ℹ️ Este reemplazo solo se aplicará para la fecha seleccionada. Tu
            plan original no se modificará.
          </p>
        </div>
      </div>
    </div>
  );
}
