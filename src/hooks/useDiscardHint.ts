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
  const [discardReason, setDiscardReason] = useState<string | null>(null);

  useEffect(() => {
    if (!isMyTurn || isDownMode || !myPlayer?.hand || !gameState) {
      setSuggestedDiscardCardId(null);
      setIsDiscardUseful(false);
      return;
    }

    // Check if the top card of discard pile is useful
    const discardCard =
      gameState.discardPile.length > 0
        ? gameState.discardPile[gameState.discardPile.length - 1]
        : undefined;

    if (discardCard && !hasDrawn) {
      // BUY PHASE: Check if buying the discard card would enable initial down
      const alreadyMelded = myPlayer.melds && myPlayer.melds.length > 0;
      const withDiscardCard = [...myPlayer.hand, discardCard];

      // IMPORTANT: If player's current hand already allows going down, do NOT suggest buying
      const currentCanDown = canFulfillContract(myPlayer.hand, gameState.currentRound, alreadyMelded).canDown;
      if (currentCanDown) {
        setIsDiscardUseful(false);
        // No suggestion to buy since already have a group
        return;
      }

      if (!alreadyMelded) {
        // Only suggest buying if player hasn't melded yet
        const before = findPotentialContractGroups(myPlayer.hand, gameState.currentRound);
        const after = findPotentialContractGroups(withDiscardCard, gameState.currentRound);
        const { canDown, groups } = canFulfillContract(
          withDiscardCard,
          gameState.currentRound,
          false // alreadyMelded = false, checking initial down
        );

        // Heuristic: mark useful if it immediately allows going down, OR it increases
        // the number of potential groups, OR it increases unique suits for the discard value
        let useful = canDown;
        let reason: string | null = null;
        if (!useful) {
          if (after.trios.length > before.trios.length || after.escalas.length > before.escalas.length) {
            useful = true;
            reason = `Aumenta grupos potenciales (${before.trios.length}/${before.escalas.length} → ${after.trios.length}/${after.escalas.length})`;
          } else {
            // Check unique suit increase for discard value
            const val = discardCard.value;
            const uniqueSuitsBefore = new Set((myPlayer.hand.filter(c => c.value === val && !(c.suit === 'JOKER' || c.value === 0))).map(c => c.suit)).size;
            const uniqueSuitsAfter = new Set(([...myPlayer.hand, discardCard].filter(c => c.value === val && !(c.suit === 'JOKER' || c.value === 0))).map(c => c.suit)).size;
            if (uniqueSuitsAfter > uniqueSuitsBefore) {
              useful = true;
              reason = `Aumenta variedad de palos para ${val} (${uniqueSuitsBefore} → ${uniqueSuitsAfter})`;
            }
          }
        } else {
          reason = "Permite cumplir el contrato inmediatamente";
        }

        setIsDiscardUseful(useful);
        setDiscardReason(useful ? reason : null);
      } else {
        // Already melded, additional downs possible
        const before = findAllValidGroups(myPlayer.hand);
        const after = findAllValidGroups(withDiscardCard);
        const { canDown, groups } = canFulfillContract(
          withDiscardCard,
          gameState.currentRound,
          true // alreadyMelded = true, checking additional down
        );

        let useful = canDown;
        if (!useful) {
          if (after.trios.length > before.trios.length || after.escalas.length > before.escalas.length) {
            useful = true;
          }
        }

        setIsDiscardUseful(useful);
      }
    } else if (discardCard && hasDrawn) {
      // DISCARD PHASE: Check if the discard card is useful for hand management
      const withDiscardCard = [...myPlayer.hand, discardCard];
      const alreadyMelded = myPlayer.melds && myPlayer.melds.length > 0;
      const { canDown } = canFulfillContract(
        withDiscardCard,
        gameState.currentRound,
        alreadyMelded
      );
      setIsDiscardUseful(canDown);
      setDiscardReason(canDown ? "Hace que puedas bajar" : null);
    } else {
      setIsDiscardUseful(false);
      setDiscardReason(null);
    }

    // Only suggest a card to discard if we've already drawn
    if (!hasDrawn) {
      setSuggestedDiscardCardId(null);
      return;
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
    discardReason,
  };
};
