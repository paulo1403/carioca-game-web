import type React from "react";
import { cn } from "@/lib/utils";

interface DiscardPileWrapperProps {
  children: React.ReactNode;
  disabled?: boolean;
  isTarget?: boolean;
}

export const DiscardPileWrapper: React.FC<DiscardPileWrapperProps> = ({
  children,
  disabled,
  isTarget,
}) => {
  return (
    <div
      className={cn(
        "relative rounded-xl transition-all duration-200",
        isTarget ? "ring-4 ring-green-400 scale-105 cursor-pointer animate-pulse" : "",
      )}
    >
      {children}
    </div>
  );
};
