# Panel Dropi Bot

Frontend del panel de gestión del bot de WhatsApp de Dropi: catálogo de productos, conversaciones
con clientes y editor del prompt del agente de IA.

Consume la API JSON del backend Django (`/api/...`) descrita en
`docs/api-frontend.md` y `docs/frontend-react-plan.md`.

## Stack

- Vite + React 19 + TypeScript
- react-router para las rutas
- TanStack Query para data fetching, caché y polling
- Tailwind CSS v4 (plugin de Vite, sin `tailwind.config.js`)
- Componentes propios sobre Radix UI (estilo shadcn/ui), iconos de Phosphor

## Setup local

```bash
npm install
npm run dev
```

La app corre en `http://localhost:5173`.

### Conectar con el backend

En producción el front y la API viven en el mismo dominio (`https://luisacoy.me`), así que todos
los fetch usan rutas relativas (`/api/...`) — no hace falta ninguna variable de entorno.

Para desarrollo local contra un backend Django corriendo en tu máquina, copiá `.env.example` a
`.env` y configurá el proxy de Vite:

```bash
cp .env.example .env
```

```
VITE_API_PROXY=http://localhost:8000
```

`vite.config.ts` levanta un proxy de `/api` hacia esa URL en modo dev, así el navegador nunca hace
una petición cross-origin y las cookies de sesión (`sessionid`, `csrftoken`) funcionan igual que en
producción.

### Chat en tiempo real (WebSocket)

El panel abre un único WebSocket app-wide (`wss://agente.luisacoy.me/ws/chat/` en producción) para
recibir mensajes y notas nuevas sin esperar al polling. Es puramente aditivo: si el socket no
conecta o se cae, el poll de 8s (detalle) y 15s (lista) siguen funcionando exactamente igual —
el socket solo reduce la latencia percibida.

Variable de entorno opcional: `VITE_WS_URL`, con la URL absoluta completa (protocolo + host +
path). Si no se define, se deriva del origen actual: `ws(s)://<host>/ws/chat/`.

- **Producción / preview**: no hace falta configurarla — mismo dominio, mismo origen.
- **Desarrollo local con `VITE_API_PROXY` configurado**: tampoco hace falta. `vite.config.ts`
  agrega una entrada de proxy `/ws` (con `ws: true`) espejo de `/api`, así que el socket sale por
  `ws://localhost:5173/ws/chat/` y llega al backend como si fuera same-origin.
- **Desarrollo local sin proxy**, apuntando directo al backend desplegado: seteá
  `VITE_WS_URL=wss://agente.luisacoy.me/ws/chat/` en tu `.env`.

`import.meta.env.VITE_WS_URL` se inlinea en build time — cambiarla requiere un redeploy, no solo
un cambio de variable en runtime.

## Autenticación

Sesión Django + cookie CSRF (sin JWT, sin tokens en `localStorage`):

1. `GET /api/auth/csrf/` al arrancar la app (`src/auth/AuthProvider.tsx`).
2. Login con `POST /api/auth/login/` — ver `src/auth/LoginPage.tsx`.
3. Todas las peticiones van con `credentials: "include"` y, en mutaciones, el header
   `X-CSRFToken` (`src/api/client.ts`).
4. Las rutas del panel están protegidas por `<RequireStaff>` (`src/auth/RequireStaff.tsx"`), que
   redirige a `/login` si no hay sesión o el usuario no es staff.

## Estructura

```
src/
  api/          # cliente fetch (CSRF, multipart, envelope de errores) + endpoints tipados
  auth/         # AuthProvider, guard de rutas, login
  realtime/     # conexión WebSocket (reconexión, backoff, suscripciones) — ver arriba
  components/
    layout/     # shell con sidebar de navegación
    ui/         # primitivos (botón, input, dialog, badge, etc.)
  features/
    products/   # catálogo, form con imágenes múltiples, config de visibilidad
    conversations/  # lista, chat, composer, grabador de nota de voz, polling
    agent/      # editor del prompt del agente
  lib/          # formato (pesos, ofertas, fechas), utilidades
```

## Deploy

Pensado para desplegarse junto al backend en el mismo dominio (mismo VPS / mismo Caddy, o Vercel
con rewrite de `/api/*` hacia Django). No requiere configurar CORS: al vivir en el mismo origen,
las cookies `SameSite=Lax` funcionan sin cambios adicionales.

```bash
npm run build   # genera dist/ listo para servir como estático
```

## Convenciones

- Commits convencionales, sin atribución de IA.
- Los formatos de precios, ofertas, fechas y badges de estado están centralizados en
  `src/lib/format.ts` — replican exactamente el comportamiento de las templates Django que
  reemplaza este panel.
