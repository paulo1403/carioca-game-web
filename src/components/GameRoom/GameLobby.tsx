"use client";

import React, { useState } from "react";
import { GameState } from "@/types/game";
import Link from "next/link";
import {
  Copy,
  LinkIcon,
  LogOut,
  User,
  Bot,
  UserMinus,
  Play,
  Loader2,
  Gamepad2,
  Crown,
  QrCode,
  Home,
  Users,
  Zap,
  Settings,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import QRCode from "react-qr-code";
import { moveTurnOrder } from "@/utils/turnOrder";

interface GameLobbyProps {
  gameState: GameState;
  roomId: string;
  myPlayerId: string | null;
  isJoining: boolean;
  isAddingBot: boolean;
  isStartingGame: boolean;
  playerName: string;
  isCopied: boolean;
  isRoomIdCopied: boolean;
  onJoin: () => void;
  onAddBot: (difficulty: "EASY" | "MEDIUM" | "HARD") => void;
  onKickPlayer: (playerId: string) => void;
  onStartGame: () => void;
  onUpdateTurnOrder: (order: string[]) => void;
  onLeaveGame: () => void;
  onCopyInviteLink: () => void;
  onCopyRoomId: () => void;
  modalConfig: {
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    type?: "info" | "confirm" | "danger";
    onConfirm?: () => void;
  };
  onCloseModal: () => void;
}

export const GameLobby: React.FC<GameLobbyProps> = ({
  gameState,
  roomId,
  myPlayerId,
  isAddingBot,
  isCopied,
  isRoomIdCopied,
  isJoining,
  isStartingGame,
  playerName,
  onJoin,
  onAddBot,
  onKickPlayer,
  onStartGame,
  onUpdateTurnOrder,
  onLeaveGame,
  onCopyInviteLink,
  onCopyRoomId,
  modalConfig,
  onCloseModal,
}) => {
  const [showQR, setShowQR] = useState(false);
  const isHost = gameState.creatorId === myPlayerId;
  const canStart = gameState.players.length >= 3;
  const playersNeeded = Math.max(3 - gameState.players.length, 0);
  const [orderIds, setOrderIds] = useState<string[]>([]);

  React.useEffect(() => {
    const ids = gameState.players.map((p) => p.id);
    setOrderIds(ids);
  }, [gameState.players.map((p) => p.id).join("|")]);

  const movePlayer = (playerId: string, direction: "up" | "down") => {
    if (!isHost) return;
    const next = moveTurnOrder(orderIds, playerId, direction);
    if (next === orderIds) return;
    setOrderIds(next);
    onUpdateTurnOrder(next);
  };

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/game/${roomId}`
      : "";

  const botDifficulties = [
    {
      id: "EASY" as const,
      label: "Bot Principiante",
      color: "bg-green-500",
      description: "Ideal para empezar",
    },
    {
      id: "MEDIUM" as const,
      label: "Bot Intermedio",
      color: "bg-yellow-500",
      description: "Desafío moderado",
    },
    {
      id: "HARD" as const,
      label: "Bot Profesional",
      color: "bg-red-500",
      description: "Experto en Carioca",
    },
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-800/50 bg-slate-950/60 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Home className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Gamepad2 className="w-6 h-6 text-blue-500" />
              Sala de Espera
            </h1>
            <p className="text-sm text-slate-400">
              {playersNeeded > 0
                ? `Faltan ${playersNeeded} jugadores`
                : "¡Listos para jugar!"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 text-sm text-slate-400">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            En línea
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          {/* Room Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Room ID Card */}
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-4">
              <h3 className="text-sm font-medium text-slate-400 mb-2">
                ID de Sala
              </h3>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-bold text-slate-100">
                  {roomId}
                </span>
                <button
                  onClick={onCopyRoomId}
                  className="text-slate-400 hover:text-blue-400 transition-colors"
                  title="Copiar ID"
                >
                  <Copy
                    className={`w-4 h-4 ${isRoomIdCopied ? "text-green-400" : ""}`}
                  />
                </button>
              </div>
            </div>

            {/* Invite Link Card */}
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-4">
              <h3 className="text-sm font-medium text-slate-400 mb-2">
                Invitar Amigos
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={onCopyInviteLink}
                  className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-sm"
                >
                  <LinkIcon className="w-4 h-4" />
                  {isCopied ? "¡Copiado!" : "Copiar enlace"}
                </button>
                <button
                  onClick={() => setShowQR(true)}
                  className="text-slate-400 hover:text-blue-400 transition-colors"
                  title="Ver QR"
                >
                  <QrCode className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Players Count Card */}
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-4">
              <h3 className="text-sm font-medium text-slate-400 mb-2">
                Jugadores
              </h3>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <span className="text-lg font-bold">
                  {gameState.players.length}/5
                </span>
                {canStart && (
                  <div className="w-2 h-2 rounded-full bg-green-500 ml-auto"></div>
                )}
              </div>
            </div>
          </div>

          {/* Join Button - If user is not in the game yet */}
          {!myPlayerId && (
            <div className="mb-8 bg-linear-to-r from-blue-950/50 to-slate-900/50 border border-blue-800/50 rounded-xl p-6">
              <div className="max-w-md mx-auto">
                <button
                  onClick={onJoin}
                  disabled={isJoining}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Uniéndose como {playerName}...
                    </>
                  ) : (
                    <>
                      <User className="w-5 h-5" />
                      Unirse como {playerName}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Players List - Takes priority on mobile */}
            <div className="lg:col-span-2 order-1">
              <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                  <User className="w-6 h-6 text-blue-500" />
                  Jugadores
                  <span className="text-slate-500 text-base font-normal">
                    ({gameState.players.length}/5)
                  </span>
                </h2>

                <div className="space-y-3">
                  {orderIds.map((id, idx) => {
                    const player = gameState.players.find((p) => p.id === id);
                    if (!player) return null;
                    return (
                    <div
                      key={player.id}
                      className="bg-slate-800/50 rounded-xl p-4 flex items-center justify-between group hover:bg-slate-800/70 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex flex-col items-center justify-center w-10">
                          <span className="text-xs text-slate-400">Turno</span>
                          <span className="text-lg font-bold text-slate-100">{idx + 1}</span>
                        </div>
                        {/* Avatar */}
                        <div
                          className={`
                          w-12 h-12 rounded-xl flex items-center justify-center shrink-0
                          ${
                            player.isBot
                              ? "bg-purple-500/20 border border-purple-500/30"
                              : "bg-blue-500/20 border border-blue-500/30"
                          }
                        `}
                        >
                          {player.isBot ? (
                            <Bot className="w-6 h-6 text-purple-400" />
                          ) : (
                            <span className="text-lg font-bold text-blue-400">
                              {player.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>

                        {/* Player Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-slate-200 truncate">
                              {player.name}
                            </span>
                            {player.id === myPlayerId && (
                              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">
                                Tú
                              </span>
                            )}
                            {idx === 0 && (
                              <Crown className="w-4 h-4 text-yellow-500" />
                            )}
                          </div>

                          {/* Bot Difficulty */}
                          {player.isBot && (
                            <div className="text-xs text-purple-400/80 flex items-center gap-1">
                              <Settings className="w-3 h-3" />
                              {player.difficulty === "EASY" && "Principiante"}
                              {player.difficulty === "MEDIUM" && "Intermedio"}
                              {player.difficulty === "HARD" && "Profesional"}
                            </div>
                          )}
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                            <span className="text-xs text-green-400 font-medium">
                              Listo
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      {isHost && (
                        <div className="flex items-center gap-1 mr-2">
                          <button
                            onClick={() => movePlayer(player.id, "up")}
                            disabled={idx === 0}
                            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 disabled:text-slate-600 disabled:hover:bg-transparent"
                            title="Subir"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => movePlayer(player.id, "down")}
                            disabled={idx === orderIds.length - 1}
                            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 disabled:text-slate-600 disabled:hover:bg-transparent"
                            title="Bajar"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {isHost && player.id !== myPlayerId && (
                        <button
                          onClick={() => onKickPlayer(player.id)}
                          className="opacity-0 group-hover:opacity-100 ml-2 p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-all"
                          title="Expulsar jugador"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                  })}

                  {/* Empty Slots */}
                  {Array.from({ length: 5 - gameState.players.length }).map(
                    (_, i) => (
                      <div
                        key={i}
                        className="border-2 border-dashed border-slate-700 rounded-xl p-4 flex items-center justify-center text-slate-500"
                      >
                        <User className="w-5 h-5 mr-2 opacity-50" />
                        <span className="text-sm">Esperando jugador...</span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>

            {/* Controls Sidebar */}
            <div className="order-2 space-y-6">
              {/* Host Controls */}
              {isHost && (
                <>
                  {/* Add Bots */}
                  <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <Bot className="w-5 h-5 text-purple-400" />
                      Añadir Bots
                    </h3>
                    <div className="space-y-3">
                      {botDifficulties.map((bot) => (
                        <button
                          key={bot.id}
                          onClick={() => onAddBot(bot.id)}
                          disabled={
                            isAddingBot || gameState.players.length >= 5
                          }
                          className="w-full p-3 rounded-xl text-left transition-all group disabled:opacity-50 disabled:cursor-not-allowed bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-600"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-3 h-3 rounded-full ${bot.color}`}
                            ></div>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-slate-200 group-hover:text-white">
                                {bot.label}
                              </div>
                              <div className="text-xs text-slate-400">
                                {bot.description}
                              </div>
                            </div>
                            {isAddingBot ? (
                              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                            ) : (
                              <Zap className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Start Game */}
                  <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
                    <button
                      onClick={onStartGame}
                      disabled={!canStart || isStartingGame}
                      className="w-full bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-green-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 text-lg"
                    >
                      {isStartingGame ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <Play className="w-6 h-6" />
                      )}
                      {isStartingGame
                        ? "Iniciando..."
                        : canStart
                          ? "¡Iniciar Partida!"
                          : `Faltan ${playersNeeded} jugadores`}
                    </button>
                  </div>
                </>
              )}

              {/* Leave Game */}
              <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
                <button
                  onClick={onLeaveGame}
                  disabled={!myPlayerId}
                  className="w-full bg-red-950/50 hover:bg-red-900/50 disabled:bg-slate-800/50 disabled:cursor-not-allowed text-red-400 hover:text-red-300 disabled:text-slate-500 font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 border border-red-900/30 hover:border-red-800/50 disabled:border-slate-700/30"
                >
                  <LogOut className="w-5 h-5" />
                  {!myPlayerId ? "Cargando..." : "Salir de la Sala"}
                </button>
              </div>

              {/* Game Info */}
              <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
                <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-3">
                  Información del Juego
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Modalidad:</span>
                    <span className="text-slate-300">Carioca Clásico</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Rondas:</span>
                    <span className="text-slate-300">7 rondas</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Compras:</span>
                    <span className="text-slate-300">Máximo 7</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden max-w-sm w-full mx-4">
            <div className="p-6 text-center">
              <h3 className="text-white font-bold text-xl mb-4">
                Código QR de la Sala
              </h3>
              <div className="bg-white p-4 rounded-xl mb-4">
                <QRCode
                  value={inviteUrl}
                  size={200}
                  className="w-full h-auto"
                />
              </div>
              <p className="text-slate-400 text-sm mb-4">
                Escanea este código para unirte a la sala
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowQR(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    onCopyInviteLink();
                    setShowQR(false);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Copiar Enlace
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
