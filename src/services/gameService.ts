/**
 * GameService (Refactored)
 * 
 * Logic has been moved to src/services/game/ to improve performance and maintainability.
 * This file serves as a proxy for backward compatibility.
 */

export {
  getGameState,
  processMove,
  autoReadyBots,
  checkAndProcessBotTurns
} from "./game/index";
