# Bolos Galegos (versión Mölkky)

Aplicación móvil progresiva (PWA) para la gestión de partidas de Bolos Galegos, basado en el juego finlandés Mölkky.

## Descripción

Bolos Galegos es una app mobile-first que permite gestionar partidas completas: puntuación en tiempo real, desempates, historial de partidas, gestión de jugadores y estadísticas.

### Funcionalidades principales

- Registro de puntuación por tirada (bolo individual o múltiples)
- Sistema de desempate con muerte súbita
- Deshacer tiradas (incluso desde pantalla de victoria)
- Clasificación en tiempo real con cuadro de puntuación por rondas
- Estadísticas de partida (media, mejor tirada, racha, MVP)
- Historial de partidas completo
- Compartir resultado de victoria como imagen
- Multiidioma (Galego, Castellano, Català, Euskara)
- Funcionamiento offline
- Instalable como aplicación nativa

## Stack técnico

| Tecnología | Uso |
|---|---|
| Vanilla JS (ES2022+) | Lógica de aplicación con ES Modules |
| Vite | Bundler y servidor de desarrollo |
| vite-plugin-pwa | Service Worker y manifest PWA |
| IndexedDB | Persistencia local de datos |
| Web Audio API | Efectos de sonido |
| html2canvas | Captura de pantalla para compartir |
| Vitest | Testing unitario |
| CSS Custom Properties | Sistema de diseño y tematización |

## Diseño visual: Tema "Atlántica"

La interfaz está inspirada en Galicia y su identidad atlántica:

- **Azul atlántico** (`#1a5f8a`) — El mar y la bandera galega como color principal
- **Dorado queimada** (`#d4a017`) — El fuego y la tradición para acentos y victorias
- **Fondo granito** (`#f4f2ef`) — La piedra gallega como base visual
- **Rojo terra** (`#a63030`) — Para fallos y acciones críticas
- **Madera de carballo** — Tonos para los bolos del juego

Principios de Material Design 3 aplicados: elevación por sombras suaves, formas redondeadas, transiciones fluidas y jerarquía de superficies.

## Instalación como app

1. Visita la URL de la aplicación desde Chrome en tu dispositivo móvil
2. Pulsa en **⋮ > Instalar aplicación** (o acepta el banner de instalación)
3. La app se añadirá a tu pantalla de inicio como una aplicación nativa

Funciona sin conexión gracias al Service Worker.

## Desarrollo local

```bash
npm install
npm run dev
```

### Tests

```bash
npm test
```

### Build

```bash
npm run build
```

## Estructura del proyecto

```
src/
├── main.js              # Punto de entrada
├── app/
│   ├── router.js        # Navegación hash-based
│   └── state.js         # Estado en memoria
├── game/
│   ├── constants.js     # Constantes del juego
│   ├── scoring.js       # Lógica de puntuación
│   └── gameEngine.js    # Motor de partida
├── storage/
│   ├── database.js      # Capa IndexedDB
│   ├── playersRepository.js
│   └── gamesRepository.js
├── ui/
│   ├── screens/         # Pantallas
│   ├── components/      # Componentes reutilizables
│   └── dialogs/         # Diálogos modales
├── styles/              # CSS con custom properties
├── i18n/                # Traducciones (gl, es, ca, eu)
└── utils/               # Utilidades DOM, sonido y formato
```

## Reglas del juego

- Objetivo: alcanzar exactamente 50 puntos
- Un bolo derribado: puntuación = número del bolo (1-12)
- Varios bolos derribados: puntuación = cantidad de bolos caídos
- Superar 50: la puntuación vuelve a 25
- 3 fallos consecutivos (opcional): jugador eliminado
- Si varios llegan a 50 en la misma ronda: desempate a muerte súbita

## Aviso legal

**Copyright (c) 2026 Adrián Álvarez González. Todos los derechos reservados.**

Este proyecto es software propietario. No se permite la copia, modificación, distribución ni uso del código fuente sin autorización expresa del autor.

No se aceptan contribuciones externas (Pull Requests, Issues ni Discussions).
