# 🚀 INICIO RÁPIDO

## 1. Configuración Mínima (5 minutos)

### Opción A: Solo con Email (Sin Google)

```bash
# Ya está todo listo, solo inicia el servidor:
npm run dev
```

### Opción B: Con Google OAuth (Recomendado)

#### Paso 1: Google Cloud Console

1. Ve a https://console.cloud.google.com/
2. Crea proyecto → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID
4. Redirect URIs:
   ```
   https://wrptlcukfryrjagqqman.supabase.co/auth/v1/callback
   http://localhost:3000/auth/callback
   ```
5. Copia Client ID y Client Secret

#### Paso 2: Supabase

1. Ve a https://wrptlcukfryrjagqqman.supabase.co
2. Authentication → Providers → Google
3. Pega Client ID y Client Secret
4. Enable

#### Paso 3: SQL Editor en Supabase

```sql
ALTER TABLE public.users ALTER COLUMN password DROP NOT NULL;
ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);
```

#### Paso 4: Email Settings en Supabase

Authentication → Settings → Email Auth:

- ✅ Enable email confirmations

---

## 2. Probar la App

```bash
npm run dev
```

Abre: http://localhost:3000

---

## 3. Paleta de Colores

```
Fondo:     #1a1a1a
Cards:     #2d2d2d
Bordes:    #3d3d3d
Acento:    #ff6b35
Hover:     #ff8555
```

---

## 4. Comandos Útiles

```bash
# Desarrollo
npm run dev

# Build
npm run build

# Producción
npm start
```

---

## 5. URLs Importantes

- **Supabase Dashboard**: https://wrptlcukfryrjagqqman.supabase.co
- **Google Cloud Console**: https://console.cloud.google.com/
- **Login Local**: http://localhost:3000/login
- **Home Local**: http://localhost:3000

---

## 6. Flujo de Usuario

### Registro:

1. `/login` → "Regístrate"
2. Completa formulario
3. Verifica email
4. Login

### Google:

1. `/login` → "Continuar con Google"
2. Autoriza
3. Automático

---

## 7. Archivos Clave

```
src/
├── app/
│   ├── login/page.tsx          # Página de login
│   ├── page.tsx                # Home protegida
│   ├── api/auth/
│   │   ├── login/route.ts      # API login
│   │   └── register/route.ts   # API registro
│   └── auth/callback/route.ts  # OAuth callback
├── lib/supabase.ts             # Cliente Supabase
└── middleware.ts               # Protección de rutas
```

---

## 8. Troubleshooting Rápido

**No llega el email:**

- Revisa spam
- En dev funciona automáticamente

**Error de Google:**

- Verifica redirect URIs
- Habilita provider en Supabase

**Error al registrar:**

- Ejecuta el SQL en Supabase
- Verifica que la tabla `users` existe

---

Para más detalles, lee:

- `INSTRUCCIONES.md` - Guía completa
- `CONFIGURACION_GOOGLE_AUTH.md` - Configuración detallada de Google
