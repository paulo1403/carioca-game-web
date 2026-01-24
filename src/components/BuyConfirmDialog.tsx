import React, { useState } from "react";
import { Player, Card } from "@/types/game";
import { Check, X, AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";
import { findPotentialContractGroups, canFulfillContract } from "@/utils/handAnalyzer";

interface BuyConfirmDialogProps {
  show: boolean;
  myPlayer: Player | undefined;
  discardCard?: Card;
  currentRound?: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const BuyConfirmDialog: React.FC<BuyConfirmDialogProps> = ({
  show,
  myPlayer,
  discardCard,
  currentRound,
  onConfirm,
  onCancel,
}) => {
  const [showReason, setShowReason] = useState(false);

  if (!show) return null;

  const remainingBuys = 7 - (myPlayer?.buysUsed ?? 0);

  // Compute before/after analysis for the discard card if available
  const analysis = (() => {
    if (!myPlayer || !discardCard || typeof currentRound !== "number") return null;

    const before = findPotentialContractGroups(myPlayer.hand, currentRound);
    const after = findPotentialContractGroups([...myPlayer.hand, discardCard], currentRound);
    const willFulfill = canFulfillContract([...myPlayer.hand, discardCard], currentRound, false).canDown;

    // Reason priority: fulfills contract > increases groups > increases unique suits
    let reason = "";

    // Helper to stringify a group
    const describeGroup = (g: Card[]) => g.map(c => `${c.value}${c.suit}`).join(", ");

    const beforeTriosDesc = before.trios.map((g, i) => `Trio ${i + 1}: ${describeGroup(g)}`);
    const afterTriosDesc = after.trios.map((g, i) => `Trio ${i + 1}: ${describeGroup(g)}`);
    const beforeEscDesc = before.escalas.map((g, i) => `Escala ${i + 1}: ${describeGroup(g)}`);
    const afterEscDesc = after.escalas.map((g, i) => `Escala ${i + 1}: ${describeGroup(g)}`);

    if (willFulfill) {
      reason = "Al comprar esta carta podrías cumplir el contrato de la ronda inmediatamente.";
    } else if (after.trios.length > before.trios.length || after.escalas.length > before.escalas.length) {
      reason = `Al comprar esta carta aumentan los grupos potenciales (${before.trios.length}/${before.escalas.length} → ${after.trios.length}/${after.escalas.length}).`;
    } else {
      const val = discardCard.value;
      const uniqueSuitsBefore = new Set(myPlayer.hand.filter(c => c.value === val && !(c.suit === 'JOKER' || c.value === 0)).map(c => c.suit)).size;
      const uniqueSuitsAfter = new Set([...myPlayer.hand, discardCard].filter(c => c.value === val && !(c.suit === 'JOKER' || c.value === 0)).map(c => c.suit)).size;
      if (uniqueSuitsAfter > uniqueSuitsBefore) {
        reason = `Al comprar esta carta aumenta la variedad de palos para el valor ${val} (${uniqueSuitsBefore} → ${uniqueSuitsAfter}).`;
      }

      return { before, after, willFulfill, reason, val, uniqueSuitsBefore, uniqueSuitsAfter, beforeTriosDesc, afterTriosDesc, beforeEscDesc, afterEscDesc };
    }

    return { before, after, willFulfill, reason, beforeTriosDesc, afterTriosDesc, beforeEscDesc, afterEscDesc };
  })();

  return (
    <Modal
      isOpen={show}
      title="Confirmar compra"
      onClose={onCancel}
      onConfirm={onConfirm}
      confirmText="Sí, comprar"
      cancelText="Cancelar"
      type="confirm"
      size="sm"
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-400" />
          <div className="font-semibold text-slate-100">Confirmar compra</div>
        </div>
        <p className="text-sm text-slate-200">Solo tienes <span className="font-bold text-yellow-400">{remainingBuys} compras</span> disponibles en toda la partida.</p>
        <p className="text-sm text-slate-200">Una vez que uses todas tus 7 compras, no podrás robar más cartas del descarte hasta el final del juego.</p>
        <p className="text-sm font-semibold text-slate-100">¿Estás seguro de que quieres comprar la carta del descarte?</p>

        {analysis && (
          <div className="mt-3">
            <button
              className="text-xs text-primary underline"
              onClick={() => setShowReason(v => !v)}
            >{showReason ? 'Ocultar motivo' : '¿Por qué me sugiere esta carta?'}</button>

            {showReason && (
              <div className="mt-2 p-3 bg-white/5 rounded-md text-sm text-slate-200">
                <p className="font-semibold">Razón: {analysis.reason || 'Ninguna heurística positiva detectada.'}</p>
                <div className="mt-2">
                  <div className="text-xs text-slate-300 mb-1">Antes: {analysis.before.trios.length} trios, {analysis.before.escalas.length} escalas</div>
                  <div className="text-xs text-slate-300 mb-2">Después: {analysis.after.trios.length} trios, {analysis.after.escalas.length} escalas</div>

                  {/* If unique suits info exists, show it explicitly */}
                  {('val' in analysis) && (
                    <div className="text-xs text-slate-300 mb-2">Palos para valor {analysis.val}: {analysis.uniqueSuitsBefore} → {analysis.uniqueSuitsAfter}</div>
                  )}

                  {/* Show group details */}
                  <div className="text-xs text-slate-300 font-semibold">Grupos antes:</div>
                  {analysis.beforeTriosDesc.length > 0 ? (
                    analysis.beforeTriosDesc.map((s: string, i: number) => (
                      <div key={`btri-${i}`} className="text-xs text-slate-300">{s}</div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-300">—</div>
                  )}

                  <div className="mt-1 text-xs text-slate-300 font-semibold">Grupos después:</div>
                  {analysis.afterTriosDesc.length > 0 ? (
                    analysis.afterTriosDesc.map((s: string, i: number) => (
                      <div key={`atri-${i}`} className="text-xs text-slate-300">{s}</div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-300">—</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
