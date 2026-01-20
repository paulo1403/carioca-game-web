"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlayingCard } from "@/components/Card";
import { RulesModal } from "@/components/RulesModal";
import { ProfileModal } from "@/components/ProfileModal";
import { useCreateGame } from "@/hooks/useCreateGame";
import { useSession, signOut } from "next-auth/react";
import {
  HelpCircle,
  Loader2,
  Dices,
  History as HistoryIcon,
  Scan,
  X,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { Scanner } from "@yudiel/react-qr-scanner";

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [joinCode, setJoinCode] = useState("");
  const [hostName, setHostName] = useState(session?.user?.name || "");
  const [showRules, setShowRules] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Update hostName when session loads
  useEffect(() => {
    if (session?.user?.name && !hostName) {
      setHostName(session.user.name);
    }
  }, [session, hostName]);

  // Use React Query hook for creating game
  const createGameMutation = useCreateGame();

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!session) return null; // Prevent flicker before redirect

  const createGame = async () => {
    if (!hostName.trim()) {
      alert("Por favor ingresa tu nombre");
      return;
    }
    createGameMutation.mutate(hostName.trim());
  };

  const joinGame = () => {
    if (joinCode.trim()) {
      router.push(`/game/${joinCode.trim()}`);
    }
  };

  const handleScan = (text: string) => {
    if (text) {
      // If URL, extract ID
      if (text.includes("/game/")) {
        const parts = text.split("/game/");
        if (parts.length > 1) {
          const id = parts[1].split("?")[0];
          setJoinCode(id);
          router.push(`/game/${id}`);
          setShowScanner(false);
          return;
        }
      }
      setJoinCode(text);
      router.push(`/game/${text}`);
      setShowScanner(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
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
      </div>

      {/* Top Header Controls (Global Fixed) */}
      <div className="fixed top-0 left-0 w-full p-4 md:p-6 flex justify-between items-start z-50 pointer-events-none">
        <div className="pointer-events-auto">
          <Link
            href="/history"
            className="flex items-center justify-center w-12 h-12 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl text-slate-400 hover:text-blue-400 hover:border-blue-500/50 transition-all shadow-xl"
            title="Historial"
          >
            <HistoryIcon className="w-6 h-6" />
          </Link>
        </div>

        <div className="flex gap-3 pointer-events-auto">
          {session?.user && (
            <button
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-3 bg-slate-900/50 backdrop-blur-md border border-slate-800 p-1.5 pr-4 rounded-2xl hover:border-slate-700 transition-all shadow-xl group"
            >
              <div className="w-9 h-9 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/30 group-hover:bg-blue-600/30 transition-colors">
                <UserIcon className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Jugador</p>
                <p className="text-sm font-bold text-white leading-none">
                  {session.user.name || session.user.email?.split('@')[0]}
                </p>
              </div>
            </button>
          )}

          <button
            onClick={() => setShowRules(true)}
            className="w-12 h-12 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-400 hover:border-blue-500/50 transition-all shadow-xl"
            title="Reglas"
          >
            <HelpCircle className="w-6 h-6" />
          </button>

          {session?.user && (
            <button
              onClick={() => signOut()}
              className="w-12 h-12 bg-red-950/20 backdrop-blur-md border border-red-900/30 rounded-2xl flex items-center justify-center text-red-400/70 hover:text-red-400 hover:border-red-500/50 transition-all shadow-xl"
              title="Cerrar Sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-md w-full surface-1 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl border border-slate-700/70 text-center relative z-10 animate-in fade-in zoom-in-95 duration-700">

        {/* Logo / Title */}
        <div className="mb-10 relative h-44 md:h-48 flex justify-center items-center group">
          <div className="absolute -rotate-15 -translate-x-14 md:-translate-x-18 transition-transform duration-700 group-hover:-translate-x-20 group-hover:-rotate-22 hover:drop-shadow-lg">
            <PlayingCard
              card={{ id: "1", suit: "HEART", value: 1, displayValue: "A" }}
              className="w-28 h-40 md:w-32 md:h-44 border-4 border-slate-200 shadow-xl scale-in-up opacity-90"
            />
          </div>
          <div className="absolute rotate-15 translate-x-14 md:translate-x-18 z-10 transition-transform duration-700 group-hover:translate-x-20 group-hover:rotate-22 hover:drop-shadow-lg">
            <PlayingCard
              card={{ id: "2", suit: "SPADE", value: 13, displayValue: "K" }}
              className="w-28 h-40 md:w-32 md:h-44 border-4 border-slate-200 shadow-xl scale-in-up opacity-90"
            />
          </div>
          <div className="absolute z-0 w-52 h-52 bg-blue-500/10 rounded-full blur-3xl animate-pulse scale-in-up"></div>
          <div className="relative z-20 transform group-hover:scale-105 transition-transform duration-500">
            <div className="px-6 py-4 rounded-2xl surface-0 backdrop-blur-md border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
              <h1 className="tracking-tight">
                <span className="block text-6xl md:text-7xl font-black text-primary drop-shadow-[0_10px_26px_rgba(0,0,0,0.9)] supports-[background-clip:text]:bg-clip-text supports-[background-clip:text]:text-transparent supports-[background-clip:text]:bg-linear-to-r supports-[background-clip:text]:from-cyan-300 supports-[background-clip:text]:via-white supports-[background-clip:text]:to-indigo-300">
                  Carioca
                </span>
                <span className="mt-2 inline-flex items-center justify-center text-[11px] md:text-xs font-bold text-primary uppercase tracking-[0.45em] bg-white/10 border border-white/15 px-4 py-1.5 rounded-full">
                  Online
                </span>
              </h1>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-tertiary uppercase tracking-wider block ml-1">
              {session?.user ? "Tu Nombre de Juego" : "Tu Nombre (Anfitrión)"}
            </label>
            <input
              type="text"
              placeholder="Ingresa tu nombre..."
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              className="w-full surface-0 border border-slate-700/70 rounded-xl px-4 py-4 text-primary placeholder-tertiary focus:outline-none focus:border-blue-500/80 focus:surface-2 transition-all text-center"
            />
            {session?.user && !hostName && (
              <p className="text-[10px] text-blue-400/60 font-medium">Se usará tu nombre de cuenta por defecto</p>
            )}
            <button
              onClick={createGame}
              disabled={createGameMutation.isPending || !hostName.trim()}
              className="w-full bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-primary font-bold text-xl py-5 rounded-2xl shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-3 group border border-blue-400/20"
            >
              {createGameMutation.isPending ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <Dices className="w-8 h-8 group-hover:rotate-12 transition-transform" />
              )}
              {createGameMutation.isPending
                ? "Creando Sala..."
                : "Crear Nueva Partida"}
            </button>
          </div>

          <div className="relative flex py-3 items-center">
            <div className="grow border-t border-slate-800"></div>
            <span className="shrink-0 mx-4 text-tertiary text-xs font-bold uppercase tracking-wider">
              O únete a una sala
            </span>
            <div className="grow border-t border-slate-800"></div>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="CÓDIGO"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="w-full surface-0 border border-slate-700/70 rounded-xl px-4 py-4 text-primary placeholder-tertiary focus:outline-none focus:border-blue-500/80 focus:surface-2 transition-all font-mono uppercase text-lg tracking-widest text-center"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowScanner(true)}
                className="surface-2 hover:surface-3 text-secondary font-bold p-3 rounded-xl shadow-lg transition-all active:scale-95 border border-slate-700/70 flex items-center justify-center shrink-0 w-14"
                title="Escanear QR"
              >
                <Scan className="w-6 h-6" />
              </button>
              <button
                onClick={joinGame}
                disabled={!joinCode}
                className="surface-2 hover:surface-3 disabled:opacity-50 text-primary font-bold px-6 py-4 rounded-xl shadow-lg transition-all active:scale-95 border border-slate-700/70 grow hover:border-slate-600"
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
      <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />

      {/* QR Scanner Modal - Improved Mobile */}
      {showScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 safe-area-inset animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden w-full max-w-md mx-4 max-h-[90vh] relative">
            <div className="absolute top-3 right-3 z-20">
              <button
                onClick={() => setShowScanner(false)}
                className="bg-black/60 text-primary p-2 rounded-full hover:bg-black/80 touch-target transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 md:p-6 text-center">
              <h3 className="text-primary font-bold text-lg md:text-xl mb-4">
                Escanear Código QR
              </h3>
              <div className="rounded-xl overflow-hidden aspect-square surface-2 relative border-2 border-slate-700">
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
                    container: {
                      width: "100%",
                      height: "100%",
                      borderRadius: "0.75rem",
                    },
                    video: {
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "0.75rem",
                    },
                  }}
                />
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-secondary text-sm">
                  Apunta la cámara al código QR de la sala
                </p>
                <div className="flex gap-2 text-xs text-tertiary">
                  <span>📱 Mantén la cámara estable</span>
                  <span>💡 Asegúrate de tener buena luz</span>
                </div>
              </div>
              <button
                onClick={() => setShowScanner(false)}
                className="w-full mt-4 surface-2 hover:surface-3 text-secondary font-medium py-3 px-4 rounded-xl transition-colors touch-target"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
