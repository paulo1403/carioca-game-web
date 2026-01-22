# 🚀 Plan de Optimización de Performance: Carioca Game Web

Este documento detalla la estrategia de ingeniería para reducir la latencia de 1-5 segundos a una experiencia casi instantánea, manteniendo la integridad de las reglas del juego.

## 📡 Fase 1: Comunicación en Tiempo Real (Supabase Realtime)
*El objetivo es eliminar el polling de 3 segundos y pasar a una arquitectura basada en eventos.*

- [ ] **Configuración de Replicación en Base de Datos:**
  - Habilitar `Realtime` en Supabase para las tablas `GameSession` y `Player`.
  - Configurar filtros por `row` para que los clientes solo reciban actualizaciones de su `sessionId`.
- [ ] **Refactorización de `useGameState.ts`:**
  - Sustituir el `refetchInterval` de React Query por una suscripción activa de Supabase.
  - Sincronizar el caché de React Query (`queryClient.setQueryData`) inmediatamente al recibir un cambio de la base de datos.
- [ ] **Canales de Broadcast (UX):**
  - Implementar un canal secundario para eventos no persistentes como "Jugador escribiendo" o "Jugador seleccionando cartas" para mejorar la sensación de interacción.

## ⚡ Fase 2: UI Optimista (Eliminar Latencia Perceptual)
*El objetivo es que el jugador vea el resultado de su acción en <100ms, sin esperar la respuesta del servidor.*

- [ ] **Mutaciones Optimistas con TanStack Query:**
  - `drawDeck/drawDiscard`: Mover la carta al estado de la mano local inmediatamente.
  - `discard`: Quitar la carta de la mano y ponerla en el pozo localmente.
  - `goDown`: Mover las cartas de la mano a los grupos del tablero de forma instantánea.
- [ ] **Lógica de Reversión (Rollback):**
  - Implementar capturas de estado antes de la mutación para restaurar la UI si el API devuelve un error (ej. movimiento inválido o fuera de turno).
- [ ] **Desacoplamiento de Animaciones:**
  - Asegurar que las animaciones de CSS/Lucide-react se disparen ante el evento de la UI y no ante el éxito del API REST.

## 🛠️ Fase 3: Optimización del Servidor y Datos
*Reducir el tiempo de ejecución en producción (Vercel/Supabase DB).*

- [ ] **Reducción de Payload de Base de Datos:**
  - Actualmente se parsean JSONs grandes (mazo, descartes). Evaluar si podemos segmentar el estado para no procesar el mazo completo en cada simple descarte.
- [ ] **Actualizaciones Atómicas en Prisma:**
  - Cambiar el patrón de "leer todo -> modificar -> guardar todo" por `prisma.player.update` con incrementos o manipulaciones directas cuando sea posible.
- [ ] **Caching de Validaciones:**
  - Cachear los resultados de `validateContract` y `isEscala/isTrio` si los parámetros no han cambiado durante el mismo turno.

## 🤖 Fase 4: Sincronización de Bots y Transiciones
*Mejorar el flujo cuando el juego cambia de estado automáticamente.*

- [ ] **Ejecución Asíncrona de Bots:**
  - Evitar que el bot bloquee el hilo principal del servidor. El bot debe actuar tras un pequeño "delay" artificial que se notifique vía Realtime.
- [ ] **Transiciones de Ronda Masivas:**
  - Optimizar el proceso de `ROUND_ENDED` para que el reparto de cartas de la nueva ronda se notifique en un solo mensaje de broadcast a todos los jugadores.

---

### 📝 Notas de Implementación (Buenas Prácticas)
- **Versión Gratuita de Supabase:** Mantendremos el uso de canales optimizados para no exceder los límites de mensajes por segundo.
- **Mantenibilidad:** Toda la lógica de reglas en `src/utils/rules.ts` se mantendrá intacta; los cambios solo afectarán a *cómo* viajan los datos.
- **Seguridad:** Las validaciones en el servidor seguirán siendo la "fuente de verdad" final para evitar trampas a través de la UI optimista.
