import type { Card, Player } from "@/types/game";
import { canAddToMeld, canStealJoker } from "@/utils/rules";

interface BestMove {
  targetPlayerId: string;
  meldIndex: number;
  isJoker: boolean;
}

/**
 * Encuentra la mejor jugada para una carta: dónde puede añadirse a un meld
 */
export const findBestCardMove = (
  card: Card,
  myPlayer: Player,
  otherPlayers: Player[],
): BestMove | null => {
  const isJokerCard = card.suit === "JOKER" || card.value === 0;

  // Check my melds first
  if (myPlayer?.melds) {
    for (let i = 0; i < myPlayer.melds.length; i++) {
      if (canAddToMeld(card, myPlayer.melds[i])) {
        return {
          targetPlayerId: myPlayer.id,
          meldIndex: i,
          isJoker: isJokerCard,
        };
      }
    }
  }

  // Check other players melds
  for (const p of otherPlayers) {
    if (p.melds) {
      for (let i = 0; i < p.melds.length; i++) {
        if (canAddToMeld(card, p.melds[i])) {
          return {
            targetPlayerId: p.id,
            meldIndex: i,
            isJoker: isJokerCard,
          };
        }
      }
    }
  }

  return null;
};

/**
 * Encuentra el joker que puede ser robado con una carta específica
 */
export const findStealableJokerForCard = (
  card: Card,
  gameState: any,
  myPlayer: Player | undefined,
): { playerId: string; meldIndex: number } | null => {
  if (!myPlayer) return null;

  const otherPlayers = gameState.players.filter((p: Player) => p.id !== myPlayer.id);

  for (const player of otherPlayers) {
    if (player.melds) {
      for (let meldIndex = 0; meldIndex < player.melds.length; meldIndex++) {
        const meld = player.melds[meldIndex];
        if (canStealJoker(card, meld, myPlayer.hand)) {
          return { playerId: player.id, meldIndex };
        }
      }
    }
  }

  return null;
};
