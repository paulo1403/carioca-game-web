import { useState, useCallback } from "react";
import { Card } from "@/types/game";
import {
  sortCards,
  organizeHandAuto,
  canFulfillContract,
} from "@/utils/handAnalyzer";

export type SortMode = "rank" | "suit" | "auto";

export const useHandManagement = (
  hand: Card[],
  currentRound: number,
  haveMelded: boolean = false,
  boughtCards: Card[] = []
) => {
  const [sortMode, setSortMode] = useState<SortMode>("suit");

  const sortedHand = useCallback(() => {
    if (!hand) return [];

    const boughtIds = new Set(boughtCards.map(c => c.id));
    const oldCards = hand.filter(c => !boughtIds.has(c.id));
    const newCards = hand.filter(c => boughtIds.has(c.id));

    let processedOld;
    if (sortMode === "auto") {
      processedOld = organizeHandAuto(oldCards, currentRound, haveMelded);
    } else {
      processedOld = sortCards(oldCards);
    }

    return [...processedOld, ...newCards];
  }, [hand, boughtCards, sortMode, currentRound, haveMelded])();

  const canDownCheck = useCallback(() => {
    const result = canFulfillContract(hand, currentRound, haveMelded);

    return {
      canDown: result.canDown,
      groups: result.groups,
    };
  }, [hand, currentRound, haveMelded])();

  return {
    sortMode,
    setSortMode,
    sortedHand,
    canDownCheck,
  };
};
