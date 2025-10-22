# 🔧 Solución al Error de Usuario No Encontrado

## Problema

Después de autenticarse con Google, el usuario no se registra en la tabla `users` y aparece el error:

```
Error al obtener usuario: Cannot coerce the result to a single JSON object
```

## Causa

El callback de Google OAuth no estaba guardando correctamente al usuario en la tabla `users`.

## ✅ Solución Implementada

### 1. Actualizado `auth/callback/route.ts`

- Ahora usa `maybeSingle()` en lugar de `single()` para evitar errores
- Incluye el `id` del usuario de Supabase Auth
- Mejor manejo de errores
- Guarda el nombre completo correctamente desde Google

### 2. Actualizado `home/page.tsx`

- Si el usuario no existe en la tabla, lo crea automáticamente
- Usa `maybeSingle()` para evitar errores de "0 rows"
- Maneja el caso de usuario nuevo correctamente

## 📋 Pasos para Solucionar

### Paso 1: Actualizar la Tabla en Supabase

Ve a **Supabase Dashboard** → **SQL Editor** y ejecuta:

```sql
-- Permitir que password sea NULL para usuarios de Google
ALTER TABLE public.users
  ALTER COLUMN password DROP NOT NULL;

-- Agregar constraint UNIQUE para email
ALTER TABLE public.users
  ADD CONSTRAINT users_email_key UNIQUE (email);

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
```

### Paso 2: Limpiar Usuarios Incompletos (Opcional)

Si tienes usuarios que se autenticaron con Google pero no están en la tabla:

```sql
-- Ver usuarios en Auth que no están en la tabla users
SELECT auth.users.email
FROM auth.users
LEFT JOIN public.users ON auth.users.email = public.users.email
WHERE public.users.email IS NULL;
```

### Paso 3: Cerrar Sesión y Volver a Iniciar

1. Si ya iniciaste sesión con Google, cierra sesión
2. Vuelve a iniciar sesión con Google
3. Ahora el usuario debería crearse correctamente en la tabla

### Paso 4: Verificar que Funciona

Ve a **Supabase Dashboard** → **Table Editor** → **users** y verifica que tu usuario aparezca con:

- ✅ `id` (debe coincidir con el de Auth)
- ✅ `name` (tu nombre de Google)
- ✅ `email` (tu correo de Google)
- ✅ `password` (vacío para usuarios de Google)
- ✅ `phone` (vacío o tu teléfono)
- ✅ `role` (debe ser 'user')

## 🔍 Verificación Manual

Si aún tienes problemas, puedes crear el usuario manualmente:

```sql
-- Reemplaza los valores con tu información
INSERT INTO public.users (id, name, email, password, phone, role)
VALUES (
  'tu-id-de-auth-aqui',  -- Copia el ID desde Authentication -> Users
  'Tu Nombre',
  'tu-email@gmail.com',
  '',  -- Vacío para usuarios de Google
  '',  -- O tu teléfono
  'user'
);
```

## 🐛 Problemas Comunes

### "duplicate key value violates unique constraint"

**Solución:** El usuario ya existe. Elimínalo primero:

```sql
DELETE FROM public.users WHERE email = 'tu-email@gmail.com';
```

### "null value in column password violates not-null constraint"

**Solución:** Ejecuta el SQL del Paso 1 para permitir passwords NULL.

### El usuario se crea pero sin nombre

**Solución:** Google no está enviando el nombre. Los cambios ya manejan esto usando el email como fallback.

## ✨ Mejoras Implementadas

1. **Creación Automática:** Si el usuario no existe, se crea automáticamente
2. **Mejor Manejo de Errores:** Usa `maybeSingle()` en lugar de `single()`
3. **Fallback de Nombre:** Si Google no envía el nombre, usa el email
4. **Sincronización de IDs:** El ID de la tabla coincide con el de Auth
5. **Logging:** Errores se muestran en consola para debugging

## 🎯 Resultado Esperado

Después de aplicar estos cambios:

1. ✅ Login con Google funciona correctamente
2. ✅ Usuario se guarda automáticamente en la tabla `users`
3. ✅ No más errores de "Cannot coerce the result"
4. ✅ La página `/home` carga correctamente
5. ✅ Se muestra tu nombre de Google en el navbar

---

**Nota:** Si ya tienes una sesión activa, cierra sesión y vuelve a iniciar para que los cambios tomen efecto.
