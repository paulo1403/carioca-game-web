"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlayingCard } from "@/components/Card";
import { RulesModal } from "@/components/RulesModal";
import {
  HelpCircle,
  Loader2,
  Dices,
  History as HistoryIcon,
  Scan,
  X,
} from "lucide-react";
import { Scanner } from "@yudiel/react-qr-scanner";

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [hostName, setHostName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const createGame = async () => {
    if (!hostName.trim()) {
      alert("Por favor ingresa tu nombre");
      return;
    }
    setIsCreating(true);
    try {
      const res = await fetch("/api/game/create", {
        method: "POST",
        body: JSON.stringify({ hostName: hostName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        // Store our player ID for this room
        localStorage.setItem(`carioca_player_id_${data.roomId}`, data.playerId);
        router.push(`/game/${data.roomId}`);
      } else {
        alert("Error al crear la partida");
        setIsCreating(false);
      }
    } catch (e) {
      console.error(e);
      setIsCreating(false);
    }
  };

  const joinGame = () => {
    if (joinCode.trim()) {
      router.push(`/game/${joinCode.trim()}`);
    }
  };

  const handleScan = (text: string) => {
    if (text) {
      // If URL, extract ID
      // Example: http://localhost:3000/game/abcd-1234
      if (text.includes("/game/")) {
        const parts = text.split("/game/");
        if (parts.length > 1) {
          const id = parts[1].split("?")[0]; // Remove query params if any
          setJoinCode(id);
          router.push(`/game/${id}`);
          setShowScanner(false);
          return;
        }
      }
      // If raw ID
      setJoinCode(text);
      router.push(`/game/${text}`);
      setShowScanner(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 pointer-events-none opacity-15">
        <div className="absolute top-10 left-10 transform -rotate-12">
          <PlayingCard
            card={{ id: "bg1", suit: "HEART", value: 10, displayValue: "10" }}
            className="w-32 h-48"
          />
        </div>
        <div className="absolute bottom-20 right-10 transform rotate-12">
          <PlayingCard
            card={{ id: "bg2", suit: "CLUB", value: 13, displayValue: "K" }}
            className="w-32 h-48"
          />
        </div>
        <div className="absolute top-1/2 left-5 transform -rotate-45">
          <div className="w-72 h-72 bg-blue-500 rounded-full blur-[110px] opacity-50"></div>
        </div>
        <div className="absolute top-1/3 right-0 transform rotate-12">
          <div className="w-72 h-72 bg-cyan-400 rounded-full blur-[120px] opacity-30"></div>
        </div>
      </div>

      <div className="max-w-md w-full bg-slate-950/65 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl border border-slate-800/70 text-center relative z-10 animate-in fade-in zoom-in-95 duration-700">
        {/* History Button (Top Left) */}
        <Link
          href="/history"
          className="absolute top-4 left-4 text-slate-500 hover:text-blue-400 transition-colors"
          title="Historial de Partidas"
        >
          <HistoryIcon className="w-6 h-6" />
        </Link>

        {/* Top Right Controls */}
        <div className="absolute top-4 right-4 flex gap-2">
          {/* Rules Button */}
          <button
            onClick={() => setShowRules(true)}
            className="text-slate-500 hover:text-blue-400 transition-colors"
            title="Ver Reglas"
          >
            <HelpCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Logo / Title */}
        <div className="mb-10 relative h-44 md:h-48 flex justify-center items-center group">
          <div className="absolute -rotate-[15deg] -translate-x-14 md:-translate-x-18 transition-transform duration-700 group-hover:-translate-x-20 group-hover:-rotate-[22deg] hover:drop-shadow-lg">
            <PlayingCard
              card={{ id: "1", suit: "HEART", value: 1, displayValue: "A" }}
              className="w-28 h-40 md:w-32 md:h-44 border-4 border-slate-200 shadow-xl scale-in-up opacity-90"
            />
          </div>
          <div className="absolute rotate-[15deg] translate-x-14 md:translate-x-18 z-10 transition-transform duration-700 group-hover:translate-x-20 group-hover:rotate-[22deg] hover:drop-shadow-lg">
            <PlayingCard
              card={{ id: "2", suit: "SPADE", value: 13, displayValue: "K" }}
              className="w-28 h-40 md:w-32 md:h-44 border-4 border-slate-200 shadow-xl scale-in-up opacity-90"
            />
          </div>
          <div className="absolute z-0 w-52 h-52 bg-blue-500/10 rounded-full blur-3xl animate-pulse scale-in-up"></div>
          <div className="relative z-20 transform group-hover:scale-105 transition-transform duration-500">
            <div className="px-6 py-4 rounded-2xl bg-slate-950/60 backdrop-blur-md border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
              <h1 className="tracking-tight">
                <span className="block text-6xl md:text-7xl font-black text-slate-100 drop-shadow-[0_10px_26px_rgba(0,0,0,0.9)] supports-[background-clip:text]:bg-clip-text supports-[background-clip:text]:text-transparent supports-[background-clip:text]:bg-gradient-to-r supports-[background-clip:text]:from-cyan-300 supports-[background-clip:text]:via-white supports-[background-clip:text]:to-indigo-300">
                  Carioca
                </span>
                <span className="mt-2 inline-flex items-center justify-center text-[11px] md:text-xs font-bold text-slate-100 uppercase tracking-[0.45em] bg-white/10 border border-white/15 px-4 py-1.5 rounded-full">
                  Online
                </span>
              </h1>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider block ml-1">
              Tu Nombre (Anfitrión)
            </label>
            <input
              type="text"
              placeholder="Ingresa tu nombre..."
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/70 rounded-xl px-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/80 focus:bg-slate-900/80 transition-all text-center"
            />
            <button
              onClick={createGame}
              disabled={isCreating || !hostName.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xl py-5 rounded-2xl shadow-lg hover:shadow-blue-500/20 hover:translate-y-[-2px] active:translate-y-[0px] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-3 group border border-blue-400/20"
            >
              {isCreating ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <Dices className="w-8 h-8 group-hover:rotate-12 transition-transform" />
              )}
              {isCreating ? "Creando Sala..." : "Crear Nueva Partida"}
            </button>
          </div>

          <div className="relative flex py-3 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink-0 mx-4 text-slate-600 text-xs font-bold uppercase tracking-wider">
              O únete a una sala
            </span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="CÓDIGO"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/70 rounded-xl px-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/80 focus:bg-slate-900/80 transition-all font-mono uppercase text-lg tracking-widest text-center"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowScanner(true)}
                className="bg-slate-900/70 hover:bg-slate-800 text-slate-200 font-bold p-3 rounded-xl shadow-lg transition-all active:scale-95 border border-slate-700/70 flex items-center justify-center flex-shrink-0 w-14"
                title="Escanear QR"
              >
                <Scan className="w-6 h-6" />
              </button>
              <button
                onClick={joinGame}
                disabled={!joinCode}
                className="bg-slate-900/70 hover:bg-slate-800 disabled:opacity-50 text-white font-bold px-6 py-4 rounded-xl shadow-lg transition-all active:scale-95 border border-slate-700/70 flex-grow hover:border-slate-600"
              >
                Entrar
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <p className="text-slate-500 text-xs font-medium">
            Invita a tus amigos compartiendo el enlace o código.
          </p>
          <button
            onClick={() => setShowRules(true)}
            className="text-blue-500/80 hover:text-blue-400 text-sm underline decoration-dashed underline-offset-4 hover:decoration-solid transition-all font-semibold"
          >
            ¿Cómo se juega Carioca?
          </button>
        </div>
      </div>

      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />

      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-black border border-white/20 rounded-2xl overflow-hidden max-w-md w-full relative">
            <div className="absolute top-4 right-4 z-20">
              <button
                onClick={() => setShowScanner(false)}
                className="bg-black/50 text-white p-2 rounded-full hover:bg-white/20"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 text-center">
              <h3 className="text-white font-bold text-lg mb-4">
                Escanear Código QR
              </h3>
              <div className="rounded-xl overflow-hidden aspect-square bg-gray-900 relative">
                <Scanner
                  onScan={(result) => {
                    if (result && result.length > 0) {
                      handleScan(result[0].rawValue);
                    }
                  }}
                  onError={(error) => console.log(error)}
                  components={{
                    onOff: false,
                    torch: false,
                    zoom: false,
                    finder: true,
                  }}
                  styles={{
                    container: { width: "100%", height: "100%" },
                    video: {
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    },
                  }}
                />
              </div>
              <p className="text-white/50 text-sm mt-4">
                Apunta la cámara al código QR de la sala.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
