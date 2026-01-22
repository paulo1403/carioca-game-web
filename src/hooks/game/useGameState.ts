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
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "GameSession",
          filter: `id=eq.${roomId}`,
        },
        () => {
          // Invalida el cache inmediatamente al detectar un cambio en DB
          queryClient.invalidateQueries({ queryKey: ["gameState", roomId] });
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
