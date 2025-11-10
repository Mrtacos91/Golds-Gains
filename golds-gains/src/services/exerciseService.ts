import { createClient } from "@/lib/supabase";

export interface Exercise {
  id?: number;
  user_id?: string;
  name: string;
  muscle_group: string;
  default_series: number;
  default_reps: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExerciseFilter {
  muscle_group?: string;
  search?: string;
}

export interface ExerciseReplacement {
  id?: number;
  user_id: string;
  plan_id: number;
  original_exercise: string;
  replacement_exercise: string;
  workout_date: string; // YYYY-MM-DD
  day_of_week: string;
  notes?: string | null;
  created_at?: string;
}

class ExerciseService {
  private supabase = createClient();

  /**
   * Obtener todos los ejercicios del usuario
   */
  async getUserExercises(
    userId: string,
    filter?: ExerciseFilter
  ): Promise<Exercise[]> {
    try {
      let query = this.supabase
        .from("exercises")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      // Filtrar por grupo muscular si se proporciona
      if (filter?.muscle_group) {
        query = query.eq("muscle_group", filter.muscle_group);
      }

      // Búsqueda por nombre si se proporciona
      if (filter?.search) {
        query = query.ilike("name", `%${filter.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching exercises:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Error in getUserExercises:", error);
      return [];
    }
  }

  /**
   * Obtener un ejercicio por ID
   */
  async getExerciseById(id: number): Promise<Exercise | null> {
    try {
      const { data, error } = await this.supabase
        .from("exercises")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching exercise:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in getExerciseById:", error);
      return null;
    }
  }

  /**
   * Crear un nuevo ejercicio
   */
  async createExercise(exercise: Exercise): Promise<Exercise | null> {
    try {
      const { data, error } = await this.supabase
        .from("exercises")
        .insert({
          user_id: exercise.user_id,
          name: exercise.name,
          muscle_group: exercise.muscle_group,
          default_series: exercise.default_series,
          default_reps: exercise.default_reps,
          notes: exercise.notes || null,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating exercise:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in createExercise:", error);
      return null;
    }
  }

  /**
   * Actualizar un ejercicio existente
   */
  async updateExercise(
    id: number,
    updates: Partial<Exercise>
  ): Promise<Exercise | null> {
    try {
      const { data, error } = await this.supabase
        .from("exercises")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating exercise:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in updateExercise:", error);
      return null;
    }
  }

  /**
   * Eliminar un ejercicio
   */
  async deleteExercise(id: number): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from("exercises")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting exercise:", error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Error in deleteExercise:", error);
      return false;
    }
  }

  /**
   * Obtener ejercicios agrupados por grupo muscular
   */
  async getExercisesByMuscleGroup(
    userId: string
  ): Promise<{ [key: string]: Exercise[] }> {
    try {
      const exercises = await this.getUserExercises(userId);

      const grouped: { [key: string]: Exercise[] } = {};

      exercises.forEach((exercise) => {
        if (!grouped[exercise.muscle_group]) {
          grouped[exercise.muscle_group] = [];
        }
        grouped[exercise.muscle_group].push(exercise);
      });

      return grouped;
    } catch (error) {
      console.error("Error in getExercisesByMuscleGroup:", error);
      return {};
    }
  }

  /**
   * Obtener conteo de ejercicios por grupo muscular
   */
  async getExerciseCount(userId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from("exercises")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (error) {
        console.error("Error counting exercises:", error);
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error("Error in getExerciseCount:", error);
      return 0;
    }
  }

  /**
   * Importar ejercicios desde un plan existente
   */
  async importExercisesFromPlan(
    userId: string,
    planExercises: string[]
  ): Promise<number> {
    try {
      // Obtener ejercicios existentes para evitar duplicados
      const existingExercises = await this.getUserExercises(userId);
      const existingNames = new Set(
        existingExercises.map((e) => e.name.toLowerCase())
      );

      // Filtrar ejercicios únicos
      const uniqueExercises = planExercises.filter(
        (name) => !existingNames.has(name.toLowerCase())
      );

      if (uniqueExercises.length === 0) {
        return 0;
      }

      // Crear ejercicios con valores por defecto
      const exercisesToInsert = uniqueExercises.map((name) => ({
        user_id: userId,
        name: name,
        muscle_group: this.inferMuscleGroup(name),
        default_series: 3,
        default_reps: 10,
        notes: "Importado desde plan de entrenamiento",
      }));

      const { data, error } = await this.supabase
        .from("exercises")
        .insert(exercisesToInsert)
        .select();

      if (error) {
        console.error("Error importing exercises:", error);
        throw error;
      }

      return data?.length || 0;
    } catch (error) {
      console.error("Error in importExercisesFromPlan:", error);
      return 0;
    }
  }

  /**
   * Registrar o actualizar un reemplazo de ejercicio para una fecha
   */
  async registerReplacement(
    replacement: ExerciseReplacement
  ): Promise<ExerciseReplacement | null> {
    try {
      // Verificar si ya existe un reemplazo para ese usuario/plan/ejercicio/fecha
      const { data: existing, error: selectError } = await this.supabase
        .from("exercise_replacements")
        .select("*")
        .eq("user_id", replacement.user_id)
        .eq("plan_id", replacement.plan_id)
        .eq("original_exercise", replacement.original_exercise)
        .eq("workout_date", replacement.workout_date)
        .limit(1)
        .single();

      if (selectError && selectError.code !== "PGRST116") {
        // PGRST116 is "No rows found" in some Supabase setups; ignore if no rows
        console.error("Error checking existing replacement:", selectError);
      }

      if (existing) {
        const { data, error } = await this.supabase
          .from("exercise_replacements")
          .update({
            replacement_exercise: replacement.replacement_exercise,
            day_of_week: replacement.day_of_week,
            notes: replacement.notes || null,
            created_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) {
          console.error("Error updating replacement:", error);
          throw error;
        }

        return data as ExerciseReplacement;
      }

      // Si no existe, insertar
      const { data, error } = await this.supabase
        .from("exercise_replacements")
        .insert({
          user_id: replacement.user_id,
          plan_id: replacement.plan_id,
          original_exercise: replacement.original_exercise,
          replacement_exercise: replacement.replacement_exercise,
          workout_date: replacement.workout_date,
          day_of_week: replacement.day_of_week,
          notes: replacement.notes || null,
        })
        .select()
        .single();

      if (error) {
        console.error("Error inserting replacement:", error);
        throw error;
      }

      return data as ExerciseReplacement;
    } catch (error) {
      console.error("Error in registerReplacement:", error);
      return null;
    }
  }

  /**
   * Inferir grupo muscular basado en el nombre del ejercicio
   */
  private inferMuscleGroup(exerciseName: string): string {
    const name = exerciseName.toLowerCase();

    if (
      name.includes("press banca") ||
      name.includes("pecho") ||
      name.includes("apertura") ||
      name.includes("flexiones") ||
      name.includes("fondos")
    ) {
      return "pecho";
    }

    if (
      name.includes("dominadas") ||
      name.includes("remo") ||
      name.includes("peso muerto") ||
      name.includes("espalda") ||
      name.includes("jalón")
    ) {
      return "espalda";
    }

    if (
      name.includes("sentadilla") ||
      name.includes("piernas") ||
      name.includes("prensa") ||
      name.includes("zancada") ||
      name.includes("femoral") ||
      name.includes("cuádriceps") ||
      name.includes("gemelos")
    ) {
      return "piernas";
    }

    if (
      name.includes("press militar") ||
      name.includes("elevaciones laterales") ||
      name.includes("hombros") ||
      name.includes("pájaros")
    ) {
      return "hombros";
    }

    if (name.includes("curl") || name.includes("bíceps")) {
      return "biceps";
    }

    if (
      name.includes("tríceps") ||
      name.includes("press francés") ||
      name.includes("extensiones")
    ) {
      return "triceps";
    }

    if (
      name.includes("plancha") ||
      name.includes("crunch") ||
      name.includes("abdomen") ||
      name.includes("abdominal")
    ) {
      return "abdomen";
    }

    return "otro";
  }
}

export const exerciseService = new ExerciseService();
