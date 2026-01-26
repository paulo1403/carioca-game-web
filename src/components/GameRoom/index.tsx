"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { GameLobby } from "./GameLobby";
import { GameBoard } from "./GameBoard";
import { toast } from "@/hooks/use-toast";
import { useGameSounds } from "@/hooks/useGameSounds";
import { useGameState } from "@/hooks/game/useGameState";
import { useGameActions } from "@/hooks/game/useGameActions";
import { useGameLobby } from "@/hooks/game/useGameLobby";
import { useMyPlayerId } from "@/hooks/game/useMyPlayerId";
import { Toaster } from "@/components/Toaster";
import { Modal } from "@/components/Modal";
import { EMOJI_DISPLAY_MS } from "@/utils/emojiReactions";


interface GameRoomProps {
  roomId: string;
  playerName: string;
}

export const GameRoom: React.FC<GameRoomProps> = ({ roomId, playerName }) => {
  const router = useRouter();
  const { playSuccess, playError, playStart, playClick, playBuyIntent, playPop } = useGameSounds();

  // Get player ID using React Query hook
  const {
    myPlayerId,
    isLoading: isLoadingPlayerId,
    invalidateMyPlayerId,
  } = useMyPlayerId({
    roomId,
    enabled: true,
  });

  const [optimisticDrawn, setOptimisticDrawn] = useState<boolean>(false);

  // UI State
  const [, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isAddingBot, setIsAddingBot] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isRoomIdCopied, setIsRoomIdCopied] = useState(false);

  // Modal States
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    type?: "info" | "confirm" | "danger";
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: "",
    message: null,
  });

  const [roundWinnerModal, setRoundWinnerModal] = useState<{
    isOpen: boolean;
    winnerName: string;
    nextRound: number;
    scores: {
      name: string;
      score: number;
      buysUsed: number;
      roundScores: number[];
      roundBuys: number[];
    }[];
  }>({
    isOpen: false,
    winnerName: "",
    nextRound: 1,
    scores: [],
  });

  const [reshuffleBanner, setReshuffleBanner] = useState<{
    count: number;
  } | null>(null);

  // Refs
  const reshuffleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const [buyIntents, setBuyIntents] = useState<Record<string, number>>({});
  const [emojiReactions, setEmojiReactions] = useState<Record<string, { emoji: string; timestamp: number }>>({});
  const buyIntentTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const emojiTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Use React Query for game state - ELIMINAMOS POLLING DUPLICADO
  const {
    gameState,
    isLoading,
    error: queryError,
    invalidateGameState,
    sendBuyIntent,
    sendEmojiReaction,
  } = useGameState({
    roomId,
    myPlayerId,
    enabled: true,
    onPlayerJoined: (playerName) => {
      playSuccess();
    },
    onPlayerLeft: (playerName) => {
      playClick();
    },
    onRoundWinner: ({ winnerName, nextRound, scores }) => {
      playSuccess();
      setRoundWinnerModal({
        isOpen: true,
        winnerName,
        nextRound,
        scores,
      });
    },
    onReshuffle: (count) => {
      playClick();
      setReshuffleBanner({ count });

      if (reshuffleTimeoutRef.current) {
        clearTimeout(reshuffleTimeoutRef.current);
      }

      reshuffleTimeoutRef.current = setTimeout(() => {
        setReshuffleBanner(null);
      }, 5000);
    },
    onBuyIntent: ({ playerId, playerName, timestamp }) => {
      if (!playerId) return;
      if (!gameState) return;
      const name = playerName || gameState.players.find(p => p.id === playerId)?.name || "Jugador";
      setBuyIntents((prev) => ({ ...prev, [playerId]: timestamp }));
      playBuyIntent();
      toast({
        title: "¡COMPRO!",
        description: `${name} quiere comprar`,
        type: "info",
      });
      const existing = buyIntentTimeoutsRef.current[playerId];
      if (existing) clearTimeout(existing);
      buyIntentTimeoutsRef.current[playerId] = setTimeout(() => {
        setBuyIntents((prev) => {
          const next = { ...prev };
          delete next[playerId];
          return next;
        });
        delete buyIntentTimeoutsRef.current[playerId];
      }, 8000);
    },
    onEmojiReaction: ({ playerId, emoji, timestamp }) => {
      if (!playerId || !emoji) return;
      setEmojiReactions((prev) => ({ ...prev, [playerId]: { emoji, timestamp } }));
      playPop();
      const existing = emojiTimeoutsRef.current[playerId];
      if (existing) clearTimeout(existing);
      emojiTimeoutsRef.current[playerId] = setTimeout(() => {
        setEmojiReactions((prev) => {
          const next = { ...prev };
          delete next[playerId];
          return next;
        });
        delete emojiTimeoutsRef.current[playerId];
      }, EMOJI_DISPLAY_MS);
    },
  });

  const handleBuyIntent = async () => {
    if (!myPlayerId) return;
    if (!gameState) return;
    const myName = gameState.players.find(p => p.id === myPlayerId)?.name || "Jugador";
    await sendBuyIntent?.(myPlayerId, myName);
  };

  const handleEmojiReaction = async (emoji: string) => {
    if (!myPlayerId) return;
    setEmojiReactions((prev) => ({ ...prev, [myPlayerId]: { emoji, timestamp: Date.now() } }));
    const existing = emojiTimeoutsRef.current[myPlayerId];
    if (existing) clearTimeout(existing);
    emojiTimeoutsRef.current[myPlayerId] = setTimeout(() => {
      setEmojiReactions((prev) => {
        const next = { ...prev };
        delete next[myPlayerId];
        return next;
      });
      delete emojiTimeoutsRef.current[myPlayerId];
    }, EMOJI_DISPLAY_MS);
    await sendEmojiReaction?.(myPlayerId, emoji);
  };

  // Use React Query for game actions - MUTATIONS
  const gameActions = useGameActions({
    roomId,
    myPlayerId: myPlayerId || "",
    onSuccess: () => playClick(),
    onError: () => playError(),
  });

  // Use React Query for lobby actions
  const lobbyActions = useGameLobby({
    roomId,
    myPlayerId,
    onSuccess: () => playSuccess(),
    onError: () => playError(),
  });

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (reshuffleTimeoutRef.current) {
        clearTimeout(reshuffleTimeoutRef.current);
      }
    };
  }, []);

  // Reset optimistic state when turn, round or status changes
  useEffect(() => {
    if (gameState) {
      setOptimisticDrawn(false);
    }
  }, [gameState?.currentTurn, gameState?.currentRound, gameState?.status]);

  // Handle kicked player
  useEffect(() => {
    if (gameState && myPlayerId) {
      const amIInGame = gameState.players.some((p) => p.id === myPlayerId);
      if (!amIInGame && !isJoining) {
        // Player was kicked
        localStorage.removeItem(`carioca_player_id_${roomId}`);
        toast({
          title: "Expulsado",
          description: "Has sido expulsado de la sala",
          type: "error",
        });
        router.push("/");
      }
    }
  }, [gameState, myPlayerId, isJoining, roomId, router]);

  // Modal helpers
  const showModal = (
    title: string,
    message: React.ReactNode,
    type: "info" | "confirm" | "danger" = "info",
    onConfirm?: () => void,
  ) => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type,
      onConfirm,
    });
  };

  const closeModal = () => {
    setModalConfig((prev) => ({ ...prev, isOpen: false }));
  };

  const closeRoundWinner = () => {
    setRoundWinnerModal((prev) => ({ ...prev, isOpen: false }));
  };

  const closeReshuffleBanner = () => {
    setReshuffleBanner(null);
  };

  const handleLeaveGame = async () => {
    if (!myPlayerId) {
      toast({
        title: "Cargando",
        description: "Un momento, estamos cargando tu información...",
        type: "info",
      });
      return;
    }

    try {
      await lobbyActions.leaveGame.mutateAsync();
      localStorage.removeItem(`carioca_player_id_${roomId}`);
      router.push("/");
    } catch (err) {
      console.error("Error leaving game:", err);
    }
  };

  const handleJoin = async () => {
    setIsJoining(true);
    setError(null);

    try {
      const data = await lobbyActions.joinGame.mutateAsync(playerName);
      // Save playerId to localStorage and invalidate the query cache
      localStorage.setItem(`carioca_player_id_${roomId}`, data.playerId);
      invalidateMyPlayerId();
      playSuccess();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al unirse");
    } finally {
      setIsJoining(false);
    }
  };

  const handleAddBot = async (difficulty: "EASY" | "MEDIUM" | "HARD") => {
    setIsAddingBot(true);
    try {
      await lobbyActions.addBot.mutateAsync(difficulty);
    } catch {
      // Error handling already done in hook
    } finally {
      setIsAddingBot(false);
    }
  };

  const handleKickPlayer = async (playerIdToKick: string) => {
    const playerToKick = gameState?.players.find(
      (p) => p.id === playerIdToKick,
    );
    const playerName = playerToKick?.name || "este jugador";

    showModal(
      "Expulsar jugador",
      `¿Estás seguro de que quieres expulsar a ${playerName}?`,
      "danger",
      async () => {
        try {
          await lobbyActions.kickPlayer.mutateAsync(playerIdToKick);
          closeModal();
          playClick();
        } catch {
          // Error handling already done in hook
        }
      },
    );
  };

  const handleStartGame = async () => {
    try {
      await lobbyActions.startGame.mutateAsync();
      playStart();
    } catch {
      // Error handling already done in hook
    }
  };

  const handleUpdateTurnOrder = async (order: string[]) => {
    try {
      await lobbyActions.updateTurnOrder.mutateAsync(order);
      playClick();
    } catch {
      // Error handling already done in hook
    }
  };

  const handleDrawDeck = async () => {
    setOptimisticDrawn(true);
    try {
      await gameActions.drawDeck.mutateAsync();
      playSuccess();
    } catch {
      setOptimisticDrawn(false);
    }
  };

  const handleDrawDiscard = async () => {
    setOptimisticDrawn(true);
    try {
      await gameActions.buyFromDiscard.mutateAsync();
      playSuccess();
    } catch {
      setOptimisticDrawn(false);
    }
  };

  const handleDiscard = async (cardId: string) => {
    try {
      await gameActions.discard.mutateAsync(cardId);
      setOptimisticDrawn(false);
      playSuccess();
    } catch {
      playError();
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleGoDown = async (groups: any[][]): Promise<void> => {
    try {
      await gameActions.goDown.mutateAsync(groups);
      playSuccess();
    } catch {
      playError();
    }
  };

  const handleAddToMeld = async (
    cardId: string,
    targetPlayerId: string,
    meldIndex: number,
  ) => {
    try {
      await gameActions.addToMeld.mutateAsync({
        cardId,
        targetPlayerId,
        meldIndex,
      });
      playSuccess();
    } catch {
      playError();
    }
  };

  const handleStealJoker = async (
    cardId: string,
    targetPlayerId: string,
    meldIndex: number,
  ) => {
    try {
      await gameActions.stealJoker.mutateAsync({
        cardId,
        targetPlayerId,
        meldIndex,
      });
      playSuccess();
    } catch {
      playError();
    }
  };

  const handleReadyForNextRound = async () => {
    try {
      await gameActions.readyForNextRound.mutateAsync();
      playClick();
    } catch {
      playError();
    }
  };

  const handleStartNextRound = async () => {
    try {
      await gameActions.startNextRound.mutateAsync();
      playStart();
    } catch {
      playError();
    }
  };

  const handleEndGame = async () => {
    showModal(
      "Terminar juego",
      "¿Estás seguro de que quieres terminar el juego? Esto expulsará a todos los jugadores.",
      "danger",
      async () => {
        try {
          await lobbyActions.endGame.mutateAsync();
        } catch {
          // Error handling already done in hook
        }
      },
    );
  };

  const handleUpdateName = async (newName: string) => {
    try {
      await gameActions.updateName.mutateAsync(newName);
      playClick();
    } catch {
      // Error handling already done in hook
    }
  };

  const handleSkipBotTurn = async () => {
    try {
      if (!gameState) return;

      const currentPlayer = gameState.players[gameState.currentTurn];
      if (!currentPlayer || !currentPlayer.isBot) return;

      const res = await fetch(`/api/game/${roomId}/skip-bot-turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requesterId: myPlayerId }),
      });

      if (!res.ok) throw new Error("Error al saltar turno del bot");

      await res.json();
      playClick();
      invalidateGameState();
    } catch (error) {
      console.error("Error skipping bot turn:", error);
    }
  };

  const copyInviteLink = () => {
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setIsRoomIdCopied(true);
    setTimeout(() => setIsRoomIdCopied(false), 2000);
  };

  // Loading state
  if (isLoading && !gameState) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-0">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="text-text-secondary">Cargando sala...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (queryError) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-0">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="mb-4 text-6xl">❌</div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">
            Error al cargar la sala
          </h2>
          <p className="text-text-secondary mb-4">
            {queryError.message || "No se pudo conectar con el servidor"}
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-0">
        <div className="text-center">
          <p className="text-text-secondary">No se encontró la sala</p>
        </div>
      </div>
    );
  }

  const me = gameState.players.find((p) => p.id === myPlayerId);
  const isMyTurn =
    me && gameState.players[gameState.currentTurn]?.id === myPlayerId;
  const hasDrawn =
    optimisticDrawn ||
    (isMyTurn && gameState.status === "PLAYING" && me && me.hasDrawn);

  // Render appropriate view based on game status
  return (
    <div className="relative">
      <Toaster />

      {/* General Modal */}
      <Modal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        onClose={closeModal}
        onConfirm={modalConfig.onConfirm}
        type={modalConfig.type}
      >
        {modalConfig.message}
      </Modal>

      {gameState.status === "WAITING" ? (
        <GameLobby
          gameState={gameState}
          roomId={roomId}
          myPlayerId={myPlayerId}
          isJoining={isJoining}
          isAddingBot={isAddingBot}
          isStartingGame={lobbyActions.startGame.isPending}
          playerName={playerName}
          isCopied={isCopied}
          isRoomIdCopied={isRoomIdCopied}
          onJoin={handleJoin}
          onAddBot={handleAddBot}
          onKickPlayer={handleKickPlayer}
          onStartGame={handleStartGame}
          onUpdateTurnOrder={handleUpdateTurnOrder}
          onLeaveGame={handleLeaveGame}
          onCopyInviteLink={copyInviteLink}
          onCopyRoomId={copyRoomId}
          modalConfig={modalConfig}
          onCloseModal={closeModal}
        />
      ) : (
        <GameBoard
          gameState={gameState}
          myPlayerId={myPlayerId!}
          roomId={roomId}
          hasDrawn={hasDrawn ?? false}
          buyIntents={buyIntents}
          onBuyIntent={handleBuyIntent}
          emojiReactions={emojiReactions}
          onEmojiReaction={handleEmojiReaction}
          modalConfig={modalConfig}
          roundWinnerModal={roundWinnerModal}
          reshuffleBanner={reshuffleBanner}
          onCloseModal={closeModal}
          onCloseRoundWinner={closeRoundWinner}
          onCloseReshuffleBanner={closeReshuffleBanner}
          onDrawDeck={handleDrawDeck}
          onDrawDiscard={handleDrawDiscard}
          isDrawing={gameActions.isDrawing}
          isBuying={gameActions.isBuying}
          onDiscard={handleDiscard}
          onDown={handleGoDown}
          onAddToMeld={handleAddToMeld}
          onStealJoker={handleStealJoker}
          onReadyForNextRound={handleReadyForNextRound}
          onStartNextRound={handleStartNextRound}
          isStartingNextRound={gameActions.startNextRound.isPending}
          onEndGame={handleEndGame}
          onSkipBotTurn={handleSkipBotTurn}
          onUpdateName={handleUpdateName}
        />
      )}
    </div>
  );
};
