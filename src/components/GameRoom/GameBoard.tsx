"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { GameState } from "@/types/game";
import { Board } from "@/components/Board";
import { ResultsModal } from "@/components/ResultsModal";
import { Shuffle, Trophy, Star, Users, Clock, Bot, User } from "lucide-react";

interface GameBoardProps {
  gameState: GameState;
  myPlayerId: string;
  roomId?: string;
  buyIntents?: Record<string, number>;
  onBuyIntent?: () => void;
  emojiReactions?: Record<string, { emoji: string; timestamp: number }>;
  onEmojiReaction?: (emoji: string) => void;
  modalConfig: {
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    type?: "info" | "confirm" | "danger";
    onConfirm?: () => void;
  };
  roundWinnerModal: {
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
  };
  reshuffleBanner: { count: number } | null;
  onCloseModal: () => void;
  onCloseRoundWinner: () => void;
  onCloseReshuffleBanner: () => void;
  onDrawDeck: () => void;
  onDrawDiscard: () => void;
  isDrawing?: boolean;
  isBuying?: boolean;
  onDiscard: (cardId: string) => void;
  onDown: (groups: any[][]) => void;
  onAddToMeld: (
    cardId: string,
    targetPlayerId: string,
    meldIndex: number,
  ) => void;
  onStealJoker: (
    cardId: string,
    targetPlayerId: string,
    meldIndex: number,
  ) => void;
  onReadyForNextRound: () => void;
  onStartNextRound: () => void;
  onEndGame?: () => void;
  onSkipBotTurn?: () => void;
  onUpdateName: (newName: string) => void;
  hasDrawn: boolean;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  myPlayerId,
  roomId,
  buyIntents,
  onBuyIntent,
  emojiReactions,
  onEmojiReaction,
  modalConfig,
  roundWinnerModal,
  reshuffleBanner,
  onCloseModal,
  onCloseRoundWinner,
  onCloseReshuffleBanner,
  onDrawDeck,
  onDrawDiscard,
  isDrawing = false,
  isBuying = false,
  onDiscard,
  onDown,
  onAddToMeld,
  onStealJoker,
  onReadyForNextRound,
  onStartNextRound,
  onEndGame,
  onUpdateName,
  hasDrawn,
}) => {
  const [showResults, setShowResults] = React.useState(false);

  const router = useRouter();
  const myPlayer = gameState.players.find((p) => p.id === myPlayerId);
  const isHost = gameState.creatorId === myPlayerId;
  const isRoundEnded = gameState.status === "ROUND_ENDED";
  const isGameFinished = gameState.status === "FINISHED";

  const getRoundScore = (player: { roundScores?: number[] }) => {
    const scores = player.roundScores || [];
    return scores.length > 0 ? scores[scores.length - 1] : 0;
  };

  const getRoundBuys = (player: { roundBuys?: number[] }) => {
    const buys = player.roundBuys || [];
    return buys.length > 0 ? buys[buys.length - 1] : 0;
  };

  // Auto-show results if game is finished
  React.useEffect(() => {
    if (isGameFinished) {
      setShowResults(true);
    }
  }, [isGameFinished]);

  // Calculate if ready for next round
  const playersReady = gameState.readyForNextRound?.length || 0;
  const totalPlayers = gameState.players.length;
  const allReady = playersReady === totalPlayers;

  return (
    <div className="relative">
      {/* Global blocking overlay for slow servers (blocks all player actions during draw/buy) */}
      {(isDrawing || isBuying) && (
        <div
          className="fixed inset-0 z-140 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          aria-busy="true"
          aria-live="polite"
        >
          <div className="bg-slate-900/95 border border-white/10 rounded-2xl p-6 w-full max-w-md text-center">
            <div className="flex items-center justify-center gap-4">
              <div className="loader w-10 h-10 rounded-full border-4 border-white/20 border-t-white animate-spin" />
              <div className="text-white font-bold text-lg">
                {isDrawing ? "Robando carta del servidor..." : "Comprando del descarte..."}
              </div>
            </div>
            <div className="text-slate-300 text-sm mt-3">
              Espera un momento mientras confirmamos la operación con el servidor.
            </div>
          </div>
        </div>
      )}



      {/* Reshuffle Banner */}
      {reshuffleBanner && (
        <div className="fixed inset-0 z-120 pointer-events-none flex items-start justify-center p-4 pt-10">
          <div
            className="pointer-events-auto w-full max-w-2xl rounded-2xl border border-amber-500/30 bg-slate-950/80 backdrop-blur-xl shadow-2xl shadow-black/40 px-6 py-5 animate-in fade-in zoom-in-95 duration-200 cursor-pointer"
            onClick={onCloseReshuffleBanner}
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
                  El descarte se mezcló y volvió al mazo. Rebarajadas esta
                  ronda:{" "}
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




      {/* Round Winner Modal */}
      {roundWinnerModal.isOpen && (
        <div className="fixed inset-0 z-130 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 border border-yellow-500/30 rounded-2xl overflow-hidden max-w-2xl w-full mx-4 max-h-[90vh]">
            {/* Header */}
            <div className="bg-linear-to-r from-yellow-600 to-amber-600 p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">
                ¡Ronda Completada!
              </h2>
              <p className="text-yellow-100">
                {roundWinnerModal.winnerName} ganó la ronda{" "}
                {gameState.currentRound}
              </p>
            </div>

            {/* Scores */}
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Puntuaciones
              </h3>
              <div className="space-y-3 mb-6">
                {roundWinnerModal.scores
                  .sort((a, b) => {
                    const aScore = isGameFinished ? a.score : getRoundScore(a);
                    const bScore = isGameFinished ? b.score : getRoundScore(b);
                    return aScore - bScore;
                  })
                  .map((player, idx) => (
                    <div
                      key={player.name}
                      className={`flex items-center justify-between p-3 rounded-xl ${idx === 0
                        ? "bg-yellow-500/10 border border-yellow-500/30"
                        : "bg-slate-800/50 border border-slate-700"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${idx === 0
                            ? "bg-yellow-500 text-white"
                            : idx === 1
                              ? "bg-slate-400 text-white"
                              : idx === 2
                                ? "bg-amber-700 text-white"
                                : "bg-slate-600 text-slate-300"
                            }`}
                        >
                          {idx + 1}
                        </div>
                        <span className="font-medium text-slate-200">
                          {player.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-lg font-bold text-slate-200">
                            {isGameFinished ? player.score : getRoundScore(player)} pts
                          </div>
                          <div className="text-xs text-slate-400">
                            {isGameFinished
                              ? `${player.buysUsed} compras totales`
                              : `${getRoundBuys(player)} compras de la ronda`}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Next Round Info */}
              {!isGameFinished && (
                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-200">
                      Siguiente Ronda: {roundWinnerModal.nextRound}
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Users className="w-4 h-4" />
                      {playersReady}/{totalPlayers} listos
                    </div>
                  </div>
                </div>
              )}

              {/* Game Finished */}
              {isGameFinished && (
                <div className="bg-linear-to-r from-purple-600/20 to-blue-600/20 rounded-xl p-4 border border-purple-500/30">
                  <h4 className="font-bold text-lg text-center text-white mb-2">
                    🎉 ¡Juego Terminado! 🎉
                  </h4>
                  <p className="text-center text-slate-300 text-sm">
                    Gracias por jugar. ¡Excelente partida!
                  </p>
                </div>
              )}

              {/* Action Button */}
              {!isGameFinished ? (
                <button
                  onClick={() => {
                    if (isHost && allReady) {
                      // Host inicia la ronda cuando todos están listos
                      onStartNextRound();
                      onCloseRoundWinner();
                    } else if (
                      !gameState.readyForNextRound?.includes(myPlayerId)
                    ) {
                      // Marcar como listo y cerrar
                      onReadyForNextRound();
                      onCloseRoundWinner();
                    } else {
                      // Ya está listo, solo cerrar
                      onCloseRoundWinner();
                    }
                  }}
                  className={`w-full mt-4 font-bold py-3 px-4 rounded-lg transition-all ${isHost && allReady
                    ? "bg-blue-600 hover:bg-blue-500 text-white animate-pulse"
                    : !gameState.readyForNextRound?.includes(myPlayerId)
                      ? "bg-green-600 hover:bg-green-500 text-white"
                      : "bg-slate-700 hover:bg-slate-600 text-slate-200"
                    }`}
                >
                  {isHost && allReady
                    ? `🚀 Iniciar Ronda ${roundWinnerModal.nextRound}`
                    : !gameState.readyForNextRound?.includes(myPlayerId)
                      ? "✓ Marcarme Listo y Continuar"
                      : "Cerrar"}
                </button>
              ) : (
                <button
                  onClick={onCloseRoundWinner}
                  className="w-full mt-4 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Cerrar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Waiting Screen Between Rounds */}
      {isRoundEnded && !roundWinnerModal.isOpen && (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
          <div className="max-w-2xl w-full bg-slate-900/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-8 shadow-2xl">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <Trophy className="w-10 h-10 text-yellow-400" />
              </div>

              <h2 className="text-2xl font-bold text-slate-200 mb-2">
                Ronda {gameState.currentRound} Completada
              </h2>

              <p className="text-slate-400 mb-8">
                Esperando a que todos los jugadores estén listos...
              </p>

              {/* Players Ready Status */}
              <div className="bg-slate-800/50 rounded-xl p-6 mb-8">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-slate-400" />
                  <span className="text-lg font-semibold text-slate-200">
                    {playersReady}/{totalPlayers} Listos
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-green-500 to-emerald-500 transition-all duration-500"
                    style={{
                      width: `${(playersReady / totalPlayers) * 100}%`,
                    }}
                  />
                </div>

                {/* Player list */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {gameState.players.map((player: any) => (
                    <div
                      key={player.id}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg ${gameState.readyForNextRound?.includes(player.id)
                        ? "bg-green-500/20 border border-green-500/30"
                        : "bg-slate-700/50 border border-slate-600"
                        }`}
                    >
                      {player.isBot ? (
                        <Bot className="w-4 h-4 text-purple-400" />
                      ) : (
                        <User className="w-4 h-4 text-blue-400" />
                      )}
                      <span className="text-sm font-medium text-slate-200 flex-1 truncate">
                        {player.name}
                        {player.id === myPlayerId && " (Tú)"}
                      </span>
                      {gameState.readyForNextRound?.includes(player.id) ? (
                        <span className="text-green-400 text-xs">✓ Listo</span>
                      ) : (
                        <span className="text-slate-500 text-xs">
                          Esperando...
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              {!gameState.readyForNextRound?.includes(myPlayerId) ? (
                <button
                  onClick={onReadyForNextRound}
                  className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-lg transition-colors text-lg"
                >
                  Marcarme Listo
                </button>
              ) : (
                <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 font-medium py-3 px-8 rounded-lg border border-green-500/30">
                  <span className="text-lg">✓</span>
                  <span>Estás Listo</span>
                </div>
              )}

              {isHost && allReady && (
                <button
                  onClick={onStartNextRound}
                  className="mt-4 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg transition-colors text-lg animate-pulse"
                >
                  🚀 Iniciar Ronda {gameState.currentRound + 1}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Game Board - Only show when actually playing */}
      {!isRoundEnded && !isGameFinished && (
        <Board
          gameState={gameState}
          myPlayerId={myPlayerId}
          roomId={roomId}
          onDrawDeck={onDrawDeck}
          onDrawDiscard={onDrawDiscard}
          onDiscard={onDiscard}
          onDown={onDown}
          onAddToMeld={onAddToMeld}
          onStealJoker={onStealJoker}
          onEndGame={onEndGame}
          onUpdateName={onUpdateName}
          hasDrawn={hasDrawn}
          buyIntents={buyIntents}
          onBuyIntent={onBuyIntent}
          emojiReactions={emojiReactions}
          onEmojiReaction={onEmojiReaction}
        />
      )}

      {/* Detailed Final Scoreboard Modal */}
      <ResultsModal
        isOpen={showResults}
        players={gameState.players}
        roomId={roomId}
        onClose={() => {
          setShowResults(false);
          if (roomId && typeof window !== "undefined") {
            localStorage.removeItem(`carioca_player_id_${roomId}`);
          }
          router.push("/");
        }}
      />

      <ResultsModal
        isOpen={showResults}
        players={gameState.players}
        roomId={roomId}
        onClose={() => {
          setShowResults(false);
          if (roomId && typeof window !== "undefined") {
            localStorage.removeItem(`carioca_player_id_${roomId}`);
          }
          router.push("/");
        }}
      />
    </div>
  );
};
