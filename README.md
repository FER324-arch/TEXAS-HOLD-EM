# Hold'em Pro

Hold'em Pro es una experiencia 2D de Texas Hold'em futurista diseñada para partidas p2p con soporte de IA, economía interna auditable y panel administrativo.

## Características clave

- Cliente Phaser 3 con estética profesional-futurista y UI en React.
- Comunicación p2p mediante WebRTC DataChannels con signaling vía Socket.IO.
- Autenticación JWT, gestión de cuentas y economía registradas en SQLite/Prisma.
- IA parametrizable, commit–reveal multi-party y utilidades de fairness compartidas.
- Panel administrativo para controlar suministro de la moneda y monitorear sesiones.

## Monorepo

```
/packages
  /client      # Phaser + UI + WebRTC
  /server      # Express, signaling, Prisma, endpoints admin
  /shared      # Tipos, evaluador, FSM, RNG, utilidades
```

## Requisitos previos

- Node.js 20+
- npm 10+

## Instalación

```bash
npm install
npm run migrate
npm run seed
```

Configura tus variables de entorno copiando `packages/server/.env.example` a `packages/server/.env` y ajustando `JWT_SECRET`, `DATABASE_URL`, `STUN_SERVERS` y `TURN_SERVERS`.

## Ejecución en desarrollo

```bash
npm run dev
```

Esto inicia el servidor Express (puerto 4000) y el cliente Vite (puerto 5173). La app intenta usar el proxy de Vite para alcanzar el backend.

### Pruebas p2p locales

1. Ejecuta `npm run dev`.
2. Abre dos ventanas del navegador en `http://localhost:5173`.
3. Regístrate o usa las cuentas seed (`admin@neon` / `admin123`, `user@demo` / `user123`).
4. Host crea una mesa desde el hub y comparte el `roomId`.
5. En la otra ventana, únete con el mismo `roomId`. El flujo de signaling usa Socket.IO, mientras que el canal de juego se crea con WebRTC DataChannels.

## Scripts

- `npm run dev` – cliente + servidor con recarga caliente.
- `npm run build` – compila paquetes shared, server y client.
- `npm run migrate` – aplica migraciones Prisma.
- `npm run seed` – crea usuarios y cuentas demo.
- `npm run test` – ejecuta pruebas unitarias (shared + server).
- `npm run lint` / `npm run format` – formato y linting con ESLint + Prettier.

## Arquitectura

```mermaid
flowchart LR
  subgraph Client
    ReactUI[React UI]
    Phaser[Phaser 3]
    Store[Zustand Store]
  end
  subgraph Server
    Express[Express API]
    Prisma[Prisma + SQLite]
    Signaling[Socket.IO Signaling]
  end
  subgraph P2P
    WebRTC[WebRTC DataChannels]
  end

  ReactUI -->|REST (JWT)| Express
  Phaser --> Store
  Store --> WebRTC
  WebRTC --> Signaling
  Express --> Prisma
  Prisma --> SQLite[(SQLite)]
```

### Flujo de partida

1. Los jugadores se autentican y cargan saldo.
2. El host crea una sesión y comparte `roomId`.
3. Cada jugador establece WebRTC usando signaling de Socket.IO.
4. Se genera el mazo mediante commit–reveal con seeds de todos los jugadores (`@neon/shared`).
5. Las transiciones de ronda usan FSM deterministic (`GameStateMachine`, `TurnStateMachine`).
6. Botes y side pots se calculan con `calculateSidePots` y los resultados se registran.
7. Al finalizar manos, el rake opcional se registra en el ledger y el panel admin puede auditar.

## Tests

```bash
npm run test
```

Las suites cubren:

- Evaluación de manos (`evaluateHand`).
- FSM de fases (`GameStateMachine`).
- Cálculo de side pots.
- Contabilidad y P&L mensual.
- Protocolo commit–reveal y mezcla determinista.
- Store IA cliente.

## Seguridad y fairness

- RNG basado en commit–reveal multi-participante con `crypto`/Web Crypto API.
- Hashes y HMAC SHA-256 para validar seeds y acciones.
- Resync y snapshots deterministas diseñados para tolerar reconexiones.
- Límite de tiempo y penalizaciones previstos en FSM de turnos.

## Administración

El panel `/admin` expone mint/burn, transferencias, bloqueo de cuentas y listado de partidas activas. Todos los movimientos generan `LedgerEntry` auditables.

## Licencia

MIT
