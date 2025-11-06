"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface GoalData {
  id: number;
  user_id: string;
  ideal_weight: number;
  ideal_fatpercent: number;
  stage: string;
  units: string;
  created_at: string;
}

interface WeightRecord {
  date: string;
  weight: number;
  fatPercent: number;
}

export default function GoalsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentGoal, setCurrentGoal] = useState<GoalData | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Form state
  const [idealWeight, setIdealWeight] = useState("");
  const [idealFatPercent, setIdealFatPercent] = useState("");
  const [stage, setStage] = useState("maintenance");
  const [units, setUnits] = useState("kg");

  // Weight tracking form state
  const [showTrackingForm, setShowTrackingForm] = useState(false);
  const [trackingWeight, setTrackingWeight] = useState("");
  const [trackingFatPercent, setTrackingFatPercent] = useState("");
  const [savingTracking, setSavingTracking] = useState(false);

  // Body fat calculator state
  const [showCalculator, setShowCalculator] = useState(false);
  const [gender, setGender] = useState("male");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [neck, setNeck] = useState("");
  const [waist, setWaist] = useState("");
  const [hip, setHip] = useState("");
  const [calculatedBF, setCalculatedBF] = useState<number | null>(null);

  // Trend data
  const [weightTrend6Months, setWeightTrend6Months] = useState<WeightRecord[]>(
    []
  );
  const [weightTrendThisMonth, setWeightTrendThisMonth] = useState<
    WeightRecord[]
  >([]);
  const [fatTrend6Months, setFatTrend6Months] = useState<WeightRecord[]>([]);
  const [fatTrendThisMonth, setFatTrendThisMonth] = useState<WeightRecord[]>(
    []
  );
  const [hoveredPoint, setHoveredPoint] = useState<{
    chartId: string;
    index: number;
    x: number;
    y: number;
    value: string;
    date: string;
  } | null>(null);

  useEffect(() => {
    loadGoalsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadGoalsData() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }

      // Load current goal
      const { data: goalData, error: goalError } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (goalError && goalError.code !== "PGRST116") {
        console.error("Error loading goal:", goalError);
      }

      if (goalData) {
        setCurrentGoal(goalData as GoalData);
        setIdealWeight(goalData.ideal_weight.toString());
        setIdealFatPercent(goalData.ideal_fatpercent.toString());
        setStage(goalData.stage);
        setUnits(goalData.units);
      } else {
        setEditMode(true);
      }

      // Load weight tracking data (mock for now - you'll need to create a weight_tracking table)
      await loadWeightTrends(user.id);

      setLoading(false);
    } catch (err) {
      console.error("Error in loadGoalsData:", err);
      setLoading(false);
    }
  }

  async function loadWeightTrends(userId: string) {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const monthStart = new Date();
      monthStart.setDate(1);

      // Query last 6 months of weight tracking data
      const { data: allRecords, error } = await supabase
        .from("weight_tracking")
        .select("*")
        .eq("user_id", userId)
        .gte("measured_at", sixMonthsAgo.toISOString())
        .order("measured_at", { ascending: true });

      if (error) {
        console.error("Error loading weight tracking:", error);
        return;
      }

      if (allRecords && allRecords.length > 0) {
        // Map to WeightRecord format
        const allData: WeightRecord[] = allRecords.map(
          (record: {
            measured_at: string;
            weight: number;
            fat_percent: number;
          }) => ({
            date: record.measured_at.split("T")[0],
            weight: record.weight,
            fatPercent: record.fat_percent,
          })
        );

        setWeightTrend6Months(allData);
        setFatTrend6Months(allData);

        // Filter this month's data
        const thisMonthData = allData.filter((record) => {
          const recordDate = new Date(record.date);
          return recordDate >= monthStart && recordDate <= new Date();
        });

        setWeightTrendThisMonth(thisMonthData);
        setFatTrendThisMonth(thisMonthData);
      } else {
        // No data available
        setWeightTrend6Months([]);
        setWeightTrendThisMonth([]);
        setFatTrend6Months([]);
        setFatTrendThisMonth([]);
      }
    } catch (err) {
      console.error("Error in loadWeightTrends:", err);
    }
  }

  async function handleSaveGoal() {
    if (!idealWeight || !idealFatPercent) {
      alert("Por favor completa todos los campos");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const goalPayload = {
        user_id: user.id,
        ideal_weight: parseFloat(idealWeight),
        ideal_fatpercent: parseFloat(idealFatPercent),
        stage,
        units,
      };

      const { error } = await supabase.from("goals").insert(goalPayload);

      if (error) {
        console.error("Error saving goal:", error);
        alert("Error al guardar la meta");
        return;
      }

      alert("Meta guardada exitosamente");
      setEditMode(false);
      await loadGoalsData();
    } catch (err) {
      console.error("Error in handleSaveGoal:", err);
      alert("Error al guardar la meta");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveTracking() {
    if (!trackingWeight || !trackingFatPercent) {
      alert("Por favor completa peso y porcentaje de grasa");
      return;
    }

    setSavingTracking(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const trackingPayload = {
        user_id: user.id,
        weight: parseFloat(trackingWeight),
        fat_percent: parseFloat(trackingFatPercent),
      };

      const { error } = await supabase
        .from("weight_tracking")
        .insert(trackingPayload);

      if (error) {
        console.error("Error saving tracking:", error);
        alert("Error al guardar el registro");
        return;
      }

      alert("Registro guardado exitosamente");
      setShowTrackingForm(false);
      setTrackingWeight("");
      setTrackingFatPercent("");
      await loadGoalsData();
    } catch (err) {
      console.error("Error in handleSaveTracking:", err);
      alert("Error al guardar el registro");
    } finally {
      setSavingTracking(false);
    }
  }

  function calculateBodyFat() {
    const h = parseFloat(height);
    const n = parseFloat(neck);
    const w = parseFloat(waist);
    const hi = parseFloat(hip);

    if (!h || !n || !w) {
      alert("Por favor completa todos los campos requeridos");
      return;
    }

    let bf: number;

    if (gender === "male") {
      // US Navy formula for men
      bf =
        495 / (1.0324 - 0.19077 * Math.log10(w - n) + 0.15456 * Math.log10(h)) -
        450;
    } else {
      // US Navy formula for women
      if (!hi) {
        alert("Por favor completa la medida de cadera");
        return;
      }
      bf =
        495 /
          (1.29579 - 0.35004 * Math.log10(w + hi - n) + 0.221 * Math.log10(h)) -
        450;
    }

    setCalculatedBF(Math.max(0, Math.min(100, bf)));
  }

  function useCalculatedBF() {
    if (calculatedBF !== null) {
      setTrackingFatPercent(calculatedBF.toFixed(1));
      setShowCalculator(false);
      setShowTrackingForm(true);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#1a1a1a]">
        <nav className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-lg border-b border-gray-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              <Link href="/home" className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  alt="Gold's Gains"
                  className="w-10 h-10 object-contain"
                />
                <h1 className="text-2xl font-bold bg-linear-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent hidden sm:block">
                  Gold&apos;s Gains
                </h1>
              </Link>
              <Link
                href="/home"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </nav>
        <div className="container mx-auto px-4 py-8">
          <p className="text-white text-center">Cargando metas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#1a1a1a]">
      <nav className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-lg border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/home" className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Gold's Gains"
                className="w-10 h-10 object-contain"
              />
              <h1 className="text-2xl font-bold bg-linear-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent hidden sm:block">
                Gold&apos;s Gains
              </h1>
            </Link>
            <Link
              href="/home"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </Link>
          </div>
        </div>
      </nav>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-6 border border-gray-800/50 shadow-xl">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Mis Metas</h1>
              <p className="text-gray-500">
                Define tus objetivos de peso, composición corporal y etapa de
                entrenamiento
              </p>
            </div>
            {currentGoal && !editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="px-4 py-2 bg-pink-400 hover:bg-orange-400 text-white rounded-lg transition-colors"
              >
                Editar Meta
              </button>
            )}
          </div>
        </div>

        {/* Current Goals / Edit Form */}
        <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-6 border border-gray-800/50 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-4">
            {editMode ? "Establecer Nueva Meta" : "Meta Actual"}
          </h2>

          {editMode ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Peso Ideal
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={idealWeight}
                      onChange={(e) => setIdealWeight(e.target.value)}
                      className="flex-1 px-4 py-2 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] border border-gray-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-400"
                      placeholder="75.0"
                    />
                    <select
                      value={units}
                      onChange={(e) => setUnits(e.target.value)}
                      className="px-4 py-2 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] border border-gray-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-400"
                    >
                      <option value="kg">kg</option>
                      <option value="lb">lb</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Porcentaje de Grasa Ideal
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      step="0.1"
                      value={idealFatPercent}
                      onChange={(e) => setIdealFatPercent(e.target.value)}
                      className="flex-1 px-4 py-2 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] border border-gray-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-400"
                      placeholder="15.0"
                    />
                    <span className="text-gray-400">%</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Etapa de Entrenamiento
                </label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  className="w-full px-4 py-2 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] border border-gray-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-400"
                >
                  <option value="bulk">Bulk (Ganancia de Masa)</option>
                  <option value="definition">
                    Definición (Pérdida de Grasa)
                  </option>
                  <option value="maintenance">Mantenimiento</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveGoal}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-[#ff6b35] hover:bg-[#ff8555] disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  {saving ? "Guardando..." : "Guardar Meta"}
                </button>
                {currentGoal && (
                  <button
                    onClick={() => {
                      setEditMode(false);
                      setIdealWeight(currentGoal.ideal_weight.toString());
                      setIdealFatPercent(
                        currentGoal.ideal_fatpercent.toString()
                      );
                      setStage(currentGoal.stage);
                      setUnits(currentGoal.units);
                    }}
                    className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          ) : currentGoal ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] rounded-lg border border-blue-400/20">
                <p className="text-gray-400 text-sm mb-1">Peso Ideal</p>
                <p className="text-3xl font-bold text-blue-400">
                  {currentGoal.ideal_weight} {currentGoal.units}
                </p>
              </div>
              <div className="p-4 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] rounded-lg border border-pink-400/20">
                <p className="text-gray-400 text-sm mb-1">% Grasa Ideal</p>
                <p className="text-3xl font-bold text-pink-400">
                  {currentGoal.ideal_fatpercent}%
                </p>
              </div>
              <div className="p-4 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] rounded-lg border border-orange-400/20">
                <p className="text-gray-400 text-sm mb-1">Etapa</p>
                <p className="text-2xl font-bold text-orange-400 capitalize">
                  {currentGoal.stage === "bulk" && "Bulk"}
                  {currentGoal.stage === "definition" && "Definición"}
                  {currentGoal.stage === "maintenance" && "Mantenimiento"}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Quick Actions */}
        <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-6 border border-gray-800/50 shadow-xl">
          <h3 className="text-xl font-semibold text-white mb-4">
            Acciones Rápidas
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setShowTrackingForm(!showTrackingForm)}
              className="bg-linear-to-br from-[#0f0f0f] to-[#1a1a1a] hover:from-[#151515] hover:to-[#202020] border border-gray-800/50 rounded-lg p-4 text-left transition-all shadow-lg"
            >
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <p className="text-white font-medium">Registrar Medición</p>
              <p className="text-gray-500 text-sm">Peso y % grasa semanal</p>
            </button>

            <button
              onClick={() => setShowCalculator(!showCalculator)}
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
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-white font-medium">Calcular % Grasa</p>
              <p className="text-gray-500 text-sm">Fórmula US Navy</p>
            </button>
          </div>
        </div>

        {/* Weight Tracking Form */}
        {showTrackingForm && (
          <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-6 border border-blue-400/30 shadow-xl">
            <h3 className="text-xl font-semibold text-white mb-4">
              Nuevo Registro de Medición
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Peso Actual
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={trackingWeight}
                      onChange={(e) => setTrackingWeight(e.target.value)}
                      className="flex-1 px-4 py-2 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] border border-gray-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="75.0"
                    />
                    <span className="px-4 py-2 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] border border-gray-800/50 rounded-lg text-gray-400">
                      {units}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Porcentaje de Grasa
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      step="0.1"
                      value={trackingFatPercent}
                      onChange={(e) => setTrackingFatPercent(e.target.value)}
                      className="flex-1 px-4 py-2 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] border border-gray-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="15.0"
                    />
                    <span className="text-gray-400">%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Usa la calculadora si no conoces tu %
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSaveTracking}
                  disabled={savingTracking}
                  className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  {savingTracking ? "Guardando..." : "Guardar Registro"}
                </button>
                <button
                  onClick={() => {
                    setShowTrackingForm(false);
                    setTrackingWeight("");
                    setTrackingFatPercent("");
                  }}
                  className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Body Fat Calculator */}
        {showCalculator && (
          <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-6 border border-pink-400/30 shadow-xl">
            <h3 className="text-xl font-semibold text-white mb-4">
              Calculadora de Porcentaje de Grasa Corporal
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Usa la fórmula US Navy para estimar tu porcentaje de grasa
              corporal basándote en medidas corporales.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Género
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setGender("male")}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      gender === "male"
                        ? "bg-pink-400 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    Masculino
                  </button>
                  <button
                    onClick={() => setGender("female")}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      gender === "female"
                        ? "bg-pink-400 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    Femenino
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Altura (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full px-4 py-2 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] border border-gray-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-400"
                    placeholder="170"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Cuello (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={neck}
                    onChange={(e) => setNeck(e.target.value)}
                    className="w-full px-4 py-2 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] border border-gray-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-400"
                    placeholder="38"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Cintura (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={waist}
                    onChange={(e) => setWaist(e.target.value)}
                    className="w-full px-4 py-2 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] border border-gray-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-400"
                    placeholder="80"
                  />
                </div>

                {gender === "female" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Cadera (cm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={hip}
                      onChange={(e) => setHip(e.target.value)}
                      className="w-full px-4 py-2 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] border border-gray-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-400"
                      placeholder="95"
                    />
                  </div>
                )}
              </div>

              {calculatedBF !== null && (
                <div className="p-4 bg-pink-400/10 border border-pink-400/30 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Resultado:</p>
                  <p className="text-3xl font-bold text-pink-400">
                    {calculatedBF.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Este es un estimado basado en la fórmula US Navy
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={calculateBodyFat}
                  className="flex-1 px-4 py-3 bg-pink-500 hover:bg-pink-600 text-white font-medium rounded-lg transition-colors"
                >
                  Calcular
                </button>
                {calculatedBF !== null && (
                  <button
                    onClick={useCalculatedBF}
                    className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                  >
                    Usar en Registro
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowCalculator(false);
                    setCalculatedBF(null);
                  }}
                  className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Weight Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 6 Months Weight Trend */}
          <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-6 border border-gray-800/50 shadow-xl">
            <h3 className="text-xl font-semibold text-white mb-4">
              Tendencia de Peso (Últimos 6 Meses)
            </h3>
            {weightTrend6Months.length > 0 ? (
              <div className="space-y-3">
                <div className="relative bg-[#0f0f0f] rounded-lg border border-gray-800/50 p-4 h-64">
                  <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 700 200"
                    preserveAspectRatio="xMidYMid meet"
                    className="overflow-visible"
                  >
                    <defs>
                      <linearGradient
                        id="weight-6m-gradient"
                        x1="0%"
                        y1="0%"
                        x2="0%"
                        y2="100%"
                      >
                        <stop
                          offset="0%"
                          stopColor="rgb(96, 165, 250)"
                          stopOpacity="0.3"
                        />
                        <stop
                          offset="100%"
                          stopColor="rgb(96, 165, 250)"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>

                    {/* Grid horizontal */}
                    {[0, 1, 2, 3, 4].map((i) => (
                      <line
                        key={i}
                        x1="50"
                        y1={30 + i * 35}
                        x2="680"
                        y2={30 + i * 35}
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="1"
                      />
                    ))}

                    {(() => {
                      const data = weightTrend6Months;
                      const minWeight = Math.min(...data.map((r) => r.weight));
                      const maxWeight = Math.max(...data.map((r) => r.weight));
                      const range = maxWeight - minWeight || 1;
                      const paddingTop = 30;
                      const paddingBottom = 30;
                      const paddingLeft = 50;
                      const paddingRight = 20;
                      const chartHeight = 200 - paddingTop - paddingBottom;
                      const chartWidth = 700 - paddingLeft - paddingRight;

                      const points = data.map((d, i) => {
                        const x =
                          paddingLeft +
                          (i / (data.length - 1 || 1)) * chartWidth;
                        const normalizedY = (d.weight - minWeight) / range;
                        const y =
                          paddingTop + chartHeight - normalizedY * chartHeight;
                        return { x, y, ...d };
                      });

                      const pathD = points
                        .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
                        .join(" ");

                      const areaD = `${pathD} L ${paddingLeft + chartWidth} ${
                        paddingTop + chartHeight
                      } L ${paddingLeft} ${paddingTop + chartHeight} Z`;

                      return (
                        <>
                          {/* Labels del eje Y */}
                          <text
                            x="45"
                            y={paddingTop + 5}
                            fill="rgba(255,255,255,0.4)"
                            fontSize="11"
                            textAnchor="end"
                          >
                            {maxWeight.toFixed(0)}
                          </text>
                          <text
                            x="45"
                            y={paddingTop + chartHeight / 2 + 5}
                            fill="rgba(255,255,255,0.4)"
                            fontSize="11"
                            textAnchor="end"
                          >
                            {((maxWeight + minWeight) / 2).toFixed(0)}
                          </text>
                          <text
                            x="45"
                            y={paddingTop + chartHeight + 5}
                            fill="rgba(255,255,255,0.4)"
                            fontSize="11"
                            textAnchor="end"
                          >
                            {minWeight.toFixed(0)}
                          </text>

                          {/* Área rellena */}
                          <path d={areaD} fill="url(#weight-6m-gradient)" />

                          {/* Línea principal */}
                          <path
                            d={pathD}
                            fill="none"
                            stroke="rgb(96, 165, 250)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]"
                          />

                          {/* Puntos interactivos */}
                          {points.map((point, i) => (
                            <g key={i}>
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r="12"
                                fill="transparent"
                                className="cursor-pointer"
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget
                                    .closest("svg")!
                                    .getBoundingClientRect();
                                  const svgX = point.x / 700;
                                  const svgY = point.y / 200;
                                  setHoveredPoint({
                                    chartId: "weight-6m",
                                    index: i,
                                    x: rect.left + svgX * rect.width,
                                    y: rect.top + svgY * rect.height,
                                    value: `${point.weight.toFixed(
                                      1
                                    )} ${units}`,
                                    date: new Date(
                                      point.date
                                    ).toLocaleDateString("es-ES", {
                                      day: "numeric",
                                      month: "short",
                                    }),
                                  });
                                }}
                                onMouseLeave={() => setHoveredPoint(null)}
                              />
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r="4"
                                fill="#0f0f0f"
                                stroke="rgb(96, 165, 250)"
                                strokeWidth="2.5"
                                className="pointer-events-none transition-all duration-200"
                                style={{
                                  filter:
                                    hoveredPoint?.chartId === "weight-6m" &&
                                    hoveredPoint?.index === i
                                      ? "drop-shadow(0 0 8px rgba(96,165,250,0.8))"
                                      : "none",
                                  transform:
                                    hoveredPoint?.chartId === "weight-6m" &&
                                    hoveredPoint?.index === i
                                      ? "scale(1.5)"
                                      : "scale(1)",
                                  transformOrigin: `${point.x}px ${point.y}px`,
                                }}
                              />
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>

                  <div className="absolute bottom-1 left-14 right-4 flex justify-between text-[10px] text-gray-500">
                    <span>
                      {new Date(weightTrend6Months[0].date).toLocaleDateString(
                        "es-ES",
                        { day: "numeric", month: "short" }
                      )}
                    </span>
                    <span className="text-gray-600">Peso por semana</span>
                    <span>
                      {new Date(
                        weightTrend6Months[weightTrend6Months.length - 1].date
                      ).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No hay datos de peso disponibles
              </p>
            )}
          </div>

          {/* This Month Weight Trend */}
          <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-6 border border-gray-800/50 shadow-xl">
            <h3 className="text-xl font-semibold text-white mb-4">
              Tendencia de Peso (Este Mes)
            </h3>
            {weightTrendThisMonth.length > 0 ? (
              <div className="space-y-3">
                <div className="relative bg-[#0f0f0f] rounded-lg border border-gray-800/50 p-4 h-64">
                  <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 500 200"
                    preserveAspectRatio="xMidYMid meet"
                    className="overflow-visible"
                  >
                    <defs>
                      <linearGradient
                        id="weight-month-gradient"
                        x1="0%"
                        y1="0%"
                        x2="0%"
                        y2="100%"
                      >
                        <stop
                          offset="0%"
                          stopColor="rgb(96, 165, 250)"
                          stopOpacity="0.3"
                        />
                        <stop
                          offset="100%"
                          stopColor="rgb(96, 165, 250)"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>

                    {/* Grid */}
                    {[0, 1, 2, 3, 4].map((i) => (
                      <line
                        key={i}
                        x1="50"
                        y1={30 + i * 35}
                        x2="480"
                        y2={30 + i * 35}
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="1"
                      />
                    ))}

                    {(() => {
                      const data = weightTrendThisMonth;
                      const minWeight = Math.min(...data.map((r) => r.weight));
                      const maxWeight = Math.max(...data.map((r) => r.weight));
                      const range = maxWeight - minWeight || 1;
                      const paddingTop = 30;
                      const paddingBottom = 30;
                      const paddingLeft = 50;
                      const paddingRight = 20;
                      const chartHeight = 200 - paddingTop - paddingBottom;
                      const chartWidth = 500 - paddingLeft - paddingRight;

                      const points = data.map((d, i) => {
                        const x =
                          paddingLeft +
                          (i / (data.length - 1 || 1)) * chartWidth;
                        const normalizedY = (d.weight - minWeight) / range;
                        const y =
                          paddingTop + chartHeight - normalizedY * chartHeight;
                        return { x, y, ...d };
                      });

                      const pathD = points
                        .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
                        .join(" ");

                      const areaD = `${pathD} L ${paddingLeft + chartWidth} ${
                        paddingTop + chartHeight
                      } L ${paddingLeft} ${paddingTop + chartHeight} Z`;

                      return (
                        <>
                          {/* Labels Y */}
                          <text
                            x="45"
                            y={paddingTop + 5}
                            fill="rgba(255,255,255,0.4)"
                            fontSize="11"
                            textAnchor="end"
                          >
                            {maxWeight.toFixed(0)}
                          </text>
                          <text
                            x="45"
                            y={paddingTop + chartHeight / 2 + 5}
                            fill="rgba(255,255,255,0.4)"
                            fontSize="11"
                            textAnchor="end"
                          >
                            {((maxWeight + minWeight) / 2).toFixed(0)}
                          </text>
                          <text
                            x="45"
                            y={paddingTop + chartHeight + 5}
                            fill="rgba(255,255,255,0.4)"
                            fontSize="11"
                            textAnchor="end"
                          >
                            {minWeight.toFixed(0)}
                          </text>

                          <path d={areaD} fill="url(#weight-month-gradient)" />

                          <path
                            d={pathD}
                            fill="none"
                            stroke="rgb(96, 165, 250)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]"
                          />

                          {points.map((point, i) => (
                            <g key={i}>
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r="12"
                                fill="transparent"
                                className="cursor-pointer"
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget
                                    .closest("svg")!
                                    .getBoundingClientRect();
                                  const svgX = point.x / 500;
                                  const svgY = point.y / 200;
                                  setHoveredPoint({
                                    chartId: "weight-month",
                                    index: i,
                                    x: rect.left + svgX * rect.width,
                                    y: rect.top + svgY * rect.height,
                                    value: `${point.weight.toFixed(
                                      1
                                    )} ${units}`,
                                    date: `Semana ${i + 1}`,
                                  });
                                }}
                                onMouseLeave={() => setHoveredPoint(null)}
                              />
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r="4"
                                fill="#0f0f0f"
                                stroke="rgb(96, 165, 250)"
                                strokeWidth="2.5"
                                className="pointer-events-none transition-all duration-200"
                                style={{
                                  filter:
                                    hoveredPoint?.chartId === "weight-month" &&
                                    hoveredPoint?.index === i
                                      ? "drop-shadow(0 0 8px rgba(96,165,250,0.8))"
                                      : "none",
                                  transform:
                                    hoveredPoint?.chartId === "weight-month" &&
                                    hoveredPoint?.index === i
                                      ? "scale(1.5)"
                                      : "scale(1)",
                                  transformOrigin: `${point.x}px ${point.y}px`,
                                }}
                              />
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>

                  <div className="absolute bottom-1 left-14 right-4 flex justify-between text-[10px] text-gray-500">
                    <span>Semana 1</span>
                    <span className="text-gray-600">Mes actual</span>
                    <span>Semana {weightTrendThisMonth.length}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No hay datos del mes actual
              </p>
            )}
          </div>
        </div>

        {/* Body Fat Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 6 Months Fat Trend */}
          <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-6 border border-gray-800/50 shadow-xl">
            <h3 className="text-xl font-semibold text-white mb-4">
              Tendencia de % Grasa (Últimos 6 Meses)
            </h3>
            {fatTrend6Months.length > 0 ? (
              <div className="space-y-3">
                <div className="relative bg-[#0f0f0f] rounded-lg border border-gray-800/50 p-4 h-64">
                  <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 700 200"
                    preserveAspectRatio="xMidYMid meet"
                    className="overflow-visible"
                  >
                    <defs>
                      <linearGradient
                        id="fat-6m-gradient"
                        x1="0%"
                        y1="0%"
                        x2="0%"
                        y2="100%"
                      >
                        <stop
                          offset="0%"
                          stopColor="rgb(244, 114, 182)"
                          stopOpacity="0.3"
                        />
                        <stop
                          offset="100%"
                          stopColor="rgb(244, 114, 182)"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>

                    {/* Grid */}
                    {[0, 1, 2, 3, 4].map((i) => (
                      <line
                        key={i}
                        x1="50"
                        y1={30 + i * 35}
                        x2="680"
                        y2={30 + i * 35}
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="1"
                      />
                    ))}

                    {(() => {
                      const data = fatTrend6Months;
                      const minFat = Math.min(...data.map((r) => r.fatPercent));
                      const maxFat = Math.max(...data.map((r) => r.fatPercent));
                      const range = maxFat - minFat || 1;
                      const paddingTop = 30;
                      const paddingBottom = 30;
                      const paddingLeft = 50;
                      const paddingRight = 20;
                      const chartHeight = 200 - paddingTop - paddingBottom;
                      const chartWidth = 700 - paddingLeft - paddingRight;

                      const points = data.map((d, i) => {
                        const x =
                          paddingLeft +
                          (i / (data.length - 1 || 1)) * chartWidth;
                        const normalizedY = (d.fatPercent - minFat) / range;
                        const y =
                          paddingTop + chartHeight - normalizedY * chartHeight;
                        return { x, y, ...d };
                      });

                      const pathD = points
                        .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
                        .join(" ");

                      const areaD = `${pathD} L ${paddingLeft + chartWidth} ${
                        paddingTop + chartHeight
                      } L ${paddingLeft} ${paddingTop + chartHeight} Z`;

                      return (
                        <>
                          {/* Labels Y */}
                          <text
                            x="45"
                            y={paddingTop + 5}
                            fill="rgba(255,255,255,0.4)"
                            fontSize="11"
                            textAnchor="end"
                          >
                            {maxFat.toFixed(0)}%
                          </text>
                          <text
                            x="45"
                            y={paddingTop + chartHeight / 2 + 5}
                            fill="rgba(255,255,255,0.4)"
                            fontSize="11"
                            textAnchor="end"
                          >
                            {((maxFat + minFat) / 2).toFixed(0)}%
                          </text>
                          <text
                            x="45"
                            y={paddingTop + chartHeight + 5}
                            fill="rgba(255,255,255,0.4)"
                            fontSize="11"
                            textAnchor="end"
                          >
                            {minFat.toFixed(0)}%
                          </text>

                          <path d={areaD} fill="url(#fat-6m-gradient)" />

                          <path
                            d={pathD}
                            fill="none"
                            stroke="rgb(244, 114, 182)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="drop-shadow-[0_0_8px_rgba(244,114,182,0.5)]"
                          />

                          {points.map((point, i) => (
                            <g key={i}>
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r="12"
                                fill="transparent"
                                className="cursor-pointer"
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget
                                    .closest("svg")!
                                    .getBoundingClientRect();
                                  const svgX = point.x / 700;
                                  const svgY = point.y / 200;
                                  setHoveredPoint({
                                    chartId: "fat-6m",
                                    index: i,
                                    x: rect.left + svgX * rect.width,
                                    y: rect.top + svgY * rect.height,
                                    value: `${point.fatPercent.toFixed(1)}%`,
                                    date: new Date(
                                      point.date
                                    ).toLocaleDateString("es-ES", {
                                      day: "numeric",
                                      month: "short",
                                    }),
                                  });
                                }}
                                onMouseLeave={() => setHoveredPoint(null)}
                              />
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r="4"
                                fill="#0f0f0f"
                                stroke="rgb(244, 114, 182)"
                                strokeWidth="2.5"
                                className="pointer-events-none transition-all duration-200"
                                style={{
                                  filter:
                                    hoveredPoint?.chartId === "fat-6m" &&
                                    hoveredPoint?.index === i
                                      ? "drop-shadow(0 0 8px rgba(244,114,182,0.8))"
                                      : "none",
                                  transform:
                                    hoveredPoint?.chartId === "fat-6m" &&
                                    hoveredPoint?.index === i
                                      ? "scale(1.5)"
                                      : "scale(1)",
                                  transformOrigin: `${point.x}px ${point.y}px`,
                                }}
                              />
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>

                  <div className="absolute bottom-1 left-14 right-4 flex justify-between text-[10px] text-gray-500">
                    <span>
                      {new Date(fatTrend6Months[0].date).toLocaleDateString(
                        "es-ES",
                        { day: "numeric", month: "short" }
                      )}
                    </span>
                    <span className="text-gray-600">% grasa por semana</span>
                    <span>
                      {new Date(
                        fatTrend6Months[fatTrend6Months.length - 1].date
                      ).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No hay datos de grasa corporal disponibles
              </p>
            )}
          </div>

          {/* This Month Fat Trend */}
          <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-6 border border-gray-800/50 shadow-xl">
            <h3 className="text-xl font-semibold text-white mb-4">
              Tendencia de % Grasa (Este Mes)
            </h3>
            {fatTrendThisMonth.length > 0 ? (
              <div className="space-y-3">
                <div className="relative bg-[#0f0f0f] rounded-lg border border-gray-800/50 p-4 h-64">
                  <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 500 200"
                    preserveAspectRatio="xMidYMid meet"
                    className="overflow-visible"
                  >
                    <defs>
                      <linearGradient
                        id="fat-month-gradient"
                        x1="0%"
                        y1="0%"
                        x2="0%"
                        y2="100%"
                      >
                        <stop
                          offset="0%"
                          stopColor="rgb(244, 114, 182)"
                          stopOpacity="0.3"
                        />
                        <stop
                          offset="100%"
                          stopColor="rgb(244, 114, 182)"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>

                    {/* Grid */}
                    {[0, 1, 2, 3, 4].map((i) => (
                      <line
                        key={i}
                        x1="50"
                        y1={30 + i * 35}
                        x2="480"
                        y2={30 + i * 35}
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="1"
                      />
                    ))}

                    {(() => {
                      const data = fatTrendThisMonth;
                      const minFat = Math.min(...data.map((r) => r.fatPercent));
                      const maxFat = Math.max(...data.map((r) => r.fatPercent));
                      const range = maxFat - minFat || 1;
                      const paddingTop = 30;
                      const paddingBottom = 30;
                      const paddingLeft = 50;
                      const paddingRight = 20;
                      const chartHeight = 200 - paddingTop - paddingBottom;
                      const chartWidth = 500 - paddingLeft - paddingRight;

                      const points = data.map((d, i) => {
                        const x =
                          paddingLeft +
                          (i / (data.length - 1 || 1)) * chartWidth;
                        const normalizedY = (d.fatPercent - minFat) / range;
                        const y =
                          paddingTop + chartHeight - normalizedY * chartHeight;
                        return { x, y, ...d };
                      });

                      const pathD = points
                        .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
                        .join(" ");

                      const areaD = `${pathD} L ${paddingLeft + chartWidth} ${
                        paddingTop + chartHeight
                      } L ${paddingLeft} ${paddingTop + chartHeight} Z`;

                      return (
                        <>
                          {/* Labels Y */}
                          <text
                            x="45"
                            y={paddingTop + 5}
                            fill="rgba(255,255,255,0.4)"
                            fontSize="11"
                            textAnchor="end"
                          >
                            {maxFat.toFixed(0)}%
                          </text>
                          <text
                            x="45"
                            y={paddingTop + chartHeight / 2 + 5}
                            fill="rgba(255,255,255,0.4)"
                            fontSize="11"
                            textAnchor="end"
                          >
                            {((maxFat + minFat) / 2).toFixed(0)}%
                          </text>
                          <text
                            x="45"
                            y={paddingTop + chartHeight + 5}
                            fill="rgba(255,255,255,0.4)"
                            fontSize="11"
                            textAnchor="end"
                          >
                            {minFat.toFixed(0)}%
                          </text>

                          <path d={areaD} fill="url(#fat-month-gradient)" />

                          <path
                            d={pathD}
                            fill="none"
                            stroke="rgb(244, 114, 182)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="drop-shadow-[0_0_8px_rgba(244,114,182,0.5)]"
                          />

                          {points.map((point, i) => (
                            <g key={i}>
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r="12"
                                fill="transparent"
                                className="cursor-pointer"
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget
                                    .closest("svg")!
                                    .getBoundingClientRect();
                                  const svgX = point.x / 500;
                                  const svgY = point.y / 200;
                                  setHoveredPoint({
                                    chartId: "fat-month",
                                    index: i,
                                    x: rect.left + svgX * rect.width,
                                    y: rect.top + svgY * rect.height,
                                    value: `${point.fatPercent.toFixed(1)}%`,
                                    date: `Semana ${i + 1}`,
                                  });
                                }}
                                onMouseLeave={() => setHoveredPoint(null)}
                              />
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r="4"
                                fill="#0f0f0f"
                                stroke="rgb(244, 114, 182)"
                                strokeWidth="2.5"
                                className="pointer-events-none transition-all duration-200"
                                style={{
                                  filter:
                                    hoveredPoint?.chartId === "fat-month" &&
                                    hoveredPoint?.index === i
                                      ? "drop-shadow(0 0 8px rgba(244,114,182,0.8))"
                                      : "none",
                                  transform:
                                    hoveredPoint?.chartId === "fat-month" &&
                                    hoveredPoint?.index === i
                                      ? "scale(1.5)"
                                      : "scale(1)",
                                  transformOrigin: `${point.x}px ${point.y}px`,
                                }}
                              />
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>

                  <div className="absolute bottom-1 left-14 right-4 flex justify-between text-[10px] text-gray-500">
                    <span>Semana 1</span>
                    <span className="text-gray-600">Mes actual</span>
                    <span>Semana {fatTrendThisMonth.length}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No hay datos del mes actual
              </p>
            )}
          </div>
        </div>

        {/* Progress Summary */}
        {currentGoal && weightTrend6Months.length > 0 && (
          <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-6 border border-gray-800/50 shadow-xl">
            <h3 className="text-xl font-semibold text-white mb-4">
              Resumen de Progreso
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] rounded-lg border border-gray-800/50">
                <p className="text-gray-400 text-sm mb-1">Peso Actual</p>
                <p className="text-2xl font-bold text-white">
                  {weightTrend6Months[
                    weightTrend6Months.length - 1
                  ]?.weight.toFixed(1)}{" "}
                  {currentGoal.units}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Meta: {currentGoal.ideal_weight} {currentGoal.units}
                </p>
              </div>

              <div className="p-4 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] rounded-lg border border-gray-800/50">
                <p className="text-gray-400 text-sm mb-1">% Grasa Actual</p>
                <p className="text-2xl font-bold text-white">
                  {fatTrend6Months[
                    fatTrend6Months.length - 1
                  ]?.fatPercent.toFixed(1)}
                  %
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Meta: {currentGoal.ideal_fatpercent}%
                </p>
              </div>

              <div className="p-4 bg-linear-to-r from-[#0f0f0f] to-[#1a1a1a] rounded-lg border border-gray-800/50">
                <p className="text-gray-400 text-sm mb-1">Diferencia</p>
                <p className="text-2xl font-bold text-white">
                  {(
                    weightTrend6Months[weightTrend6Months.length - 1]?.weight -
                    currentGoal.ideal_weight
                  ).toFixed(1)}{" "}
                  {currentGoal.units}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {Math.abs(
                    weightTrend6Months[weightTrend6Months.length - 1]?.weight -
                      currentGoal.ideal_weight
                  ) < 2
                    ? "¡Muy cerca de tu meta!"
                    : weightTrend6Months[weightTrend6Months.length - 1]
                        ?.weight > currentGoal.ideal_weight
                    ? "Por encima de la meta"
                    : "Por debajo de la meta"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tooltip flotante para puntos hover */}
      {hoveredPoint && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: `${hoveredPoint.x}px`,
            top: `${hoveredPoint.y - 60}px`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="bg-linear-to-br from-gray-900 to-black border border-gray-700 rounded-lg px-3 py-2 shadow-2xl shadow-black/50">
            <div className="text-white font-bold text-sm">
              {hoveredPoint.value}
            </div>
            <div className="text-gray-400 text-xs">{hoveredPoint.date}</div>
            {/* Flecha */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full">
              <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-gray-700"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
