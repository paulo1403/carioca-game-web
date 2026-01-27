import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import type { GameState, Player } from "@/types/game";
import { getBuyPenalty, getRemainingBuys } from "@/utils/buys";

interface FinalPlayer extends Player {
  remainingBuys: number;
  buyPenalty: number;
  finalScore: number;
}

export function useFinalResults(players: Player[] | undefined, roomId?: string) {
  const queryClient = useQueryClient();

  const resolvedPlayers = useMemo(() => {
    if (players && players.length > 0) return players;
    if (!roomId) return [];
    const cached = queryClient.getQueryData<GameState>(["gameState", roomId]);
    return cached?.players ?? [];
  }, [players, roomId, queryClient]);

  const finalPlayers = useMemo<FinalPlayer[]>(() => {
    return resolvedPlayers.map((p) => {
      const remainingBuys = getRemainingBuys(p.buysUsed || 0);
      const buyPenalty = getBuyPenalty(p.buysUsed || 0);
      const finalScore = p.score || 0;
      return { ...p, remainingBuys, buyPenalty, finalScore };
    });
  }, [resolvedPlayers]);

  const sortedPlayers = useMemo(
    () => [...finalPlayers].sort((a, b) => a.finalScore - b.finalScore),
    [finalPlayers],
  );

  return { players: finalPlayers, sortedPlayers };
}
