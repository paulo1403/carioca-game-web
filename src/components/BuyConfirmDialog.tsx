import React from "react";
import { Player } from "@/types/game";
import { Check, X, AlertTriangle } from "lucide-react";

interface BuyConfirmDialogProps {
  show: boolean;
  myPlayer: Player | undefined;
  onConfirm: () => void;
  onCancel: () => void;
}

export const BuyConfirmDialog: React.FC<BuyConfirmDialogProps> = ({
  show,
  myPlayer,
  onConfirm,
  onCancel,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-green-900/95 border-2 border-yellow-400 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-8 h-8 text-yellow-400" />
          <h3 className="font-bold text-xl text-white">Confirmar Compra</h3>
        </div>

        <div className="text-white/90 mb-6 space-y-2">
          <p className="text-sm">
            Solo tienes{" "}
            <span className="font-bold text-yellow-400">
              {7 - (myPlayer?.buysUsed ?? 0)} compras
            </span>{" "}
            disponibles en toda la partida.
          </p>
          <p className="text-sm">
            Una vez que uses todas tus 7 compras, no podrás robar más cartas del
            descarte hasta el final del juego.
          </p>
          <p className="text-sm font-semibold text-center mt-4">
            ¿Estás seguro de que quieres comprar la carta del descarte?
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            Sí, comprar
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-5 h-5" />
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
