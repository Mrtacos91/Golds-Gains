# Reemplazar Ejercicios en Progreso - Gold's Gains

## 📋 Resumen

Funcionalidad que permite a los usuarios reemplazar ejercicios de su rutina mientras registran su progreso diario. Útil cuando un ejercicio no está disponible o se quiere hacer una variación diferente.

## 🎯 Caso de Uso

**Escenario típico:**

- Tu plan dice "Press banca plano"
- Ese día el banco está ocupado o quieres hacer otra variación
- Reemplazas por "Peck Deck" o "Press con mancuernas"
- El registro guarda el ejercicio que realmente hiciste

## 🚀 Funcionalidades

### 1. **Botón de Reemplazo**

- Aparece al lado del botón de completar en cada ejercicio
- Solo visible cuando estás registrando el día actual (no en días pasados)
- Ícono de flechas intercambiadas para identificación visual

### 2. **Dos Modalidades de Reemplazo**

#### A) **Ejercicio Personalizado**

- Escribe manualmente el nombre del ejercicio
- Útil para ejercicios no guardados o variaciones específicas
- Ejemplo: "Press banca con agarre cerrado", "Sentadilla búlgara", etc.

#### B) **Mis Ejercicios Guardados**

- Selecciona de tu biblioteca de ejercicios guardados
- Muestra: nombre, grupo muscular, series y reps predeterminadas
- Al seleccionar, ajusta automáticamente las series/reps según el ejercicio guardado

## 🔧 Lógica Implementada

### Flujo de Usuario

```
1. Usuario hace click en botón "Reemplazar" (ícono de flechas)
   ↓
2. Modal aparece con dos opciones:
   - "Ejercicio Personalizado" (azul)
   - "Mis Ejercicios Guardados" (púrpura)
   ↓
3a. Si elige "Personalizado":
    - Escribe nombre del ejercicio
    - Click en "Reemplazar"
    - Ejercicio se actualiza manteniendo series/reps originales

3b. Si elige "Guardados":
    - Carga lista de ejercicios desde la tabla `exercises`
    - Muestra ejercicios con grupo muscular y configuración
    - Click en ejercicio deseado
    - Ajusta series/reps según configuración del ejercicio guardado
   ↓
4. Modal se cierra, ejercicio reemplazado
5. Usuario registra progreso normalmente
```

### Manejo de Series

**Ejercicio Personalizado:**

- Mantiene la misma cantidad de series del ejercicio original
- Mantiene las reps planeadas del ejercicio original
- Usuario ajusta manualmente si necesita

**Ejercicio Guardado:**

- Ajusta automáticamente según `default_series` del ejercicio guardado
- Ajusta automáticamente según `default_reps` del ejercicio guardado
- Si el guardado tiene MÁS series: agrega series vacías
- Si el guardado tiene MENOS series: remueve series sobrantes

**Ejemplo:**

```javascript
// Ejercicio original: Press banca - 4 series × 10 reps
// Ejercicio guardado: Peck Deck - 3 series × 12 reps

// Resultado después del reemplazo:
{
  name: "Peck Deck",
  plannedSeries: 3,  // Ajustado
  plannedReps: 12,   // Ajustado
  seriesData: [
    { reps: 0, weight: "", rir: 0, completedAt: null },
    { reps: 0, weight: "", rir: 0, completedAt: null },
    { reps: 0, weight: "", rir: 0, completedAt: null }
  ]
}
```

## 🎨 UI/UX

### Modal de Reemplazo

**Header:**

- Ícono de flechas intercambiadas (azul)
- Título: "Reemplazar Ejercicio"
- Muestra ejercicio actual
- Botón X para cerrar

**Pantalla de Selección:**

- Dos cards grandes con hover effects
- Card Azul: Ejercicio Personalizado
- Card Púrpura: Mis Ejercicios Guardados
- Cada card muestra ícono descriptivo y explicación

**Formulario Personalizado:**

- Input de texto con autofocus
- Placeholder: "Ej: Peck Deck, Leg Extension, etc."
- Botones: Cancelar (gris) y Reemplazar (azul)
- Botón "Volver" arriba

**Lista de Guardados:**

- Scroll vertical si hay muchos ejercicios
- Cada ejercicio en card horizontal
- Muestra: nombre, badge de grupo muscular, series × reps
- Hover effect con color púrpura
- Loading spinner mientras carga
- Mensaje si no hay ejercicios guardados

### Estados Visuales

```css
/* Botón Reemplazar (solo día actual) */
- Normal: bg-blue-400/10 border-blue-400/30
- Hover: bg-blue-400/20

/* Modal */
- Backdrop: bg-black/80 backdrop-blur-sm
- Animaciones: fadeIn + slideUp

/* Cards de Selección */
- Normal: border-gray-800/50
- Hover: border-blue-400/50 (personalizado)
- Hover: border-purple-400/50 (guardados)
```

## 🔒 Restricciones y Validaciones

### 1. **Solo Días Actuales**

```typescript
{
  isToday && (
    <button onClick={() => handleOpenReplaceModal(exerciseIndex)}>
      // Botón de reemplazo
    </button>
  );
}
```

- Botón no aparece en días pasados
- Previene modificaciones de registros históricos

### 2. **Validación de Nombre Personalizado**

```typescript
disabled={!customExerciseName.trim()}
```

- Botón deshabilitado si el campo está vacío
- Requiere al menos un carácter

### 3. **Estado del Ejercicio**

- Al reemplazar, el estado se resetea a "pendiente"
- Usuario debe completar el nuevo ejercicio

## 💾 Persistencia de Datos

### En la Base de Datos

Cuando se guarda el workout, el ejercicio reemplazado se almacena como:

```typescript
// Tabla: workout
{
  exercises: ["Peck Deck", "Remo con barra", ...],  // Nombre reemplazado
  series: [1, 2, 3, 1, 2, ...],
  reps: [12, 12, 12, 10, 10, ...],
  // ... resto de campos
}
```

### Consideraciones

1. **No se guarda referencia al ejercicio original**

   - El reemplazo es definitivo para ese registro
   - El plan original NO se modifica
   - Solo afecta al workout del día específico

2. **Múltiples reemplazos en un día**

   - Usuario puede reemplazar varios ejercicios
   - Cada uno se guarda con su nuevo nombre
   - No hay límite de reemplazos

3. **Recargar datos después del reemplazo**
   - Si ya existe un workout guardado para ese día
   - Y se recarga la página
   - Se muestra el ejercicio reemplazado (no el original)

## 🧪 Flujos de Prueba

### Test 1: Reemplazo con Ejercicio Personalizado

1. Ir a `/progress`
2. Seleccionar día actual
3. Click en botón "Reemplazar" de un ejercicio
4. Seleccionar "Ejercicio Personalizado"
5. Escribir "Peck Deck"
6. Click "Reemplazar"
7. ✅ Verificar: Nombre cambia a "Peck Deck", series/reps igual

### Test 2: Reemplazo con Ejercicio Guardado

1. Tener al menos 1 ejercicio en "Mis Ejercicios" (3 series × 12 reps)
2. Ir a `/progress`
3. Seleccionar día actual
4. Click en botón "Reemplazar" de ejercicio con 4 series
5. Seleccionar "Mis Ejercicios Guardados"
6. Esperar carga
7. Click en ejercicio guardado
8. ✅ Verificar: Nombre cambia, series ajustadas a 3, reps a 12

### Test 3: Sin Ejercicios Guardados

1. Asegurar que no hay ejercicios en tabla `exercises`
2. Ir a `/progress`, click "Reemplazar"
3. Seleccionar "Mis Ejercicios Guardados"
4. ✅ Verificar: Mensaje "No tienes ejercicios guardados"

### Test 4: Botón No Visible en Días Pasados

1. Ir a `/progress`
2. Seleccionar fecha anterior a hoy
3. ✅ Verificar: Botón de reemplazo NO aparece

### Test 5: Persistencia Después de Guardar

1. Reemplazar un ejercicio
2. Completar el workout y guardar
3. Recargar la página
4. ✅ Verificar: Ejercicio reemplazado se mantiene

## 📱 Responsive Design

### Mobile (< 640px)

- Modal ocupa 100% con padding reducido
- Cards de selección en columna única
- Texto reducido en badges
- Scroll vertical en lista de ejercicios
- Botones con tamaño touch-friendly (min 44px)

### Tablet (640px - 1024px)

- Modal max-width: 2xl
- Cards con padding normal
- Todo visible sin scroll horizontal

### Desktop (> 1024px)

- Modal centrado con max-height: 90vh
- Hover effects completos
- Animaciones suaves

## 🎯 Mejoras Futuras (Opcional)

- [ ] Historial de reemplazos por ejercicio
- [ ] Sugerencias inteligentes basadas en grupo muscular
- [ ] Búsqueda/filtrado en lista de ejercicios guardados
- [ ] Opción de "reemplazar siempre" para crear preferencias
- [ ] Mostrar cuántas veces se ha usado cada reemplazo
- [ ] Integración con API de ejercicios (base de datos externa)
- [ ] Imágenes/GIFs en ejercicios guardados para ayudar a seleccionar

## 🐛 Troubleshooting

**Problema: "Cannot find name 'exerciseService'"**

```bash
# Solución: Verificar import
import { exerciseService } from "@/services/exerciseService";
```

**Problema: Lista de ejercicios guardados vacía**

- Verificar que tabla `exercises` existe
- Confirmar que hay ejercicios para el usuario actual
- Revisar RLS policies en Supabase

**Problema: Botón no aparece**

- Verificar que `isToday` es true
- Confirmar que es el día actual del dispositivo
- Revisar que no es un día pasado

**Problema: Series no se ajustan correctamente**

- Verificar `default_series` en ejercicio guardado
- Confirmar que no hay errores en console
- Revisar lógica de slice/push en handleReplaceWithSaved

## 📝 Notas Técnicas

### Estados Reactivos

```typescript
const [showReplaceModal, setShowReplaceModal] = useState(false);
const [replaceExerciseIndex, setReplaceExerciseIndex] = useState<number | null>(
  null
);
const [replaceMode, setReplaceMode] = useState<"custom" | "saved" | null>(null);
const [customExerciseName, setCustomExerciseName] = useState("");
const [savedExercises, setSavedExercises] = useState<any[]>([]);
const [loadingSavedExercises, setLoadingSavedExercises] = useState(false);
```

### Funciones Clave

- `handleOpenReplaceModal()` - Abre modal y carga ejercicios guardados
- `handleReplaceWithCustom()` - Reemplazo con nombre personalizado
- `handleReplaceWithSaved()` - Reemplazo con ejercicio guardado + ajuste de series
- `handleCancelReplace()` - Cierra modal y limpia estados

### Dependencias

- `@/services/exerciseService` - CRUD de ejercicios guardados
- Supabase client - Autenticación del usuario
- React state hooks - Manejo de estados locales

## ✅ Checklist de Implementación

- [x] Agregar estados de reemplazo
- [x] Import de exerciseService
- [x] Botón de reemplazo en header de ejercicio
- [x] Modal con diseño responsive
- [x] Pantalla de selección de modo
- [x] Formulario de ejercicio personalizado
- [x] Lista de ejercicios guardados
- [x] Lógica de reemplazo con ajuste de series
- [x] Validaciones y restricciones
- [x] Animaciones y transiciones
- [x] Manejo de estados de carga
- [x] Compatibilidad con días pasados (ocultar botón)
- [x] Documentación completa
