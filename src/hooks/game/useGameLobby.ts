"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

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
        body: JSON.stringify({ name: playerName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al unirse a la partida");
      }

      return res.json();
    },
    onSuccess: (data) => {
      // Store player ID in localStorage IMMEDIATELY
      const createdPlayer = data.player;
      if (typeof window !== "undefined" && createdPlayer?.id) {
        localStorage.setItem(`carioca_player_id_${roomId}`, createdPlayer.id);
      }

      // Optimistically append new player to cache so UI updates immediately
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

      invalidateGameState();
      // Force refetch right away for authoritative state
      queryClient.refetchQueries({ queryKey: ["gameState", roomId] });

      // Broadcast full player object so other clients can update instantly
      try {
        supabase.channel(`game:${roomId}`).send({
          type: "broadcast",
          event: "player_change",
          payload: {
            action: "join",
            player: createdPlayer,
          },
        });
        console.debug("[useGameLobby] Broadcast player_change sent", { roomId, player: createdPlayer.id });
      } catch (err) {
        console.debug("[useGameLobby] Failed sending broadcast", err);
      }

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
    onSuccess: (data) => {
      const createdBot = data.bot;
      // Optimistic append
      queryClient.setQueryData(["gameState", roomId], (old: any) => {
        if (!old) return old;
        const exists = old.players.some((p: any) => p.id === createdBot.id);
        if (exists) return old;
        const parsed = {
          ...createdBot,
          hand: JSON.parse(createdBot.hand || "[]"),
          melds: JSON.parse(createdBot.melds || "[]"),
          boughtCards: JSON.parse(createdBot.boughtCards || "[]"),
          roundScores: JSON.parse(createdBot.roundScores || "[]"),
          roundBuys: JSON.parse(createdBot.roundBuys || "[]"),
        };
        return { ...old, players: [...old.players, parsed] };
      });

      invalidateGameState();

      try {
        supabase.channel(`game:${roomId}`).send({
          type: "broadcast",
          event: "player_change",
          payload: { action: "join", player: createdBot },
        });
        console.debug("[useGameLobby] Broadcast bot join sent", { roomId, botId: createdBot.id });
      } catch (err) {
        console.debug("[useGameLobby] Failed sending bot broadcast", err);
      }

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
      const currentId =
        myPlayerId ||
        (typeof window !== "undefined"
          ? localStorage.getItem(`carioca_player_id_${roomId}`)
          : null);

      const res = await fetch(`/api/game/${roomId}/remove-player`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerIdToRemove: playerIdToKick,
          requesterId: currentId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al expulsar jugador");
      }

      return res.json();
    },
    onSuccess: (_data, playerIdToKick) => {
      // Optimistically remove
      queryClient.setQueryData(["gameState", roomId], (old: any) => {
        if (!old) return old;
        return { ...old, players: old.players.filter((p: any) => p.id !== playerIdToKick) };
      });

      invalidateGameState();
      // Broadcast player removal so hosts see the leave immediately
      try {
        supabase.channel(`game:${roomId}`).send({
          type: "broadcast",
          event: "player_change",
          payload: { action: "leave", playerId: playerIdToKick },
        });
        console.debug("[useGameLobby] Broadcast player_leave sent", { roomId, playerIdToKick });
      } catch (err) {
        console.debug("[useGameLobby] Failed sending player_leave broadcast", err);
      }

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
      // Refetch inmediatamente para que todos vean el juego iniciado
      queryClient.refetchQueries({ queryKey: ["gameState", roomId] });
      
      // Broadcast a otros jugadores que el juego inició
      try {
        supabase.channel(`game:${roomId}`).send({
          type: "broadcast",
          event: "game_started",
          payload: { roomId },
        });
        console.debug("[useGameLobby] Broadcast game_started sent", { roomId });
      } catch (err) {
        console.debug("[useGameLobby] Failed sending game_started broadcast", err);
      }
      
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
      const currentId =
        myPlayerId ||
        (typeof window !== "undefined"
          ? localStorage.getItem(`carioca_player_id_${roomId}`)
          : null);

      const res = await fetch(`/api/game/${roomId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requesterId: currentId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al terminar juego");
      }

      return res.json();
    },
    onSuccess: () => {
      invalidateGameState();
      // Refetch inmediatamente para que todos vean que el juego terminó
      queryClient.refetchQueries({ queryKey: ["gameState", roomId] });
      
      // Broadcast a otros jugadores que el juego terminó
      try {
        supabase.channel(`game:${roomId}`).send({
          type: "broadcast",
          event: "game_ended",
          payload: { roomId },
        });
        console.debug("[useGameLobby] Broadcast game_ended sent", { roomId });
      } catch (err) {
        console.debug("[useGameLobby] Failed sending game_ended broadcast", err);
      }
      
      // Clear localStorage and redirect handled by component
      localStorage.removeItem(`carioca_player_id_${roomId}`);

      // Force redirect to home
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }

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
      if (!myPlayerId) {
        throw new Error("No se encontró tu ID de jugador. Recargando...");
      }

      const res = await fetch(`/api/game/${roomId}/remove-player`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerIdToRemove: myPlayerId,
          requesterId: myPlayerId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al salir");
      }

      return res.json();
    },
    onSuccess: (_data) => {
      // Optimistically remove self from cache so host and others update immediately
      const leavingId = myPlayerId;
      if (leavingId) {
        queryClient.setQueryData(["gameState", roomId], (old: any) => {
          if (!old) return old;
          return { ...old, players: old.players.filter((p: any) => p.id !== leavingId) };
        });

        // Broadcast leave so other clients can update instantly
        try {
          supabase.channel(`game:${roomId}`).send({
            type: "broadcast",
            event: "player_change",
            payload: { action: "leave", playerId: leavingId },
          });
          console.debug("[useGameLobby] Broadcast leave sent", { roomId, playerId: leavingId });
        } catch (err) {
          console.debug("[useGameLobby] Failed sending leave broadcast", err);
        }
      }

      // Clear localStorage and redirect handled by component
      if (typeof window !== "undefined") {
        localStorage.removeItem(`carioca_player_id_${roomId}`);
      }
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
