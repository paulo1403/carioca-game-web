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
  onBuyIntent?: (data: { playerId: string; playerName?: string; timestamp: number }) => void;
  onEmojiReaction?: (data: { playerId: string; emoji: string; timestamp: number }) => void;
}

export function useGameState({
  roomId,
  myPlayerId,
  enabled = true,
  onPlayerJoined,
  onPlayerLeft,
  onRoundWinner,
  onReshuffle,
  onBuyIntent,
  onEmojiReaction,
}: UseGameStateOptions) {
  const queryClient = useQueryClient();
  const realtimeFailedRef = useRef(false);
  const channelRef = useRef<any>(null);

  // Suscripción Realtime a cambios en la base de datos
  useEffect(() => {
    if (!roomId || !enabled) return;

    let subscription: any = null;
    let fallbackInterval: any = null;

    const setupRealtime = async () => {
      try {
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
          queryClient.invalidateQueries({ queryKey: ["gameState", roomId] });
          queryClient.refetchQueries({ queryKey: ["gameState", roomId] });
        }
      )
      // Fallback: listen for custom broadcasts (player_change) sent by clients when they join
      .on(
        "broadcast",
        { event: "player_change" },
        (payload) => {
          const msg = payload?.payload ?? payload;

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
          // Immediately invalidate and refetch the game state
          queryClient.invalidateQueries({ queryKey: ["gameState", roomId] });
          queryClient.refetchQueries({ queryKey: ["gameState", roomId] });
        }
      )
      .on(
        "broadcast",
        { event: "buy_intent" },
        (payload) => {
          const data = payload?.payload ?? payload;
          if (data?.playerId) {
            onBuyIntent?.({
              playerId: data.playerId,
              playerName: data.playerName,
              timestamp: data.timestamp || Date.now(),
            });
          }
        }
      )
      .on(
        "broadcast",
        { event: "emoji_reaction" },
        (payload) => {
          const data = payload?.payload ?? payload;
          if (data?.playerId && data?.emoji) {
            onEmojiReaction?.({
              playerId: data.playerId,
              emoji: data.emoji,
              timestamp: data.timestamp || Date.now(),
            });
          }
        }
      )
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") {
          console.warn("[useGameState] Realtime subscription failed, using polling fallback", status);
          realtimeFailedRef.current = true;
        } else {
          realtimeFailedRef.current = false;
        }
      });

        subscription = channel;
        channelRef.current = channel;
      } catch (error) {
        console.warn("[useGameState] Failed to setup Realtime, using polling fallback", error);
        realtimeFailedRef.current = true;
      }

      // Fallback: Si Realtime falla, usa polling agresivo
      if (realtimeFailedRef.current || !subscription) {
        fallbackInterval = setInterval(() => {
          queryClient.refetchQueries({ queryKey: ["gameState", roomId] });
        }, 2000); // Polling cada 2 segundos como fallback (más responsivo)
      }
    };

    setupRealtime();

    return () => {
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
      if (subscription) {
        supabase.removeChannel(subscription);
      }
      channelRef.current = null;
    };
  }, [roomId, enabled, queryClient, onBuyIntent, onEmojiReaction]);

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
    // Polling agresivo como fallback para cuando Realtime no funciona
    refetchInterval: 2000,
    staleTime: 500,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
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

  const sendBuyIntent = async (playerId: string, playerName?: string) => {
    const channel = channelRef.current;
    if (!channel) return;
    await channel.send({
      type: "broadcast",
      event: "buy_intent",
      payload: { playerId, playerName, timestamp: Date.now() },
    });
  };

  const sendEmojiReaction = async (playerId: string, emoji: string) => {
    const channel = channelRef.current;
    if (!channel) return;
    await channel.send({
      type: "broadcast",
      event: "emoji_reaction",
      payload: { playerId, emoji, timestamp: Date.now() },
    });
  };

  return {
    gameState,
    isLoading,
    error,
    refetch,
    invalidateGameState,
    sendBuyIntent,
    sendEmojiReaction,
  };
}
