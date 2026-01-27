import { useEffect, useState } from "react";
import type { Card, GameState, Player } from "@/types/game";
import { canStealJoker } from "@/utils/rules";

interface StealableJoker {
  playerId: string;
  meldIndex: number;
  jokerCard: Card;
  requiredCards: Card[];
  canSteal: boolean;
}

export const useStealableJokers = (
  gameState: GameState,
  myPlayer: Player | undefined,
  isMyTurn: boolean,
  isDownMode: boolean,
) => {
  const [stealableJokers, setStealableJokers] = useState<StealableJoker[]>([]);

  useEffect(() => {
    if (!isMyTurn || isDownMode || !myPlayer) {
      setStealableJokers([]);
      return;
    }

    const stealable: StealableJoker[] = [];
    const otherPlayers = gameState.players.filter((p) => p.id !== myPlayer.id);

    otherPlayers.forEach((player) => {
      player.melds?.forEach((meld, meldIndex) => {
        const jokerCard = meld.find((c) => c.suit === "JOKER" || c.value === 0);
        if (jokerCard) {
          const requiredCards = myPlayer.hand.filter((card) =>
            canStealJoker(card, meld, myPlayer.hand),
          );

          if (requiredCards.length > 0) {
            stealable.push({
              playerId: player.id,
              meldIndex,
              jokerCard,
              requiredCards,
              canSteal: true,
            });
          }
        }
      });
    });

    setStealableJokers(stealable);
  }, [gameState, myPlayer, isMyTurn, isDownMode]);

  return stealableJokers;
};
