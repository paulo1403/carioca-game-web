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
  processing?: boolean;
  onBuyIntent?: () => void;
  canBuyIntent?: boolean;
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
  processing = false,
  onBuyIntent,
  canBuyIntent = false,
}) => {
  return (
    <div className="mt-3 flex gap-3 z-50 flex-wrap justify-center">
      {onBuyIntent && (
        <button
          onClick={() => !processing && canBuyIntent && onBuyIntent()}
          disabled={processing || !canBuyIntent}
          className={cn(
            "font-semibold px-5 py-2 rounded-full shadow-sm flex items-center gap-2 transition-all text-sm",
            canBuyIntent
              ? "bg-amber-400 text-slate-900 hover:bg-amber-300"
              : "bg-slate-800/60 text-slate-400 cursor-not-allowed",
          )}
        >
          <Wand2 className="w-5 h-5" />
          ¡COMPRO!
        </button>
      )}
      {/* Steal Joker Buttons */}
      {hasMelds && isMyTurn && hasDrawn && stealableJokers.length > 0 && !isDownMode && (
        <div className="flex gap-2 bg-red-900/70 p-2 rounded-full border border-red-500/50 items-center">
          <span className="text-red-200 text-xs font-semibold px-2">🃏 {stealableJokers.length}</span>
          {stealableJokers.slice(0, 3).map((sj, index) => (
            <button
              key={`${sj.playerId}-${sj.meldIndex}`}
              onClick={() => !processing && onStealJoker(index)}
              disabled={processing}
              className={cn(
                "bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-full text-xs font-semibold",
                processing ? "opacity-60 cursor-not-allowed" : ""
              )}
              title={`Robar joker - Necesitas ${
                sj.requiredCards.length
              } carta${sj.requiredCards.length !== 1 ? "s" : ""}`}
            >
              #{index + 1}
            </button>
          ))}
        </div>
      )}

      {/* Bajarse Button */}
      {isMyTurn && hasDrawn && !isDownMode && canDown && (
        <button
          onClick={() => !processing && onToggleDownMode()}
          disabled={processing}
          className={cn(
            "font-semibold px-6 py-2 rounded-full shadow-sm flex items-center gap-2 transition-all text-sm",
            "bg-green-500 hover:bg-green-400 text-white",
            processing ? "opacity-60 cursor-not-allowed" : ""
          )}
        >
          <ArrowDown className="w-5 h-5" />
          {hasMelds ? "Bajada adicional" : "Bajarse"}
        </button>
      )}
    </div>
  );
};
