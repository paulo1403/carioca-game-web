"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GameState } from "@/types/game";
import { useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface UseGameStateOptions {
  roomId: string;
  myPlayerId: string | null;
  enabled?: boolean;
  onPlayerJoined?: (playerName: string) => void;
  onPlayerLeft?: (playerName: string) => void;
  onRoundWinner?: (data: {
    winnerName: string;
    nextRound: number;
    scores: any[];
  }) => void;
  onReshuffle?: (count: number) => void;
}

export function useGameState({
  roomId,
  myPlayerId,
  enabled = true,
  onPlayerJoined,
  onPlayerLeft,
  onRoundWinner,
  onReshuffle,
}: UseGameStateOptions) {
  const queryClient = useQueryClient();

  // Suscripción Realtime a cambios en la base de datos
  useEffect(() => {
    if (!roomId || !enabled) return;

    const channel = supabase
      .channel(`game:${roomId}`)
      // GameSession updates (existing behavior)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "GameSession",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          // Invalida el cache inmediatamente al detectar un cambio en DB
          console.debug("[useGameState] Realtime GameSession UPDATE received", payload);
          queryClient.invalidateQueries({ queryKey: ["gameState", roomId] });
          // Force immediate refetch to avoid waiting for stale timers
          queryClient.refetchQueries({ queryKey: ["gameState", roomId] });
        }
      )
      // Also listen to Player table changes so inserts/deletes are received
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Player",
          filter: `gameSessionId=eq.${roomId}`,
        },
        (payload) => {
          console.debug("[useGameState] Realtime Player INSERT received", payload);
          queryClient.invalidateQueries({ queryKey: ["gameState", roomId] });
          queryClient.refetchQueries({ queryKey: ["gameState", roomId] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "Player",
          filter: `gameSessionId=eq.${roomId}`,
        },
        (payload) => {
          console.debug("[useGameState] Realtime Player DELETE received", payload);
          queryClient.invalidateQueries({ queryKey: ["gameState", roomId] });
          queryClient.refetchQueries({ queryKey: ["gameState", roomId] });
        }
      )
      // Also handle player updates (e.g., rename)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "Player",
          filter: `gameSessionId=eq.${roomId}`,
        },
        (payload) => {
          console.debug("[useGameState] Realtime Player UPDATE received", payload);
          queryClient.invalidateQueries({ queryKey: ["gameState", roomId] });
          queryClient.refetchQueries({ queryKey: ["gameState", roomId] });
        }
      )
      // Fallback: listen for custom broadcasts (player_change) sent by clients when they join
      .on(
        "broadcast",
        { event: "player_change" },
        (payload) => {
          console.debug("[useGameState] Broadcast player_change received", payload);          const msg = payload?.payload ?? payload;

          // Handle join with full player object for immediate optimistic update
          if (msg?.action === "join" && msg?.player) {
            const createdPlayer = msg.player;
            queryClient.setQueryData(["gameState", roomId], (old: any) => {
              if (!old) return old;
              const exists = old.players.some((p: any) => p.id === createdPlayer.id);
              if (exists) return old;
              const parsedPlayer = {
                ...createdPlayer,
                hand: JSON.parse(createdPlayer.hand || "[]"),
                melds: JSON.parse(createdPlayer.melds || "[]"),
                boughtCards: JSON.parse(createdPlayer.boughtCards || "[]"),
                roundScores: JSON.parse(createdPlayer.roundScores || "[]"),
                roundBuys: JSON.parse(createdPlayer.roundBuys || "[]"),
              };
              return { ...old, players: [...old.players, parsedPlayer] };
            });
            // Also trigger authoritative refetch
            queryClient.refetchQueries({ queryKey: ["gameState", roomId] });
            return;
          }

          // Handle leave
          if (msg?.action === "leave" && msg?.playerId) {
            queryClient.setQueryData(["gameState", roomId], (old: any) => {
              if (!old) return old;
              return { ...old, players: old.players.filter((p: any) => p.id !== msg.playerId) };
            });
            queryClient.refetchQueries({ queryKey: ["gameState", roomId] });
            return;
          }

          // Fallback: invalidate + refetch          queryClient.invalidateQueries({ queryKey: ["gameState", roomId] });
          queryClient.refetchQueries({ queryKey: ["gameState", roomId] });
        }
      )
      // Listen for game_started broadcast
      .on(
        "broadcast",
        { event: "game_started" },
        (payload) => {
          console.debug("[useGameState] Broadcast game_started received", payload);
          // Immediately invalidate and refetch the game state
          queryClient.invalidateQueries({ queryKey: ["gameState", roomId] });
          queryClient.refetchQueries({ queryKey: ["gameState", roomId] });
        }
      )
      // Listen for game_ended broadcast
      .on(
        "broadcast",
        { event: "game_ended" },
        (payload) => {
          console.debug("[useGameState] Broadcast game_ended received", payload);
          // Immediately invalidate and refetch the game state
          queryClient.invalidateQueries({ queryKey: ["gameState", roomId] });
          queryClient.refetchQueries({ queryKey: ["gameState", roomId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, enabled, queryClient]);

  // Track previous state for notifications
  const prevPlayersRef = useRef<any[]>([]);
  const lastActionTimestampRef = useRef<number>(0);
  const prevReshuffleCountRef = useRef<number | null>(null);

  const {
    data: gameState,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["gameState", roomId],
    queryFn: async () => {
      const res = await fetch(`/api/game/${roomId}/state`);
      if (!res.ok) {
        throw new Error("Error al cargar el estado del juego");
      }
      const data = await res.json();
      return data.gameState as GameState;
    },
    enabled: enabled && !!roomId,
    // Polling de seguridad muy lento (heartbeat) ya que usamos Realtime
    refetchInterval: 60000,
    staleTime: 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  // Effect para detectar cambios y notificar
  useEffect(() => {
    if (!gameState) return;

    // Handle reshuffle notifications
    if (typeof gameState.reshuffleCount === "number") {
      const nextCount = gameState.reshuffleCount;
      const prevCount = prevReshuffleCountRef.current;

      if (prevCount === null) {
        prevReshuffleCountRef.current = nextCount;
      } else if (nextCount > prevCount) {
        prevReshuffleCountRef.current = nextCount;
        onReshuffle?.(nextCount);
      } else {
        prevReshuffleCountRef.current = nextCount;
      }
    }

    // Handle round winner notifications
    if (
      gameState.lastAction &&
      gameState.lastAction.description &&
      (gameState.lastAction.description.includes("ganó la ronda") ||
        gameState.lastAction.type === "DOWN") &&
      gameState.lastAction.timestamp > lastActionTimestampRef.current &&
      (gameState.status === "ROUND_ENDED" || gameState.status === "FINISHED")
    ) {
      const description = gameState.lastAction.description;
      const winnerName = description.split(" ganó")[0].replace("¡", "");

      onRoundWinner?.({
        winnerName,
        nextRound: gameState.currentRound,
        scores: gameState.players.map((p: any) => ({
          name: p.name,
          score: p.score,
          buysUsed: p.buysUsed,
          roundScores: p.roundScores || [],
          roundBuys: p.roundBuys || [],
        })),
      });
    }

    // Handle game actions and notifications
    if (
      gameState.lastAction &&
      gameState.lastAction.timestamp > lastActionTimestampRef.current
    ) {
      lastActionTimestampRef.current = gameState.lastAction.timestamp;

      const action = gameState.lastAction;
      if (action.description && action.playerId !== myPlayerId) {
        toast({
          title: "Acción de juego",
          description: action.description,
          type: "info",
          duration: 3000,
        });
      }
    }

    // Handle player changes (join/leave notifications)
    const currentIds = gameState.players.map((p: any) => p.id);
    const prevIds = prevPlayersRef.current.map((p: any) => p.id);

    // Players who left
    const leftPlayers = prevPlayersRef.current.filter(
      (p: any) => !currentIds.includes(p.id),
    );
    if (leftPlayers.length > 0 && prevPlayersRef.current.length > 0) {
      leftPlayers.forEach((p: any) => {
        onPlayerLeft?.(p.name);
        toast({
          title: "Jugador desconectado",
          description: `${p.name} abandonó la partida`,
          type: "info",
        });
      });
    }

    // Players who joined
    const newPlayers = gameState.players.filter(
      (p: any) => !prevIds.includes(p.id),
    );
    if (newPlayers.length > 0 && prevPlayersRef.current.length > 0) {
      newPlayers.forEach((p: any) => {
        onPlayerJoined?.(p.name);
        toast({
          title: "Nuevo jugador",
          description: `${p.name} se unió a la partida`,
          type: "success",
        });
      });
    }

    prevPlayersRef.current = gameState.players;
  }, [
    gameState,
    myPlayerId,
    onPlayerJoined,
    onPlayerLeft,
    onRoundWinner,
    onReshuffle,
  ]);

  const invalidateGameState = () => {
    queryClient.invalidateQueries({ queryKey: ["gameState", roomId] });
  };

  return {
    gameState,
    isLoading,
    error,
    refetch,
    invalidateGameState,
  };
}
