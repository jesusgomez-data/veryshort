# VS· Very Short

> **Comparte tu día en 7.5 segundos.**

Red social de historias ultra-cortas en video. Solo círculos, solo momentos, solo lo que importa.

---

## 🎬 Demo

Abre `index.html` en tu navegador o despliega en cualquier hosting estático.

**Credenciales Supabase ya configuradas** — funciona out of the box en modo demo sin cuenta.

---

## ✨ Features

- 📷 **Grabación real** — cámara frontal/trasera, countdown 7.5s, MediaRecorder API
- ▶️ **Visor de historias** — video fullscreen, barra de progreso, reacciones
- 🔴 **Feed de órbitas** — círculos giratorios rojo/blanco, mapa de historias activas
- 💬 **Mensajes directos** — chat en tiempo real con Supabase Realtime
- 👥 **Seguidores** — follow/unfollow, modal con lista
- 🔍 **Explorar** — trending hashtags, sugeridos
- 🔐 **Auth completa** — login/registro con Supabase Auth
- ☁️ **Upload a Supabase Storage** — videos guardados en la nube

---

## 🛠 Stack

| Capa | Tech |
|------|------|
| Frontend | React 18 (CDN, sin build) |
| Backend | Supabase (Auth + PostgreSQL + Storage + Realtime) |
| Fonts | Oswald + Barlow Condensed (Google Fonts) |
| Deploy | GitHub Pages / Vercel / cualquier hosting estático |

---

## 🚀 Setup

### 1. Clona el repo
```bash
git clone https://github.com/TU_USUARIO/veryshort.git
cd veryshort
```

### 2. Abre en el navegador
```bash
# Opción simple — abre directo
open index.html

# Opción con server local
npx serve .
```

### 3. Configura tu propio Supabase (opcional)

1. Crea proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** → pega y ejecuta `supabase_schema.sql`
3. En `index.html` líneas ~230, cambia las credenciales:
```javascript
const SB_URL  = 'https://TU_PROYECTO.supabase.co';
const SB_KEY  = 'TU_ANON_KEY';
```

---

## 📁 Estructura

```
veryshort/
├── index.html          ← App completa (React + CSS + JS en un archivo)
├── supabase_schema.sql ← Schema completo de la BD
├── icon.png            ← Ícono de la app
├── logo-dark.png       ← Logo versión oscura
├── logo-light.png      ← Logo versión clara
└── README.md
```

---

## 🗄 Base de datos

El archivo `supabase_schema.sql` crea:

| Tabla | Descripción |
|-------|-------------|
| `profiles` | Usuarios con username, bio, avatar |
| `stories` | Videos con duración ≤7.5s, caption, emoji |
| `story_views` | Registro de vistas por usuario |
| `reactions` | Reacciones ❤️🔥 por historia |
| `follows` | Relaciones seguidor/seguido |
| `conversations` | Chats entre usuarios |
| `messages` | Mensajes individuales |
| `notifications` | Sistema de notificaciones |

RLS activado en todas las tablas. Triggers automáticos para notificaciones y contadores.

---

## 🎨 Brand

- **Negro** `#000000` — fondo absoluto
- **Rojo** `#e8000a` — acción, vida, energía
- **Blanco** `#ffffff` — contraste puro
- **Tipografía** — Oswald (display) + Barlow Condensed (body)
- **Forma signature** — diamante ◆ para el botón de grabación

---

## 📱 PWA

Agrega al inicio del `<head>` para instalación en móvil:
```html
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#000000">
```

---

## 🔒 Seguridad

- Las credenciales de Supabase en el código son la **anon key** (pública por diseño)
- Row Level Security (RLS) protege todos los datos en Supabase
- Nunca incluyas la `service_role` key en el frontend

---

## 📄 Licencia

MIT — Úsalo, modifícalo, haz algo increíble con él.

---

Hecho con ⚡ por **Jesús M.** — `@jesus.dev`
