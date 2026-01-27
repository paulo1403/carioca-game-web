import type { GameState } from "@/types/game";

export type TurnDirection = GameState["direction"];

export const getNextTurnIndex = (
  direction: TurnDirection,
  currentTurn: number,
  playerCount: number,
) => {
  const step = direction === "clockwise" ? 1 : -1;
  return (currentTurn + step + playerCount) % playerCount;
};
