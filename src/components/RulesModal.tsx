import React from "react";
import { Card } from "@/types/game";
import { PlayingCard } from "./Card";
import { BookOpen, X } from "lucide-react";

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-green-900 border-2 border-yellow-500 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-green-900/95 backdrop-blur border-b border-yellow-500/30 p-4 flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold text-yellow-400 flex items-center gap-2">
            <BookOpen className="w-6 h-6" /> Reglas del Carioca
          </h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10 rounded-full p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-white space-y-6">
          <section>
            <h3 className="text-lg font-bold text-yellow-200 mb-2">Objetivo</h3>
            <p className="text-sm text-white/90 leading-relaxed">
              El objetivo es deshacerse de todas las cartas de la mano. El juego
              se divide en varias rondas, y en cada una los jugadores deben
              cumplir un "contrato" específico (formar tríos o escalas) para
              poder bajarse.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-yellow-200 mb-2">
              Conceptos Básicos
            </h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-white/90">
              <li>
                <span className="font-bold text-white">Trío:</span> 3 cartas del
                mismo valor (ej. 3 Reyes).
              </li>
              <li>
                <span className="font-bold text-white">Escala:</span> 4 cartas
                consecutivas del mismo palo (ej. 2, 3, 4, 5 de Corazones).
              </li>
              <li>
                <span className="font-bold text-white">Comodín (Joker):</span>{" "}
                Puede reemplazar a cualquier carta.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-yellow-200 mb-2">
              Rondas (Contratos)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="bg-black/20 p-3 rounded-lg border border-white/10">
                <span className="font-bold text-yellow-400">Ronda 1:</span> 1
                Trío (3 cartas)
              </div>
              <div className="bg-black/20 p-3 rounded-lg border border-white/10">
                <span className="font-bold text-yellow-400">Ronda 2:</span> 2
                Tríos (6 cartas)
              </div>
              <div className="bg-black/20 p-3 rounded-lg border border-white/10">
                <span className="font-bold text-yellow-400">Ronda 3:</span> 1
                Escala (4 cartas)
              </div>
              <div className="bg-black/20 p-3 rounded-lg border border-white/10">
                <span className="font-bold text-yellow-400">Ronda 4:</span> 2
                Escalas (8 cartas)
              </div>
              <div className="bg-black/20 p-3 rounded-lg border border-white/10">
                <span className="font-bold text-yellow-400">Ronda 5:</span> 1
                Trío de 5 (5 cartas)
              </div>
              <div className="bg-black/20 p-3 rounded-lg border border-white/10">
                <span className="font-bold text-yellow-400">Ronda 6:</span> 2
                Tríos de 5 (10 cartas)
              </div>
              <div className="bg-black/20 p-3 rounded-lg border border-white/10">
                <span className="font-bold text-yellow-400">Ronda 7:</span> 1
                Escala de 6 (6 cartas)
              </div>
              <div className="bg-black/20 p-3 rounded-lg border border-white/10">
                <span className="font-bold text-yellow-400">Ronda 8:</span>{" "}
                Escalera de 7 (7 cartas)
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-yellow-200 mb-2">
              Bajadas Adicionales
            </h3>
            <p className="text-sm text-white/90 leading-relaxed mb-3">
              Una vez cumplido el contrato principal de la ronda, puedes bajar
              cualquier grupo válido de{" "}
              <span className="font-bold text-white">mínimo 3 cartas</span> en
              tus turnos siguientes:
            </p>
            <div className="space-y-4">
              <div className="bg-black/20 p-4 rounded-lg border border-white/10">
                <h4 className="font-bold text-yellow-400 mb-2">
                  Tríos (3 o más cartas del mismo valor)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-white/90">
                  <div>• 4 4 4 (trío puro)</div>
                  <div>• 3 3 3 (trío puro)</div>
                  <div>• 4 4 Joker (con comodín)</div>
                  <div>• 3 Joker 5 del mismo palo (con comodín)</div>
                </div>
              </div>
              <div className="bg-black/20 p-4 rounded-lg border border-white/10">
                <h4 className="font-bold text-yellow-400 mb-2">
                  Escaleras (3 o más cartas consecutivas del mismo palo)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-white/90">
                  <div>• 3♣ Joker 5♣ (con comodín)</div>
                  <div>• 2♥ 3♥ 4♥ 5♥ (escalera completa)</div>
                  <div>• 7♦ 8♦ Joker 10♦ (con comodín)</div>
                  <div>• 9♠ 10♠ J♠ Q♠ (escalera alta)</div>
                </div>
              </div>
            </div>
            <p className="text-sm text-white/90 leading-relaxed mt-3">
              <span className="font-bold text-yellow-400">Importante:</span>{" "}
              Solo puedes bajar grupos adicionales después de haber cumplido el
              contrato principal de la ronda. Una vez que te bajas inicialmente,
              puedes continuar bajando grupos válidos en tus turnos siguientes
              durante la misma partida.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-yellow-200 mb-2">
              Cartas Especiales
            </h3>
            <div className="flex gap-4 justify-center py-2">
              <div className="flex flex-col items-center">
                <PlayingCard
                  card={{
                    id: "j1",
                    value: 0,
                    suit: "JOKER",
                    displayValue: "J",
                  }}
                  className="w-16 h-24 text-xs"
                />
                <span className="text-xs mt-1">Joker</span>
              </div>
              <div className="flex flex-col items-center">
                <PlayingCard
                  card={{
                    id: "a1",
                    value: 1,
                    suit: "SPADE",
                    displayValue: "A",
                  }}
                  className="w-16 h-24 text-xs"
                />
                <span className="text-xs mt-1">As (Alto/Bajo)</span>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/20 flex justify-end">
          <button
            onClick={onClose}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-6 rounded-lg transition-transform active:scale-95"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
