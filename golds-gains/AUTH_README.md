# Sistema de Autenticación - Gold's Gains

## Configuración

### 1. Variables de Entorno

Crea o actualiza el archivo `.env.local` con tus credenciales de Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
```

### 2. Configuración de Supabase

#### Crear la tabla de usuarios

La tabla `users` ya debe estar creada con el siguiente esquema:

```sql
create table public.users (
  id uuid not null default gen_random_uuid (),
  name text not null,
  email text not null,
  password text not null,
  phone text not null,
  role text not null default 'user'::text,
  created_at timestamp with time zone not null default now(),
  constraint users_pkey primary key (id)
);
```

#### Configurar autenticación de Google en Supabase

1. Ve a tu proyecto de Supabase
2. Navega a **Authentication** > **Providers**
3. Habilita **Google** como proveedor
4. Configura las credenciales de OAuth de Google:
   - Ve a [Google Cloud Console](https://console.cloud.google.com/)
   - Crea un proyecto o selecciona uno existente
   - Habilita la API de Google+
   - Crea credenciales OAuth 2.0
   - Agrega la URL de callback de Supabase en las URIs de redireccionamiento autorizadas
5. Copia el **Client ID** y **Client Secret** en Supabase

### 3. Integración completa de Google OAuth (Opcional)

Para una integración completa de Google OAuth, necesitas instalar el SDK:

```bash
npm install @react-oauth/google
```

Luego, actualiza el componente de login para usar el proveedor real de Google.

## Características Implementadas

### ✅ Registro de usuarios

- Formulario de registro con validación
- Hash de contraseñas con bcrypt (10 rounds)
- Almacenamiento seguro en la base de datos

### ✅ Inicio de sesión

- Autenticación con email y contraseña
- Verificación de contraseñas hasheadas
- Mensajes de error apropiados

### ✅ Inicio de sesión con Google

- Botón de Google OAuth
- Creación automática de usuarios en la base de datos
- Verificación de usuarios existentes

### ✅ Seguridad

- Contraseñas hasheadas con bcrypt
- Validación de datos del lado del servidor
- No se devuelven contraseñas en las respuestas de la API

## Estructura de Archivos

```
src/
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── register/
│   │       │   └── route.ts       # API para registro
│   │       ├── login/
│   │       │   └── route.ts       # API para login
│   │       └── google/
│   │           └── route.ts       # API para Google OAuth
│   └── login/
│       └── page.tsx               # Página de login/registro
└── lib/
    └── supabase.ts                # Cliente de Supabase
```

## Uso

### Acceder a la página de login

```
http://localhost:3000/login
```

### API Endpoints

#### POST /api/auth/register

```json
{
  "name": "Juan Pérez",
  "email": "juan@ejemplo.com",
  "password": "contraseña123",
  "phone": "+1234567890"
}
```

#### POST /api/auth/login

```json
{
  "email": "juan@ejemplo.com",
  "password": "contraseña123"
}
```

#### POST /api/auth/google

```json
{
  "user": {
    "name": "Usuario Google",
    "email": "usuario@gmail.com"
  }
}
```

## Próximos pasos recomendados

1. **Implementar sesiones**: Usa NextAuth.js o JWT para manejar sesiones
2. **Proteger rutas**: Crea middleware para proteger páginas que requieren autenticación
3. **Recuperación de contraseña**: Agrega funcionalidad de "olvidé mi contraseña"
4. **Validación de email**: Implementa verificación de correo electrónico
5. **Integración completa de Google**: Instala y configura `@react-oauth/google`

## Notas de Seguridad

- Las contraseñas se hashean con bcrypt usando 10 salt rounds
- Nunca se devuelven contraseñas en las respuestas de la API
- Los usuarios de Google tienen contraseña vacía (no pueden hacer login con password)
- Se recomienda implementar rate limiting en producción
- Configura políticas de seguridad (RLS) en Supabase

## Dependencias Instaladas

- `@supabase/supabase-js`: Cliente de Supabase
- `@supabase/auth-helpers-nextjs`: Helpers de autenticación para Next.js
- `bcryptjs`: Librería para hashear contraseñas
- `@types/bcryptjs`: Tipos de TypeScript para bcryptjs
