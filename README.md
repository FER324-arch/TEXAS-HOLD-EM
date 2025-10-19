# Texas Hold'em Elite

Texas Hold'em Elite es un videojuego de póker profesional inspirado en los torneos de alto nivel. Desarrollado con React, TypeScript y Vite, ofrece una experiencia fluida con inteligencia artificial estratégica y una estética cuidada.

## Características principales

- Motor completo de Texas Hold'em con cuatro jugadores (tú y tres rivales IA).
- Flujo de juego realista con ciegas, rondas de apuestas, showdown y registro de eventos.
- Inteligencia artificial con evaluaciones de mano pre-flop y post-flop para tomar decisiones dinámicas.
- Interfaz moderna con cartas animadas, panel de control intuitivo y registro de acciones.
- Generador de paquetes `.zip` para distribuir fácilmente el juego listo para producción.

## Requisitos previos

- Node.js 18 o superior
- npm 9 o superior

## Instalación y ejecución

```bash
npm install
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en tu navegador para jugar.

## Construir y empaquetar

Para generar la versión de producción y crear un `.zip` con todos los archivos necesarios:

```bash
npm run build
npm run package
```

El archivo comprimido se guardará dentro de la carpeta `release/` con un nombre que incluye la fecha y hora de creación.

## Scripts disponibles

- `npm run dev`: inicia el entorno de desarrollo con Vite.
- `npm run build`: genera la compilación de producción en `dist/`.
- `npm run preview`: sirve la compilación de producción para revisar el resultado final.
- `npm run package`: crea un `.zip` en `release/` con la carpeta `dist/`, `package.json`, `package-lock.json` y este README.

## Arquitectura del proyecto

- `src/App.tsx`: gestiona el estado del juego, la lógica principal y la interfaz del usuario.
- `src/game/`: contiene la lógica de juego, inteligencia artificial y evaluador de manos.
- `src/styles/`: agrupa los estilos globales y específicos de la mesa.
- `scripts/create-zip.js`: script Node.js que empaqueta la build en un archivo `.zip` listo para distribuir.

## Créditos

Proyecto creado por inteligencia artificial para demostrar una implementación moderna de un videojuego de Texas Hold'em.
