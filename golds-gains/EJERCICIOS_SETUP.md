# Setup de "Mis Ejercicios" - Gold's Gains

## 📋 Resumen

Este documento explica cómo configurar la funcionalidad de "Mis Ejercicios" que permite a los usuarios guardar y gestionar sus ejercicios personalizados.

## 🗄️ Paso 1: Crear la tabla en Supabase

Ve al SQL Editor en tu dashboard de Supabase y ejecuta el siguiente script:

```sql
-- Tabla para almacenar ejercicios personalizados del usuario
create table public.exercises (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  muscle_group text not null, -- 'pecho', 'espalda', 'piernas', etc.
  default_series integer default 3,
  default_reps integer default 10,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Índice para consultas rápidas por usuario
create index exercises_user_id_idx on public.exercises(user_id);

-- Índice para búsquedas por grupo muscular
create index exercises_muscle_group_idx on public.exercises(muscle_group);

-- RLS (Row Level Security)
alter table public.exercises enable row level security;

-- Política: Los usuarios solo pueden ver sus propios ejercicios
create policy "Users can view their own exercises"
  on public.exercises for select
  using (auth.uid() = user_id);

-- Política: Los usuarios solo pueden insertar sus propios ejercicios
create policy "Users can insert their own exercises"
  on public.exercises for insert
  with check (auth.uid() = user_id);

-- Política: Los usuarios solo pueden actualizar sus propios ejercicios
create policy "Users can update their own exercises"
  on public.exercises for update
  using (auth.uid() = user_id);

-- Política: Los usuarios solo pueden eliminar sus propios ejercicios
create policy "Users can delete their own exercises"
  on public.exercises for delete
  using (auth.uid() = user_id);
```

## 📁 Estructura del proyecto

```
src/
├── services/
│   └── exerciseService.ts      # Servicio para gestionar ejercicios (NUEVO)
├── app/
│   └── plan/
│       └── page.tsx            # Página actualizada con "Mis Ejercicios"
└── lib/
    └── supabase.ts             # Cliente de Supabase (existente)
```

## 🔧 Funcionalidades implementadas

### 1. **Servicio de Ejercicios** (`src/services/exerciseService.ts`)

Clase singleton que maneja todas las operaciones CRUD:

- ✅ `getUserExercises()` - Obtener ejercicios del usuario con filtros opcionales
- ✅ `getExerciseById()` - Obtener un ejercicio específico
- ✅ `createExercise()` - Crear nuevo ejercicio
- ✅ `updateExercise()` - Actualizar ejercicio existente
- ✅ `deleteExercise()` - Eliminar ejercicio
- ✅ `getExercisesByMuscleGroup()` - Agrupar ejercicios por músculo
- ✅ `getExerciseCount()` - Contar total de ejercicios
- ✅ `importExercisesFromPlan()` - Importar ejercicios desde el plan activo
- ✅ `inferMuscleGroup()` - Detectar grupo muscular automáticamente

### 2. **UI en la página de Plan**

**Botón "Mis Ejercicios"**: Acceso rápido desde la vista del plan

**Funcionalidades de la sección**:

- 📝 Crear ejercicios personalizados
- ✏️ Editar ejercicios existentes
- 🗑️ Eliminar ejercicios
- 🔍 Buscar por nombre
- 🎯 Filtrar por grupo muscular
- 📥 Importar ejercicios desde el plan actual
- 📊 Visualización organizada con tarjetas

**Campos del formulario**:

- Nombre del ejercicio
- Grupo muscular (pecho, espalda, piernas, hombros, bíceps, tríceps, abdomen, otro)
- Series por defecto
- Repeticiones por defecto
- Notas (opcional)

## 🎨 Diseño

Siguiendo el estilo de la aplicación:

- Colores: Púrpura para "Mis Ejercicios" (diferenciándolo de naranja/azul/verde)
- Fondo oscuro con gradientes
- Bordes sutiles con opacidad
- Hover states y transiciones suaves
- Responsive design (mobile-first)

## 🔐 Seguridad

- ✅ **RLS habilitado**: Los usuarios solo acceden a sus propios ejercicios
- ✅ **Políticas de seguridad**: CRUD protegido por `auth.uid()`
- ✅ **Cascada de eliminación**: Si se elimina un usuario, se eliminan sus ejercicios
- ✅ **Validación en frontend**: Campos requeridos verificados antes de enviar

## 📊 Relación con otras tablas

```
users (auth.users)
  ↓ (user_id)
exercises
  ↑ (puede importar desde)
plan
```

**Nota**: Los ejercicios son independientes del plan. Un usuario puede:

1. Crear ejercicios manualmente
2. Importar ejercicios desde su plan activo
3. Usar ejercicios guardados en futuros planes

## 🚀 Uso

### Crear un ejercicio manualmente:

1. Ir a `/plan`
2. Click en "Mis Ejercicios"
3. Click en "+ Agregar Nuevo Ejercicio"
4. Completar el formulario
5. Click en "Crear Ejercicio"

### Importar desde el plan:

1. Tener un plan activo creado
2. Ir a "Mis Ejercicios"
3. Click en "Importar del Plan"
4. Los ejercicios únicos se agregarán automáticamente

### Editar un ejercicio:

1. Click en el ícono de edición (✏️) en la tarjeta del ejercicio
2. Modificar los campos
3. Click en "Guardar Cambios"

### Eliminar un ejercicio:

1. Click en el ícono de eliminación (🗑️)
2. Confirmar la acción

## 🔮 Mejoras futuras (opcional)

- [ ] Agregar imágenes/GIFs de técnica
- [ ] Categorías personalizadas
- [ ] Compartir ejercicios con otros usuarios
- [ ] Historial de pesos usados por ejercicio
- [ ] Variaciones de ejercicios (inclinado, declinado, etc.)
- [ ] Integración con YouTube/videos de técnica
- [ ] Exportar/importar biblioteca de ejercicios

## 🐛 Troubleshooting

**Error: "Cannot find module '@/services/exerciseService'"**

- Verifica que el archivo `src/services/exerciseService.ts` existe
- Revisa la configuración de paths en `tsconfig.json`

**Error: "relation 'public.exercises' does not exist"**

- Ejecuta el script SQL en Supabase
- Verifica que estás conectado a la base de datos correcta

**Los ejercicios no se cargan:**

- Verifica que el usuario esté autenticado
- Revisa las políticas RLS en Supabase
- Revisa la consola del navegador para errores

**No se pueden crear ejercicios:**

- Verifica que RLS está habilitado
- Confirma que las políticas de INSERT están activas
- Verifica que `user_id` corresponde al usuario autenticado

## 📝 Notas adicionales

- Los ejercicios se ordenan por fecha de creación (más recientes primero)
- El sistema detecta automáticamente el grupo muscular basándose en palabras clave
- Los duplicados se previenen al importar desde el plan
- La búsqueda es case-insensitive
- Los filtros se pueden combinar (búsqueda + grupo muscular)
