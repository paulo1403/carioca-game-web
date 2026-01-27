import { Check, Plus, Wand2, X } from "lucide-react";
import type React from "react";
import { cn } from "@/lib/utils";
import type { Card } from "@/types/game";

interface DownModeControlsProps {
  groupsToMeld: Card[][];
  tempGroup: Card[];
  onAddGroup: () => void;
  onConfirmDown: () => void;
  onCancel: () => void;
  onAutoFill?: () => void;
  canAutoFill?: boolean;
  canConfirmDown?: boolean;
  error?: string | null;
}

export const DownModeControls: React.FC<DownModeControlsProps> = ({
  groupsToMeld,
  tempGroup,
  onAddGroup,
  onConfirmDown,
  onCancel,
  onAutoFill,
  canAutoFill,
  canConfirmDown = true,
  error,
}) => {
  return (
    <div className="flex flex-col gap-3">
      {/* Error message */}
      {error && (
        <div className="bg-red-500/20 border-2 border-red-500 text-red-200 px-4 py-2 rounded-lg text-sm font-medium animate-in fade-in">
          ⚠️ {error}
        </div>
      )}
      <div className="flex gap-2 bg-gradient-to-r from-slate-900/80 to-slate-800/80 p-3 rounded-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 border-2 border-slate-600/50 shadow-2xl">
        <div className="flex flex-col items-center justify-center px-4 border-r border-slate-600/50">
          <span className="text-white/70 text-xs uppercase font-bold">Grupos Listos</span>
          <span className="text-white font-bold text-lg animate-pulse">{groupsToMeld.length}</span>
        </div>

        <button
          onClick={onAddGroup}
          disabled={tempGroup.length < 3}
          className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 disabled:bg-gray-700 text-white p-2 rounded-lg flex flex-col items-center min-w-[80px] transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          <span className="text-[10px] uppercase font-bold mt-1">Guardar Grupo</span>
        </button>

        {/* Auto Fill Button if canDown */}
        {canAutoFill && groupsToMeld.length === 0 && onAutoFill && (
          <button
            onClick={onAutoFill}
            className="bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white p-2 rounded-lg flex flex-col items-center min-w-[80px] animate-pulse transition-all hover:scale-105 active:scale-95 shadow-lg"
          >
            <Wand2 className="w-5 h-5 animate-spin" />
            <span className="text-[10px] uppercase font-bold mt-1">Auto Llenar</span>
          </button>
        )}

        <button
          onClick={onConfirmDown}
          disabled={!canConfirmDown || (groupsToMeld.length === 0 && tempGroup.length === 0)}
          title={!canConfirmDown ? "Debes dejar al menos una carta en la mano" : ""}
          className="bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 disabled:opacity-50 disabled:bg-gray-700 disabled:cursor-not-allowed text-white p-2 rounded-lg flex flex-col items-center min-w-[80px] transition-all hover:scale-105 active:scale-95 shadow-lg"
        >
          <Check className="w-5 h-5" />
          <span className="text-[10px] uppercase font-bold mt-1">Confirmar</span>
        </button>

        <button
          onClick={onCancel}
          className="bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white p-2 rounded-lg flex flex-col items-center min-w-[80px] transition-all hover:scale-105 active:scale-95 shadow-lg"
        >
          <X className="w-5 h-5" />
          <span className="text-[10px] uppercase font-bold mt-1">Cancelar</span>
        </button>
      </div>
    </div>
  );
};
