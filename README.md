# VS · Very Short

Red social de historias en video de 7.5 segundos. Comparte lo que importa, sin filtros, sin edición infinita — solo 7.5 segundos de realidad.

---

## Quick Start

```bash
cd app
npm install
npm run dev
```

The app runs at `http://localhost:5173` by default.

---

## Stack

| Layer | Technology |
|---|---|
| UI Framework | React 18 |
| Bundler | Vite |
| Styling | Tailwind CSS |
| State Management | Zustand |
| Backend — Auth | Supabase Auth |
| Backend — DB | Supabase (PostgreSQL) |
| Backend — Storage | Supabase Storage |
| Backend — Realtime | Supabase Realtime |
| Mobile | Capacitor (iOS / Android) |

---

## Project Structure

```
app/
├── src/
│   ├── pages/          # Route-level screens (Feed, Chat, Activity, Profile…)
│   ├── components/     # Reusable UI components (chat/, feed/, shared/)
│   ├── stores/         # Zustand stores (authStore, feedStore, chatStore)
│   ├── hooks/          # Custom React hooks (useNotifs, useProfile…)
│   ├── lib/            # Supabase client, utility functions
│   └── styles/         # Global CSS and design tokens
└── supabase/
    └── migrations/     # SQL migration files
```

---

## Environment Variables

Create an `.env.local` file in the `app/` directory:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_MAX_VIDEO_MS=7500
```

---

## Mobile Builds (Capacitor)

```bash
npm run build
npm run cap:add:ios       # or cap:add:android
npm run cap:sync
npm run cap:open:ios      # opens Xcode
```

For Android replace `:ios` with `:android` in the last two commands.

---

## Features

- Record and post 7.5-second video stories directly from the browser or native camera
- Realtime feed of stories from followed users
- Explore page to discover new creators
- Direct messaging with realtime delivery and read receipts
- Notifications (follows, reactions, replies, view milestones)
- Emoji-based avatar system — no profile photos required
- Supabase Auth (magic link + OAuth)
- Progressive Web App ready; ships as iOS and Android app via Capacitor
- Offline-tolerant UI with optimistic updates

---

## Design Tokens

| Token | Value |
|---|---|
| Background | `#000` |
| Brand red | `#e8000a` |
| White | `#fff` |
| Display font | Unbounded |
| Body font | Space Grotesk |
| Max story duration | 7 500 ms |
