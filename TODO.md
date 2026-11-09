# TODO — Cellbound Arena

## MVP local jugable

- [x] El jugador puede entrar a una arena desde una pantalla inicial y personalizar su nombre.
- [x] La célula del jugador se mueve siguiendo el puntero y el juego funciona en desktop y touch.
- [x] La arena genera comida, bots y límites visibles dentro de un mapa amplio.
- [x] Comer orbs aumenta la masa y actualiza la interfaz de masa, posición y tiempo vivo.
- [x] Los bots tienen movimiento autónomo, persiguen objetivos y pueden absorber o ser absorbidos.
- [x] La tabla de posiciones muestra los hunters con mayor masa en tiempo real.
- [x] Q expulsa una porción de masa; ESC pausa y permite continuar.
- [x] La partida termina con una pantalla de resultados y permite reintentar.
- [x] La interfaz responde a pantallas pequeñas, conserva contraste y no depende de assets externos.

## Siguiente fase online

- [ ] Extraer contrato de comandos/snapshots compartido.
- [ ] Implementar Game Server autoritativo con WebSocket y salas.
- [ ] Añadir matchmaking, reconexión y validación de inputs.
- [ ] Persistir perfiles y resultados en PostgreSQL.
- [ ] Añadir Redis para presencia y estado efímero.
