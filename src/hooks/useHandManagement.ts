import { useState, useCallback } from "react";
import { Card } from "@/types/game";
import {
  sortCards,
  organizeHandAuto,
  canFulfillContract,
} from "@/utils/handAnalyzer";

export type SortMode = "rank" | "suit" | "auto";

export const useHandManagement = (hand: Card[], currentRound: number) => {
  const [sortMode, setSortMode] = useState<SortMode>("suit");

  const sortedHand = useCallback(() => {
    if (!hand) return [];

    if (sortMode === "auto") {
      return organizeHandAuto(hand, currentRound);
    }

    // For rank/suit sorting, just use sortCards which organizes by suit naturally
    return sortCards(hand);
  }, [hand, sortMode, currentRound])();

  const canDownCheck = useCallback(() => {
    const result = canFulfillContract(hand, currentRound);

    return {
      canDown: result.canDown,
      groups: result.groups,
    };
  }, [hand, currentRound])();

  return {
    sortMode,
    setSortMode,
    sortedHand,
    canDownCheck,
  };
};
