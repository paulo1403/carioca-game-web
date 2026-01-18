import { useState, useCallback } from "react";
import { Card } from "@/types/game";

export const useDownMode = () => {
  const [isDownMode, setIsDownMode] = useState(false);
  const [tempGroup, setTempGroup] = useState<Card[]>([]);
  const [groupsToMeld, setGroupsToMeld] = useState<Card[][]>([]);

  const toggleDownMode = useCallback(() => {
    if (isDownMode) {
      setIsDownMode(false);
      setTempGroup([]);
      setGroupsToMeld([]);
    } else {
      setIsDownMode(true);
    }
  }, [isDownMode]);

  const addCardToTempGroup = useCallback((card: Card) => {
    setTempGroup((prev) => [...prev, card]);
  }, []);

  const removeCardFromTempGroup = useCallback((cardId: string) => {
    setTempGroup((prev) => prev.filter((c) => c.id !== cardId));
  }, []);

  const toggleCardInTempGroup = useCallback((card: Card) => {
    setTempGroup((prev) =>
      prev.some((c) => c.id === card.id)
        ? prev.filter((c) => c.id !== card.id)
        : [...prev, card]
    );
  }, []);

  const addGroupToMeld = useCallback((group: Card[]) => {
    setGroupsToMeld((prev) => [...prev, group]);
  }, []);

  const resetDownMode = useCallback(() => {
    setIsDownMode(false);
    setTempGroup([]);
    setGroupsToMeld([]);
  }, []);

  return {
    isDownMode,
    tempGroup,
    groupsToMeld,
    toggleDownMode,
    addCardToTempGroup,
    removeCardFromTempGroup,
    toggleCardInTempGroup,
    addGroupToMeld,
    setGroupsToMeld,
    setTempGroup,
    resetDownMode,
  };
};
