"use client";

import { X, Sparkles, CheckCircle2, Info } from "lucide-react";

interface ChangelogModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
    if (!isOpen) return null;

    const updates = [
        {
            title: "Regla de Mayoría Natural",
            description: "Los grupos ahora deben tener al menos la misma cantidad de cartas naturales que de Jokers, cumpliendo fielmente las reglas del Carioca.",
            type: "improvement",
        },
        {
            title: "Enchife Manual Directo",
            description: "¡Toma el control! Selecciona una carta y toca directamente cualquier juego de la mesa para añadirla, incluso los juegos de tus oponentes.",
            type: "feature",
        },
        {
            title: "Asistente con Botones Rápidos",
            description: "El asistente ahora permite añadir cartas a la mesa con un solo toque desde la sección '¡Puedes añadir estas a la mesa!'.",
            type: "feature",
        },
        {
            title: "IA de Bots Fluida",
            description: "Se corrigieron los bloqueos de los bots y se optimizó su toma de decisiones para turnos mucho más rápidos y estratégicos.",
            type: "fix",
        },
        {
            title: "Nueva Vista de Juegos",
            description: "Rediseño completo de la ventana de juegos bajados con una lista vertical organizada, evitando que las cartas se amontonen.",
            type: "improvement",
        },
        {
            title: "Corrección en Robo de Descarte",
            description: "Robar del pozo de descarte en tu turno ya no cuenta como una compra de 3 cartas, tal como dictan las reglas oficiales.",
            type: "fix",
        },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl relative">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-linear-to-r from-blue-900/20 to-indigo-900/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                            <Sparkles className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Novedades</h2>
                            <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Version 0.5.0 • Enero 2026</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 flex gap-3">
                        <Info className="w-5 h-5 text-blue-400 shrink-0" />
                        <p className="text-sm text-slate-300 leading-relaxed">
                            Hemos realizado varias mejoras para hacer que Carioca Online sea más emocionante y justo para todos los jugadores.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {updates.map((update, index) => (
                            <div
                                key={index}
                                className="group relative bg-slate-900/40 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 transition-all hover:bg-slate-900/60"
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${update.type === "feature" ? "bg-cyan-400" : "bg-indigo-400"
                                        } shadow-[0_0_8px_rgba(34,211,238,0.5)]`} />
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-100 mb-1 group-hover:text-blue-400 transition-colors">
                                            {update.title}
                                        </h3>
                                        <p className="text-sm text-slate-400 leading-relaxed">
                                            {update.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 bg-slate-900/20 flex justify-center">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 px-12"
                    >
                        ¡Entendido!
                    </button>
                </div>
            </div>
        </div>
    );
}
