import React from "react";
import { Player, Card } from "@/types/game";
import { MeldGroup } from "./MeldGroup";
import { cn } from "@/lib/utils";
import { X, Layers, Zap } from "lucide-react";

interface PlayerBadgeProps {
  player: Player;
  className?: string;
  isOwnPlayer?: boolean;
  handPoints?: number;
  expandedPlayerId?: string | null;
  onExpandToggle?: (playerId: string | null) => void;
}

export const PlayerBadge: React.FC<PlayerBadgeProps> = ({
  player,
  className,
  isOwnPlayer = false,
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

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      <div
        onClick={handleBadgeClick}
        className={cn(
          "bg-black/30 p-1 md:p-2 rounded-lg text-white text-center transition-all w-24 md:w-32 relative cursor-pointer select-none",
          isExpanded ? "ring-2 ring-blue-400 bg-blue-900/50" : ""
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

        {/* Down Indicator */}
        {showMelds && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[8px] md:text-[10px] px-1.5 py-0.5 rounded-full border border-white/20 shadow-sm">
            Bajado
          </div>
        )}
      </div>

      {/* Melds Display - Modal/Popover */}
      {isExpanded && showMelds && (
        <>
          {/* Mobile Full Screen Overlay */}
          {isMobile && (
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-4"
              onClick={() => onExpandToggle?.(null)}
            >
              <div
                className="bg-green-900/90 border-2 border-white/20 rounded-2xl p-4 w-full max-w-sm max-h-[80vh] overflow-y-auto shadow-2xl relative"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4 sticky top-0 bg-green-900/90 pb-2 border-b border-white/10 z-10">
                  <h3 className="font-bold text-lg text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-yellow-400" />
                    Juegos de {player.name}
                  </h3>
                  <button
                    onClick={() => onExpandToggle?.(null)}
                    className="bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-transform active:scale-95"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-col gap-6 items-center w-full pb-4">
                  {player.melds?.map((group: Card[], gIdx: number) => (
                    <div
                      key={gIdx}
                      className="w-full flex flex-col items-center"
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
            </div>
          )}

          {/* Popover for Desktop */}
          {!isMobile && (
            <div
              className={cn(
                "absolute top-full mt-4 flex flex-col gap-1 items-center bg-black/80 p-2 rounded-lg z-30 shadow-2xl border border-white/10 max-h-[200px] overflow-y-auto w-[180px] transition-all animate-in zoom-in-90"
              )}
            >
              <span className="text-[10px] text-white/50 uppercase font-bold mb-1 w-full text-center sticky top-0 bg-black/80 pb-1 flex justify-between items-center px-2">
                <span>Juegos de {player.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onExpandToggle?.(null);
                  }}
                  className="bg-red-500 rounded-full p-1 hover:bg-red-600"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </span>
              <div className="flex flex-col items-center gap-4 justify-center w-full">
                {player.melds?.map((group: Card[], gIdx: number) => (
                  <MeldGroup
                    key={gIdx}
                    group={group}
                    playerId={player.id}
                    meldIndex={gIdx}
                    size="small"
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
