import React from "react";
import { Card } from "@/types/game";
import { PlayingCard } from "./Card";
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
  const cardSize = size === "large" ? "normal" : "small";
  const spacing = size === "large" ? "-space-x-4" : "-space-x-3";

  return (
    <div
      className={cn(
        "flex p-1 rounded transition-all items-center justify-center bg-white/5",
        spacing,
      )}
    >
      {group.map((card, i) => (
        <PlayingCard
          key={card.id}
          card={card}
          size={cardSize}
          className="shadow-md hover:shadow-lg transition-shadow"
        />
      ))}
    </div>
  );
};
