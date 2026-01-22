import React from "react";
import { PlayingCard } from "./Card";
import { BookOpen, Trophy, Info, Zap } from "lucide-react";
import { Modal } from "./Modal";
import { ROUND_CONTRACTS } from "@/types/game";

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reglas del Carioca"
      size="3xl"
      confirmText="¡Entendido!"
    >
      <div className="space-y-8 py-2">
        {/* Objetivo */}
        <section className="bg-white/5 rounded-2xl p-5 border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <BookOpen className="w-12 h-12" />
          </div>
          <h3 className="text-blue-400 font-black uppercase tracking-widest text-xs mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            Objetivo del Juego
          </h3>
          <p className="text-slate-300 leading-relaxed">
            Deshazte de todas tus cartas antes que los demás. El juego se divide
            en <span className="text-white font-bold">8 rondas</span>. En cada
            ronda, debes cumplir un contrato específico (tríos o escalas) para
            poder "bajarte".
          </p>
        </section>

        {/* Rondas */}
        <section>
          <h3 className="text-white font-black uppercase tracking-widest text-xs mb-4 px-1 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            Rondas y Contratos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ROUND_CONTRACTS.map((contract, i) => (
              <div
                key={contract.round}
                className="bg-slate-950/50 rounded-xl p-3 border border-white/5 flex items-center gap-4 hover:bg-white/5 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center font-black text-blue-400 border border-blue-500/20">
                  {contract.round}
                </div>
                <div>
                  <div className="text-white font-bold text-sm tracking-tight">
                    {contract.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    {contract.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Conceptos */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950/30 rounded-2xl p-4 border border-white/5">
            <Zap className="w-5 h-5 text-yellow-500 mb-2" />
            <h4 className="text-white font-bold text-sm mb-1">
              Grupo (Rondas 1-7)
            </h4>
            <p className="text-[11px] text-slate-400">
              Cartas de palos DIFERENTES. Ejemplo: 5♥ 7♦ K♣
            </p>
          </div>
          <div className="bg-slate-950/30 rounded-2xl p-4 border border-white/5">
            <BookOpen className="w-5 h-5 text-blue-400 mb-2" />
            <h4 className="text-white font-bold text-sm mb-1">
              Escala (Ronda 8)
            </h4>
            <p className="text-[11px] text-slate-400">
              7+ cartas consecutivas del MISMO palo.
            </p>
          </div>
          <div className="bg-slate-950/30 rounded-2xl p-4 border border-white/5">
            <Info className="w-5 h-5 text-purple-400 mb-2" />
            <h4 className="text-white font-bold text-sm mb-1">Joker</h4>
            <p className="text-[11px] text-slate-400">
              Comodín que reemplaza cualquier palo o valor.
            </p>
          </div>
        </section>

        {/* Ejemplos */}
        <section>
          <h3 className="text-white font-black uppercase tracking-widest text-xs mb-4 px-1">
            Ejemplos de Bajada
          </h3>
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase ml-2">
                ✓ Grupo válido (Ronda 1: 3+ palos diferentes)
              </span>
              <div className="flex gap-2 bg-black/20 p-3 rounded-2xl border border-white/5 overflow-x-auto">
                {[
                  { id: "g1", value: 5, suit: "HEART", displayValue: "5" },
                  { id: "g2", value: 7, suit: "DIAMOND", displayValue: "7" },
                  { id: "g3", value: 13, suit: "CLUB", displayValue: "K" },
                ].map((c) => (
                  <PlayingCard
                    key={c.id}
                    card={c as any}
                    className="w-12 h-18 scale-90"
                  />
                ))}
              </div>
              <p className="text-[9px] text-slate-400 ml-2">
                Tres palos diferentes: ♥ ♦ ♣ ✓
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase ml-2">
                ✓ Grupo con Joker (completa el palo faltante)
              </span>
              <div className="flex gap-2 bg-black/20 p-3 rounded-2xl border border-white/5 overflow-x-auto">
                {[
                  { id: "g4", value: 3, suit: "HEART", displayValue: "3" },
                  { id: "g5", value: 9, suit: "DIAMOND", displayValue: "9" },
                  { id: "g6", value: 0, suit: "JOKER", displayValue: "J" },
                ].map((c) => (
                  <PlayingCard
                    key={c.id}
                    card={c as any}
                    className="w-12 h-18 scale-90"
                  />
                ))}
              </div>
              <p className="text-[9px] text-slate-400 ml-2">
                Dos palos + Joker (representa un 3er palo) ✓
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase ml-2">
                ✗ Grupo inválido (mismo palo, no diferentes)
              </span>
              <div className="flex gap-2 bg-black/20 p-3 rounded-2xl border border-white/5 overflow-x-auto opacity-60">
                {[
                  { id: "b1", value: 4, suit: "HEART", displayValue: "4" },
                  { id: "b2", value: 8, suit: "HEART", displayValue: "8" },
                  { id: "b3", value: 13, suit: "HEART", displayValue: "K" },
                ].map((c) => (
                  <PlayingCard
                    key={c.id}
                    card={c as any}
                    className="w-12 h-18 scale-90"
                  />
                ))}
              </div>
              <p className="text-[9px] text-slate-400 ml-2">
                Todos del mismo palo ♥ - NO válido para rondas 1-7 ✗
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase ml-2">
                Escala de Corazones (Ronda 8)
              </span>
              <div className="flex gap-2 bg-black/20 p-3 rounded-2xl border border-white/5 overflow-x-auto">
                {[
                  { id: "e1", value: 4, suit: "HEART", displayValue: "4" },
                  { id: "e2", value: 5, suit: "HEART", displayValue: "5" },
                  { id: "e3", value: 6, suit: "HEART", displayValue: "6" },
                  { id: "e4", value: 7, suit: "HEART", displayValue: "7" },
                  { id: "e5", value: 8, suit: "HEART", displayValue: "8" },
                ].map((c) => (
                  <PlayingCard
                    key={c.id}
                    card={c as any}
                    className="w-12 h-18 scale-90"
                  />
                ))}
              </div>
              <p className="text-[9px] text-slate-400 ml-2">
                Consecutivas del mismo palo (mínimo 7) ✓
              </p>
            </div>
          </div>
        </section>

        <div className="bg-blue-600/10 rounded-2xl p-5 border border-blue-500/20">
          <p className="text-[11px] text-blue-300 leading-relaxed italic">
            <span className="font-bold uppercase not-italic mr-1">
              Pro Tip:
            </span>
            Solo puedes bajar grupos adicionales después de cumplir tu contrato
            inicial. Una vez bajado, puedes "botar" cartas en los juegos de
            otros jugadores.
          </p>
        </div>
      </div>
    </Modal>
  );
};
