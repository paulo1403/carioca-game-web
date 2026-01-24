import React from "react";
import { Card, GameState, Player } from "@/types/game";
import { CardWrapper } from "./CardWrapper";
import { cn } from "@/lib/utils";
import { SortMode } from "@/hooks/useHandManagement";
import { MoveDirection } from "@/utils/handOrder";

interface HandAreaProps {
  sortedHand: Card[];
  groupsToMeld: Card[][];
  tempGroup: Card[];
  selectedCardId: string | null;
  addableCards: string[];
  suggestedDiscardCardId: string | null;
  isMyTurn: boolean;
  hasDrawn: boolean;
  isDownMode: boolean;
  isMobile: boolean;
  onClick: (cardId: string) => void;
  handPoints?: number;
  boughtCardIds?: string[];
  groupCandidateIds?: Set<string>;
  sortMode: SortMode;
  onSortModeChange: (mode: SortMode) => void;
  onMoveSelectedCard: (direction: MoveDirection) => void;
  canReorder: boolean;
}

export const HandArea: React.FC<HandAreaProps> = ({
  sortedHand,
  groupsToMeld,
  tempGroup,
  selectedCardId,
  addableCards,
  suggestedDiscardCardId,
  isMyTurn,
  hasDrawn,
  isDownMode,
  isMobile,
  onClick,
  handPoints = 0,
  boughtCardIds = [],
  groupCandidateIds = new Set<string>(),
  sortMode,
  onSortModeChange,
  onMoveSelectedCard,
  canReorder,
}) => {
  const boughtCardIdsSet = React.useMemo(() => new Set(boughtCardIds), [boughtCardIds]);
  const [showSortControls, setShowSortControls] = React.useState(!isMobile);

  const visibleHand = sortedHand.filter(
    (card) => !groupsToMeld.some((g) => g.some((c) => c.id === card.id)),
  );

  const cardWidth = isMobile ? 80 : 96;
  const step = isMobile ? 50 : 64;
  const contentWidth =
    visibleHand.length <= 1
      ? cardWidth
      : cardWidth + (visibleHand.length - 1) * step;

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex flex-col gap-2 items-center">
        <button
          type="button"
          onClick={() => setShowSortControls((prev) => !prev)}
          className="px-3 py-1.5 rounded-full text-xs md:text-sm font-semibold border bg-slate-900/50 text-slate-200 border-slate-700/60"
        >
          Orden
        </button>

        {showSortControls && (
          <div className="flex flex-col gap-2 items-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {([
                { id: "suit", label: "Palo" },
                { id: "rank", label: "Valor" },
                { id: "auto", label: "Auto" },
                { id: "manual", label: "Manual" },
              ] as { id: SortMode; label: string }[]).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onSortModeChange(opt.id)}
                  className={cn(
                    "px-3 py-2 rounded-full text-xs md:text-sm font-semibold border transition-colors",
                    sortMode === opt.id
                      ? "bg-blue-600 text-white border-blue-400"
                      : "bg-slate-900/40 text-slate-200 border-slate-600/60 hover:bg-slate-700/40"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {sortMode === "manual" && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => onMoveSelectedCard("start")}
                  disabled={!selectedCardId || !canReorder}
                  className={cn(
                    "px-3 py-2 rounded-full text-xs md:text-sm font-semibold border",
                    !selectedCardId || !canReorder
                      ? "bg-slate-800/40 text-slate-500 border-slate-700/60"
                      : "bg-slate-900/60 text-white border-slate-600/60 hover:bg-slate-700/60"
                  )}
                >
                  ⏮
                </button>
                <button
                  type="button"
                  onClick={() => onMoveSelectedCard("left")}
                  disabled={!selectedCardId || !canReorder}
                  className={cn(
                    "px-3 py-2 rounded-full text-xs md:text-sm font-semibold border",
                    !selectedCardId || !canReorder
                      ? "bg-slate-800/40 text-slate-500 border-slate-700/60"
                      : "bg-slate-900/60 text-white border-slate-600/60 hover:bg-slate-700/60"
                  )}
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={() => onMoveSelectedCard("right")}
                  disabled={!selectedCardId || !canReorder}
                  className={cn(
                    "px-3 py-2 rounded-full text-xs md:text-sm font-semibold border",
                    !selectedCardId || !canReorder
                      ? "bg-slate-800/40 text-slate-500 border-slate-700/60"
                      : "bg-slate-900/60 text-white border-slate-600/60 hover:bg-slate-700/60"
                  )}
                >
                  ▶
                </button>
                <button
                  type="button"
                  onClick={() => onMoveSelectedCard("end")}
                  disabled={!selectedCardId || !canReorder}
                  className={cn(
                    "px-3 py-2 rounded-full text-xs md:text-sm font-semibold border",
                    !selectedCardId || !canReorder
                      ? "bg-slate-800/40 text-slate-500 border-slate-700/60"
                      : "bg-slate-900/60 text-white border-slate-600/60 hover:bg-slate-700/60"
                  )}
                >
                  ⏭
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hand Cards Container */}
      <div className="relative h-40 md:h-56 w-full max-w-4xl overflow-x-auto overflow-y-hidden pb-4 md:pb-6 px-4 md:px-6 bg-gradient-to-r from-slate-900/30 to-slate-800/30 rounded-2xl backdrop-blur-sm border border-slate-700/50 py-6 md:py-8 mx-auto touch-pan-x overscroll-x-contain">
        <div
          className="relative h-full mx-auto"
          style={{ width: contentWidth + 24, minWidth: "100%" }}
        >
          {visibleHand.map((card, index) => {
            const isSelected = selectedCardId === card.id;
            const isTempSelected = tempGroup.some((c) => c.id === card.id);
            const zIndex = isSelected || isTempSelected ? 50 : index;
            const total = visibleHand.length;
            const middle = (total - 1) / 2;
            const offset = index - middle;
            const rotation = total > 1 ? offset * (isMobile ? 1.5 : 2) : 0;
            const yOffset = Math.abs(offset) * (isMobile ? 1 : 2);

            return (
              <div
                key={card.id}
                className="absolute bottom-0 transition-transform duration-500"
                style={{
                  left: index * step,
                  zIndex,
                  transform:
                    isSelected || isTempSelected
                      ? "translateY(-20px)"
                      : `rotate(${rotation}deg) translateY(${yOffset}px)`,
                }}
              >
                <CardWrapper
                  card={card}
                  index={index}
                  disabled={!isMyTurn || !hasDrawn || isDownMode}
                  isSelected={isSelected}
                  isTempSelected={isTempSelected}
                  isAddable={addableCards.includes(card.id)}
                  isSuggestedDiscard={suggestedDiscardCardId === card.id}
                  isGroupMember={groupCandidateIds.has(card.id)}
                  isNew={boughtCardIdsSet.has(card.id)}
                  onClick={() => onClick(card.id)}
                  isMobile={isMobile}
                  size={isMobile ? "touch" : "normal"}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Hand Points Display */}
      <div className="flex justify-center">
        <div className="bg-gradient-to-r from-blue-600/80 to-blue-700/80 backdrop-blur-sm border-2 border-blue-400/50 rounded-full px-6 py-2 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-white/80 text-sm font-semibold">
              Puntos en mano:
            </span>
            <span className="text-white font-bold text-xl bg-blue-900/50 px-4 py-1 rounded-full border border-blue-400/30">
              {handPoints}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
