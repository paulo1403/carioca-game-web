import type React from "react";
import { cn } from "@/lib/utils";
import type { Card } from "@/types/game";
import { isDifferentSuitGroup, isEscala } from "@/utils/rules";
import { PlayingCard } from "./Card";

interface MeldGroupProps {
  group: Card[];
  playerId: string;
  meldIndex: number;
  size?: "small" | "large";
  onClick?: () => void;
}

export const MeldGroup: React.FC<MeldGroupProps> = ({
  group,
  playerId,
  meldIndex,
  size = "small",
  onClick,
}) => {
  const cardSize = size === "large" ? "normal" : "small";
  const spacing = size === "large" ? "-space-x-8" : "-space-x-4";

  const isTrioGroup = isDifferentSuitGroup(group, 3);
  const isEscalaGroup = isEscala(group, 3);

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between px-2">
        <span className="text-[10px] font-bold text-white/50 uppercase tracking-tighter">
          Juego {meldIndex + 1}
        </span>
        {isTrioGroup && (
          <span className="text-[9px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
            TRÍO
          </span>
        )}
        {isEscalaGroup && !isTrioGroup && (
          <span className="text-[9px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
            ESCALA
          </span>
        )}
      </div>

      <div
        onClick={onClick}
        className={cn(
          "flex p-3 rounded-xl transition-all items-center justify-start bg-black/40 border border-white/5 min-h-[100px] overflow-x-auto custom-scrollbar",
          onClick
            ? "cursor-pointer hover:bg-black/60 hover:border-blue-500/30 hover:ring-1 hover:ring-blue-500/20 active:scale-[0.98]"
            : "",
          spacing,
        )}
      >
        {group.map((card, i) => (
          <div key={card.id} style={{ zIndex: i }}>
            <PlayingCard card={card} size={cardSize} className="shadow-xl ring-1 ring-black/20" />
          </div>
        ))}
      </div>
    </div>
  );
};
