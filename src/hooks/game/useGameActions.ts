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
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["gameState", roomId] });
      const previousState = queryClient.getQueryData<any>(["gameState", roomId]);

      if (previousState) {
        const newState = JSON.parse(JSON.stringify(previousState));
        const player = newState.players.find((p: any) => p.id === myPlayerId);
        if (player) {
          player.hasDrawn = true;
          // Agregamos una carta placeholder para feedback visual inmediato si es posible
          player.hand.push({ id: "optimistic-draw", suit: "JOKER", value: 0, displayValue: "?" });
        }
        queryClient.setQueryData(["gameState", roomId], newState);
      }

      return { previousState };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousState) {
        queryClient.setQueryData(["gameState", roomId], context.previousState);
      }
      toast({
        title: "Error",
        description: error.message,
        type: "error",
      });
      onError?.(error);
    },
    onSettled: () => {
      invalidateGameState();
      queryClient.refetchQueries({ queryKey: ["gameState", roomId] });
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
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["gameState", roomId] });
      const previousState = queryClient.getQueryData<any>(["gameState", roomId]);

      if (previousState && previousState.discardPile.length > 0) {
        const newState = JSON.parse(JSON.stringify(previousState));
        const player = newState.players.find((p: any) => p.id === myPlayerId);
        if (player) {
          const card = newState.discardPile.pop();
          player.hand.push(card);
          player.hasDrawn = true;
          // Por simplicidad optimista solo movemos la del descarte, 
          // las 2 del mazo aparecerán cuando el server responda
        }
        queryClient.setQueryData(["gameState", roomId], newState);
      }

      return { previousState };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousState) {
        queryClient.setQueryData(["gameState", roomId], context.previousState);
      }
      toast({
        title: "Error",
        description: error.message,
        type: "error",
      });
      onError?.(error);
    },
    onSettled: () => {
      invalidateGameState();
      queryClient.refetchQueries({ queryKey: ["gameState", roomId] });
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
    onMutate: async (cardId) => {
      // Cancelar refetches salientes para no sobrescribir nuestro estado optimista
      await queryClient.cancelQueries({ queryKey: ["gameState", roomId] });

      // Guardar el estado previo para rollback
      const previousState = queryClient.getQueryData<any>(["gameState", roomId]);

      // Aplicar el cambio optimista
      if (previousState) {
        const newState = JSON.parse(JSON.stringify(previousState));
        const playerIndex = newState.players.findIndex((p: any) => p.id === myPlayerId);

        if (playerIndex !== -1) {
          const player = newState.players[playerIndex];
          const cardIndex = player.hand.findIndex((c: any) => c.id === cardId);

          if (cardIndex !== -1) {
            const [card] = player.hand.splice(cardIndex, 1);
            newState.discardPile.push(card);
            // Simular cambio de turno (simplificado)
            newState.currentTurn = (newState.currentTurn - 1 + newState.players.length) % newState.players.length;
            player.hasDrawn = false;
          }
        }

        queryClient.setQueryData(["gameState", roomId], newState);
      }

      return { previousState };
    },
    onError: (error: Error, _variables, context) => {
      // Si hay error, volvemos al estado anterior
      if (context?.previousState) {
        queryClient.setQueryData(["gameState", roomId], context.previousState);
      }
      toast({
        title: "Error",
        description: error.message,
        type: "error",
      });
      onError?.(error);
    },
    onSettled: () => {
      // Siempre refrescar al terminar (exito o error) para sincronizar con el server
      invalidateGameState();
      queryClient.refetchQueries({ queryKey: ["gameState", roomId] });
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
    onMutate: async (groups) => {
      await queryClient.cancelQueries({ queryKey: ["gameState", roomId] });
      const previousState = queryClient.getQueryData<any>(["gameState", roomId]);

      if (previousState) {
        const newState = JSON.parse(JSON.stringify(previousState));
        const player = newState.players.find((p: any) => p.id === myPlayerId);
        if (player) {
          // Remover cartas de la mano
          const flatCardsIds = groups.flat().map((c: any) => c.id);
          player.hand = player.hand.filter((c: any) => !flatCardsIds.includes(c.id));
          // Añadir a melds
          if (!player.melds) player.melds = [];
          player.melds.push(...groups);
        }
        queryClient.setQueryData(["gameState", roomId], newState);
      }

      return { previousState };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousState) {
        queryClient.setQueryData(["gameState", roomId], context.previousState);
      }
      toast({
        title: "Error",
        description: error.message,
        type: "error",
      });
      onError?.(error);
    },
    onSettled: () => {
      invalidateGameState();
      queryClient.refetchQueries({ queryKey: ["gameState", roomId] });
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
    onMutate: async ({ cardId, targetPlayerId, meldIndex }) => {
      await queryClient.cancelQueries({ queryKey: ["gameState", roomId] });
      const previousState = queryClient.getQueryData<any>(["gameState", roomId]);

      if (previousState) {
        const newState = JSON.parse(JSON.stringify(previousState));
        const player = newState.players.find((p: any) => p.id === myPlayerId);
        const targetPlayer = newState.players.find((p: any) => p.id === targetPlayerId);

        if (player && targetPlayer && targetPlayer.melds?.[meldIndex]) {
          const cardIdx = player.hand.findIndex((c: any) => c.id === cardId);
          if (cardIdx !== -1) {
            const [card] = player.hand.splice(cardIdx, 1);
            targetPlayer.melds[meldIndex].push(card);
          }
        }
        queryClient.setQueryData(["gameState", roomId], newState);
      }

      return { previousState };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousState) {
        queryClient.setQueryData(["gameState", roomId], context.previousState);
      }
      toast({
        title: "Error",
        description: error.message,
        type: "error",
      });
      onError?.(error);
    },
    onSettled: () => {
      invalidateGameState();
      queryClient.refetchQueries({ queryKey: ["gameState", roomId] });
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
    onMutate: async ({ cardId, targetPlayerId, meldIndex }) => {
      await queryClient.cancelQueries({ queryKey: ["gameState", roomId] });
      const previousState = queryClient.getQueryData<any>(["gameState", roomId]);

      if (previousState) {
        const newState = JSON.parse(JSON.stringify(previousState));
        const player = newState.players.find((p: any) => p.id === myPlayerId);
        const targetPlayer = newState.players.find((p: any) => p.id === targetPlayerId);

        if (player && targetPlayer && targetPlayer.melds?.[meldIndex]) {
          const cardIdx = player.hand.findIndex((c: any) => c.id === cardId);
          const targetMeld = targetPlayer.melds[meldIndex];
          const jokerIdx = targetMeld.findIndex((c: any) => c.suit === "JOKER" || c.value === 0);

          if (cardIdx !== -1 && jokerIdx !== -1) {
            const [card] = player.hand.splice(cardIdx, 1);
            const [joker] = targetMeld.splice(jokerIdx, 1);
            targetMeld.push(card);
            player.hand.push(joker);
          }
        }
        queryClient.setQueryData(["gameState", roomId], newState);
      }

      return { previousState };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousState) {
        queryClient.setQueryData(["gameState", roomId], context.previousState);
      }
      toast({
        title: "Error",
        description: error.message,
        type: "error",
      });
      onError?.(error);
    },
    onSettled: () => {
      invalidateGameState();
      queryClient.refetchQueries({ queryKey: ["gameState", roomId] });
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
      queryClient.refetchQueries({ queryKey: ["gameState", roomId] });
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
