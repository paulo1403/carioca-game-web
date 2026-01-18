import React from "react";
import { Wand2, Zap, ArrowDown } from "lucide-react";
import { Card } from "@/types/game";
import { cn } from "@/lib/utils";

interface StealableJoker {
  playerId: string;
  meldIndex: number;
  jokerCard: Card;
  requiredCards: Card[];
  canSteal: boolean;
}

interface ActionBarProps {
  stealableJokers: StealableJoker[];
  isMyTurn: boolean;
  hasDrawn: boolean;
  isDownMode: boolean;
  canDown: boolean;
  hasMelds: boolean;
  onToggleDownMode: () => void;
  onStealJoker: (index: number) => void;
  playerNames?: Record<string, string>;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  stealableJokers,
  isMyTurn,
  hasDrawn,
  isDownMode,
  canDown,
  hasMelds,
  onToggleDownMode,
  onStealJoker,
  playerNames = {},
}) => {
  return (
    <div className="mb-4 flex gap-4 z-50 flex-wrap justify-center animate-in fade-in">
      {/* Steal Joker Buttons */}
      {hasMelds && isMyTurn && hasDrawn && stealableJokers.length > 0 && !isDownMode && (
        <div className="relative animate-bounce rotate-in">
          <div className="flex gap-2 bg-gradient-to-r from-red-900/90 to-red-800/90 p-3 rounded-2xl backdrop-blur-md border-2 border-red-500/60 shadow-2xl flex-wrap justify-center">
            <div className="flex flex-col items-center justify-center px-3 border-r border-red-500/50 w-full sm:w-auto">
              <span className="text-red-200 text-xs uppercase font-bold tracking-wider">
                🃏 Jokers
              </span>
              <span className="text-white font-bold text-lg animate-pulse">
                {stealableJokers.length}
              </span>
            </div>
            {stealableJokers.slice(0, 3).map((sj, index) => (
              <button
                key={`${sj.playerId}-${sj.meldIndex}`}
                onClick={() => onStealJoker(index)}
                className="bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-3 py-2 rounded-lg flex flex-col items-center min-w-[70px] transition-all active:scale-95 shadow-lg font-semibold hover:scale-110 hover:shadow-xl"
                title={`Robar joker - Necesitas ${
                  sj.requiredCards.length
                } carta${sj.requiredCards.length !== 1 ? "s" : ""}`}
              >
                <Zap className="w-5 h-5 mb-1 animate-pulse" />
                <span className="text-[10px] uppercase font-bold">
                  #{index + 1}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bajarse Button */}
      {isMyTurn && hasDrawn && !isDownMode && canDown && (
        <div className="relative rotate-in">
          <button
            onClick={onToggleDownMode}
            className={cn(
              "font-bold px-8 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-5 transition-all hover:scale-110 hover:shadow-4xl",
              "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white ring-4 ring-green-300 glow-pulse text-lg"
            )}
          >
            <ArrowDown className="w-6 h-6 animate-bounce" />
            {hasMelds ? "¡Bajada Adicional!" : "¡Bajarse Ahora!"}
          </button>
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gradient-to-r from-green-400 to-emerald-400 text-slate-900 text-xs font-bold px-4 py-2 rounded-full shadow-2xl whitespace-nowrap animate-bounce flex items-center gap-1">
            ⚡{hasMelds ? "¡Más grupos para bajar!" : "¡Cumple el contrato!"}
          </div>
        </div>
      )}
    </div>
  );
};
