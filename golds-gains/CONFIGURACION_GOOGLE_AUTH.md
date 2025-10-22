# 🔐 Configuración de Autenticación con Google y Verificación de Email

## ✅ Cambios Implementados

### 1. **Nuevo Sistema de Colores**

- Paleta oscura inspirada en la imagen proporcionada
- Colores principales:
  - Fondo: `#1a1a1a` (negro suave)
  - Cards: `#2d2d2d` (gris oscuro)
  - Bordes: `#3d3d3d` (gris medio)
  - Acento: `#ff6b35` (naranja/dorado)
  - Hover: `#ff8555` (naranja claro)

### 2. **Integración con Supabase Auth**

- Autenticación real con Google OAuth
- Verificación de email obligatoria
- Sesiones manejadas por Supabase
- Middleware para proteger rutas

### 3. **Flujo de Verificación de Email**

- Al registrarse, se envía un email de verificación
- El usuario debe confirmar su email antes de poder iniciar sesión
- Mensaje claro en pantalla después del registro

---

## 📋 Guía de Configuración

### Paso 1: Configurar Supabase Auth

#### 1.1 Habilitar Email Confirmation

1. Ve a tu proyecto de Supabase: https://wrptlcukfryrjagqqman.supabase.co
2. Navega a **Authentication** → **Settings**
3. En **Auth Providers**, asegúrate de que **Email** esté habilitado
4. En **Email Auth**, marca:
   - ✅ **Enable email confirmations** (Verificación de email)
   - ✅ **Enable email change confirmations**
   - ✅ **Enable email signup**

#### 1.2 Configurar Email Templates (Opcional)

1. Ve a **Authentication** → **Email Templates**
2. Personaliza la plantilla de **Confirm signup**
3. Asegúrate de que el link de confirmación apunte a: `{{ .SiteURL }}/auth/callback`

### Paso 2: Configurar Google OAuth

#### 2.1 Crear Credenciales en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto nuevo o selecciona uno existente
3. Navega a **APIs & Services** → **Credentials**
4. Haz clic en **Create Credentials** → **OAuth 2.0 Client ID**
5. Configura la pantalla de consentimiento si aún no lo has hecho
6. Tipo de aplicación: **Web application**
7. **Authorized JavaScript origins**:
   ```
   http://localhost:3000
   https://wrptlcukfryrjagqqman.supabase.co
   ```
8. **Authorized redirect URIs**:
   ```
   https://wrptlcukfryrjagqqman.supabase.co/auth/v1/callback
   http://localhost:3000/auth/callback
   ```
9. Copia el **Client ID** y **Client Secret**

#### 2.2 Configurar Google en Supabase

1. Ve a tu proyecto de Supabase
2. Navega a **Authentication** → **Providers**
3. Encuentra **Google** y haz clic en él
4. Habilita Google:
   - ✅ **Enable Google provider**
5. Pega tus credenciales:
   - **Client ID**: El Client ID de Google Cloud
   - **Client Secret**: El Client Secret de Google Cloud
6. Guarda los cambios

### Paso 3: Actualizar la Tabla Users

La tabla `users` necesita usar el ID de Supabase Auth como primary key:

```sql
-- Si ya tienes la tabla, necesitas modificarla:
ALTER TABLE public.users
  ALTER COLUMN id TYPE uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN password DROP NOT NULL; -- Para usuarios de Google

-- Si la tabla no existe, créala así:
CREATE TABLE public.users (
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
CREATE INDEX idx_users_email ON public.users(email);
```

### Paso 4: Configurar URL del Sitio (Solo en Producción)

Si estás desplegando a producción, actualiza el archivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://wrptlcukfryrjagqqman.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com
```

---

## 🚀 Flujo de Autenticación

### Registro de Usuario

1. Usuario completa el formulario de registro
2. Se crea cuenta en Supabase Auth
3. Se envía email de verificación
4. Se guarda usuario en tabla `users` con contraseña hasheada
5. Se muestra mensaje: "Por favor verifica tu correo electrónico"

### Verificación de Email

1. Usuario hace clic en el link del email
2. Supabase confirma el email automáticamente
3. Usuario es redirigido a `/auth/callback`
4. El callback verifica la sesión y redirige al home

### Login Normal

1. Usuario ingresa email y contraseña
2. Supabase Auth valida las credenciales
3. Se verifica que el email esté confirmado
4. Si está confirmado, se permite el acceso
5. Si no está confirmado, se muestra error

### Login con Google

1. Usuario hace clic en "Continuar con Google"
2. Es redirigido a Google para autenticación
3. Después de aprobar, Google redirige a `/auth/callback`
4. Se crea/actualiza el usuario en la tabla `users`
5. Usuario es redirigido al home

---

## 🔒 Seguridad Implementada

- ✅ Contraseñas hasheadas con bcrypt (10 rounds)
- ✅ Verificación de email obligatoria
- ✅ Sesiones manejadas por Supabase (cookies seguras)
- ✅ Middleware que protege rutas privadas
- ✅ Validación de datos en servidor
- ✅ Tokens JWT en cookies HttpOnly

---

## 🧪 Probar la Aplicación

### En Desarrollo

```bash
npm run dev
```

Luego visita: http://localhost:3000/login

### Flujo de Prueba

1. **Registro**:

   - Completa el formulario
   - Revisa tu email para el link de verificación
   - Haz clic en el link para verificar

2. **Login con Email**:

   - Usa tus credenciales
   - Deberías poder acceder después de verificar el email

3. **Login con Google**:
   - Haz clic en "Continuar con Google"
   - Autoriza la aplicación
   - Deberías ser redirigido automáticamente

---

## 📝 Archivos Modificados/Creados

```
src/
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── login/route.ts       ✅ Actualizado
│   │       └── register/route.ts    ✅ Actualizado
│   ├── auth/
│   │   └── callback/route.ts        ✨ Nuevo
│   └── login/page.tsx               ✅ Actualizado (nuevos colores)
├── lib/
│   └── supabase.ts                  ✅ Actualizado
└── middleware.ts                     ✨ Nuevo
```

---

## 🎨 Paleta de Colores

```css
/* Fondo principal */
background: #1a1a1a

/* Contenedores */
background: #2d2d2d

/* Bordes */
border: #3d3d3d

/* Color de acento (botones, links) */
color: #ff6b35

/* Color de acento hover */
color: #ff8555

/* Texto principal */
color: #ffffff

/* Texto secundario */
color: #9ca3af (gray-400)
```

---

## ⚠️ Notas Importantes

1. **Primeros Pasos**: Configura Google OAuth en Supabase antes de probar el login con Google
2. **Email de Prueba**: Supabase puede requerir configuración SMTP para emails en producción
3. **En Desarrollo**: Los emails de verificación funcionan automáticamente en desarrollo
4. **Middleware**: El middleware protege todas las rutas excepto `/login` y `/auth/*`
5. **Sesiones**: Las sesiones se guardan automáticamente en cookies HttpOnly

---

## 🐛 Solución de Problemas

### "Error al iniciar sesión con Google"

- Verifica que las URLs de redirect estén configuradas correctamente en Google Cloud Console
- Asegúrate de que Google OAuth esté habilitado en Supabase

### "Por favor verifica tu correo electrónico"

- Esto es normal después del registro
- Revisa tu bandeja de entrada y spam
- El link de verificación expira en 24 horas

### "Error al crear el usuario"

- Verifica que la tabla `users` exista en Supabase
- Asegúrate de que el campo `password` pueda ser null
- Verifica que no haya restricciones de unique en el email

### Usuario no puede iniciar sesión después de verificar

- Verifica en Supabase Auth que el usuario tenga `email_confirmed_at` con una fecha
- Intenta hacer logout y login de nuevo

---

## 📚 Recursos Adicionales

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)

---

¡Tu aplicación ahora tiene autenticación completa con Google y verificación de email! 🎉
