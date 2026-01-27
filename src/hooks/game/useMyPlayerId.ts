"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

interface UseMyPlayerIdOptions {
  roomId: string;
  enabled?: boolean;
}

export function useMyPlayerId({ roomId, enabled = true }: UseMyPlayerIdOptions) {
  const queryClient = useQueryClient();

  // Obtener playerId de localStorage como fallback
  const [localPlayerId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`carioca_player_id_${roomId}`);
      return stored ? stored.trim() : null;
    }
    return null;
  });

  // Query para obtener playerId del servidor
  // El servidor puede retornar:
  // - playerId: si el usuario autenticado está en la partida
  // - null: si el usuario NO está autenticado O no está en la partida
  const {
    data: serverPlayerId,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["myPlayerId", roomId],
    queryFn: async () => {
      const res = await fetch(`/api/game/${roomId}/get-my-player-id`);
      if (!res.ok) {
        throw new Error("Failed to get player ID");
      }
      const data = await res.json();
      return data.playerId as string | null;
    },
    enabled: enabled,
    staleTime: 5 * 60 * 1000, // Considerar fresco por 5 minutos
    gcTime: 30 * 60 * 1000, // Mantener en cache 30 minutos
    retry: 2,
  });

  // Sincronizar localStorage cuando obtenemos playerId del servidor
  useEffect(() => {
    if (serverPlayerId) {
      localStorage.setItem(`carioca_player_id_${roomId}`, serverPlayerId);
    } else if (serverPlayerId === null && !localPlayerId) {
      // Si el servidor retorna null y no tenemos localStorage, limpiar
      localStorage.removeItem(`carioca_player_id_${roomId}`);
    }
  }, [serverPlayerId, roomId, localPlayerId]);

  // Determinar el playerId final:
  // 1. Si el servidor retorna un ID, usarlo (usuario autenticado)
  // 2. Si el servidor retorna null pero tenemos localStorage, usarlo (fallback)
  // 3. Si no hay nada, null
  const myPlayerId = serverPlayerId ?? localPlayerId ?? null;

  // Helper para invalidar el cache cuando se actualice (ej: después de join)
  const invalidateMyPlayerId = () => {
    queryClient.invalidateQueries({ queryKey: ["myPlayerId", roomId] });
  };

  // Helper para refetch manual si es necesario
  const refetchMyPlayerId = () => {
    return refetch();
  };

  return {
    myPlayerId,
    isLoading,
    error,
    invalidateMyPlayerId,
    refetchMyPlayerId,
  };
}
