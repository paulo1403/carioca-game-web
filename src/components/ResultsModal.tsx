import { Star, TrendingDown, Trophy } from "lucide-react";
import type React from "react";
import { useFinalResults } from "@/hooks/useFinalResults";
import { cn } from "@/lib/utils";
import type { Player } from "@/types/game";
import { MAX_BUYS } from "@/utils/buys";
import { Modal } from "./Modal";

interface ResultsModalProps {
  isOpen: boolean;
  players: Player[];
  onClose: () => void;
  roomId?: string;
}

export const ResultsModal: React.FC<ResultsModalProps> = ({ isOpen, players, onClose, roomId }) => {
  const { sortedPlayers } = useFinalResults(players, roomId);
  const winner = sortedPlayers[0];

  return (
    <Modal
      isOpen={isOpen}
      title="🏆 Resultados Finales"
      onClose={onClose}
      size="5xl"
      confirmText="Volver al Inicio"
    >
      <div className="flex flex-col gap-8">
        {/* Winner Announcement */}
        <div className="bg-gradient-to-r from-yellow-500/20 to-amber-600/20 border border-yellow-500/30 rounded-3xl p-6 flex flex-col items-center text-center animate-bounce-slow">
          <div className="bg-yellow-500 p-4 rounded-full shadow-[0_0_30px_rgba(234,179,8,0.5)] mb-4">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl md:text-3xl font-black text-white">
            ¡Victoria para <span className="text-yellow-400">{winner.name}</span>!
          </h3>
          <p className="text-slate-400 mt-2 font-medium">
            Con un puntaje total de {winner.finalScore} puntos.
          </p>
        </div>

        {/* Detailed Table */}
        <div className="overflow-x-auto rounded-2xl border border-white/5 bg-white/5">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/10 text-white font-black text-xs md:text-sm tracking-widest uppercase">
                <th className="p-4 border-r border-white/10">Jugador</th>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((r) => (
                  <th key={r} className="p-4 text-center border-r border-white/10">
                    R{r}
                  </th>
                ))}
                <th className="p-4 text-center border-r border-white/10">Compras</th>
                <th className="p-4 text-center bg-blue-600/30">Total</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((player, pIdx) => (
                <tr
                  key={player.id}
                  className={cn(
                    "border-t border-white/5 hover:bg-white/5 transition-colors",
                    player.id === winner.id ? "bg-yellow-500/5 text-yellow-100" : "text-slate-300",
                  )}
                >
                  <td className="p-4 font-bold border-r border-white/10 truncate max-w-[120px]">
                    <div className="flex items-center gap-2">
                      {player.id === winner.id && (
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      )}
                      {player.name}
                    </div>
                  </td>
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((rIdx) => {
                    const score = player.roundScores[rIdx] ?? 0;
                    return (
                      <td
                        key={rIdx}
                        className="p-4 text-center font-medium border-r border-white/10"
                      >
                        {score === 0 ? <span className="text-green-500 font-black">0</span> : score}
                      </td>
                    );
                  })}
                  <td className="p-4 text-center border-r border-white/10">
                    <div className="text-xs text-slate-400">
                      Usadas {player.buysUsed}/{MAX_BUYS}
                    </div>
                    <div
                      className={cn(
                        "text-sm font-bold",
                        player.remainingBuys > 0 ? "text-red-400" : "text-green-400",
                      )}
                    >
                      Restantes {player.remainingBuys}
                    </div>
                  </td>
                  <td className="p-4 text-center bg-blue-600/10 font-black text-white border-l border-white/10">
                    {player.finalScore}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Fun Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-4">
            <div className="bg-red-500/20 p-3 rounded-xl">
              <TrendingDown className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-red-300/60 font-bold uppercase tracking-wider">
                Mayor Puntaje
              </p>
              <p className="text-lg font-black text-red-100">
                {sortedPlayers[sortedPlayers.length - 1].name} (
                {sortedPlayers[sortedPlayers.length - 1].finalScore} pts)
              </p>
            </div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex items-center gap-4">
            <div className="bg-blue-500/20 p-3 rounded-xl">
              <Star className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-blue-300/60 font-bold uppercase tracking-wider">
                Promedio de Sala
              </p>
              <p className="text-lg font-black text-blue-100">
                {(
                  sortedPlayers.reduce((sum, p) => sum + p.finalScore, 0) / sortedPlayers.length
                ).toFixed(1)}{" "}
                pts
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
