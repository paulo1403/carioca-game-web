/**
 * GameService (Refactored)
 *
 * Logic has been moved to src/services/game/ to improve performance and maintainability.
 * This file serves as a proxy for backward compatibility.
 */

export {
  autoReadyBots,
  checkAndProcessBotTurns,
  getGameState,
  processMove,
} from "./game/index";
