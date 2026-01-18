import React from "react";
import { Card } from "@/types/game";
import { cn } from "@/lib/utils";

interface MeldGroupProps {
  group: Card[];
  playerId: string;
  meldIndex: number;
  size?: "small" | "large";
}

export const MeldGroup: React.FC<MeldGroupProps> = ({
  group,
  playerId,
  meldIndex,
  size = "small",
}) => {
  const isLarge = size === "large";

  return (
    <div
      className={cn(
        "flex p-1 rounded transition-all items-center justify-center",
        isLarge
          ? "-space-x-6 min-w-[100px] min-h-[80px]"
          : "-space-x-4 min-w-[60px] min-h-[40px]",
        "bg-white/5"
      )}
    >
      {group.map((card, i) => (
        <div
          key={card.id}
          className={cn(
            "bg-white rounded shadow-sm border border-gray-300 relative select-none overflow-hidden",
            isLarge ? "w-14 h-20" : "w-8 h-12"
          )}
        >
          {/* Corner Info (Top Left) */}
          <div className="absolute top-0.5 left-0.5 flex flex-col items-center leading-none">
            <span
              className={cn(
                "font-bold",
                isLarge ? "text-sm" : "text-[8px]",
                card.suit === "HEART" || card.suit === "DIAMOND"
                  ? "text-red-500"
                  : "text-black"
              )}
            >
              {card.value === 0 ? "JK" : card.displayValue || card.value}
            </span>
            <span
              className={cn(
                isLarge ? "text-xs" : "text-[6px]",
                card.suit === "HEART" || card.suit === "DIAMOND"
                  ? "text-red-500"
                  : "text-black"
              )}
            >
              {card.suit === "HEART"
                ? "♥"
                : card.suit === "DIAMOND"
                ? "♦"
                : card.suit === "CLUB"
                ? "♣"
                : card.suit === "SPADE"
                ? "♠"
                : "★"}
            </span>
          </div>

          {/* Center Suit (Big) */}
          <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
            <span
              className={cn(
                isLarge ? "text-3xl" : "text-xl",
                card.suit === "HEART" || card.suit === "DIAMOND"
                  ? "text-red-500"
                  : "text-black"
              )}
            >
              {card.suit === "HEART"
                ? "♥"
                : card.suit === "DIAMOND"
                ? "♦"
                : card.suit === "CLUB"
                ? "♣"
                : card.suit === "SPADE"
                ? "♠"
                : "★"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
