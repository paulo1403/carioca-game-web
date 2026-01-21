"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

interface UseGameActionsOptions {
  roomId: string;
  myPlayerId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useGameActions({
  roomId,
  myPlayerId,
  onSuccess,
  onError,
}: UseGameActionsOptions) {
  const queryClient = useQueryClient();

  // Helper para invalidar el cache
  const invalidateGameState = () => {
    queryClient.invalidateQueries({ queryKey: ["gameState", roomId] });
  };

  // Draw from deck
  const drawDeck = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/game/${roomId}/move`, {
        method: "POST",
        body: JSON.stringify({ playerId: myPlayerId, action: "DRAW_DECK" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al robar");
      }

      return res.json();
    },
    onSuccess: () => {
      invalidateGameState();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        type: "error",
      });
      onError?.(error);
    },
  });

  // Buy from discard pile
  const buyFromDiscard = useMutation({
    mutationFn: async () => {
      // Intent to buy
      const intendRes = await fetch(`/api/game/${roomId}/move`, {
        method: "POST",
        body: JSON.stringify({ playerId: myPlayerId, action: "INTEND_BUY" }),
      });

      if (!intendRes.ok) {
        const data = await intendRes.json();
        throw new Error(data.error || "Error al solicitar compra");
      }

      // Actually buy
      const buyRes = await fetch(`/api/game/${roomId}/move`, {
        method: "POST",
        body: JSON.stringify({ playerId: myPlayerId, action: "DRAW_DISCARD" }),
      });

      if (!buyRes.ok) {
        const data = await buyRes.json();
        throw new Error(data.error || "Error al comprar");
      }

      return buyRes.json();
    },
    onSuccess: () => {
      invalidateGameState();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        type: "error",
      });
      onError?.(error);
    },
  });

  // Discard card
  const discard = useMutation({
    mutationFn: async (cardId: string) => {
      const res = await fetch(`/api/game/${roomId}/move`, {
        method: "POST",
        body: JSON.stringify({
          playerId: myPlayerId,
          action: "DISCARD",
          payload: { cardId },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "No puedes botar esa carta");
      }

      return res.json();
    },
    onSuccess: () => {
      invalidateGameState();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        type: "error",
      });
      onError?.(error);
    },
  });

  // Go down (meld cards)
  const goDown = useMutation({
    mutationFn: async (groups: any[][]) => {
      const res = await fetch(`/api/game/${roomId}/move`, {
        method: "POST",
        body: JSON.stringify({
          playerId: myPlayerId,
          action: "DOWN",
          payload: { groups },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al bajar");
      }

      return res.json();
    },
    onSuccess: () => {
      invalidateGameState();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        type: "error",
      });
      onError?.(error);
    },
  });

  // Add to existing meld
  const addToMeld = useMutation({
    mutationFn: async ({
      cardId,
      targetPlayerId,
      meldIndex,
    }: {
      cardId: string;
      targetPlayerId: string;
      meldIndex: number;
    }) => {
      const res = await fetch(`/api/game/${roomId}/move`, {
        method: "POST",
        body: JSON.stringify({
          playerId: myPlayerId,
          action: "ADD_TO_MELD",
          payload: { cardId, targetPlayerId, meldIndex },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al añadir carta");
      }

      return res.json();
    },
    onSuccess: () => {
      invalidateGameState();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        type: "error",
      });
      onError?.(error);
    },
  });

  // Steal joker
  const stealJoker = useMutation({
    mutationFn: async ({
      cardId,
      targetPlayerId,
      meldIndex,
    }: {
      cardId: string;
      targetPlayerId: string;
      meldIndex: number;
    }) => {
      const res = await fetch(`/api/game/${roomId}/move`, {
        method: "POST",
        body: JSON.stringify({
          playerId: myPlayerId,
          action: "STEAL_JOKER",
          payload: { cardId, targetPlayerId, meldIndex },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al robar joker");
      }

      return res.json();
    },
    onSuccess: () => {
      invalidateGameState();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        type: "error",
      });
      onError?.(error);
    },
  });

  // Ready for next round
  const readyForNextRound = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/game/${roomId}/move`, {
        method: "POST",
        body: JSON.stringify({
          playerId: myPlayerId,
          action: "READY_FOR_NEXT_ROUND",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al confirmar");
      }

      return res.json();
    },
    onSuccess: () => {
      invalidateGameState();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        type: "error",
      });
      onError?.(error);
    },
  });

  // Start next round
  const startNextRound = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/game/${roomId}/move`, {
        method: "POST",
        body: JSON.stringify({
          playerId: myPlayerId,
          action: "START_NEXT_ROUND",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al iniciar");
      }

      return res.json();
    },
    onSuccess: () => {
      invalidateGameState();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        type: "error",
      });
      onError?.(error);
    },
  });

  // Update player name
  const updateName = useMutation({
    mutationFn: async (newName: string) => {
      const res = await fetch(`/api/game/${roomId}/update-name`, {
        method: "POST",
        body: JSON.stringify({ playerId: myPlayerId, newName }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al actualizar nombre");
      }

      return res.json();
    },
    onSuccess: () => {
      invalidateGameState();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        type: "error",
      });
      onError?.(error);
    },
  });

  return {
    drawDeck,
    buyFromDiscard,
    discard,
    goDown,
    addToMeld,
    stealJoker,
    readyForNextRound,
    startNextRound,
    updateName,
  };
}
