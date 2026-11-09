# Cellbound Arena

MVP web jugable inspirado en la fantasía de crecer y dominar una arena de células. La primera entrega corre una simulación local con bots para validar el loop antes de conectar partidas online.

## Stack

- TypeScript
- Vite
- Canvas 2D
- CSS responsive

## Desarrollo

```bash
npm install
npm run dev
```

Abre la URL que muestra Vite. Para validar el build:

```bash
npm run build
```

## Controles

- Mouse o touch: dirigir la célula.
- `Q`: expulsar masa.
- `ESC`: pausar o continuar.

## Próximo paso de arquitectura

El MVP mantiene la simulación en memoria para que el gameplay sea demostrable sin servicios externos. La siguiente fase debe mover `GameSimulation` a un servidor autoritativo con WebSocket, manteniendo el mismo contrato de entidades y snapshots. Cada sala será propiedad de un único proceso de juego.
