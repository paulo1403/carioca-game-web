import React from "react";
import { Card as CardType } from "@/types/game";
import { cn } from "@/lib/utils";
import { Heart, Diamond, Club, Spade, Ghost } from "lucide-react";

interface CardProps {
  card: CardType;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

export const PlayingCard: React.FC<CardProps> = ({
  card,
  isSelected,
  onClick,
  className,
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

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative w-16 h-24 bg-gradient-to-br rounded-xl border-2 shadow-lg flex flex-col justify-between p-1.5 select-none cursor-pointer transition-all hover:shadow-2xl hover:-translate-y-3 card-bounce-in",
        card.suit === "HEART" || card.suit === "DIAMOND"
          ? "from-red-50 to-red-100 border-red-400 text-red-600"
          : card.suit === "JOKER"
          ? "from-yellow-300 to-yellow-400 border-yellow-600 text-yellow-700"
          : "from-slate-100 to-slate-200 border-slate-400 text-slate-900",
        isSelected
          ? "ring-3 ring-blue-500 -translate-y-4 shadow-2xl border-blue-600 card-glow"
          : "hover:card-pulse",
        className
      )}
    >
      <div className="text-xs font-bold leading-none text-left">
        {card.displayValue}
      </div>
      <div className="self-center">{getSuitIcon(card.suit, "w-5 h-5")}</div>
      <div className="text-xs font-bold leading-none self-end rotate-180 text-right">
        {card.displayValue}
      </div>
    </div>
  );
};
