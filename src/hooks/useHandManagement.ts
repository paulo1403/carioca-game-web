import { useCallback, useEffect, useMemo, useState } from "react";
import type { Card } from "@/types/game";
import {
  canFulfillContract,
  organizeHandAuto,
  sortCards,
  sortCardsByRank,
} from "@/utils/handAnalyzer";
import { applyOrder, type MoveDirection, moveId, normalizeOrder } from "@/utils/handOrder";

export type SortMode = "rank" | "suit" | "auto" | "manual";

export const useHandManagement = (
  hand: Card[],
  currentRound: number,
  haveMelded: boolean = false,
  boughtCards: Card[] = [],
  storageKey?: string,
) => {
  const [sortModeState, setSortModeState] = useState<SortMode>(() => {
    if (typeof window === "undefined" || !storageKey) return "suit";
    const raw = window.localStorage.getItem(`handSortMode:${storageKey}`);
    if (raw === "rank" || raw === "suit" || raw === "auto" || raw === "manual") return raw;
    return "suit";
  });

  const [manualOrder, setManualOrder] = useState<string[]>(() => {
    if (typeof window === "undefined" || !storageKey) return [];
    const raw = window.localStorage.getItem(`handOrder:${storageKey}`);
    try {
      const parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const handIds = useMemo(() => hand.map((c) => c.id), [hand]);
  const handIdsKey = handIds.join("|");

  useEffect(() => {
    setManualOrder((prev) => normalizeOrder(handIds, prev));
  }, [handIdsKey]);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    window.localStorage.setItem(`handSortMode:${storageKey}`, sortModeState);
  }, [sortModeState, storageKey]);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    window.localStorage.setItem(`handOrder:${storageKey}`, JSON.stringify(manualOrder));
  }, [manualOrder, storageKey]);

  const setSortMode = useCallback(
    (mode: SortMode) => {
      if (mode === "manual") {
        setManualOrder((prev) => normalizeOrder(handIds, prev.length ? prev : handIds));
      }
      setSortModeState(mode);
    },
    [handIds],
  );

  const moveManualCard = useCallback(
    (cardId: string, direction: MoveDirection) => {
      setSortMode("manual");
      setManualOrder((prev) => {
        const normalized = normalizeOrder(handIds, prev.length ? prev : handIds);
        return moveId(normalized, cardId, direction);
      });
    },
    [handIds, setSortMode],
  );

  const sortedHand = useCallback(() => {
    if (!hand) return [];

    if (sortModeState === "manual") {
      return applyOrder(hand, manualOrder);
    }

    const boughtIds = new Set(boughtCards.map((c) => c.id));
    const oldCards = hand.filter((c) => !boughtIds.has(c.id));
    const newCards = hand.filter((c) => boughtIds.has(c.id));

    let processedOld;
    if (sortModeState === "auto") {
      processedOld = organizeHandAuto(oldCards, currentRound, haveMelded);
    } else if (sortModeState === "rank") {
      processedOld = sortCardsByRank(oldCards);
    } else {
      processedOld = sortCards(oldCards);
    }

    return [...processedOld, ...newCards];
  }, [hand, boughtCards, sortModeState, manualOrder, currentRound, haveMelded])();

  const canDownCheck = useCallback(() => {
    const result = canFulfillContract(hand, currentRound, haveMelded);

    return {
      canDown: result.canDown,
      groups: result.groups,
    };
  }, [hand, currentRound, haveMelded])();

  return {
    sortMode: sortModeState,
    setSortMode,
    sortedHand,
    canDownCheck,
    moveManualCard,
  };
};
