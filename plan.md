# Cellbound Arena — plan de implementación

## Alcance confirmado

Crear la primera versión de un juego web inspirado en la premisa de Agar.io: una célula controlable entra en una arena, recoge orbs, crece y compite contra hunters controlados por la máquina. Esta entrega prioriza una experiencia jugable de inmediato y deja la simulación online autoritativa como siguiente fase.

## Arquitectura de implementación

- **Cliente**: TypeScript + Canvas 2D + Vite. El canvas maneja el mundo, la cámara, el renderizado y la entrada de mouse/touch.
- **Simulación MVP**: estado local en memoria con un jugador, 24 bots, comida, colisiones, crecimiento, expulsión de masa y estados de pausa/game over.
- **Estructura de datos**: entidades tipadas, loop fijo con delta limitado, partículas y tablero calculado desde el estado actual.
- **Escalado posterior**: sustituir el `GameSimulation` local por WebSocket hacia un Game Server autoritativo; conservar el contrato de entidades y comandos.
- **Serving**: Vite en desarrollo y assets estáticos en producción. `public/manus-routes.json` declara la ruta `/`.

## Estructura del proyecto

```text
src/main.ts       Simulación, input, render, HUD y ciclo principal
src/styles.css    Sistema visual, responsive layout y overlays
public/           Rutas y archivos estáticos
index.html        Shell de la experiencia
```

## Dirección visual elegida

### Estilos explorados

- **Editorial sci-fi / radar nocturno** — 0.05
- **Arcade pastel maximalista** — 0.08
- **Terminal deportiva minimal** — 0.06

Se elige **Editorial sci-fi / radar nocturno**.

- **Movimiento**: una interfaz de transmisión en vivo, entre un radar orbital y la portada de una revista de competición.
- **Principios**: contraste profundo, datos silenciosos, energía focal en las células y jerarquía editorial.
- **Color**: navy casi negro como espacio de lectura; menta como firma de vida; coral y violeta para amenazas y rivales.
- **Layout**: el mundo ocupa todo el viewport; las métricas flotan en bordes y el CTA vive en una tarjeta editorial central solo antes de iniciar.
- **Elementos firma**: grid orbital fino, orbes con aura concéntrica y etiquetas monoespaciadas tipo instrumentación.
- **Interacción**: entrar a la arena es un gesto contundente; en partida, la UI se retira y deja que el cursor dirija la atención.
- **Animación**: deriva suave de partículas, pulso radial en orbs, entrada con fade/slide y micro-toast para eventos de absorción.
- **Tipografía**: sistema sans condensado para titulares y `ui-monospace` para datos; uppercase en labels y sentence case en acciones.
- **Esencia**: “Un duelo de instinto en una arena que nunca duerme”; preciso, tenso, elegante.
- **Voz**: breve, competitiva, sin ruido. Ejemplos: “Cada orb cuenta.” / “La arena recuerda.”
- **Marca**: wordmark alto en mayúsculas con un orb partido como firma.
- **Color propio**: menta eléctrica `#70F0D2` sobre navy tinta `#070B17`.

## Entregable de esta fase

Una experiencia local jugable y responsive, lista para desplegar como frontend estático y preparada para incorporar backend multijugador en la siguiente fase.
