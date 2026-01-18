import React from "react";
import { PlayingCard } from "./Card";
import { DiscardPileWrapper } from "./DiscardPileWrapper";
import { cn } from "@/lib/utils";
import { Lightbulb } from "lucide-react";
import { Card, GameState, Player } from "@/types/game";

interface DeckAreaProps {
  isMyTurn: boolean;
  hasDrawn: boolean;
  isDownMode: boolean;
  gameState: GameState;
  myPlayer: Player | undefined;
  onDrawDeck: () => void;
  onDrawDiscard: () => void;
  handleDiscardPileClick: () => void;
  setShowBuyConfirmDialog: (show: boolean) => void;
  isDiscardUseful: boolean;
  playShuffle: () => void;
  selectedCardId: string | null;
}

export const DeckArea: React.FC<DeckAreaProps> = ({
  isMyTurn,
  hasDrawn,
  isDownMode,
  gameState,
  myPlayer,
  onDrawDeck,
  handleDiscardPileClick,
  isDiscardUseful,
  playShuffle,
  selectedCardId,
}) => {
  return (
    <div className="flex gap-4 md:gap-8 items-center justify-center bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 p-4 md:p-8 rounded-2xl border-2 md:border-4 border-slate-600/50 transform scale-90 md:scale-100 shadow-2xl backdrop-blur-sm">
      {/* Deck */}
      <div
        onClick={() => {
          if (isMyTurn && !hasDrawn && !isDownMode) {
            onDrawDeck();
            playShuffle();
          }
        }}
        className={cn(
          "relative transition-all duration-300 card-bounce-in",
          isMyTurn && !hasDrawn && !isDownMode
            ? "cursor-pointer hover:scale-110 hover:shadow-2xl hover:shadow-blue-500/50 hover:-translate-y-2"
            : "opacity-75"
        )}
      >
        <div className="w-20 h-28 md:w-24 md:h-36 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl border-3 border-blue-300 shadow-2xl flex items-center justify-center font-bold text-white">
          <span className="text-lg md:text-xl">♠</span>
        </div>
        <div className="absolute -top-2 -left-2 w-20 h-28 md:w-24 md:h-36 bg-blue-700 rounded-xl border-3 border-blue-400 -z-10 opacity-50"></div>

        {isMyTurn && !hasDrawn && !isDownMode && (
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-white text-xs font-bold bg-blue-600 px-3 py-1.5 rounded-full whitespace-nowrap animate-bounce shadow-lg rotate-in">
            ↓ Robar
          </div>
        )}
      </div>

      {/* Discard Pile */}
      <DiscardPileWrapper
        disabled={isDownMode}
        isTarget={!!(isMyTurn && hasDrawn && selectedCardId)}
      >
        <div
          onClick={handleDiscardPileClick}
          className={cn(
            "relative transition-all duration-300 card-bounce-in",
            gameState.discardPile.length > 0 &&
              (myPlayer?.buysUsed ?? 0) < 7 &&
              !isDownMode
              ? "cursor-pointer hover:scale-105 hover:ring-4 hover:ring-yellow-400 rounded-lg hover:-translate-y-2"
              : ""
          )}
        >
          {gameState.discardPile.length > 0 ? (
            <PlayingCard
              card={gameState.discardPile[gameState.discardPile.length - 1]}
              className="w-20 h-28 md:w-24 md:h-36 transition-all duration-300"
            />
          ) : (
            <div className="w-20 h-28 md:w-24 md:h-36 border-2 border-dashed border-white/30 rounded-lg flex items-center justify-center text-white/30 text-sm md:text-base">
              Pozo
            </div>
          )}

          {/* Buy Counter */}
          {gameState.discardPile.length > 0 && (
            <div className="absolute -top-2 -right-2 bg-black/80 text-white text-xs px-2 py-1 rounded-full border border-white/20 w-10 text-center animate-pulse">
              {7 - (myPlayer?.buysUsed ?? 0)} compras
            </div>
          )}

          {gameState.discardPile.length > 0 &&
            (myPlayer?.buysUsed ?? 0) < 7 &&
            !isDownMode &&
            (!isMyTurn || !selectedCardId) && (
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-white text-xs font-bold bg-black/50 px-2 py-1 rounded whitespace-nowrap animate-bounce rotate-in">
                Comprar
              </div>
            )}

          {/* Hint Indicator */}
          {isDiscardUseful && (
            <div
              className="absolute -top-2 -right-2 bg-yellow-400 text-black p-1 rounded-full shadow-lg animate-bounce z-20"
              title="¡Esta carta te sirve!"
            >
              <Lightbulb className="w-4 h-4" />
            </div>
          )}
        </div>
      </DiscardPileWrapper>
    </div>
  );
};
