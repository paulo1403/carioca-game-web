"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

interface UseGameLobbyOptions {
  roomId: string;
  myPlayerId: string | null;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useGameLobby({
  roomId,
  myPlayerId,
  onSuccess,
  onError,
}: UseGameLobbyOptions) {
  const queryClient = useQueryClient();

  // Helper para invalidar el cache
  const invalidateGameState = () => {
    queryClient.invalidateQueries({ queryKey: ["gameState", roomId] });
  };

  // Join game
  const joinGame = useMutation({
    mutationFn: async (playerName: string) => {
      const res = await fetch(`/api/game/${roomId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: playerName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al unirse a la partida");
      }

      return res.json();
    },
    onSuccess: (data) => {
      // Store player ID in localStorage
      localStorage.setItem(`carioca_player_id_${roomId}`, data.playerId);
      invalidateGameState();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al unirse",
        description: error.message,
        type: "error",
      });
      onError?.(error);
    },
  });

  // Add bot
  const addBot = useMutation({
    mutationFn: async (difficulty: "EASY" | "MEDIUM" | "HARD") => {
      const res = await fetch(`/api/game/${roomId}/add-bot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al añadir bot");
      }

      return res.json();
    },
    onSuccess: () => {
      invalidateGameState();
      toast({
        title: "Bot añadido",
        description: "El bot se unió a la partida",
        type: "success",
      });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al añadir bot",
        description: error.message,
        type: "error",
      });
      onError?.(error);
    },
  });

  // Kick player
  const kickPlayer = useMutation({
    mutationFn: async (playerIdToKick: string) => {
      const res = await fetch(`/api/game/${roomId}/remove-player`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerIdToRemove: playerIdToKick,
          requesterId: myPlayerId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al expulsar jugador");
      }

      return res.json();
    },
    onSuccess: () => {
      invalidateGameState();
      toast({
        title: "Jugador expulsado",
        description: "El jugador fue expulsado de la sala",
        type: "info",
      });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al expulsar",
        description: error.message,
        type: "error",
      });
      onError?.(error);
    },
  });

  // Start game
  const startGame = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/game/${roomId}/start`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al iniciar partida");
      }

      return res.json();
    },
    onSuccess: () => {
      invalidateGameState();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al iniciar",
        description: error.message,
        type: "error",
      });
      onError?.(error);
    },
  });

  // End game
  const endGame = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/game/${roomId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requesterId: myPlayerId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al terminar juego");
      }

      return res.json();
    },
    onSuccess: () => {
      // Clear localStorage and redirect handled by component
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al terminar juego",
        description: error.message,
        type: "error",
      });
      onError?.(error);
    },
  });

  // Leave game
  const leaveGame = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/game/${roomId}/remove-player`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: myPlayerId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al salir");
      }

      return res.json();
    },
    onSuccess: () => {
      // Clear localStorage and redirect handled by component
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al salir",
        description: error.message,
        type: "error",
      });
      onError?.(error);
    },
  });

  return {
    joinGame,
    addBot,
    kickPlayer,
    startGame,
    endGame,
    leaveGame,
  };
}
