# Solución al Error 500 en Registro de Usuario

## Problema

Al intentar registrar un usuario nuevo, aparece el error:

```
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
Registro fallido (server response): {error: "Error interno del servidor"}
```

## Causas Comunes y Soluciones

### 1. Variables de Entorno Faltantes

**Síntomas:**

- El servidor arroja error al crear el cliente de Supabase
- En los logs del servidor aparece: "Creating Supabase client..." seguido de un error

**Solución:**

1. Crea un archivo `.env.local` en la raíz del proyecto (si no existe)
2. Añade las siguientes variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon-aqui
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

3. Obtén las credenciales desde tu [Dashboard de Supabase](https://supabase.com/dashboard) > Settings > API
4. **Reinicia el servidor** (`Ctrl+C` y luego `npm run dev`)

### 2. Tabla `users` No Existe

**Síntomas:**

- En los logs del servidor aparece: "Error al crear usuario en BD"
- El error menciona que la tabla no existe o tiene permisos incorrectos

**Solución:**

1. Abre tu proyecto en [Supabase](https://supabase.com/dashboard)
2. Ve a SQL Editor
3. Ejecuta el siguiente SQL:

```sql
-- Crear la tabla users
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  password text, -- Puede ser null para usuarios de Google
  phone text NOT NULL,
  role text NOT NULL DEFAULT 'user'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_email_key UNIQUE (email)
);

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Habilitar Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Política para permitir INSERT desde el servidor
CREATE POLICY "Enable insert for authenticated users" ON public.users
  FOR INSERT
  WITH CHECK (true);

-- Política para permitir SELECT del propio usuario
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT
  USING (auth.uid() = id);
```

### 3. Error "nextCookies.set is not a function" (Next.js 15)

**Síntomas:**

- Error en los logs: "nextCookies.set is not a function"
- Ocurre al crear el cliente de Supabase en route handlers
- El error aparece con Next.js 15 y versiones antiguas de @supabase/auth-helpers-nextjs

**Solución:**
Ya está corregido en el código actual. Se usa `createServerClient` de `@supabase/ssr` en lugar de `createRouteHandlerClient`.

Si necesitas aplicar el fix manualmente:

```typescript
// ❌ ANTES (no funciona en Next.js 15)
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

const supabase = createRouteHandlerClient({
  cookies: async () => cookieStore,
});

// ✅ DESPUÉS (compatible con Next.js 15)
import { createServerClient } from "@supabase/ssr";

const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignorar errores de Server Components
        }
      },
    },
  }
);
```

### 4. Problema con Cookies en Next.js 15 (Versión Anterior)

**Síntomas:**

- Error en los logs: "cookies is not a function" o similar
- El error ocurre al crear el cliente de Supabase

**Solución:**
Este problema ya está corregido en el código actual (usando `await cookies()`).

### 4. Problema con Cookies en Next.js 15 (Versión Anterior)

**Síntomas:**

- Error en los logs: "cookies is not a function" o similar
- Ocurría en versiones anteriores del código

**Solución:**
Este problema ya está resuelto. Ahora usamos `createServerClient` con la configuración correcta de cookies.

### 5. bcrypt No Instalado

**Síntomas:**

- Error en los logs: "Cannot find module 'bcryptjs'"

**Solución:**

```bash
npm install bcryptjs @types/bcryptjs
```

## Cómo Ver los Logs Detallados del Servidor

1. Abre la terminal donde está corriendo `npm run dev`
2. Reproduce el error registrando un usuario
3. Busca líneas que comiencen con `[api/auth/register]`
4. Copia toda la salida y compártela para diagnosticar el problema exacto

## Ejemplo de Logs Exitosos

Cuando el registro funciona correctamente, deberías ver:

```
[api/auth/register] POST called with: { name: 'Test User', email: 'test@example.com', phone: '+1234567890' }
[api/auth/register] Creating Supabase client...
[api/auth/register] Calling supabase.auth.signUp...
[api/auth/register] Auth signUp successful, user ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
[api/auth/register] Hashing password...
[api/auth/register] Inserting into users table...
[api/auth/register] User created successfully!
```

## Verificación Rápida

Ejecuta este comando en PowerShell para probar el endpoint directamente:

```powershell
$body = @{
  name = 'Test User'
  email = 'test@example.com'
  password = 'TestPassword123!'
  phone = '+1234567890'
} | ConvertTo-Json

Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/register' `
  -Method POST `
  -Body $body `
  -ContentType 'application/json' `
  -Verbose
```

Si funciona, recibirás:

```json
{
  "message": "Usuario registrado exitosamente. Por favor verifica tu correo electrónico para activar tu cuenta.",
  "requiresEmailVerification": true
}
```

## Próximos Pasos Después de Corregir

1. ✅ Verifica que puedes registrar un usuario
2. ✅ Revisa tu email para el enlace de verificación
3. ✅ Completa la verificación de email
4. ✅ Intenta iniciar sesión con el usuario verificado
5. ✅ Configura Google OAuth (opcional) siguiendo `CONFIGURACION_GOOGLE_AUTH.md`
