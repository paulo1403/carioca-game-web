"use client";

import React, { useState } from "react";
import { GameState, ROUND_CONTRACTS } from "@/types/game";
import { RulesModal } from "@/components/RulesModal";
import {
  Trophy,
  User,
  Bot,
  Zap,
  Menu,
  X,
  LogOut,
  History,
  Users,
  HelpCircle,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface GameHeaderProps {
  gameState: GameState;
  myPlayerId: string;
  roomId?: string;
  onEndGame?: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  gameState,
  myPlayerId,
  roomId,
  onEndGame,
}) => {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showEndGameModal, setShowEndGameModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const currentTurnPlayer = gameState.players[gameState.currentTurn];
  const contract = ROUND_CONTRACTS[gameState.currentRound - 1];
  const myPlayer = gameState.players.find((p) => p.id === myPlayerId);
  const isHost = gameState.creatorId === myPlayerId;

  const handleLeaveGame = () => {
    if (roomId) {
      localStorage.removeItem(`carioca_player_id_${roomId}`);
    }
    router.push("/");
  };

  return (
    <>
      <div className="w-full fixed top-0 left-0 z-40 bg-slate-950/40 backdrop-blur-md border-b border-white/5 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
              Ronda {gameState.currentRound}
            </span>
            <span className="text-white font-extrabold text-sm md:text-base leading-tight">
              {contract?.name || "Sin Contrato"}
            </span>
          </div>
          <div className="h-8 w-px bg-white/10 hidden md:block"></div>
          <div className="flex-col hidden md:flex">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
              Objetivo
            </span>
            <span className="text-blue-300 font-bold text-xs">
              {contract?.description || "Saca todas tus cartas"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/10 shadow-inner">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden sm:inline">
            Turno de:
          </span>
          <div className="flex items-center gap-1.5">
            {currentTurnPlayer?.isBot ? (
              <Bot className="w-3 h-3 text-purple-400" />
            ) : (
              <User className="w-3 h-3 text-blue-400" />
            )}
            <span className="text-white font-bold text-sm truncate max-w-20">
              {currentTurnPlayer?.name}
            </span>
            {currentTurnPlayer?.id === myPlayerId && (
              <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
            )}
          </div>

          {/* Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="ml-2 p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Menú"
          >
            {isMenuOpen ? (
              <X className="w-5 h-5 text-slate-300" />
            ) : (
              <Menu className="w-5 h-5 text-slate-300" />
            )}
          </button>
        </div>

        {/* Dropdown Menu */}
        {isMenuOpen && (
          <div className="absolute top-full right-4 mt-2 w-64 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
            {/* Player Info */}
            <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-200 truncate">
                    {myPlayer?.name}
                  </div>
                  <div className="text-xs text-slate-400">
                    {isHost ? "Anfitrión" : "Jugador"}
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Options */}
            <div className="py-1">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  router.push("/history");
                }}
                className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-slate-800/50 transition-colors text-slate-200"
              >
                <History className="w-4 h-4 text-slate-400" />
                <span className="text-sm">Ver Historial</span>
              </button>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  // TODO: Mostrar modal de jugadores
                }}
                className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-slate-800/50 transition-colors text-slate-200"
              >
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-sm">
                  Jugadores ({gameState.players.length})
                </span>
              </button>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setShowRulesModal(true);
                }}
                className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-slate-800/50 transition-colors text-slate-200"
              >
                <HelpCircle className="w-4 h-4 text-slate-400" />
                <span className="text-sm">Cómo Jugar</span>
              </button>

              <div className="border-t border-slate-700 my-1"></div>

              {isHost && (
                <>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setShowEndGameModal(true);
                    }}
                    className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-orange-900/20 transition-colors text-orange-400"
                  >
                    <XCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Terminar Juego</span>
                  </button>

                  <div className="border-t border-slate-700 my-1"></div>
                </>
              )}

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setShowLeaveModal(true);
                }}
                className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-red-900/20 transition-colors text-red-400"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Salir de la Partida</span>
              </button>
            </div>
          </div>
        )}

        {/* Click outside to close */}
        {isMenuOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsMenuOpen(false)}
          />
        )}
      </div>

      {/* Leave Game Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-150 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <LogOut className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-200">
                Salir de la Partida
              </h3>
            </div>
            <p className="text-slate-300 mb-6">
              ¿Estás seguro de que quieres salir de la partida?
              {isHost &&
                " Como anfitrión, esto no terminará el juego para los demás jugadores."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowLeaveModal(false);
                  handleLeaveGame();
                }}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Game Modal (Host only) */}
      {showEndGameModal && (
        <div className="fixed inset-0 z-150 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-200">
                Terminar Juego
              </h3>
            </div>
            <p className="text-slate-300 mb-6">
              ¿Estás seguro de que quieres terminar el juego para todos los
              jugadores? Esta acción expulsará a todos y cerrará la sala.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndGameModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowEndGameModal(false);
                  onEndGame?.();
                }}
                className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Terminar Juego
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules Modal */}
      <RulesModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />
    </>
  );
};
