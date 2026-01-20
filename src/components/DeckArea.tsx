import React from "react";
import { PlayingCard } from "./Card";
import { DiscardPileWrapper } from "./DiscardPileWrapper";
import { cn } from "@/lib/utils";
import { Lightbulb } from "lucide-react";
import { Card, GameState, Player } from "@/types/game";
import { useIsMobile } from "@/hooks/useIsMobile";

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
  const { isMobile } = useIsMobile();
  return (
    <div className="flex gap-4 md:gap-8 items-center justify-center glass-panel p-4 md:p-8 rounded-3xl transform scale-90 md:scale-100 shadow-2xl">
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
            ? "cursor-pointer hover:scale-110 hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] hover:-translate-y-2"
            : "opacity-75 grayscale-[0.2]",
        )}
      >
        <div
          className={cn(
            "bg-blue-800 rounded-xl border-2 border-blue-400 shadow-2xl flex items-center justify-center relative overflow-hidden group-hover:border-white transition-colors",
            isMobile ? "w-20 h-28" : "w-24 h-36",
          )}
        >
          {/* Card Back Pattern */}
          <div className="absolute inset-1 border border-blue-400/30 rounded-lg flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] bg-size-[10px_10px]"></div>
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-blue-400/50 flex items-center justify-center bg-blue-900/40">
              <span className="text-2xl md:text-3xl text-blue-200 drop-shadow-lg font-black">
                C
              </span>
            </div>
          </div>
        </div>

        {/* Shadow Stack Effect */}
        <div
          className={cn(
            "absolute top-1 left-1 bg-blue-900 rounded-xl border border-blue-500/30 -z-10",
            isMobile ? "w-20 h-28" : "w-24 h-36",
          )}
        ></div>
        <div
          className={cn(
            "absolute top-2 left-2 bg-blue-950 rounded-xl border border-blue-600/20 -z-20",
            isMobile ? "w-20 h-28" : "w-24 h-36",
          )}
        ></div>

        {isMyTurn && !hasDrawn && !isDownMode && (
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-white text-xs font-bold bg-blue-600 px-4 py-2 rounded-xl whitespace-nowrap animate-bounce shadow-xl border border-blue-400">
            ROBAR CARTA
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
              : "",
          )}
        >
          {gameState.discardPile.length > 0 ? (
            <PlayingCard
              card={gameState.discardPile[gameState.discardPile.length - 1]}
              size={isMobile ? "touch" : "normal"}
              className="transition-all duration-300"
            />
          ) : (
            <div
              className={cn(
                "border-2 border-dashed border-white/30 rounded-lg flex items-center justify-center text-white/30",
                isMobile ? "w-20 h-28 text-sm" : "w-24 h-36 text-base",
              )}
            >
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
