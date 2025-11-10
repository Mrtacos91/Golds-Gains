# Sistema de Reemplazo de Ejercicios - Gold's Gains

## 📋 Resumen
Esta funcionalidad permite a los usuarios registrar cuando realizaron un ejercicio diferente al programado en su plan para una fecha específica. Es ideal para casos donde por lesión, falta de equipo, o preferencia personal, se realiza un ejercicio sustituto.

## 🗄️ Paso 1: Crear la tabla en Supabase

Ejecuta este SQL en el SQL Editor de Supabase:

```sql
-- Tabla para registrar reemplazos de ejercicios por fecha
create table public.exercise_replacements (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  plan_id bigint references public.plan(id) on delete cascade not null,
  original_exercise text not null,
  replacement_exercise text not null,
  workout_date date not null,
  day_of_week text not null, -- 'Lun', 'Mar', etc.
  notes text,
  created_at timestamp with time zone default now()
);

-- Índice para consultas rápidas
create index exercise_replacements_user_date_idx on public.exercise_replacements(user_id, workout_date);
create index exercise_replacements_plan_idx on public.exercise_replacements(plan_id);

-- RLS
alter table public.exercise_replacements enable row level security;

create policy "Users can view their own replacements"
  on public.exercise_replacements for select
  using (auth.uid() = user_id);

create policy "Users can insert their own replacements"
  on public.exercise_replacements for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own replacements"
  on public.exercise_replacements for update
  using (auth.uid() = user_id);

create policy "Users can delete their own replacements"
  on public.exercise_replacements for delete
  using (auth.uid() = user_id);
```

## 📁 Archivos creados/modificados

```
src/
├── services/
│   └── exerciseService.ts                    # ✅ ACTUALIZADO - Métodos de reemplazo
├── app/
│   └── components/
│       └── ExerciseReplacementModal.tsx      # ✅ NUEVO - Modal de reemplazo
```

## 🔧 Funcionalidades del servicio

### Métodos añadidos a `exerciseService.ts`:

#### 1. `registerReplacement(replacement: ExerciseReplacement)`
- Registra un nuevo reemplazo o actualiza uno existente
- Si ya existe un reemplazo para ese ejercicio en esa fecha, lo actualiza
- Si no existe, crea uno nuevo

#### 2. `getReplacementsForDate(userId, planId, workoutDate)`
- Obtiene todos los reemplazos para una fecha específica
- Útil para mostrar qué ejercicios fueron reemplazados ese día

#### 3. `getPlanReplacements(userId, planId)`
- Obtiene todos los reemplazos de un plan
- Ordenados por fecha (más reciente primero)

#### 4. `deleteReplacement(replacementId)`
- Elimina un reemplazo específico
- Útil si el usuario se equivocó o quiere usar el ejercicio original

#### 5. `getEffectiveExercise(userId, planId, originalExercise, workoutDate)`
- **MUY IMPORTANTE**: Devuelve el ejercicio que realmente se hizo
- Si hay reemplazo para esa fecha → devuelve el reemplazo
- Si no hay reemplazo → devuelve el ejercicio original
- Úsalo cuando registres progreso o muestres historial

#### 6. `getReplacementHistory(userId, planId, originalExercise)`
- Obtiene el historial de reemplazos de un ejercicio específico
- Útil para ver patrones (ej: "siempre reemplazo press banca con peck deck")

## 🎨 Componente Modal

### `ExerciseReplacementModal.tsx`

**Props**:
```typescript
{
  isOpen: boolean;              // Controla visibilidad
  onClose: () => void;          // Callback al cerrar
  userId: string;               // ID del usuario
  planId: number;               // ID del plan activo
  originalExercise: string;     // Ejercicio programado
  workoutDate: string;          // Fecha (YYYY-MM-DD)
  dayOfWeek: string;            // Día ('Lun', 'Mar', etc.)
  onSuccess?: () => void;       // Callback al guardar exitosamente
}
```

**Funcionalidades**:
- ✅ Muestra el ejercicio original
- ✅ Dos modos de selección:
  - **Mis Ejercicios**: Lista de ejercicios guardados del usuario
  - **Escribir Manualmente**: Input libre
- ✅ Campo de notas opcional
- ✅ Validación de campos
- ✅ Actualiza si ya existe un reemplazo para esa fecha
- ✅ Diseño responsive y accesible

## 📊 Casos de uso

### Caso 1: Registrar progreso con reemplazo

```typescript
// En la página de progreso/workout
import ExerciseReplacementModal from "@/app/components/ExerciseReplacementModal";
import { exerciseService } from "@/services/exerciseService";

// Estado del modal
const [showReplacementModal, setShowReplacementModal] = useState(false);
const [selectedExercise, setSelectedExercise] = useState<{
  name: string;
  date: string;
  dayOfWeek: string;
} | null>(null);

// Al registrar progreso, verificar si hay reemplazo
const workoutDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

// Obtener ejercicio efectivo (original o reemplazo)
const effectiveExercise = await exerciseService.getEffectiveExercise(
  userId,
  planId,
  originalExerciseName,
  workoutDate
);

// Usar effectiveExercise para guardar el progreso
// ...

// Botón para abrir modal de reemplazo
<button onClick={() => {
  setSelectedExercise({
    name: originalExerciseName,
    date: workoutDate,
    dayOfWeek: 'Lun'
  });
  setShowReplacementModal(true);
}}>
  Reemplazar Ejercicio
</button>

// Modal
<ExerciseReplacementModal
  isOpen={showReplacementModal}
  onClose={() => setShowReplacementModal(false)}
  userId={userId}
  planId={planId}
  originalExercise={selectedExercise?.name || ''}
  workoutDate={selectedExercise?.date || ''}
  dayOfWeek={selectedExercise?.dayOfWeek || ''}
  onSuccess={() => {
    // Refrescar datos si es necesario
    console.log('Reemplazo guardado');
  }}
/>
```

### Caso 2: Mostrar historial de reemplazos

```typescript
// En una vista de historial
const replacements = await exerciseService.getPlanReplacements(
  userId,
  planId
);

// Agrupar por ejercicio original
const groupedReplacements = replacements.reduce((acc, rep) => {
  if (!acc[rep.original_exercise]) {
    acc[rep.original_exercise] = [];
  }
  acc[rep.original_exercise].push(rep);
  return acc;
}, {} as Record<string, ExerciseReplacement[]>);

// Mostrar
{Object.entries(groupedReplacements).map(([original, reps]) => (
  <div key={original}>
    <h3>{original}</h3>
    <ul>
      {reps.map(rep => (
        <li key={rep.id}>
          {rep.workout_date}: {rep.replacement_exercise}
          {rep.notes && ` - ${rep.notes}`}
        </li>
      ))}
    </ul>
  </div>
))}
```

### Caso 3: Vista del día de entrenamiento

```typescript
// Mostrar qué ejercicios están programados vs qué se hizo realmente
const todayDate = new Date().toISOString().split('T')[0];
const replacements = await exerciseService.getReplacementsForDate(
  userId,
  planId,
  todayDate
);

// Crear mapa de reemplazos
const replacementMap = new Map(
  replacements.map(r => [r.original_exercise, r.replacement_exercise])
);

// Para cada ejercicio del plan
planExercises.forEach(exercise => {
  const effectiveExercise = replacementMap.get(exercise.name) || exercise.name;
  const wasReplaced = replacementMap.has(exercise.name);
  
  // Mostrar con indicador visual si fue reemplazado
  console.log({
    scheduled: exercise.name,
    performed: effectiveExercise,
    wasReplaced
  });
});
```

## 🎯 Integración recomendada

### Dónde usar esta funcionalidad:

1. **Página de Progreso** (`/progress`)
   - Botón "Reemplazar ejercicio" junto a cada ejercicio
   - Al registrar peso/reps, verificar si hay reemplazo primero

2. **Página de Workout del día**
   - Mostrar ejercicios programados
   - Permitir reemplazar antes de iniciar
   - Indicador visual de ejercicios reemplazados

3. **Historial/Insights**
   - Mostrar qué ejercicios fueron reemplazados y cuándo
   - Estadísticas: "Press banca reemplazado 3 veces en el último mes"

4. **Vista de plan** (`/plan`)
   - Opcional: Ver historial de reemplazos por ejercicio
   - Botón para ver patrones de reemplazo

## 🔐 Seguridad

- ✅ RLS habilitado
- ✅ Usuarios solo ven/modifican sus reemplazos
- ✅ Cascada de eliminación (si se borra usuario o plan)
- ✅ Validación en frontend y backend

## 📱 Diseño UI/UX

### Modal de reemplazo:
- Fondo oscuro con blur
- Muestra ejercicio original destacado
- Dos modos de selección claramente diferenciados
- Botones de acción visibles
- Mensaje informativo azul al final
- Responsive (móvil y desktop)

### Colores:
- Naranja (orange-400): Acciones principales
- Azul (blue-400): Información
- Gris: Fondos y bordes
- Blanco: Texto principal

## 🔮 Mejoras futuras (opcional)

- [ ] Sugerencias inteligentes de reemplazo basadas en grupo muscular
- [ ] Historial visual (gráfica de reemplazos por mes)
- [ ] Exportar/compartir lista de reemplazos comunes
- [ ] Plantillas de reemplazo ("Si no hay banco, usar piso")
- [ ] Integración con IA para sugerir ejercicios equivalentes
- [ ] Notificación si un ejercicio se reemplaza frecuentemente
- [ ] Estadísticas: % de adherencia al plan original

## 🐛 Troubleshooting

**Modal no se abre:**
- Verifica que `isOpen={true}`
- Revisa la consola por errores

**No se pueden cargar "Mis Ejercicios":**
- Asegúrate de que la tabla `exercises` existe
- Verifica que el usuario tiene ejercicios guardados
- Usa el modo "Escribir Manualmente" como alternativa

**Error al guardar:**
- Verifica que la tabla `exercise_replacements` existe
- Revisa las políticas RLS
- Confirma que plan_id es válido

**El reemplazo no se refleja en el progreso:**
- Asegúrate de usar `getEffectiveExercise()` al registrar progreso
- Verifica que la fecha coincida exactamente (formato YYYY-MM-DD)

## 📝 Ejemplo completo de integración

```typescript
// En tu página de workout/progress
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { exerciseService } from "@/services/exerciseService";
import ExerciseReplacementModal from "@/app/components/ExerciseReplacementModal";

export default function WorkoutPage() {
  const supabase = createClient();
  const [plan, setPlan] = useState(null);
  const [userId, setUserId] = useState("");
  const [showReplacementModal, setShowReplacementModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  
  const today = new Date().toISOString().split('T')[0];
  const dayOfWeek = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'][new Date().getDay()];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    setUserId(user.id);
    
    // Cargar plan
    const { data: planData } = await supabase
      .from('plan')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    setPlan(planData);
    
    // Cargar reemplazos del día
    if (planData) {
      const replacements = await exerciseService.getReplacementsForDate(
        user.id,
        planData.id,
        today
      );
      console.log('Reemplazos de hoy:', replacements);
    }
  };

  const handleReplaceExercise = (exercise) => {
    setSelectedExercise({
      name: exercise.name,
      date: today,
      dayOfWeek: dayOfWeek
    });
    setShowReplacementModal(true);
  };

  return (
    <div>
      <h1>Entrenamiento de Hoy</h1>
      
      {plan?.exercises.map((exercise, index) => (
        <div key={index}>
          <h3>{exercise}</h3>
          <button onClick={() => handleReplaceExercise({ name: exercise })}>
            🔄 Reemplazar
          </button>
          {/* Resto de la UI del ejercicio */}
        </div>
      ))}

      <ExerciseReplacementModal
        isOpen={showReplacementModal}
        onClose={() => setShowReplacementModal(false)}
        userId={userId}
        planId={plan?.id || 0}
        originalExercise={selectedExercise?.name || ''}
        workoutDate={selectedExercise?.date || ''}
        dayOfWeek={selectedExercise?.dayOfWeek || ''}
        onSuccess={() => {
          loadData(); // Recargar para ver el reemplazo
        }}
      />
    </div>
  );
}
```

## ✅ Checklist de implementación

- [ ] Ejecutar SQL en Supabase
- [ ] Verificar que `exerciseService.ts` tiene los nuevos métodos
- [ ] Probar el modal `ExerciseReplacementModal.tsx`
- [ ] Integrar en página de progreso/workout
- [ ] Usar `getEffectiveExercise()` al registrar progreso
- [ ] Probar casos edge:
  - [ ] Reemplazar el mismo ejercicio dos veces en la misma fecha
  - [ ] Reemplazar sin tener ejercicios guardados
  - [ ] Escribir manualmente
  - [ ] Agregar notas
- [ ] Verificar que los reemplazos no modifican el plan original
- [ ] Documentar para el equipo

## 💡 Tips de UX

1. **Indicador visual**: Muestra un badge o color diferente para ejercicios reemplazados
2. **Confirmación**: Considera agregar confirmación antes de reemplazar
3. **Undo**: Permite deshacer reemplazos recientes fácilmente
4. **Historial rápido**: Botón "Ver reemplazos anteriores" en el modal
5. **Sugerencias**: Si un ejercicio se reemplaza frecuentemente, sugerir cambiarlo en el plan

---

**Fecha de creación**: ${new Date().toLocaleDateString('es-ES')}
**Versión**: 1.0
