import React from "react";
import { Card } from "@/types/game";
import { PlayingCard } from "./Card";
import { cn } from "@/lib/utils";

interface CardWrapperProps {
  card: Card;
  index: number;
  disabled?: boolean;
  isSelected?: boolean;
  isTempSelected?: boolean;
  isAddable?: boolean;
  isSuggestedDiscard?: boolean;
  isGroupMember?: boolean;
  isNew?: boolean;
  onClick?: () => void;
  isMobile?: boolean;
  size?: "small" | "normal" | "large" | "touch";
} 

export const CardWrapper: React.FC<CardWrapperProps> = ({
  card,
  index,
  disabled,
  isSelected,
  isTempSelected,
  isAddable,
  isSuggestedDiscard,
  isGroupMember,
  isNew,
  onClick,
  isMobile,
  size = "normal",
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "transform transition-all duration-300 origin-bottom card-slide-in",
        !isMobile && "touch-none",
        disabled ? "" : "hover:-translate-y-6 hover:scale-105",
        disabled ? "cursor-default opacity-75" : "cursor-pointer",
        isSelected ? "-translate-y-10 z-40 card-glow scale-110" : "",
        isTempSelected ? "-translate-y-6 z-40 scale-105" : "",
        isAddable && !isSelected && !isTempSelected
          ? "-translate-y-4 z-30 ring-4 ring-blue-400 rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-pulse"
          : "",
        isGroupMember && !isSelected && !isTempSelected
          ? "-translate-y-3 z-35 ring-4 ring-amber-400 rounded-lg shadow-[0_0_18px_rgba(245,158,11,0.28)]"
          : "",
        isSuggestedDiscard && !isSelected && !isTempSelected && !isAddable
          ? "-translate-y-2 z-20 ring-4 ring-red-400 rounded-lg shadow-[0_0_15px_rgba(239,68,68,0.5)]"
          : "",
      )}
      style={{
        zIndex: isSelected || isTempSelected ? 50 : index,
      }}
    >
      <PlayingCard
        card={card}
        isSelected={isSelected}
        size={size}
        className={cn(
          "shadow-xl transition-all duration-300",
          isSelected && "ring-4 ring-yellow-400 border-yellow-500 card-glow",
          isTempSelected && "ring-4 ring-green-400 border-green-500",
          isAddable &&
          !isSelected &&
          !isTempSelected &&
          "border-blue-500 card-pulse",
          isSuggestedDiscard &&
          !isSelected &&
          !isTempSelected &&
          !isAddable &&
          "border-red-500",
          isNew &&
          !isSelected &&
          !isTempSelected &&
          "ring-4 ring-emerald-400 border-emerald-500 shadow-[0_0_15px_rgba(52,211,153,0.5)]",
        )}
      />
      {isAddable && !isSelected && !isTempSelected && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-md whitespace-nowrap animate-bounce z-50 rotate-in">
          ¡Ponla!
        </div>
      )}

      {isGroupMember && !isSelected && !isTempSelected && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-md whitespace-nowrap z-50">
          ¡Bajar!
        </div>
      )}

      {isSuggestedDiscard && !isSelected && !isTempSelected && !isAddable && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-md whitespace-nowrap animate-bounce z-50 rotate-in">
          ¡Bota esta!
        </div>
      )}
    </div>
  );
};
