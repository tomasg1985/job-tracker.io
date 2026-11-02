# JobTrack Radar (backend local)

Servidor Node + Playwright que lee LinkedIn, Indeed y Computrabajo y alimenta el Radar 24 h de JobTrack.

## Instalación
```
cd server
npm i
npx playwright install chromium
npm start        # http://127.0.0.1:3001
```
Luego abre **http://localhost:3001** (el servidor también sirve JobTrack; evita bloqueos del navegador) → Postulaciones → Radar 24 h → escribe el puesto → **LinkedIn · Indeed · Computrabajo**.

## Pruebas
`npm test` (parsers con HTML de ejemplo y `scan()` con un navegador simulado; no requiere Playwright).

## Qué esperar (límites reales)
- **Los selectores CSS no fueron verificados contra los sitios reales** (se probaron con HTML de ejemplo). Si un portal cambia su marcado, ajusta `parseList/parseDetail` en `scrapers/<portal>.js`; el resto sigue funcionando y el error aparece como aviso.
- **LinkedIn**: páginas públicas (sin iniciar sesión). Informa “sé de los primeros N” → se muestra “< N postulantes”. Puede pedir login si abusas. Scrapear LinkedIn va contra sus Términos de uso: úsalo bajo tu responsabilidad y con poca frecuencia.
- **Indeed**: no publica número de postulantes (N/D, no se descarta) y suele bloquear automatización con captcha; el servidor lo detecta y avisa.
- **Computrabajo**: filtro nativo de 24 h; el número de postulantes se lee del detalle si existe.
- Solo escucha en 127.0.0.1, un escaneo a la vez, con pausas aleatorias. `HEADLESS=0 npm start` muestra el navegador para depurar. `PORT` cambia el puerto.
- La postulación automática sigue siendo un registro: no envía solicitudes reales.

## Fuentes abiertas (sin navegador)
GetOnBoard (incluye nº de postulantes), RemoteOK, We Work Remotely, Remotive y Arbeitnow se leen por API/RSS con `fetch` (Node 18+): son rápidas y no abren Chromium. Por defecto el Radar usa estas + Computrabajo; LinkedIn e Indeed solo si activas su chip.
Respeta sus condiciones: RemoteOK y Remotive piden enlazar a la oferta original (el botón «Ver oferta» lo hace) y Remotive publica con ~24 h de retraso.
Diagnóstico: `node probe.mjs "puesto" "ciudad"` guarda el HTML real de LinkedIn/Indeed/Computrabajo en `server/debug/`.

## Sincronización entre dispositivos (PostgreSQL)

El navegador sigue guardando una copia en `localStorage`; el servidor guarda la copia compartida y cada dispositivo la mantiene al día.

**Variables de entorno**
- `ACCESS_KEY`: clave de acceso (obligatoria si el servidor es accesible desde internet).
- `DATABASE_URL`: URL de PostgreSQL. Sin ella, los datos se guardan en `server/data/state.json` (útil en local).

**En local:** `ACCESS_KEY=mi-clave DATABASE_URL=postgres://… npm start` y abre `http://127.0.0.1:3001`.

**En Render:** sube el repositorio completo, crea un *Web Service* (o usa `render.yaml`), define `ACCESS_KEY` y `DATABASE_URL` y abre la URL `https://…onrender.com` en tu PC y en el teléfono. La primera vez pedirá la clave y cargará tus datos.

**Notas**
- La API: `GET /api/state`, `PUT /api/state` (control de versiones: si dos dispositivos cambian a la vez aparece un aviso para conservar uno o combinar).
- Se sincronizan CVs, ofertas, envíos, metas y ajustes. No se sincronizan la API key del LLM ni la URL del servidor local del Radar.
- En Render no hay Chromium: LinkedIn, Indeed y Computrabajo (Playwright) no funcionan allí; las fuentes abiertas sí.
- Usa siempre HTTPS: los CVs contienen datos personales.
