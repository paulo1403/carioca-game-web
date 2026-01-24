import React, { useMemo } from "react";
import { Eye, Layers, Sparkles, ArrowRight, Zap } from "lucide-react";
import { Card, ROUND_CONTRACTS_DATA } from "@/types/game";
import { cn } from "@/lib/utils";
import {
  formatCardShort,
  formatWatchCard,
  getHandSuggestions,
} from "@/utils/handSuggestions";

interface HandAssistantProps {
  hand: Card[];
  topDiscard?: Card;
  sortMode: "rank" | "suit" | "auto";
  onToggleAutoSort: () => void;
  canInteract: boolean;
  onPrefillDownMode: (cards: Card[]) => void;
  canAutoDown: boolean;
  onAutoDown: () => void;
  disabled?: boolean;
  currentRound?: number;
  allMelds?: Card[][];
  onAddToMeld?: (cardId: string) => void;
  haveMelded?: boolean;
  additionalGroups?: Card[][];
}

const getSuitSymbol = (suit: string) => {
  if (suit === "HEART") return "♥";
  if (suit === "DIAMOND") return "♦";
  if (suit === "CLUB") return "♣";
  if (suit === "SPADE") return "♠";
  return "🃏";
};

export const HandAssistant: React.FC<HandAssistantProps> = ({
  hand,
  topDiscard,
  sortMode,
  onToggleAutoSort,
  canInteract,
  onPrefillDownMode,
  canAutoDown,
  onAutoDown,
  disabled,
  currentRound,
  allMelds = [],
  onAddToMeld,
  haveMelded,
  additionalGroups = [],
}) => {
  const data = useMemo(
    () => getHandSuggestions(hand, topDiscard, allMelds),
    [hand, topDiscard, allMelds],
  );

  const nearDifferentSuitGroups = data.nearDifferentSuitGroups.slice(0, 3);
  const nearEscalas = data.nearEscalas.slice(0, 2);
  const addableToTable = haveMelded ? data.addableToTable : [];
  const watch = data.watch.slice(0, 8);

  const contractStatus = useMemo(() => {
    if (!currentRound || currentRound === 8) return null;
    const reqs = ROUND_CONTRACTS_DATA[currentRound];
    if (!reqs) return null;
    const need = reqs.differentSuitGroups;
    const size = reqs.differentSuitSize;
    const complete = nearDifferentSuitGroups.filter(g => g.missingCount === 0 && g.cards.length >= size).length;
    if (complete >= need) return null;
    return { need, size, complete, missing: need - complete };
  }, [currentRound, nearDifferentSuitGroups]);

  if (disabled) return null;
  if (
    nearDifferentSuitGroups.length === 0 &&
    nearEscalas.length === 0 &&
    addableToTable.length === 0
  )
    return null;

  // Determine which type of groups are relevant for current round
  const showDifferentSuitGroups = currentRound !== 8;
  const showEscalas = currentRound === 8;

  return (
    <div
      className={cn(
        "w-full max-w-4xl mx-auto mb-3 rounded-2xl border bg-slate-950/35 backdrop-blur-sm px-4 py-3",
        data.topDiscardMatchesWatch
          ? "border-amber-500/40 shadow-lg shadow-amber-500/10"
          : "border-slate-800",
      )}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <div className="text-slate-100 font-extrabold">Asistente</div>
          {data.topDiscardMatchesWatch && (
            <span className="text-[10px] font-bold bg-amber-500/15 text-amber-300 px-2 py-1 rounded-full border border-amber-500/20 uppercase tracking-widest">
              Atento al descarte
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleAutoSort}
            className="text-xs font-bold px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900/50 text-slate-200 hover:bg-slate-900/80 transition-colors"
          >
            {sortMode === "auto" ? "Ordenar por palo" : "Agrupar mano"}
          </button>
          {canAutoDown && (
            <button
              onClick={onAutoDown}
              className={cn(
                "text-xs font-bold px-3 py-1.5 rounded-full border transition-colors",
                canInteract
                  ? "border-green-500/30 bg-green-500/10 text-green-200 hover:bg-green-500/15"
                  : "border-slate-700 bg-slate-900/40 text-slate-500",
              )}
              disabled={!canInteract}
              title={
                canInteract
                  ? "Entrar en modo bajarse y prellenar grupos"
                  : "Solo disponible en tu turno después de robar"
              }
            >
              Bajarse (auto)
            </button>
          )}
        </div>

        {!haveMelded && contractStatus && (
          <div className="w-full mt-2 px-3 py-2 rounded-md border border-amber-500/20 bg-amber-900/5 text-amber-300 text-sm font-semibold">
            Contrato R{currentRound}: necesitas <span className="font-bold">{contractStatus.need}</span> grupo(s) de <span className="font-bold">{contractStatus.size}</span>. Tienes <span className="font-bold">{contractStatus.complete}</span>. Falta <span className="font-bold">{contractStatus.missing}</span>.
          </div>
        )}
      </div>

      {watch.length > 0 && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <Eye className="w-4 h-4" />
            Cartas a vigilar:
          </div>
          {watch.map((w, idx) => (
            <span
              key={`${w.kind}-${idx}`}
              className="text-xs font-semibold px-2 py-1 rounded-full border border-slate-700 bg-slate-900/60 text-slate-200"
            >
              {formatWatchCard(w)}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        {addableToTable.length > 0 && (
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3">
            <div className="flex items-center gap-2 text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-2">
              <Zap className="w-4 h-4 text-blue-400" />
              ¡Puedes añadir estas a la mesa!
            </div>
            <div className="flex flex-wrap gap-2">
              {addableToTable.map((c, idx) => (
                <button
                  key={`addable-${idx}`}
                  onClick={() => onAddToMeld && onAddToMeld(c.id)}
                  className="text-sm font-bold bg-blue-600/40 hover:bg-blue-600/60 text-blue-100 border border-blue-500/60 px-3 py-1 rounded-lg transition-all active:scale-95 flex items-center gap-2 group"
                >
                  {formatCardShort(c)}
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        )}

        {haveMelded && additionalGroups.length > 0 && (
          <div className="rounded-xl border border-emerald-800 bg-emerald-900/10 p-3">
            <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-300 uppercase tracking-widest mb-2">
              <Zap className="w-4 h-4 text-emerald-300" />
              Bajadas adicionales
            </div>
            <div className="space-y-2">
              {additionalGroups.map((g, idx) => (
                <div key={`addg-${idx}`} className="flex items-center justify-between gap-2">
                  <div className="text-sm font-bold text-slate-200">{g.map(formatCardShort).join(" ")}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onPrefillDownMode && onPrefillDownMode(g)}
                      className={cn(
                        "text-xs font-bold px-3 py-1.5 rounded-full transition-colors",
                        canInteract
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
                          : "border-slate-700 bg-slate-900/40 text-slate-500",
                      )}
                      disabled={!canInteract}
                    >
                      Preseleccionar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showDifferentSuitGroups && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              <Layers className="w-4 h-4" />
              Grupos con diferentes palos
            </div>
            {nearDifferentSuitGroups.length === 0 ? (
              <div className="text-sm text-slate-500">
                Sin grupos de diferentes palos.
              </div>
            ) : (
              <div className="space-y-2">
                {nearDifferentSuitGroups.map((g, idx) => (
                  <button
                    key={`group-${idx}`}
                    className={cn(
                      "w-full text-left flex items-center gap-2 text-sm rounded-lg px-2 py-1 transition-colors",
                      canInteract
                        ? "text-slate-200 hover:bg-white/5"
                        : "text-slate-500",
                    )}
                    onClick={() => onPrefillDownMode(g.cards)}
                    disabled={!canInteract}
                    title={
                      canInteract
                        ? "Preseleccionar estas cartas en modo bajarse"
                        : "Solo disponible en tu turno después de robar"
                    }
                  >
                    <span className="font-bold">
                      {g.cards.map(formatCardShort).join(" ")}
                    </span>
                    {g.missingCount > 0 && (
                      <>
                        <ArrowRight className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-300 text-xs">
                          +{g.missingCount} palo
                          {g.missingCount !== 1 ? "s" : ""}
                        </span>
                      </>
                    )}
                    {g.missingCount === 0 && (
                      <span className="text-green-400 text-xs font-bold">
                        ✓ Completo
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {showEscalas && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              <Layers className="w-4 h-4" />
              Escaleras (casi)
            </div>
            {nearEscalas.length === 0 ? (
              <div className="text-sm text-slate-500">
                Sin escaleras casi listas.
              </div>
            ) : (
              <div className="space-y-2">
                {nearEscalas.map((e, idx) => (
                  <button
                    key={`escala-${idx}`}
                    className={cn(
                      "w-full text-left flex items-center gap-2 text-sm rounded-lg px-2 py-1 transition-colors",
                      canInteract
                        ? "text-slate-200 hover:bg-white/5"
                        : "text-slate-500",
                    )}
                    onClick={() => onPrefillDownMode(e.cards)}
                    disabled={!canInteract}
                    title={
                      canInteract
                        ? "Preseleccionar estas cartas en modo bajarse"
                        : "Solo disponible en tu turno después de robar"
                    }
                  >
                    <span className="font-bold">
                      {e.cards.map(formatCardShort).join(" ")}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-300">
                      Falta {formatWatchCard(e.missing)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {!showEscalas && nearEscalas.length > 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              <Layers className="w-4 h-4" />
              Escaleras (casi)
            </div>
            <div className="space-y-2">
              {nearEscalas.slice(0, 2).map((e, idx) => (
                <button
                  key={`escala-${idx}`}
                  className={cn(
                    "w-full text-left flex items-center gap-2 text-sm rounded-lg px-2 py-1 transition-colors",
                    canInteract
                      ? "text-slate-200 hover:bg-white/5"
                      : "text-slate-500",
                  )}
                  onClick={() => onPrefillDownMode(e.cards)}
                  disabled={!canInteract}
                  title={
                    canInteract
                      ? "Preseleccionar estas cartas en modo bajarse"
                      : "Solo disponible en tu turno después de robar"
                  }
                >
                  <span className="font-bold">
                    {e.cards.map(formatCardShort).join(" ")}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-300">
                    Falta {formatWatchCard(e.missing)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
