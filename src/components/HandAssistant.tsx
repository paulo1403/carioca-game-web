import React, { useMemo } from "react";
import { Eye, Layers, Sparkles, ArrowRight } from "lucide-react";
import { Card } from "@/types/game";
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
}

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
}) => {
  const data = useMemo(
    () => getHandSuggestions(hand, topDiscard),
    [hand, topDiscard]
  );

  const nearTrios = data.nearTrios.slice(0, 3);
  const nearEscalas = data.nearEscalas.slice(0, 3);
  const watch = data.watch.slice(0, 8);

  if (disabled) return null;
  if (nearTrios.length === 0 && nearEscalas.length === 0) return null;

  return (
    <div
      className={cn(
        "w-full max-w-4xl mx-auto mb-3 rounded-2xl border bg-slate-950/35 backdrop-blur-sm px-4 py-3",
        data.topDiscardMatchesWatch
          ? "border-amber-500/40 shadow-lg shadow-amber-500/10"
          : "border-slate-800"
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
                  : "border-slate-700 bg-slate-900/40 text-slate-500"
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
      </div>

      {watch.length > 0 && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <Eye className="w-4 h-4" />
            Cartas a vigilar:
          </div>
          {watch.map((w, idx) => (
            <span
              key={`${w.kind}-${"value" in w ? w.value : ""}-${"suit" in w ? w.suit : ""}-${idx}`}
              className="text-xs font-semibold px-2 py-1 rounded-full border border-slate-700 bg-slate-900/60 text-slate-200"
            >
              {formatWatchCard(w)}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            <Layers className="w-4 h-4" />
            Posibles trios (casi)
          </div>
          {nearTrios.length === 0 ? (
            <div className="text-sm text-slate-500">Sin pares útiles ahora.</div>
          ) : (
            <div className="space-y-2">
              {nearTrios.map((t) => (
                <button
                  key={`trio-${t.value}`}
                  className={cn(
                    "w-full text-left flex items-center gap-2 text-sm rounded-lg px-2 py-1 transition-colors",
                    canInteract
                      ? "text-slate-200 hover:bg-white/5"
                      : "text-slate-500"
                  )}
                  onClick={() => onPrefillDownMode(t.cards)}
                  disabled={!canInteract}
                  title={
                    canInteract
                      ? "Preseleccionar estas cartas en modo bajarse"
                      : "Solo disponible en tu turno después de robar"
                  }
                >
                  <span className="font-bold">{t.cards.map(formatCardShort).join(" ")}</span>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-300">
                    Falta {formatWatchCard(t.missing)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            <Layers className="w-4 h-4" />
            Posibles escaleras (casi)
          </div>
          {nearEscalas.length === 0 ? (
            <div className="text-sm text-slate-500">Sin escaleras casi listas.</div>
          ) : (
            <div className="space-y-2">
              {nearEscalas.map((e) => (
                <button
                  key={`escala-${e.suit}-${e.missing.value}-${e.cards.map((c) => c.value).join(",")}`}
                  className={cn(
                    "w-full text-left flex items-center gap-2 text-sm rounded-lg px-2 py-1 transition-colors",
                    canInteract
                      ? "text-slate-200 hover:bg-white/5"
                      : "text-slate-500"
                  )}
                  onClick={() => onPrefillDownMode(e.cards)}
                  disabled={!canInteract}
                  title={
                    canInteract
                      ? "Preseleccionar estas cartas en modo bajarse"
                      : "Solo disponible en tu turno después de robar"
                  }
                >
                  <span className="font-bold">{e.cards.map(formatCardShort).join(" ")}</span>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-300">
                    Falta {formatWatchCard(e.missing)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
