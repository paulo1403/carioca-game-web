"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Trophy,
  Calendar,
  Users,
  History as HistoryIcon,
  Loader2,
} from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useGameHistory, GameHistoryEntry } from "@/hooks/useGameHistory";
import { useSession } from "next-auth/react";

export default function HistoryPage() {
  const { isMobile } = useIsMobile();
  const { data: history = [], isLoading: loading } = useGameHistory();
  const { data: session } = useSession();

  // Type assertion for safety
  const games = history as GameHistoryEntry[];

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-4 md:p-8 safe-area-inset">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8 p-4 bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800">
          <Link
            href="/"
            className="bg-slate-800/70 hover:bg-slate-700 p-2 rounded-xl transition-colors border border-slate-700/50 touch-target"
          >
            <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 text-slate-300" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-3xl font-bold flex items-center gap-2 md:gap-3 text-slate-100">
              <HistoryIcon className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />
              <span className="truncate">
                {isMobile ? "Historial" : `Historial de ${session?.user?.name || "Jugador"}`}
              </span>
            </h1>
            {!isMobile && (
              <p className="text-sm text-slate-400 mt-1">
                Revisa tus partidas anteriores y estadísticas
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500/50 mb-4" />
            <p className="text-slate-400 text-sm">Cargando historial...</p>
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-16 md:py-20 bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-800 mx-2 md:mx-0">
            <HistoryIcon className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 text-slate-700" />
            <p className="text-lg md:text-xl text-slate-500 mb-2">
              No hay partidas registradas aún
            </p>
            <p className="text-sm text-slate-600">
              ¡Juega tu primera partida para comenzar!
            </p>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
              <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {games.length}
                </div>
                <div className="text-xs md:text-sm text-slate-400">
                  Partidas
                </div>
              </div>
              <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-green-400">
                  {
                    games.filter((g) =>
                      g.participants.find((p) => p.id === g.winnerId),
                    ).length
                  }
                </div>
                <div className="text-xs md:text-sm text-slate-400">
                  Completadas
                </div>
              </div>
              <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {
                    new Set(
                      games.flatMap((g) => g.participants.map((p) => p.name)),
                    ).size
                  }
                </div>
                <div className="text-xs md:text-sm text-slate-400">
                  Jugadores
                </div>
              </div>
              <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {Math.round(
                    games.reduce((sum, g) => sum + g.participants.length, 0) /
                    games.length,
                  ) || 0}
                </div>
                <div className="text-xs md:text-sm text-slate-400">
                  Promedio
                </div>
              </div>
            </div>

            {/* Games List */}
            <div className="space-y-3 md:space-y-4">
              {games.map((game) => {
                const winner = game.participants.find(
                  (p) => p.id === game.winnerId,
                );
                const date = new Date(game.playedAt);
                const formattedDate = isMobile
                  ? date.toLocaleDateString("es-CL", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                  : date.toLocaleDateString("es-CL", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                return (
                  <div
                    key={game.id}
                    className="bg-slate-900/50 hover:bg-slate-800/60 transition-all duration-200 rounded-xl border border-slate-800 hover:border-slate-700 shadow-sm hover:shadow-md overflow-hidden"
                  >
                    {isMobile ? (
                      // Mobile Layout - Stacked
                      <div className="p-4 space-y-4">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-slate-500 text-sm">
                            <Calendar className="w-4 h-4" />
                            <span className="font-mono">{formattedDate}</span>
                          </div>
                          <div className="text-xs text-slate-400 bg-slate-800/50 px-2 py-1 rounded-full">
                            {game.participants.length} jugadores
                          </div>
                        </div>

                        {/* Winner */}
                        <div className="flex items-center gap-3">
                          <div className="bg-yellow-500/10 p-2.5 rounded-full border border-yellow-500/20 shrink-0">
                            <Trophy className="w-5 h-5 text-yellow-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs text-yellow-600 font-bold uppercase tracking-wider">
                              Ganador
                            </div>
                            <div className="text-lg font-bold text-slate-200 truncate">
                              {winner?.name || "Desconocido"}
                            </div>
                          </div>
                        </div>

                        {/* Participants */}
                        <div>
                          <div className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Participantes
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {game.participants.map((p) => (
                              <span
                                key={p.id}
                                className={`text-xs px-2 py-1 rounded-full border whitespace-nowrap ${p.id === game.winnerId
                                    ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-500 font-medium"
                                    : "bg-slate-800/70 border-slate-700/70 text-slate-400"
                                  }`}
                              >
                                {p.name.length > 12
                                  ? `${p.name.slice(0, 12)}...`
                                  : p.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Desktop Layout - Side by side
                      <div className="p-6 flex gap-6 items-center">
                        {/* Left: Date & Winner */}
                        <div className="shrink-0">
                          <div className="flex items-center gap-2 text-slate-500 text-sm mb-3">
                            <Calendar className="w-4 h-4" />
                            {formattedDate}
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="bg-yellow-500/10 p-3 rounded-full border border-yellow-500/20">
                              <Trophy className="w-6 h-6 text-yellow-500" />
                            </div>
                            <div>
                              <div className="text-xs text-yellow-600 font-bold uppercase tracking-wider">
                                Ganador
                              </div>
                              <div className="text-xl font-bold text-slate-200">
                                {winner?.name || "Desconocido"}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right: Participants */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
                            <Users className="w-4 h-4" />
                            Participantes ({game.participants.length})
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {game.participants.map((p) => (
                              <span
                                key={p.id}
                                className={`text-sm px-3 py-1.5 rounded-full border ${p.id === game.winnerId
                                    ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-500 font-medium"
                                    : "bg-slate-800 border-slate-700 text-slate-400"
                                  }`}
                              >
                                {p.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
