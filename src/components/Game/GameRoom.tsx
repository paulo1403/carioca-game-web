"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Board } from "@/components/Board";
import { GameState } from "@/types/game";
import { ROUND_CONTRACTS } from "@/types/game";
import { Modal } from "@/components/Modal";
import { useRouter } from "next/navigation";
import {
  Copy,
  Link as LinkIcon,
  LogOut,
  User,
  Bot,
  UserMinus,
  Play,
  Loader2,
  Gamepad2,
  Crown,
  Menu,
  BookOpen,
  Ban,
  X,
  Trophy,
  QrCode,
  Scan,
  Home,
  Volume2,
  VolumeX,
  Shuffle,
} from "lucide-react";
import { Toaster } from "@/components/Toaster";
import { toast } from "@/hooks/use-toast";
import { RulesModal } from "@/components/RulesModal";
import QRCode from "react-qr-code";
import { useGameSounds } from "@/hooks/useGameSounds";

interface GameRoomProps {
  roomId: string;
  playerName: string;
}

export const GameRoom: React.FC<GameRoomProps> = ({ roomId, playerName }) => {
  const router = useRouter();
  const { isMuted, toggleMute, playSuccess, playError, playStart, playClick } =
    useGameSounds();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string>("");
  const [optimisticDrawn, setOptimisticDrawn] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isRoomIdCopied, setIsRoomIdCopied] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isAddingBot, setIsAddingBot] = useState(false);
  const [joinName, setJoinName] = useState(playerName);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showGameInfo, setShowGameInfo] = useState(false);

  // Track previous players to detect leavers
  const prevPlayersRef = useRef<any[]>([]);
  // Track last action timestamp to avoid duplicate toasts
  const lastActionTimestampRef = useRef<number>(0);
  const prevReshuffleCountRef = useRef<number | null>(null);
  const reshuffleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal State
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

  const showModal = (
    title: string,
    message: React.ReactNode,
    type: "info" | "confirm" | "danger" = "info",
    onConfirm?: () => void
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

  useEffect(() => {
    return () => {
      if (reshuffleTimeoutRef.current) {
        clearTimeout(reshuffleTimeoutRef.current);
      }
    };
  }, []);

  // Memoized fetch function to avoid stale closures in setInterval
  const fetchGameState = useCallback(async () => {
    try {
      const res = await fetch(`/api/game/${roomId}/state`);
      if (res.ok) {
        const data = await res.json();

        if (typeof data.gameState?.reshuffleCount === "number") {
          const nextCount: number = data.gameState.reshuffleCount;
          const prevCount = prevReshuffleCountRef.current;
          if (prevCount === null) {
            prevReshuffleCountRef.current = nextCount;
          } else if (nextCount > prevCount) {
            prevReshuffleCountRef.current = nextCount;
            setReshuffleBanner({ count: nextCount });
            playClick();
            if (reshuffleTimeoutRef.current) {
              clearTimeout(reshuffleTimeoutRef.current);
            }
            reshuffleTimeoutRef.current = setTimeout(() => {
              setReshuffleBanner(null);
            }, 2600);
          } else {
            prevReshuffleCountRef.current = nextCount;
          }
        }

        // Check for Round End via Last Action
        // We use a ref to track if we already showed the round end modal for this specific action timestamp
        if (
          data.gameState.lastAction &&
          data.gameState.lastAction.description &&
          data.gameState.lastAction.description.includes("ganó la ronda") &&
          data.gameState.lastAction.timestamp >
            lastActionTimestampRef.current &&
          data.gameState.status !== "ROUND_ENDED"
        ) {
          // Extract winner name from description
          const description = data.gameState.lastAction.description;
          const winnerName = description.split(" ganó")[0].replace("¡", "");

          setRoundWinnerModal({
            isOpen: true,
            winnerName: winnerName,
            nextRound: data.gameState.currentRound,
            scores: data.gameState.players.map((p: any) => ({
              name: p.name,
              score: p.score,
              buysUsed: p.buysUsed,
              roundScores: JSON.parse(p.roundScores || "[]"),
              roundBuys: JSON.parse(p.roundBuys || "[]"),
            })),
          });

          // Play success sound
          playSuccess();
        }

        // Check if we were kicked (we have an ID, but it's not in the players list)
        if (myPlayerId) {
          const amIInGame = data.gameState.players.some(
            (p: any) => p.id === myPlayerId
          );
          if (!amIInGame) {
            handleKicked();
            return;
          }
        }

        // Check for Game Actions (Toast)
        if (data.gameState.lastAction) {
          const action = data.gameState.lastAction;
          if (action.timestamp > lastActionTimestampRef.current) {
            lastActionTimestampRef.current = action.timestamp;

            // Don't show toast for my own actions? Or yes for confirmation?
            // User said "salir quien robo la carta", usually implies others.
            // But seeing your own action is fine too, or we filter.
            // Let's filter out MY actions to avoid noise if I already know what I did.
            if (action.playerId !== myPlayerId) {
              toast({
                title: "Acción de Juego",
                description: action.description,
                type: "info",
                duration: 2000,
              });
              playClick(); // General sound for other's actions
            }
          }
        }

        // Check for player leaves/joins (Notifications)
        if (prevPlayersRef.current.length > 0) {
          const currentIds = data.gameState.players.map((p: any) => p.id);
          const prevIds = prevPlayersRef.current.map((p: any) => p.id);

          // Check Left
          const leftPlayers = prevPlayersRef.current.filter(
            (p) => !currentIds.includes(p.id)
          );
          leftPlayers.forEach((p) => {
            if (!p.isBot) {
              toast({
                title: "Jugador salió",
                description: `${p.name} ha abandonado la sala.`,
                type: "warning",
              });
              playError();
            }
          });

          // Check Joined
          const newPlayers = data.gameState.players.filter(
            (p: any) => !prevIds.includes(p.id)
          );
          newPlayers.forEach((p: any) => {
            if (!p.isBot) {
              toast({
                title: "Jugador unido",
                description: `${p.name} se ha unido a la sala.`,
                type: "success",
              });
              playSuccess();
            }
          });
        }
        prevPlayersRef.current = data.gameState.players;

        setGameState(data.gameState);
      } else {
        if (res.status === 404) {
          localStorage.removeItem(`carioca_player_id_${roomId}`);
          window.location.href = "/";
          return;
        }
      }
    } catch (e) {
      console.error("Error polling state", e);
    }
  }, [roomId, myPlayerId, modalConfig.isOpen]); // Dependencies for useCallback

  // Poll for state updates (Simulate Realtime)
  useEffect(() => {
    const storedId = localStorage.getItem(`carioca_player_id_${roomId}`);
    if (storedId) {
      setMyPlayerId(storedId.trim());
    }

    // Initial fetch
    fetchGameState();

    // Faster polling during ROUND_ENDED, slower during gameplay
    const pollInterval = gameState?.status === "ROUND_ENDED" ? 500 : 2000;

    const interval = setInterval(() => {
      fetchGameState();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [roomId, fetchGameState, gameState?.status]); // Re-run effect when fetchGameState changes (which changes when deps change)

  // Reset optimistic state when turn changes or gameState updates
  useEffect(() => {
    if (gameState) {
      const currentPlayer = gameState.players[gameState.currentTurn];
      // If server says it's not my turn, reset
      if (currentPlayer.id !== myPlayerId) {
        setOptimisticDrawn(false);
      } else {
        // It is my turn. Check if server knows I drew.
        if (gameState.lastAction?.playerId === myPlayerId) {
          // Server confirms I acted.
          // We don't necessarily need to set optimisticDrawn to true,
          // because the derived hasDrawn will be true.
          // But we should ensure optimisticDrawn doesn't conflict?
          // Actually, if server confirms, we can clear optimistic.
          // Wait, if I draw, optimistic=true. Server update comes, hasDrawn=true.
          // If I discard, optimistic should be reset?
          // If I discard, turn changes, so the first check handles it.
        }
      }
    }
  }, [gameState, myPlayerId]);

  const hasDrawn =
    (gameState?.lastAction?.playerId === myPlayerId &&
      gameState?.players[gameState.currentTurn].id === myPlayerId) ||
    optimisticDrawn;

  const handleKicked = () => {
    localStorage.removeItem(`carioca_player_id_${roomId}`);
    // Ideally show modal then redirect, but alert is safer for force redirect
    alert("Has sido expulsado de la sala por el anfitrión.");
    window.location.href = "/";
  };

  const handleLeaveGame = () => {
    showModal(
      "Salir de la Sala",
      "¿Estás seguro que quieres abandonar la partida?",
      "confirm",
      async () => {
        try {
          await fetch(`/api/game/${roomId}/leave`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ playerId: myPlayerId }),
          });
          localStorage.removeItem(`carioca_player_id_${roomId}`);
          window.location.href = "/";
        } catch (e) {
          console.error("Error leaving", e);
          window.location.href = "/"; // Force leave anyway locally
        }
      }
    );
  };

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      const res = await fetch(`/api/game/${roomId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: joinName }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(`carioca_player_id_${roomId}`, data.playerId);
        setMyPlayerId(data.playerId);
        // We don't call fetchGameState here manually because effect will pick it up or we can wait for interval
        // But for immediate feedback:
        // Actually fetchGameState depends on myPlayerId, so we should wait for state update.
        // But we can just rely on the next interval tick or force a reload.
      } else {
        const err = await res.json();
        setError(err.error);
      }
    } catch (e) {
      setError("Error al unirse");
    }
    setIsJoining(false);
  };

  const handleAddBot = async (difficulty: string) => {
    if (isAddingBot) return;
    setIsAddingBot(true);
    try {
      const res = await fetch(`/api/game/${roomId}/add-bot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty }),
      });

      if (!res.ok) {
        const data = await res.json();
        showModal("Error", data.error || "Error al añadir bot", "info");
      } else {
        await fetchGameState();
      }
    } catch (e) {
      showModal("Error", "Error de conexión", "info");
    }
    setIsAddingBot(false);
  };

  const handleKickPlayer = (playerIdToRemove: string) => {
    showModal(
      "Expulsar Jugador",
      "¿Seguro que quieres expulsar a este jugador de la partida?",
      "danger",
      async () => {
        try {
          const res = await fetch(`/api/game/${roomId}/remove-player`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ playerIdToRemove, requesterId: myPlayerId }),
          });

          if (res.ok) {
            await fetchGameState();
            closeModal();
          } else {
            const err = await res.json();
            closeModal(); // Close confirm modal first
            setTimeout(
              () =>
                showModal("Error", err.error || "Error al expulsar", "info"),
              100
            );
          }
        } catch (e) {
          closeModal();
          setTimeout(
            () => showModal("Error", "Error de conexión", "info"),
            100
          );
        }
      }
    );
  };

  const handleStartGame = async () => {
    await fetch(`/api/game/${roomId}/start`, {
      method: "POST",
    });
    playStart();
    await fetchGameState();
  };

  const handleDrawDeck = async () => {
    // Optimistic update
    setOptimisticDrawn(true);

    const res = await fetch(`/api/game/${roomId}/move`, {
      method: "POST",
      body: JSON.stringify({ playerId: myPlayerId, action: "DRAW_DECK" }),
    });

    if (!res.ok) {
      // Revert on error
      setOptimisticDrawn(false);
      const data = await res.json();
      showModal("Error", data.error || "Error al robar", "info");
      playError();
    } else {
      await fetchGameState();
    }
  };

  const handleBuy = async () => {
    // First register intention to buy
    const intendRes = await fetch(`/api/game/${roomId}/move`, {
      method: "POST",
      body: JSON.stringify({
        playerId: myPlayerId,
        action: "INTEND_BUY",
      }),
    });

    if (!intendRes.ok) {
      const data = await intendRes.json();
      showModal(
        "Error",
        data.error || "Error al registrar intención de compra",
        "info"
      );
      return;
    }

    // Then attempt to buy (server will check priority)
    const buyRes = await fetch(`/api/game/${roomId}/move`, {
      method: "POST",
      body: JSON.stringify({ playerId: myPlayerId, action: "BUY" }),
    });

    if (!buyRes.ok) {
      const data = await buyRes.json();
      showModal("Error", data.error || "Error al comprar", "info");
      playError();
    } else {
      await fetchGameState();
    }
  };

  const handleBuyFromDiscard = async () => {
    // First register intention to buy
    const intendRes = await fetch(`/api/game/${roomId}/move`, {
      method: "POST",
      body: JSON.stringify({
        playerId: myPlayerId,
        action: "INTEND_BUY",
      }),
    });

    if (!intendRes.ok) {
      const data = await intendRes.json();
      showModal(
        "Error",
        data.error || "Error al registrar intención de compra",
        "info"
      );
      return;
    }

    // Then attempt to buy from discard (server will check priority)
    const buyRes = await fetch(`/api/game/${roomId}/move`, {
      method: "POST",
      body: JSON.stringify({ playerId: myPlayerId, action: "DRAW_DISCARD" }),
    });

    if (!buyRes.ok) {
      const data = await buyRes.json();
      showModal("Error", data.error || "Error al comprar del descarte", "info");
      playError();
    } else {
      await fetchGameState();
    }
  };

  const handleDiscard = async (cardId: string) => {
    setOptimisticDrawn(false); // Reset immediately as we are ending turn
    await fetch(`/api/game/${roomId}/move`, {
      method: "POST",
      body: JSON.stringify({
        playerId: myPlayerId,
        action: "DISCARD",
        payload: { cardId },
      }),
    });
    await fetchGameState();
  };

  const handleReadyForNextRound = async () => {
    // Optimistic update to avoid double clicks
    // But we don't have local state for ready, we rely on server.
    // However, if we click and it takes time, user might click again.
    // Let's assume the button is disabled or hidden if ready.
    // The UI checks: !gameState.readyForNextRound?.includes(myPlayerId)
    // So if we update optimistically or disable button it's fine.

    // BUT: The issue is "Not your turn".
    // This function calls "READY_FOR_NEXT_ROUND".
    // Does the API have this action?
    // I need to check api/game/[id]/move/route.ts
    // If it's not there, it will fail or return error.
    // Wait, I suspect "READY_FOR_NEXT_ROUND" logic is MISSING in the backend or failing validation.
    // AND if the user sees "Not your turn", it means the backend checked `currentPlayer.id !== playerId`.
    // BUT for "READY_FOR_NEXT_ROUND", it should NOT check turn. Anyone can be ready.

    // Let's check the backend route first.
    const res = await fetch(`/api/game/${roomId}/move`, {
      method: "POST",
      body: JSON.stringify({
        playerId: myPlayerId,
        action: "READY_FOR_NEXT_ROUND",
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      showModal("Error", data.error || "Error al marcarte como listo", "info");
    } else {
      await fetchGameState();
    }
  };

  const handleStartNextRound = async () => {
    const res = await fetch(`/api/game/${roomId}/move`, {
      method: "POST",
      body: JSON.stringify({
        playerId: myPlayerId,
        action: "START_NEXT_ROUND",
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      showModal(
        "Error",
        data.error || "Error al iniciar la siguiente ronda",
        "info"
      );
    } else {
      await fetchGameState();
    }
  };

  const handleEndGame = async () => {
    showModal(
      "Terminar Partida",
      "¿Estás seguro que quieres terminar la partida para todos los jugadores?",
      "danger",
      async () => {
        try {
          const res = await fetch(`/api/game/${roomId}/end`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requesterId: myPlayerId }),
          });

          if (res.ok) {
            await fetchGameState();
            closeModal();
          } else {
            const err = await res.json();
            closeModal(); // Close confirm modal first
            setTimeout(
              () =>
                showModal(
                  "Error",
                  err.error || "Error al terminar partida",
                  "info"
                ),
              100
            );
          }
        } catch (e) {
          closeModal();
          setTimeout(
            () => showModal("Error", "Error de conexión", "info"),
            100
          );
        }
      }
    );
  };

  const handleSkipBotTurn = async () => {
    if (!gameState) return;

    const currentPlayer = gameState.players[gameState.currentTurn];
    if (!currentPlayer.isBot) {
      showModal("Error", "El turno actual no es de un bot", "info");
      return;
    }

    try {
      const res = await fetch(`/api/game/${roomId}/skip-bot-turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requesterId: myPlayerId }),
      });

      if (res.ok) {
        const data = await res.json();
        showModal("Turno Forzado", data.message, "info");
        await fetchGameState();
        setIsMenuOpen(false);
      } else {
        const err = await res.json();
        showModal("Error", err.error || "Error al forzar turno", "info");
      }
    } catch (e) {
      showModal("Error", "Error de conexión", "info");
    }
  };

  const copyInviteLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setIsRoomIdCopied(true);
    setTimeout(() => setIsRoomIdCopied(false), 2000);
  };

  // Join Screen (If no ID)
  if (!myPlayerId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-slate-100 p-4">
        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl max-w-sm w-full text-center">
          <h2 className="text-2xl font-bold mb-4 flex items-center justify-center gap-2 text-slate-100">
            <Gamepad2 className="w-8 h-8 text-blue-500" />
            Unirse a la Partida
          </h2>
          {error && (
            <p className="text-red-400 mb-2 bg-red-950/30 p-2 rounded border border-red-900/50">
              {error}
            </p>
          )}

          {gameState && (
            <div className="mb-6 bg-slate-950/50 p-4 rounded-lg border border-slate-800">
              <h3 className="text-sm font-semibold mb-2 text-slate-400 flex items-center justify-center gap-2">
                <User className="w-4 h-4" />
                Jugadores en Sala ({gameState.players.length}/5):
              </h3>
              <ul className="space-y-1">
                {gameState.players.map((p) => (
                  <li
                    key={p.id}
                    className="text-sm flex items-center justify-center gap-2 text-slate-300"
                  >
                    {p.isBot ? (
                      <Bot className="w-4 h-4 text-purple-400" />
                    ) : (
                      <User className="w-4 h-4 text-blue-400" />
                    )}
                    {p.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <input
            type="text"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            placeholder="Tu Nombre"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 mb-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button
            onClick={handleJoin}
            disabled={isJoining || !joinName}
            className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-500 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {isJoining ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Entrar"
            )}
          </button>
        </div>
      </div>
    );
  }

  if (!gameState)
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-white">
        <Loader2 className="animate-spin w-12 h-12 mb-4 text-blue-500" />
        <p className="text-slate-400">Cargando partida...</p>
      </div>
    );

  const playersByScore = [...gameState.players].sort(
    (a, b) => (a.score || 0) - (b.score || 0)
  );
  const rankById = new Map(playersByScore.map((p, idx) => [p.id, idx + 1]));
  const currentTurnPlayer = gameState.players[gameState.currentTurn];
  const reshufflePct = Math.max(
    0,
    Math.min(100, (gameState.reshuffleCount / 3) * 100)
  );

  return (
    <>
      <Toaster />
      {reshuffleBanner && (
        <div className="fixed inset-0 z-[120] pointer-events-none flex items-start justify-center p-4 pt-10">
          <div
            className="pointer-events-auto w-full max-w-2xl rounded-2xl border border-amber-500/30 bg-slate-950/80 backdrop-blur-xl shadow-2xl shadow-black/40 px-6 py-5 animate-in fade-in zoom-in-95 duration-200"
            onClick={() => setReshuffleBanner(null)}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Shuffle className="w-7 h-7 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-slate-100 font-extrabold text-lg leading-tight">
                  ¡Se rebarajó el mazo!
                </div>
                <div className="text-slate-300 text-sm leading-snug">
                  El descarte se mezcló y volvió al mazo. Rebarajadas esta ronda:{" "}
                  <span className="font-bold text-amber-300">
                    {reshuffleBanner.count}/3
                  </span>
                </div>
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Toca para cerrar
              </div>
            </div>
          </div>
        </div>
      )}
      <Modal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        onClose={closeModal}
        onConfirm={modalConfig.onConfirm}
        type={modalConfig.type}
      >
        {modalConfig.message}
      </Modal>

      {/* LOBBY STATE UI */}
      {gameState.status === "WAITING" ? (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4">
          <div className="max-w-4xl w-full bg-slate-900/50 backdrop-blur-md p-6 md:p-8 rounded-2xl shadow-xl border border-slate-800 mt-4 md:mt-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 border-b border-slate-800 pb-6">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3 mb-2 text-slate-100">
                  <Gamepad2 className="w-8 h-8 text-blue-500" />
                  Sala de Espera
                </h1>
                <p className="text-slate-400 text-sm font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Esperando {Math.max(3 - gameState.players.length, 0)}{" "}
                  jugadores más para iniciar
                </p>
              </div>

              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <button
                  onClick={copyRoomId}
                  className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border border-slate-700 text-slate-300"
                  title="Copiar ID de Sala"
                >
                  <span className="opacity-50">ID:</span>
                  <span className="font-mono font-bold text-slate-200">
                    {roomId}
                  </span>
                  {isRoomIdCopied ? (
                    <Copy className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 opacity-50" />
                  )}
                </button>
                <button
                  onClick={copyInviteLink}
                  className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border border-slate-700 text-slate-300"
                >
                  {isCopied ? (
                    <Copy className="w-4 h-4 text-green-400" />
                  ) : (
                    <LinkIcon className="w-4 h-4 text-blue-400" />
                  )}
                  {isCopied ? "Copiado" : "Invitar"}
                </button>
                <button
                  onClick={() => setShowQR(true)}
                  className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border border-slate-700 text-slate-300"
                >
                  <QrCode className="w-4 h-4" />
                  QR
                </button>
                <button
                  onClick={handleLeaveGame}
                  className="bg-red-950/30 hover:bg-red-900/50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border border-red-900/30 text-red-400"
                >
                  <LogOut className="w-4 h-4" />
                  Salir
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Player List */}
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-3 text-slate-200">
                  <User className="w-5 h-5 text-blue-500" />
                  Jugadores
                  <span className="text-slate-500 text-base font-normal">
                    ({gameState.players.length}/5)
                  </span>
                </h2>
                <ul className="space-y-3">
                  {gameState.players.map((p, idx) => (
                    <li
                      key={p.id}
                      className="bg-slate-800/50 p-4 rounded-xl flex items-center justify-between group border border-slate-700/50 hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-center gap-4 overflow-hidden flex-1">
                        <div
                          className={`p-2.5 rounded-lg flex-shrink-0 ${
                            p.isBot
                              ? "bg-purple-500/10 text-purple-400"
                              : "bg-blue-500/10 text-blue-400"
                          }`}
                        >
                          {p.isBot ? (
                            <Bot className="w-5 h-5" />
                          ) : (
                            <User className="w-5 h-5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium flex items-center gap-2 text-slate-200 truncate">
                            {p.name}
                            {p.id === myPlayerId && (
                              <span className="text-xs text-blue-300 bg-blue-900/30 px-2 py-0.5 rounded border border-blue-800/50">
                                Tú
                              </span>
                            )}
                          </div>
                          {idx === 0 && (
                            <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Crown className="w-3 h-3 text-yellow-500/70" />{" "}
                              Anfitrión
                            </span>
                          )}
                          {p.isBot && (
                            <span className="text-xs text-purple-400/70 flex items-center gap-1 mt-0.5">
                              Bot{" "}
                              {(p as any).difficulty === "EASY"
                                ? "Principiante"
                                : (p as any).difficulty === "MEDIUM"
                                ? "Intermedio"
                                : "Profesional"}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {gameState.creatorId === myPlayerId &&
                          p.id !== myPlayerId && (
                            <button
                              onClick={() => handleKickPlayer(p.id)}
                              className="text-slate-600 hover:text-red-400 p-2 rounded-lg hover:bg-red-950/30 transition-colors"
                              title="Expulsar jugador"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          )}
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                          <span className="text-xs text-green-400 font-medium">
                            Listo
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                  {Array.from({ length: 5 - gameState.players.length }).map(
                    (_, i) => (
                      <li
                        key={i}
                        className="border border-dashed border-slate-800 p-4 rounded-xl flex items-center justify-center text-slate-600 gap-2 text-sm"
                      >
                        <User className="w-4 h-4 opacity-50" />
                        <span>Esperando jugador...</span>
                      </li>
                    )
                  )}
                </ul>
              </div>

              {/* Controls (Host Only) */}
              <div className="flex flex-col h-full">
                {gameState.creatorId === myPlayerId ? (
                  <div className="flex flex-col gap-4 h-full">
                    <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-700/50">
                      <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-300">
                        <Bot className="w-5 h-5 text-purple-400" />
                        <span>Añadir Bots</span>
                      </h3>
                      <div className="space-y-2">
                        <button
                          onClick={() => handleAddBot("EASY")}
                          disabled={
                            isAddingBot || gameState.players.length >= 5
                          }
                          className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 p-3 rounded-lg text-left transition-colors flex justify-between items-center text-sm border border-slate-700 hover:border-slate-600 group"
                        >
                          <span className="flex items-center gap-2 text-slate-300 group-hover:text-slate-200">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>{" "}
                            Bot Principiante
                          </span>
                        </button>
                        <button
                          onClick={() => handleAddBot("MEDIUM")}
                          disabled={
                            isAddingBot || gameState.players.length >= 5
                          }
                          className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 p-3 rounded-lg text-left transition-colors flex justify-between items-center text-sm border border-slate-700 hover:border-slate-600 group"
                        >
                          <span className="flex items-center gap-2 text-slate-300 group-hover:text-slate-200">
                            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>{" "}
                            Bot Intermedio
                          </span>
                        </button>
                        <button
                          onClick={() => handleAddBot("HARD")}
                          disabled={
                            isAddingBot || gameState.players.length >= 5
                          }
                          className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 p-3 rounded-lg text-left transition-colors flex justify-between items-center text-sm border border-slate-700 hover:border-slate-600 group"
                        >
                          <span className="flex items-center gap-2 text-slate-300 group-hover:text-slate-200">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>{" "}
                            Bot Profesional
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="mt-auto pt-4">
                      <button
                        onClick={handleStartGame}
                        disabled={gameState.players.length < 3}
                        className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                          gameState.players.length >= 3
                            ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20"
                            : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                        }`}
                      >
                        {gameState.players.length < 3 ? (
                          <span className="text-sm font-medium">
                            Faltan {3 - gameState.players.length} jugadores
                            (Mínimo 3)
                          </span>
                        ) : (
                          <>
                            <Play className="w-5 h-5" />
                            Iniciar Partida
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center bg-slate-800/20 p-8 rounded-xl border border-dashed border-slate-700">
                    <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500/50" />
                    <p className="text-lg font-medium text-slate-300 mb-1">
                      Esperando al anfitrión...
                    </p>
                    <p className="text-sm text-slate-500">
                      El anfitrión está configurando la partida
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : gameState.status === "FINISHED" ? (
        // FINISHED STATE UI
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 flex flex-col items-center justify-center relative overflow-hidden">
          {/* Confetti Background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-3 h-3 bg-yellow-400 rounded-full opacity-30"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `float ${
                    3 + Math.random() * 2
                  }s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 0.5}s`,
                }}
              />
            ))}
          </div>

          <div className="bg-slate-900/50 backdrop-blur-lg p-8 md:p-12 rounded-3xl shadow-2xl max-w-md w-full text-center border border-slate-800 relative z-10">
            <Trophy className="w-24 h-24 text-yellow-500 mb-8 mx-auto drop-shadow-lg" />

            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-slate-100">
              ¡Partida Finalizada!
            </h1>

            <p className="text-slate-400 mb-10 text-lg">
              La partida ha terminado. ¡Gracias por jugar!
            </p>

            <div className="space-y-3 mb-8">
              <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">
                Próximo paso
              </p>
              <div className="h-px bg-slate-800 w-full"></div>
            </div>

            <div className="flex flex-col gap-4">
              <button
                onClick={() => router.push("/")}
                className="w-full bg-slate-100 hover:bg-white text-slate-900 font-bold text-lg py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3"
              >
                <Home className="w-5 h-5" />
                Volver al Inicio
              </button>
              <button
                onClick={() => router.push("/history")}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-all border border-slate-700"
              >
                Ver Historial de Partidas
              </button>
            </div>
          </div>
        </div>
      ) : gameState.status === "ROUND_ENDED" ? (
        // ROUND_ENDED STATE UI
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4">
          <div className="w-full min-h-screen md:min-h-0 flex items-center justify-center px-3 py-6 md:py-0">
            <div className="w-full max-w-5xl bg-slate-900/80 backdrop-blur-lg p-6 md:p-8 rounded-2xl shadow-2xl border border-slate-800">
              {/* Header */}
              <div className="text-center mb-8 border-b border-slate-800 pb-6">
                <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-slate-100 mb-2">
                  ¡Ronda {gameState.currentRound} Terminada!
                </h1>
                <p className="text-slate-400">
                  Esperando que todos los jugadores estén listos para continuar
                </p>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Player Status */}
                <div className="lg:col-span-1 bg-slate-950/50 p-5 rounded-xl border border-slate-800">
                  <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-500" />
                    Jugadores
                  </h2>
                  <ul className="space-y-3">
                    {gameState.players.map((p, idx) => {
                      const isReady = gameState.readyForNextRound?.includes(
                        p.id
                      );
                      return (
                        <li
                          key={p.id}
                          className={`p-3 rounded-lg transition-all border ${
                            isReady
                              ? "bg-green-500/5 border-green-500/20"
                              : "bg-slate-800/50 border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div
                                className={`p-2 rounded-lg flex-shrink-0 ${
                                  isReady
                                    ? "bg-green-500/10 text-green-400"
                                    : "bg-slate-700 text-slate-400"
                                }`}
                              >
                                {p.isBot ? (
                                  <Bot className="w-4 h-4" />
                                ) : (
                                  <User className="w-4 h-4" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-slate-200 text-sm truncate">
                                  {p.name}
                                </div>
                                {idx === 0 && (
                                  <div className="text-xs text-slate-500 flex items-center gap-1">
                                    <Crown className="w-3 h-3" /> Host
                                  </div>
                                )}
                                {p.id === myPlayerId && (
                                  <div className="text-xs text-blue-400">
                                    Tú
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              {isReady ? (
                                <div className="flex items-center gap-1.5 bg-green-500/10 px-2 py-1 rounded text-green-400 border border-green-500/20">
                                  <span className="text-xs font-bold">
                                    Listo
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded text-slate-500 border border-slate-700">
                                  <span className="text-xs">Espera</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Scoreboard */}
                <div className="lg:col-span-2 bg-slate-950/50 p-5 rounded-xl border border-slate-800 overflow-hidden">
                  <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Tabla de Puntuaciones
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-800">
                          <th className="text-left py-3 px-3 text-slate-500 font-semibold">
                            Jugador
                          </th>
                          <th className="text-center py-3 px-3 text-slate-500 font-semibold">
                            Total
                          </th>
                          <th className="text-center py-3 px-3 text-slate-500 font-semibold">
                            Compras
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {gameState.players
                          .sort((a, b) => a.score - b.score)
                          .map((player, rank) => {
                            const totalBuys = player.buysUsed || 0;
                            const remainingBuys = Math.max(0, 7 - totalBuys);
                            const isWinning = rank === 0;

                            return (
                              <tr
                                key={player.id}
                                className={`hover:bg-slate-800/30 transition-colors ${
                                  isWinning ? "bg-yellow-500/5" : ""
                                }`}
                              >
                                <td className="py-3 px-3 flex items-center gap-2 text-slate-300">
                                  <div className="flex-1 truncate font-medium">
                                    {isWinning && (
                                      <span className="inline-block mr-2 text-yellow-500">
                                        🥇
                                      </span>
                                    )}
                                    {player.name}
                                    {player.id === myPlayerId && (
                                      <span className="ml-2 text-xs bg-blue-900/30 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800/50">
                                        Tú
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td
                                  className={`text-center py-3 px-3 font-bold text-base ${
                                    isWinning
                                      ? "text-yellow-500"
                                      : "text-slate-200"
                                  }`}
                                >
                                  {player.score}
                                </td>
                                <td className="text-center py-3 px-3">
                                  <div className="text-xs whitespace-nowrap bg-slate-900 rounded-md py-1 px-2 inline-flex gap-2 border border-slate-800">
                                    <span
                                      className="text-red-400 font-semibold"
                                      title="Usadas"
                                    >
                                      {totalBuys}
                                    </span>
                                    <span className="text-slate-600">/</span>
                                    <span
                                      className="text-green-400 font-semibold"
                                      title="Restantes"
                                    >
                                      {remainingBuys}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 gap-3 md:gap-4 max-w-md mx-auto">
                {/* Player Ready Button - only for non-hosts and non-bots */}
                {!gameState.readyForNextRound?.includes(myPlayerId) &&
                  gameState.creatorId !== myPlayerId &&
                  !gameState.players.find((p) => p.id === myPlayerId)
                    ?.isBot && (
                    <button
                      onClick={handleReadyForNextRound}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      <Play className="w-5 h-5" />
                      Estoy Listo
                    </button>
                  )}

                {/* Host Start Next Round Button */}
                {gameState.creatorId === myPlayerId && (
                  <button
                    onClick={handleStartNextRound}
                    disabled={
                      gameState.readyForNextRound?.length !==
                      gameState.players.filter(
                        (p) => p.id !== gameState.creatorId
                      ).length
                    }
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-lg py-3 rounded-xl shadow-lg transition-all disabled:shadow-none flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    <span className="text-center">
                      {gameState.readyForNextRound?.length ===
                      gameState.players.filter(
                        (p) => p.id !== gameState.creatorId
                      ).length ? (
                        <>Iniciar Ronda {gameState.currentRound + 1}</>
                      ) : (
                        <>
                          Esperando a{" "}
                          {gameState.players.filter(
                            (p) => p.id !== gameState.creatorId
                          ).length -
                            (gameState.readyForNextRound?.length || 0)}{" "}
                          jugadores
                        </>
                      )}
                    </span>
                  </button>
                )}

                {/* Leave Game Button */}
                <button
                  onClick={handleLeaveGame}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-base py-3 rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-700"
                >
                  <LogOut className="w-4 h-4" />
                  Salir de la Partida
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative">
          <Board
            gameState={gameState}
            myPlayerId={myPlayerId}
            onDrawDeck={handleDrawDeck}
            onDrawDiscard={handleBuyFromDiscard}
            onDiscard={handleDiscard}
            onDown={async (groups) => {
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
                showModal("Error", data.error || "Error al bajarse", "info");
              } else {
                await fetchGameState();
              }
            }}
            onAddToMeld={async (cardId, targetPlayerId, meldIndex) => {
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
                showModal(
                  "Error",
                  data.error || "No puedes poner esa carta ahí",
                  "info"
                );
              } else {
                await fetchGameState();
              }
            }}
            onStealJoker={async (cardId, targetPlayerId, meldIndex) => {
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
                showModal(
                  "Error",
                  data.error || "No puedes robar ese joker",
                  "info"
                );
              } else {
                await fetchGameState();
              }
            }}
            hasDrawn={hasDrawn}
          />

          {/* Menu Button (Top Right) */}
          <div className="absolute top-2 right-2 z-50">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm border border-white/10 transition-colors"
            >
              {isMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-black/80 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col p-1">
                <div className="px-3 py-2 border-b border-white/10 mb-1">
                  <span className="text-xs text-white/50 font-bold uppercase">
                    Menú de Juego
                  </span>
                </div>

                <button
                  onClick={() => {
                    setShowGameInfo(true);
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-colors text-left"
                >
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  Información de Partida
                </button>

                <button
                  onClick={() => {
                    setShowRules(true);
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-colors text-left"
                >
                  <BookOpen className="w-4 h-4 text-yellow-400" />
                  Ver Reglas
                </button>

                <button
                  onClick={() => {
                    copyRoomId();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-colors text-left"
                >
                  {isRoomIdCopied ? (
                    <Copy className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 opacity-50" />
                  )}
                  {isRoomIdCopied ? "¡ID Copiado!" : `ID: ${roomId}`}
                </button>

                <button
                  onClick={() => {
                    copyInviteLink();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-colors text-left"
                >
                  {isCopied ? (
                    <Copy className="w-4 h-4 text-green-400" />
                  ) : (
                    <LinkIcon className="w-4 h-4 text-blue-400" />
                  )}
                  {isCopied ? "¡Enlace Copiado!" : "Copiar Invitación"}
                </button>

                {/* Mute Toggle */}
                <button
                  onClick={() => {
                    toggleMute();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-colors text-left"
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-red-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-green-400" />
                  )}
                  {isMuted ? "Activar Sonido" : "Silenciar Sonido"}
                </button>

                <button
                  onClick={() => {
                    handleLeaveGame();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-red-300 hover:bg-red-500/20 rounded-lg transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Salir de la Partida
                </button>

                {/* Host Actions */}
                {gameState.creatorId === myPlayerId && (
                  <>
                    <div className="my-1 border-t border-white/10"></div>

                    {/* Skip Bot Turn Button */}
                    {gameState.players[gameState.currentTurn]?.isBot && (
                      <button
                        onClick={() => {
                          handleSkipBotTurn();
                        }}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-orange-400 hover:bg-orange-500/20 rounded-lg transition-colors text-left"
                      >
                        <Loader2 className="w-4 h-4" />
                        Forzar Turno del Bot
                      </button>
                    )}

                    <button
                      onClick={() => {
                        handleEndGame();
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20 rounded-lg transition-colors text-left"
                    >
                      <Ban className="w-4 h-4" />
                      Terminar Partida
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />

      {/* Game Info Modal */}
      <Modal
        isOpen={showGameInfo}
        title="Información de la Partida"
        onClose={() => setShowGameInfo(false)}
        type="info"
        size="3xl"
      >
        <div className="max-h-[75vh] overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Ronda
              </div>
              <div className="text-slate-100 font-extrabold text-lg leading-tight">
                {ROUND_CONTRACTS[gameState.currentRound - 1]?.name ||
                  `Ronda ${gameState.currentRound}`}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Turno
              </div>
              <div className="flex items-center gap-2">
                {currentTurnPlayer?.isBot ? (
                  <Bot className="w-5 h-5 text-purple-400" />
                ) : (
                  <User className="w-5 h-5 text-blue-400" />
                )}
                <div className="text-slate-100 font-extrabold text-lg leading-tight truncate">
                  {currentTurnPlayer?.name}
                </div>
                {currentTurnPlayer?.id === myPlayerId && (
                  <span className="ml-auto text-[10px] font-bold bg-blue-600 text-white px-2 py-1 rounded-full">
                    Tú
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Rebarajadas
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
                  <div
                    className="h-full bg-amber-500"
                    style={{ width: `${reshufflePct}%` }}
                  />
                </div>
                <div className="text-slate-100 font-bold tabular-nums">
                  {gameState.reshuffleCount}/3
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Última Acción
                </div>
                <div className="text-slate-100 font-semibold leading-snug break-words">
                  {gameState.lastAction?.description || "Aún no hay acciones."}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Trophy className="w-4 h-4 text-amber-400" />
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  R{gameState.currentRound}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/30">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" />
                <div className="text-slate-100 font-extrabold">
                  Jugadores ({gameState.players.length})
                </div>
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Menor puntaje va ganando
              </div>
            </div>

            <div className="divide-y divide-slate-800">
              {gameState.players.map((player, index) => {
                const isCurrentTurn = gameState.currentTurn === index;
                const isMe = player.id === myPlayerId;
                const buysUsed = player.buysUsed || 0;
                const buysLeft = Math.max(0, 7 - buysUsed);
                const playerRank = rankById.get(player.id) || 0;
                const buysBarColor =
                  buysUsed >= 7
                    ? "bg-red-500"
                    : buysUsed >= 5
                    ? "bg-amber-500"
                    : "bg-green-500";

                return (
                  <details
                    key={player.id}
                    className={`group ${isCurrentTurn ? "bg-blue-500/10" : ""}`}
                  >
                    <summary className="cursor-pointer select-none list-none px-4 py-3 flex items-center gap-3 hover:bg-white/5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                          player.isBot
                            ? "bg-purple-500/10 border-slate-700 text-purple-300"
                            : "bg-blue-500/10 border-slate-700 text-blue-300"
                        } ${isCurrentTurn ? "ring-2 ring-blue-500/30" : ""}`}
                      >
                        {player.isBot ? (
                          <Bot className="w-6 h-6" />
                        ) : (
                          <User className="w-6 h-6" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="text-slate-100 font-bold truncate">
                            {player.name}
                          </div>
                          {index === 0 && (
                            <span className="text-[10px] font-bold bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
                              <Crown className="w-3 h-3" /> Host
                            </span>
                          )}
                          {isMe && (
                            <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                              Tú
                            </span>
                          )}
                          {isCurrentTurn && (
                            <span className="text-[10px] font-bold bg-blue-500/15 text-blue-200 px-2 py-0.5 rounded-full border border-blue-500/20">
                              Turno
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 font-medium">
                          Posición: #{playerRank} •{" "}
                          {player.isBot ? "Bot" : "Humano"}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-slate-100 font-extrabold text-xl tabular-nums leading-none">
                          {player.score || 0}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Puntos
                        </div>
                      </div>
                    </summary>

                    <div className="px-4 pb-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-center">
                          <div className="text-slate-100 font-extrabold text-lg tabular-nums leading-none">
                            {player.hand.length}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Mano
                          </div>
                        </div>
                        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-center">
                          <div className="text-slate-100 font-extrabold text-lg tabular-nums leading-none">
                            {player.boughtCards.length}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Compradas
                          </div>
                        </div>
                        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-center">
                          <div className="text-slate-100 font-extrabold text-lg tabular-nums leading-none">
                            {player.melds?.length || 0}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Bajadas
                          </div>
                        </div>
                        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-center">
                          <div className="text-slate-100 font-extrabold text-lg tabular-nums leading-none">
                            {buysLeft}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Compras
                          </div>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          <span>Compras Usadas</span>
                          <span className="tabular-nums">{buysUsed}/7</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
                          <div
                            className={`h-full ${buysBarColor}`}
                            style={{
                              width: `${Math.min(100, (buysUsed / 7) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>

                      {player.melds && player.melds.length > 0 && (
                        <div className="mt-3">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                            Juegos en mesa
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {player.melds.map((meld, meldIndex) => (
                              <div
                                key={meldIndex}
                                className="px-3 py-1 rounded-full bg-slate-900/60 border border-slate-700 text-slate-200 text-xs font-semibold"
                              >
                                Juego {meldIndex + 1}: {meld.length} cartas
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        isOpen={showQR}
        title="Código QR de la Sala"
        onClose={() => setShowQR(false)}
        type="info"
      >
        <div className="flex flex-col items-center justify-center p-4">
          <div className="bg-white p-4 rounded-xl shadow-inner mb-4">
            <QRCode
              value={typeof window !== "undefined" ? window.location.href : ""}
              size={200}
            />
          </div>
          <p className="text-center text-sm text-slate-300">
            Escanea este código para unirte a la partida directamente.
          </p>
        </div>
      </Modal>

      {/* Round Winner Modal */}
      <Modal
        isOpen={roundWinnerModal.isOpen}
        title={`¡Ronda Terminada!`}
        onClose={() =>
          setRoundWinnerModal((prev) => ({ ...prev, isOpen: false }))
        }
        type="info"
      >
        <div className="text-center">
          <div className="mb-6">
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-2" />
            <h3 className="text-xl font-bold text-slate-100">
              ¡{roundWinnerModal.winnerName} ganó la ronda!
            </h3>
            <p className="text-slate-400">
              Preparando Ronda {roundWinnerModal.nextRound}...
            </p>
          </div>

          <div className="bg-slate-950/40 rounded-lg p-4 overflow-x-auto border border-slate-800">
            <h4 className="font-semibold mb-3 text-left text-slate-200">
              Resumen de Partida
            </h4>
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-300 uppercase bg-slate-900/60">
                <tr>
                  <th className="px-3 py-2 rounded-l-lg">Jugador</th>
                  <th className="px-3 py-2 text-center">Pts Total</th>
                  <th className="px-3 py-2 text-center">Pts Ronda</th>
                  <th className="px-3 py-2 text-center">Compras Totales</th>
                  <th className="px-3 py-2 rounded-r-lg text-center">
                    Compras Restantes
                  </th>
                </tr>
              </thead>
              <tbody>
                {roundWinnerModal.scores
                  .sort((a, b) => a.score - b.score)
                  .map((player, idx) => {
                    const lastRoundScore =
                      player.roundScores.length > 0
                        ? player.roundScores[player.roundScores.length - 1]
                        : 0;

                    // Total Buys across all rounds
                    const totalBuys = player.roundBuys.reduce(
                      (sum, buys) => sum + buys,
                      0
                    );

                    // Remaining Buys (Limit 7 per game)
                    const buysLeft = Math.max(0, 7 - totalBuys);

                    return (
                      <tr key={idx} className="border-b border-slate-800">
                        <td className="px-3 py-2 font-medium flex items-center gap-2 text-slate-200">
                          {idx === 0 && (
                            <Crown className="w-3 h-3 text-yellow-500" />
                          )}
                          {player.name}
                        </td>
                        <td className="px-3 py-2 text-center font-bold text-blue-400">
                          {player.score}
                        </td>
                        <td className="px-3 py-2 text-center text-red-400">
                          +{lastRoundScore}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-300">
                          {totalBuys}
                        </td>
                        <td className="px-3 py-2 text-center text-green-400">
                          {buysLeft}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <button
            onClick={() =>
              setRoundWinnerModal((prev) => ({ ...prev, isOpen: false }))
            }
            className="mt-6 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Continuar
          </button>
        </div>
      </Modal>
    </>
  );
};
