import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Player, Card } from "@/types/game";
import { MeldGroup } from "./MeldGroup";
import { cn } from "@/lib/utils";
import { X, Layers, Zap } from "lucide-react";

interface PlayerBadgeProps {
  player: Player;
  className?: string;
  isOwnPlayer?: boolean;
  isCurrentTurn?: boolean;
  handPoints?: number;
  expandedPlayerId?: string | null;
  onExpandToggle?: (playerId: string | null) => void;
}

export const PlayerBadge: React.FC<PlayerBadgeProps> = ({
  player,
  className,
  isOwnPlayer = false,
  isCurrentTurn = false,
  handPoints = 0,
  expandedPlayerId,
  onExpandToggle,
}) => {
  const showMelds = player.melds && player.melds.length > 0;
  const isExpanded = expandedPlayerId === player.id;

  const handleBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onExpandToggle) {
      onExpandToggle(isExpanded ? null : player.id);
    }
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      <div
        onClick={handleBadgeClick}
        className={cn(
          "bg-black/30 p-1 md:p-2 rounded-lg text-white text-center transition-all w-24 md:w-32 relative cursor-pointer select-none",
          isExpanded ? "ring-2 ring-blue-400 bg-blue-900/50" : "",
          isCurrentTurn
            ? "ring-2 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)] bg-green-900/20"
            : "",
        )}
      >
        <div className="font-bold text-xs md:text-base truncate">
          {player.name}
        </div>
        <div className="text-[10px] md:text-xs">
          {player.hand.length} cartas
        </div>
        <div className="text-[10px] md:text-xs">Pts: {player.score}</div>
        {isOwnPlayer && (
          <div className="text-[10px] md:text-xs text-yellow-300 font-semibold">
            Mano: {handPoints} pts
          </div>
        )}

        {/* Current Turn Indicator */}
        {isCurrentTurn && (
          <div className="absolute -top-2 -right-2 z-10 animate-bounce">
            <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
          </div>
        )}

        {/* Down Indicator */}
        {showMelds && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[8px] md:text-[10px] px-1.5 py-0.5 rounded-full border border-white/20 shadow-sm">
            Bajado
          </div>
        )}
      </div>

      {/* Melds Display - Unified Modal */}
      {isExpanded &&
        showMelds &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4"
            onClick={() => onExpandToggle?.(null)}
          >
            <div
              className="bg-slate-900/95 border border-white/10 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-center p-4 border-b border-white/10 bg-slate-900">
                <h3 className="font-bold text-lg md:text-xl text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-yellow-400" />
                  <span>
                    Juegos de{" "}
                    <span className="text-yellow-400">{player.name}</span>
                  </span>
                </h3>
                <button
                  onClick={() => onExpandToggle?.(null)}
                  className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 place-items-center">
                  {player.melds?.map((group: Card[], gIdx: number) => (
                    <div
                      key={gIdx}
                      className="flex flex-col items-center bg-black/20 p-4 rounded-lg w-full border border-white/5 hover:border-white/10 transition-colors"
                    >
                      <MeldGroup
                        group={group}
                        playerId={player.id}
                        meldIndex={gIdx}
                        size="large"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer hint */}
              <div className="p-3 bg-black/20 text-center border-t border-white/5">
                <p className="text-xs text-white/40">
                  Haz clic fuera para cerrar
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
