# VS · Very Short — Guía de Configuración de Supabase

## Paso 1: Ejecutar el schema principal

Ve a **SQL Editor** en tu proyecto Supabase y ejecuta:

```
supabase/migrations/001_initial_schema.sql
```

## Paso 2: Ejecutar storage y extras

Ejecuta también:

```
supabase/migrations/002_storage_and_extras.sql
```

Este archivo crea:
- ✅ Buckets de Storage (`videos`, `avatars`) con políticas RLS
- ✅ Columnas extra en `profiles` (`avatar_url`, `follower_count`, `following_count`, etc.)
- ✅ Triggers para contadores de seguidores automáticos
- ✅ Políticas para ver quién vio tu historia
- ✅ Realtime habilitado para mensajes, notificaciones y stories

## Paso 3: Verificar Storage buckets

En **Storage** → verifica que existan los buckets:
- `videos` (público, max 100MB)
- `avatars` (público, max 5MB)

## Paso 4: Variables de entorno

El archivo `app/.env.local` ya tiene las credenciales configuradas:
```
VITE_SUPABASE_URL=https://uprqlonrzrylwcpudmcr.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

## Paso 5: Auth settings en Supabase

En **Authentication → Settings**:
- Site URL: `http://localhost:3000` (dev) / tu dominio (prod)
- Email confirmations: puedes desactivarlas para desarrollo

## Estructura de tablas

| Tabla | Descripción |
|-------|-------------|
| `profiles` | Usuarios con username, bio, avatar |
| `stories` | Videos ≤7.5s con metadata |
| `story_views` | Registro de vistas (quién vio qué) |
| `reactions` | Reacciones ❤️ 🔥 por historia |
| `follows` | Relaciones seguidor/seguido |
| `conversations` | Chats entre 2 usuarios |
| `messages` | Mensajes individuales |
| `notifications` | Notificaciones automáticas |

## Correr la app

```bash
cd app
npm install
npm run dev
```
