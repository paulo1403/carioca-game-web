import { useState, useEffect } from "react";
import { Card, Player, GameState } from "@/types/game";
import {
  findPotentialContractGroups,
  canFulfillContract,
  findAllValidGroups,
} from "@/utils/handAnalyzer";
import { getCardPoints, canAddToMeld } from "@/utils/rules";

export const useDiscardHint = (
  myPlayer: Player | undefined,
  isMyTurn: boolean,
  hasDrawn: boolean,
  isDownMode: boolean,
  gameState?: GameState
) => {
  const [suggestedDiscardCardId, setSuggestedDiscardCardId] = useState<
    string | null
  >(null);
  const [isDiscardUseful, setIsDiscardUseful] = useState(false);

  useEffect(() => {
    if (!isMyTurn || !hasDrawn || isDownMode || !myPlayer?.hand || !gameState) {
      setSuggestedDiscardCardId(null);
      setIsDiscardUseful(false);
      return;
    }

    // Check if the top card of discard pile is useful
    const discardCard =
      gameState.discardPile.length > 0
        ? gameState.discardPile[gameState.discardPile.length - 1]
        : undefined;

    if (discardCard) {
      // Check if we can fulfill the contract with this card
      const withDiscardCard = [...myPlayer.hand, discardCard];
      const { canDown } = canFulfillContract(
        withDiscardCard,
        gameState.currentRound
      );
      setIsDiscardUseful(canDown);
    } else {
      setIsDiscardUseful(false);
    }

    // Suggest a card to discard: prefer cards NOT in potential contract groups
    // and cards with highest point value
    const alreadyMelded = myPlayer.melds && myPlayer.melds.length > 0;
    const { trios, escalas } = alreadyMelded
      ? findAllValidGroups(myPlayer.hand)
      : findPotentialContractGroups(myPlayer.hand, gameState.currentRound);

    // Collect all cards that are part of valid groups in hand
    const usefulCardIds = new Set<string>();
    [...trios, ...escalas].forEach((group) => {
      group.forEach((card: Card) => {
        usefulCardIds.add(card.id);
      });
    });

    // ALSO: Cards that can be added to melds on the table are useful
    myPlayer.hand.forEach(card => {
      // Check my melds
      if (myPlayer.melds?.some(meld => canAddToMeld(card, meld))) {
        usefulCardIds.add(card.id);
      }
      // Check others melds 
      gameState.players.forEach(p => {
        if (p.id !== myPlayer.id && p.melds?.some(meld => canAddToMeld(card, meld))) {
          usefulCardIds.add(card.id);
        }
      });
    });

    // Find cards NOT in any group (these are safe to discard)
    const discardableCandidates = myPlayer.hand.filter(
      (card) => !usefulCardIds.has(card.id)
    );

    // If no discardable candidates, suggest the highest point card
    let suggested: Card | null = null;

    if (discardableCandidates.length > 0) {
      // Sort by points (highest first) - prefer to discard high-value cards
      // EXCEPTION: Never suggest discarding a Joker (unless it's the only option, which is handled by sort order)
      // We assign a very low "discard score" to Jokers so they end up at the bottom
      suggested = [...discardableCandidates].sort((a, b) => {
        const isAJoker = a.suit === "JOKER" || a.value === 0;
        const isBJoker = b.suit === "JOKER" || b.value === 0;

        if (isAJoker && !isBJoker) return 1; // a is Joker, put it after b (a > b in descending sort? No, sort is b - a)
        // Array.sort((a,b) => val)
        // If val > 0, b comes first.
        // If val < 0, a comes first.
        // We want High Points First.
        // So b.points - a.points.
        // If a is Joker, we want it LAST.
        // So a should be "smaller" than b.
        // So if a is Joker, we want positive result? No wait.
        // If result > 0, sort is [b, a].
        // So if a is Joker, we return 1. -> [b, a]. Correct.

        if (!isAJoker && isBJoker) return -1; // b is Joker, put it after a. -> [a, b]. Correct.

        return getCardPoints(b) - getCardPoints(a);
      })[0];
    } else if (myPlayer.hand.length > 0) {
      // If all cards are in groups, suggest the lowest value card
      suggested = [...myPlayer.hand].sort(
        (a, b) => getCardPoints(a) - getCardPoints(b)
      )[0];
    }

    setSuggestedDiscardCardId(suggested?.id ?? null);
  }, [myPlayer, isMyTurn, hasDrawn, isDownMode, gameState]);

  return {
    suggestedDiscardCardId,
    isDiscardUseful,
  };
};
