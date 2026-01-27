import { useMemo } from "react";
import { type Card, GameState, type Player } from "@/types/game";
import { canAddToMeld } from "@/utils/rules";

export const useAddableCards = (
  isMyTurn: boolean,
  hasDrawn: boolean,
  isDownMode: boolean,
  myPlayer: Player | undefined,
  otherPlayers: Player[],
  haveMelded: boolean,
) => {
  return useMemo(() => {
    if (!isMyTurn || !hasDrawn || isDownMode || !myPlayer || !haveMelded) {
      return [] as string[];
    }

    const newAddable: string[] = [];
    myPlayer.hand.forEach((card) => {
      let canAdd = false;

      // Check my melds
      if (myPlayer.melds) {
        if (myPlayer.melds.some((meld: Card[]) => canAddToMeld(card, meld))) {
          canAdd = true;
        }
      }

      // Check other players melds
      if (!canAdd) {
        otherPlayers.forEach((p) => {
          if (p.melds && p.melds.some((meld: Card[]) => canAddToMeld(card, meld))) {
            canAdd = true;
          }
        });
      }

      if (canAdd) newAddable.push(card.id);
    });

    return newAddable;
  }, [isMyTurn, hasDrawn, isDownMode, myPlayer, otherPlayers, haveMelded]);
};
