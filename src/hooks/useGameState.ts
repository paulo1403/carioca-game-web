import { useMemo } from "react";
import { Card, GameState } from "@/types/game";
import { getCardPoints } from "@/utils/rules";

export const useGameState = (gameState: GameState, myPlayerId: string) => {
  const myPlayer = useMemo(
    () => gameState.players.find((p) => p.id === myPlayerId),
    [gameState.players, myPlayerId]
  );

  const otherPlayers = useMemo(
    () => gameState.players.filter((p) => p.id !== myPlayerId),
    [gameState.players, myPlayerId]
  );

  const isMyTurn = useMemo(
    () => gameState.players[gameState.currentTurn]?.id === myPlayerId,
    [gameState.players, gameState.currentTurn, myPlayerId]
  );

  const myHandPoints = useMemo(() => {
    if (!myPlayer?.hand) return 0;
    return myPlayer.hand.reduce(
      (total: number, card: Card) => total + getCardPoints(card),
      0
    );
  }, [myPlayer?.hand]);

  const haveMelded = useMemo(
    () => myPlayer && myPlayer.melds && myPlayer.melds.length > 0,
    [myPlayer]
  );

  return {
    myPlayer,
    otherPlayers,
    isMyTurn,
    myHandPoints,
    haveMelded,
  };
};
