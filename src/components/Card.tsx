import React from "react";
import { Card as CardType } from "@/types/game";
import { cn } from "@/lib/utils";
import { Heart, Diamond, Club, Spade, Ghost } from "lucide-react";

interface CardProps {
  card: CardType;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
  size?: "small" | "normal" | "large" | "touch";
  disabled?: boolean;
}

export const PlayingCard: React.FC<CardProps> = ({
  card,
  isSelected,
  onClick,
  className,
  size = "normal",
  disabled = false,
}) => {
  const getSuitColor = (suit: string) => {
    return suit === "HEART" || suit === "DIAMOND"
      ? "text-red-600"
      : "text-slate-900";
  };

  const getSuitIcon = (suit: string, size: string = "w-6 h-6") => {
    switch (suit) {
      case "HEART":
        return <Heart className={cn(size, "fill-current")} />;
      case "DIAMOND":
        return <Diamond className={cn(size, "fill-current")} />;
      case "CLUB":
        return <Club className={cn(size, "fill-current")} />;
      case "SPADE":
        return <Spade className={cn(size, "fill-current")} />;
      case "JOKER":
        return <Ghost className={cn(size)} />;
      default:
        return null;
    }
  };

  // Size classes for different card sizes
  const sizeClasses = {
    small: "w-12 h-18 text-xs",
    normal: "w-16 h-24 md:w-20 md:h-28 text-sm md:text-base",
    large: "w-20 h-28 md:w-24 md:h-36 text-base md:text-lg",
    touch: "w-20 h-28 text-base min-h-[112px] min-w-[80px]", // Optimized for touch
  };

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={cn(
        "relative bg-white rounded-xl border-2 shadow-lg flex flex-col justify-between p-1.5 select-none transition-all card-bounce-in overflow-hidden",
        // Size classes
        sizeClasses[size],
        // Interactive states
        disabled
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer hover:shadow-2xl hover:-translate-y-2 active:scale-95 touch-manipulation",
        // Suit colors
        card.suit === "HEART" || card.suit === "DIAMOND"
          ? "border-red-500 text-red-600"
          : card.suit === "JOKER"
            ? "border-yellow-600 text-yellow-700 bg-linear-to-br from-yellow-300 to-yellow-500"
            : "border-slate-800 text-slate-900",
        // Selection state
        isSelected
          ? "ring-4 ring-blue-500 -translate-y-4 shadow-[0_15px_30px_rgba(59,130,246,0.6)] border-blue-600 card-glow"
          : !disabled && "hover:card-pulse",
        className,
      )}
      // Better touch targets
      style={{
        minHeight: size === "touch" ? "112px" : undefined,
        minWidth: size === "touch" ? "80px" : undefined,
      }}
    >
      {/* Front Design */}
      <div className="flex flex-col h-full bg-white/95 rounded-lg p-1.5 relative overflow-hidden">
        <div className="flex justify-between items-start leading-none">
          <span
            className={cn(
              "font-black",
              size === "small"
                ? "text-xs"
                : size === "large"
                  ? "text-lg md:text-xl"
                  : size === "touch"
                    ? "text-base"
                    : "text-sm md:text-lg",
            )}
          >
            {card.displayValue}
          </span>
          <div className="pt-0.5">
            {getSuitIcon(
              card.suit,
              size === "small"
                ? "w-3 h-3"
                : size === "large"
                  ? "w-5 h-5"
                  : "w-4 h-4",
            )}
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center opacity-10">
          {getSuitIcon(
            card.suit,
            size === "small"
              ? "w-8 h-8"
              : size === "large"
                ? "w-20 h-20"
                : size === "touch"
                  ? "w-14 h-14"
                  : "w-12 h-12 md:w-16 md:h-16",
          )}
        </div>

        <div className="flex justify-between items-end rotate-180 leading-none">
          <span
            className={cn(
              "font-black",
              size === "small"
                ? "text-xs"
                : size === "large"
                  ? "text-lg md:text-xl"
                  : size === "touch"
                    ? "text-base"
                    : "text-sm md:text-lg",
            )}
          >
            {card.displayValue}
          </span>
          <div className="pt-0.5">
            {getSuitIcon(
              card.suit,
              size === "small"
                ? "w-3 h-3"
                : size === "large"
                  ? "w-5 h-5"
                  : "w-4 h-4",
            )}
          </div>
        </div>
      </div>

      {/* Selected Indicator Overlay */}
      {isSelected && (
        <div className="absolute inset-0 bg-blue-500/10 pointer-events-none rounded-xl border-2 border-blue-500 ring-2 ring-blue-400"></div>
      )}
    </div>
  );
};
