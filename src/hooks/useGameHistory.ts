"use client";

import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

export interface GameHistoryEntry {
  id: string;
  gameSessionId: string;
  winnerId: string | null;
  participants: Array<{ id: string; name: string; score: number }>;
  playedAt: string;
}

export function useGameHistory() {
  return useQuery<GameHistoryEntry[]>({
    queryKey: ["gameHistory"],
    queryFn: async () => {
      const res = await fetch("/api/history");

      if (!res.ok) {
        const error = new Error("Error al cargar el historial");
        toast({
          title: "Error al cargar historial",
          description: error.message,
          type: "error",
        });
        throw error;
      }

      const data = await res.json();
      return data as GameHistoryEntry[];
    },
    staleTime: 30000, // 30 segundos - el historial no cambia frecuentemente
    gcTime: 5 * 60 * 1000, // 5 minutos en cache
    refetchOnWindowFocus: false, // No refetch al cambiar de pestaña
    refetchOnMount: true, // Sí refetch al montar componente
    retry: 2, // Reintentar 2 veces si falla
  });
}
