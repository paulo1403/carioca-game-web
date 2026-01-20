"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GameState } from "@/types/game";
import { useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";

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
    // Polling adaptativo basado en estado del juego
    refetchInterval: (query) => {
      const state = query.state.data;
      if (!state) return false;

      // Polling durante el juego activo
      if (state.status === "PLAYING") {
        return 3000; // 3 segundos durante juego activo
      }

      // Polling en lobby - menos frecuente
      if (state.status === "WAITING") {
        return 8000; // 8 segundos en lobby
      }

      // Polling muy lento en estados terminados
      if (state.status === "ROUND_ENDED") {
        return 15000; // 15 segundos esperando siguiente ronda
      }

      if (state.status === "FINISHED") {
        return false; // Sin polling en juego terminado
      }

      return false; // Sin polling por defecto
    },
    staleTime: 1000, // Considerar datos frescos por 1 segundo
    gcTime: 5 * 60 * 1000, // Mantener en cache 5 minutos
    refetchOnMount: true,
    refetchOnWindowFocus: false, // No refetch al cambiar de pestaña
    refetchOnReconnect: true, // Sí refetch al reconectar
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

    // Check if player was kicked
    if (myPlayerId) {
      const amIInGame = gameState.players.some((p: any) => p.id === myPlayerId);
      if (!amIInGame && prevPlayersRef.current.length > 0) {
        // Player was kicked - handled by parent component
      }
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

  // Mutation helper para invalidar el cache después de acciones
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
