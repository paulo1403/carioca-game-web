"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";

interface CreateGameResponse {
  roomId: string;
  playerId: string;
}

export function useCreateGame() {
  const router = useRouter();

  return useMutation({
    mutationFn: async (hostName: string) => {
      const res = await fetch("/api/game/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostName: hostName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al crear la sala");
      }

      return res.json() as Promise<CreateGameResponse>;
    },
    onSuccess: (data) => {
      // Store player ID for this room
      localStorage.setItem(`carioca_player_id_${data.roomId}`, data.playerId);

      // Navigate to the game room
      router.push(`/game/${data.roomId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear sala",
        description: error.message,
        type: "error",
      });
    },
  });
}
